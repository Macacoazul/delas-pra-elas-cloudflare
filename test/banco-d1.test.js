import test from 'node:test';
import assert from 'node:assert/strict';
import { criarBancoDeTeste } from './helpers/d1-sqlite.js';
import { BancoD1, mudancasEmJson, ErroDeConflito, idAutomatico } from '../src/banco-d1.js';

const SEGREDO = 'segredo-de-teste-com-mais-de-vinte-caracteres';
const novo = () => criarBancoDeTeste({ segredo: SEGREDO });

test('grava, lê, atualiza e apaga um documento', async () => {
  const t = await novo();
  const ref = t.banco.doc('clientes/c1');
  assert.equal((await ref.get()).exists, false);

  await ref.set({ nome: 'Ana', whatsapp: '47999990000' });
  const lido = await ref.get();
  assert.equal(lido.exists, true);
  assert.deepEqual(lido.data(), { nome: 'Ana', whatsapp: '47999990000' });

  await ref.update({ nome: 'Ana Paula' });
  assert.equal((await ref.get()).data().nome, 'Ana Paula');
  assert.equal((await ref.get()).data().whatsapp, '47999990000', 'update mexe só no campo informado');

  await ref.delete();
  assert.equal((await ref.get()).exists, false);
  assert.equal(t.ler('clientes/c1'), undefined);
});

test('update de documento que não existe falha; set com merge cria e mescla campos aninhados', async () => {
  const t = await novo();
  await assert.rejects(() => t.banco.doc('clientes/nada').update({ a: 1 }), /NOT_FOUND/);

  await t.banco.doc('ajustes/frete').set({ remetente: { nome: 'Loja', cep: '89201001' }, a: 1 });
  await t.banco.doc('ajustes/frete').set({ remetente: { nome: 'Outra' }, b: 2 }, { merge: true });
  assert.deepEqual(t.ler('ajustes/frete'), { remetente: { nome: 'Outra', cep: '89201001' }, a: 1, b: 2 });
});

test('ids automáticos são longos e diferentes; caminhos e nomes estranhos são recusados', async () => {
  const t = await novo();
  const ids = new Set(Array.from({ length: 200 }, () => idAutomatico()));
  assert.equal(ids.size, 200);
  for (const id of ids) assert.match(id, /^[A-Za-z0-9]{20}$/);
  assert.match(t.banco.collection('fretes').doc().id, /^[A-Za-z0-9]{20}$/);

  for (const ruim of ['semcaminho', 'a/b/c', 'Maiuscula/x', "fretes/x'; DROP TABLE documentos; --", 'fretes/', 'fretes/a b']) {
    assert.throws(() => t.banco.doc(ruim), /caminho inválido/, ruim);
  }
  assert.throws(() => t.banco.collection("fretes' OR 1=1 --"), /coleção inválida/);
  assert.throws(() => t.banco.collection('fretes').where("status') OR 1=1 --", '==', 'x'), /campo inválido/);
  assert.throws(() => t.banco.collection('fretes').where('status', '>', 'x'), /só "=="/);
});

test('valores que o banco não aceita são recusados antes de gravar', async () => {
  const t = await novo();
  const ref = t.banco.doc('vendas/v1');
  await assert.rejects(() => ref.set({ a: undefined }), /undefined/);
  await assert.rejects(() => ref.set({ a: () => 1 }), /função/);
  await assert.rejects(() => ref.set({ a: Number.NaN }), /número inválido/);
  await assert.rejects(() => ref.set({ a: { b: [1, undefined] } }), /undefined/);
  assert.equal(t.ler('vendas/v1'), undefined);
});

test('consulta por igualdade usa os campos certos, ignora apagados e respeita o limite', async () => {
  const t = await novo();
  for (let i = 0; i < 6; i += 1) {
    await t.banco.doc(`fretes/f${i}`).set({ token: `tok${i}`, status: i % 2 ? 'pago' : 'aguardando_pagamento', urgente: i === 3 });
  }
  await t.banco.doc('fretes/f1').delete();

  const pagos = await t.banco.collection('fretes').where('status', '==', 'pago').get();
  assert.deepEqual(pagos.docs.map((d) => d.id).sort(), ['f3', 'f5']);
  assert.equal(pagos.empty, false);

  const porToken = await t.banco.collection('fretes').where('token', '==', 'tok4').limit(1).get();
  assert.equal(porToken.size, 1);
  assert.equal(porToken.docs[0].id, 'f4');

  assert.equal((await t.banco.collection('fretes').where('token', '==', 'nao-existe').get()).empty, true);
  assert.equal((await t.banco.collection('fretes').where('urgente', '==', true).get()).size, 1, 'booleano casa com o valor guardado');
  assert.equal((await t.banco.collection('fretes').limit(2).get()).size, 2);
  // O valor da consulta nunca vira SQL:
  assert.equal((await t.banco.collection('fretes').where('token', '==', "' OR '1'='1").get()).empty, true);
});

test('transação: leitura-modificação-gravação simultâneas não perdem nenhuma soma', async () => {
  const t = await novo();
  await t.banco.doc('contas/c').set({ n: 0 });
  const somar = () =>
    t.banco.runTransaction(async (tx) => {
      const s = await tx.get(t.banco.doc('contas/c'));
      tx.update(s.ref, { n: s.data().n + 1 });
    });
  await Promise.all(Array.from({ length: 6 }, somar));
  assert.equal(t.ler('contas/c').n, 6);
  assert.equal(t.d1.sqlite.prepare('SELECT COUNT(*) AS n FROM guarda').get().n, 0, 'a trava não deixa rastro');
});

test('transação: se alguém mudou o documento no meio, o commit é recusado e nada é gravado', async () => {
  const t = await novo();
  await t.banco.doc('contas/c').set({ n: 1 });
  await t.banco.doc('contas/outra').set({ x: 1 });

  // Sem retentativa: uma transação "à mão", para ver o conflito de perto.
  let tentativas = 0;
  await assert.rejects(
    () =>
      t.banco.runTransaction(async (txn) => {
        tentativas += 1;
        const s = await txn.get(t.banco.doc('contas/c'));
        await t.banco.doc('contas/c').set({ n: 99 }); // outro pedido muda no meio do caminho
        txn.set(t.banco.doc('contas/outra'), { x: s.data().n });
      }, 1),
    (e) => e instanceof ErroDeConflito,
  );
  assert.equal(tentativas, 1);
  assert.deepEqual(t.ler('contas/outra'), { x: 1 }, 'a gravação da transação perdida não vale');
  assert.equal(t.ler('contas/c').n, 99);
});

test('transação: com retentativa, o segundo passe enxerga o valor novo', async () => {
  const t = await novo();
  await t.banco.doc('contas/c').set({ n: 1 });
  let vezes = 0;
  await t.banco.runTransaction(async (txn) => {
    vezes += 1;
    const s = await txn.get(t.banco.doc('contas/c'));
    if (vezes === 1) await t.banco.doc('contas/c').set({ n: 10 });
    txn.update(s.ref, { n: s.data().n + 1 });
  });
  assert.equal(vezes, 2);
  assert.equal(t.ler('contas/c').n, 11);
});

test('transação: criar documento que alguém criou antes também conflita (leitura de "não existe")', async () => {
  const t = await novo();
  let vezes = 0;
  const visto = [];
  await t.banco.runTransaction(async (txn) => {
    vezes += 1;
    const s = await txn.get(t.banco.doc('fretes/novo'));
    visto.push(s.exists);
    if (vezes === 1) await t.banco.doc('fretes/novo').set({ dono: 'outro' });
    if (!s.exists) txn.set(s.ref, { dono: 'eu' });
  });
  assert.deepEqual(visto, [false, true]);
  assert.equal(t.ler('fretes/novo').dono, 'outro', 'quem chegou primeiro ficou com o documento');
});

test('transação: leituras depois de escritas são erro de programação; sem escritas não grava nada', async () => {
  const t = await novo();
  await assert.rejects(
    () =>
      t.banco.runTransaction(async (txn) => {
        txn.set(t.banco.doc('a/b'), { x: 1 });
        await txn.get(t.banco.doc('a/c'));
      }),
    /leituras devem vir antes/,
  );
  await t.banco.runTransaction(async (txn) => {
    await txn.get(t.banco.doc('a/b'));
  });
  assert.equal(t.ler('a/b'), undefined);
});

test('transação: apagar e gravar vários documentos de uma vez é tudo-ou-nada', async () => {
  const t = await novo();
  await t.banco.doc('vendas/v1').set({ ok: 1 });
  await t.banco.doc('vendas/v2').set({ ok: 1 });
  await assert.rejects(() =>
    t.banco.runTransaction(async (txn) => {
      txn.delete(t.banco.doc('vendas/v1'));
      txn.set(t.banco.doc('vendas/v2'), { ok: 2 });
      txn.set(t.banco.doc('vendas/v3'), { ruim: undefined });
    }),
  );
  assert.deepEqual(t.ler('vendas/v1'), { ok: 1 });
  assert.deepEqual(t.ler('vendas/v2'), { ok: 1 });

  await t.banco.runTransaction(async (txn) => {
    txn.delete(t.banco.doc('vendas/v1'));
    txn.set(t.banco.doc('vendas/v2'), { ok: 2 });
  });
  assert.equal(t.ler('vendas/v1'), undefined);
  assert.deepEqual(t.ler('vendas/v2'), { ok: 2 });
});

test('coleções privadas ficam cifradas no banco e só abrem no caminho certo', async () => {
  const t = await novo();
  const segredoDeMelhorEnvio = 'TOKEN-QUE-NAO-PODE-APARECER-123456';
  await t.banco.doc('privado/credenciais').set({ melhorEnvio: { token: segredoDeMelhorEnvio } });
  await t.banco.doc('fretes_privado/f1').set({ cpf: '11144477735', rua: 'Rua das Flores' });
  await t.banco.doc('fretes/f1').set({ status: 'pago' });

  for (const caminho of ['privado/credenciais', 'fretes_privado/f1']) {
    const bruto = t.bruto(caminho);
    assert.match(bruto, /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, caminho);
    assert.doesNotMatch(bruto, /TOKEN|11144477735|Flores|melhorEnvio/, 'nada legível no banco');
  }
  assert.match(t.bruto('fretes/f1'), /"status":"pago"/, 'o que não é privado fica legível (a equipe lista os fretes)');

  assert.equal((await t.banco.doc('privado/credenciais').get()).data().melhorEnvio.token, segredoDeMelhorEnvio);
  assert.equal(t.ler('fretes_privado/f1').cpf, '11144477735', 'o atalho dos testes (cifra independente) também lê');

  // Copiar o texto cifrado para outro documento não funciona (o caminho entra na autenticação).
  t.d1.sqlite.prepare("INSERT INTO documentos (colecao, id, dados, versao, seq) VALUES ('fretes_privado', 'f2', ?, 1, 99)").run(t.bruto('fretes_privado/f1'));
  await assert.rejects(() => t.banco.doc('fretes_privado/f2').get());

  // Segredo diferente: não abre.
  const outro = new BancoD1(t.d1, { segredo: 'outro-segredo-diferente-bem-longo' });
  await assert.rejects(() => outro.doc('privado/credenciais').get());
  // Sem segredo: nem grava nem lê privados.
  const semSegredo = new BancoD1(t.d1, { segredo: '' });
  await assert.rejects(() => semSegredo.doc('privado/credenciais').set({ a: 1 }), /SEGREDO/);
});

test('consultas em coleções privadas devolvem os dados abertos', async () => {
  const t = await novo();
  await t.banco.doc('fretes_privado/f1').set({ cpf: '1' });
  const q = await t.banco.collection('fretes_privado').get();
  assert.deepEqual(q.docs.map((d) => d.data()), [{ cpf: '1' }]);
});

test('mudancasEmJson: lote inicial, mudanças desde um número, apagados e paginação', async () => {
  const t = await novo();
  await t.banco.doc('clientes/c1').set({ nome: 'Ana' });
  await t.banco.doc('vendas/v1').set({ peca: 'Blusa' });
  await t.banco.doc('fotos/p1').set({ imagem: 'data:...' });
  await t.banco.doc('clientes/c2').set({ nome: 'Bia' });

  const tudo = JSON.parse(await mudancasEmJson(t.banco, ['clientes', 'vendas'], 0));
  assert.equal(tudo.completo, true);
  assert.deepEqual(tudo.mudancas.map((m) => `${m.c}/${m.i}`), ['clientes/c1', 'vendas/v1', 'clientes/c2'], 'só as coleções pedidas, em ordem de gravação');
  assert.deepEqual(tudo.mudancas[0].d, { nome: 'Ana' });
  assert.equal(tudo.de, 0);
  assert.equal(tudo.ate, 4, 'a sequência é global; a foto ocupou o número 3');

  const nada = JSON.parse(await mudancasEmJson(t.banco, ['clientes', 'vendas'], tudo.ate));
  assert.deepEqual(nada.mudancas, []);
  assert.equal(nada.ate, tudo.ate, 'sem novidades, o número fica onde estava');

  await t.banco.doc('clientes/c1').update({ nome: 'Ana Paula' });
  await t.banco.doc('vendas/v1').delete();
  const delta = JSON.parse(await mudancasEmJson(t.banco, ['clientes', 'vendas'], tudo.ate));
  assert.deepEqual(delta.mudancas.map((m) => [m.c, m.i, m.a, m.d]), [
    ['clientes', 'c1', 0, { nome: 'Ana Paula' }],
    ['vendas', 'v1', 1, null],
  ]);

  const pagina = JSON.parse(await mudancasEmJson(t.banco, ['clientes', 'vendas'], 0, { limite: 2 }));
  assert.equal(pagina.completo, false);
  assert.equal(pagina.mudancas.length, 2);
  const resto = JSON.parse(await mudancasEmJson(t.banco, ['clientes', 'vendas'], pagina.ate, { limite: 2 }));
  assert.equal(resto.completo, true);
  const todos = [...pagina.mudancas, ...resto.mudancas].map((m) => `${m.c}/${m.i}/${m.a}`);
  assert.deepEqual(todos, ['clientes/c2/0', 'clientes/c1/0', 'vendas/v1/1']);
});

test('mudancasEmJson: coleções inválidas e lista vazia são recusadas; texto com aspas e acentos sobrevive', async () => {
  const t = await novo();
  await assert.rejects(() => mudancasEmJson(t.banco, ["x'); DROP TABLE documentos;--"], 0), /coleção inválida/);
  await assert.rejects(() => mudancasEmJson(t.banco, [], 0), /nenhuma coleção/);
  const estranho = { nome: 'Maria "da Silva" \\ José\nlinha 2 😀 ação', n: 1.5 };
  await t.banco.doc('clientes/c9').set(estranho);
  const r = JSON.parse(await mudancasEmJson(t.banco, ['clientes'], 0));
  assert.deepEqual(r.mudancas[0].d, estranho);
});

test('mudancasEmJson com "recentes": na primeira vez traz os N mais novos; depois só as mudanças', async () => {
  const t = await novo();
  for (let i = 1; i <= 8; i += 1) await t.banco.doc(`fretes/f${i}`).set({ criadoEm: 1000 + (i === 3 ? 500 : i), n: i });
  const primeira = JSON.parse(await mudancasEmJson(t.banco, ['fretes'], 0, { recentes: { campo: 'criadoEm', n: 3 } }));
  assert.deepEqual(primeira.mudancas.map((m) => m.d.n), [3, 8, 7], 'os 3 de criadoEm maior, do mais novo para o mais velho');
  assert.equal(primeira.ate, 8);
  assert.equal(primeira.completo, true);

  await t.banco.doc('fretes/f2').update({ n: 20 });
  const depois = JSON.parse(await mudancasEmJson(t.banco, ['fretes'], primeira.ate, { recentes: { campo: 'criadoEm', n: 3 } }));
  assert.deepEqual(depois.mudancas.map((m) => m.d.n), [20]);

  const vazio = await criarBancoDeTeste({ segredo: SEGREDO });
  const nenhum = JSON.parse(await mudancasEmJson(vazio.banco, ['fretes'], 0, { recentes: { campo: 'criadoEm', n: 3 } }));
  assert.deepEqual(nenhum, { de: 0, ate: 0, completo: true, mudancas: [] });
  await assert.rejects(() => mudancasEmJson(t.banco, ['fretes'], 0, { recentes: { campo: "x') --", n: 3 } }), /campo inválido/);
});

test('mudancasEmJson: número de partida lixo vira "do começo"; à frente do banco manda reiniciar', async () => {
  const t = await novo();
  await t.banco.doc('clientes/c1').set({ nome: 'Ana' });
  await t.banco.doc('clientes/c2').set({ nome: 'Bia' });
  for (const lixo of [undefined, null, 'abc', -3, Number.NaN, Infinity, '1e999', 2 ** 60, '0x10', {}, [], 1.9e300]) {
    const r = JSON.parse(await mudancasEmJson(t.banco, ['clientes'], lixo));
    assert.equal(r.mudancas.length, 2, String(lixo));
    assert.ok(Number.isSafeInteger(r.de) && Number.isSafeInteger(r.ate), `números válidos para ${String(lixo)}`);
  }

  const igual = JSON.parse(await mudancasEmJson(t.banco, ['clientes'], 2));
  assert.deepEqual(igual, { de: 2, ate: 2, completo: true, mudancas: [] }, 'em dia: sem novidades e sem reiniciar');

  // Banco "voltou no tempo" (restauração): o aparelho está na sequência 50, o banco só vai até 2.
  const adiante = JSON.parse(await mudancasEmJson(t.banco, ['clientes'], 50));
  assert.equal(adiante.reiniciar, true);
  assert.equal(adiante.de, 0);
  assert.equal(adiante.mudancas.length, 2, 'devolve tudo para o aparelho recomeçar do zero');
  assert.equal(adiante.ate, 2);
});

test('documento enorme é recusado', async () => {
  const t = await novo();
  await assert.rejects(() => t.banco.doc('fotos/gigante').set({ imagem: 'a'.repeat(1_600_000) }), /grande demais/);
});
