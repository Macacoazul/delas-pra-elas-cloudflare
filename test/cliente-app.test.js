/**
 * O cliente do app (app/api.js) falando com o servidor DE VERDADE (src/servidor.js + banco D1 de teste), sem navegador:
 * login e primeiro acesso, cópia local, conferência do que mudou, fila de reenvio (sem internet, recusas, sessão que
 * acaba, duas abas), fotos, restauração do backup antigo e equipe.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { criarServidor } from '../src/servidor.js';
import { criarCliente, aplicarOperacao, novoId, ErroDoServidor, SemRede } from '../app/api.js';
import { criarArmazemEmMemoria } from '../app/armazem.js';
import { lerBackup } from '../app/backup.js';
import { criarEcossistema, criarNavegador, ADMIN_SENHA_DE_TESTE, EMAIL_DA_DONA, SENHA_DA_DONA } from './helpers/ecossistema.js';
import { arquivosDeTeste } from './helpers/site-de-teste.js';

const servidor = criarServidor({ arquivos: arquivosDeTeste() });
const DIA = '2026-10-25';
const FOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

/* ── mundo de teste ───────────────────────────────────────── */
let celulares = [];

async function comMundo(fn, opcoes) {
  const eco = await criarEcossistema(opcoes);
  celulares = [];
  try {
    return await fn(eco);
  } finally {
    // nenhum celular pode continuar falando com o banco depois que ele fecha
    for (const c of celulares) {
      c.cliente.parar();
      await c.cliente.aguardar();
    }
    await eco.parar();
  }
}

/** Um celular: cliente do app + rede de mentira (que pode "cair") + relógio e agenda controlados à mão. */
function criarCelular(eco, { armazem = criarArmazemEmMemoria(), navegador = criarNavegador(servidor, eco.env) } = {}) {
  const rede = { fora: false, chamadas: [], enderecos: [], respostaFalsa: null };
  const relogio = { t: 1_760_000_000_000 };
  const agenda = [];
  const buscar = async (caminho, init = {}) => {
    const metodo = init.method || 'GET';
    rede.chamadas.push(`${metodo} ${caminho.split('?')[0]}`);
    rede.enderecos.push(`${metodo} ${caminho}`);
    if (rede.fora) throw new TypeError('Failed to fetch');
    if (rede.respostaFalsa) {
      const f = rede.respostaFalsa;
      return { ok: f.status < 300, status: f.status, text: async () => f.texto };
    }
    const r = await navegador.pedir(metodo, caminho, { bruto: init.body, headers: init.headers || {} });
    return { ok: r.status >= 200 && r.status < 300, status: r.status, text: async () => r.texto };
  };
  const cliente = criarCliente({
    fetch: buscar,
    armazem,
    agora: () => relogio.t,
    agendar: (fn, ms) => {
      const item = { id: agenda.length + 1, fn, ms, quando: relogio.t + ms, ativo: true };
      agenda.push(item);
      return item.id;
    },
    cancelar: (id) => {
      const item = agenda.find((a) => a.id === id);
      if (item) item.ativo = false;
    },
    pagina: null,
  });
  const proximo = () => agenda.filter((a) => a.ativo).sort((x, y) => x.quando - y.quando || x.id - y.id)[0];
  const executar = async (item) => {
    item.ativo = false;
    relogio.t = Math.max(relogio.t, item.quando);
    await item.fn();
  };
  const celular = {
    cliente,
    rede,
    relogio,
    armazem,
    navegador,
    agenda,
    chamadasA: (parte) => rede.chamadas.filter((c) => c.includes(parte)).length,
    /** Deixa o tempo passar `ms`, rodando tudo que estiver agendado para esse intervalo (como um relógio de verdade). */
    async avancar(ms) {
      const limite = relogio.t + ms;
      for (let item = proximo(); item && item.quando <= limite; item = proximo()) await executar(item);
      relogio.t = limite;
    },
    /** Roda o que estiver agendado até a próxima conferência com o servidor e diz quanto o app vai esperar pela seguinte. */
    async proximoCiclo() {
      for (;;) {
        const item = proximo();
        assert.ok(item, 'não havia nada agendado');
        await executar(item);
        if (item.fn.name === 'ciclo') return agenda.find((a) => a.ativo && a.fn.name === 'ciclo').ms;
      }
    },
    agendados: () => agenda.filter((a) => a.ativo),
  };
  celulares.push(celular);
  return celular;
}

async function entrarComoDona(c) {
  await c.cliente.iniciar();
  if (c.cliente.estado().primeiroAcesso) await c.cliente.criarPrimeiraConta({ chave: ADMIN_SENHA_DE_TESTE, email: EMAIL_DA_DONA, senha: SENHA_DA_DONA });
  else await c.cliente.entrar(EMAIL_DA_DONA, SENHA_DA_DONA);
  await c.cliente.sincronizar();
}

const nova = (id, nome, extra = {}) => ({ col: 'clientes', id, op: 'set', dados: { nome, whatsapp: '', preExistente: false, criadaEm: DIA, ...extra } });
const venda = (id, clienteId, extra = {}) => ({
  col: 'vendas',
  id,
  op: 'set',
  dados: { data: DIA, criadaEm: 1_760_000_000_000, clienteId, codigo: '12', peca: 'Blusa jeans', valor: 35.5, pago: false, fila: [], temFoto: false, ...extra },
});

/* ── funções puras ────────────────────────────────────────── */
test('novoId: 20 letras e números, sem repetir', () => {
  const ids = new Set(Array.from({ length: 500 }, () => novoId()));
  assert.equal(ids.size, 500);
  for (const id of ids) assert.match(id, /^[A-Za-z0-9]{20}$/);
});

test('aplicarOperacao faz o mesmo que o servidor: padrões, mesclar, apagar, e ignora fotos', () => {
  const docs = { clientes: new Map(), vendas: new Map(), config: new Map() };
  aplicarOperacao(docs, nova('c1', 'Ana'));
  aplicarOperacao(docs, { col: 'clientes', id: 'c1', op: 'mesclar', dados: { whatsapp: '47999990000' } });
  assert.deepEqual(docs.clientes.get('c1'), { nome: 'Ana', whatsapp: '47999990000', preExistente: false, criadaEm: DIA });

  aplicarOperacao(docs, { col: 'vendas', id: 'v1', op: 'set', dados: { data: DIA, criadaEm: 1, clienteId: 'c1', peca: 'Saia', valor: 10, pago: false } });
  assert.deepEqual(docs.vendas.get('v1').fila, []);
  assert.equal(docs.vendas.get('v1').codigo, '');
  assert.equal(docs.vendas.get('v1').temFoto, false);

  // mesclar num documento que não existe cria (como no servidor); id e primeiraCompra nunca entram
  aplicarOperacao(docs, { col: 'clientes', id: 'c2', op: 'mesclar', dados: { id: 'x', primeiraCompra: DIA, nome: 'Bia' } });
  assert.deepEqual(Object.keys(docs.clientes.get('c2')).sort(), ['nome', 'preExistente', 'whatsapp']);

  aplicarOperacao(docs, { col: 'fotos', id: 'v1', op: 'set', dados: { imagem: FOTO } });
  assert.equal(docs.fotos, undefined);

  aplicarOperacao(docs, { col: 'vendas', id: 'v1', op: 'apagar' });
  assert.equal(docs.vendas.has('v1'), false);
  aplicarOperacao(docs, { col: 'vendas', id: 'nao-existe', op: 'apagar' }); // apagar o que não existe não é erro
});

/* ── entrada ──────────────────────────────────────────────── */
test('abrir o app sem nenhuma conta mostra o primeiro acesso; com a senha de instalação certa vira dona e entra', async () => {
  await comMundo(async (eco) => {
    const c = criarCelular(eco);
    assert.equal(c.cliente.estado().tela, 'abrindo');
    await c.cliente.iniciar();
    assert.equal(c.cliente.estado().tela, 'entrada');
    assert.equal(c.cliente.estado().primeiroAcesso, true);

    await assert.rejects(c.cliente.criarPrimeiraConta({ chave: 'errada', email: EMAIL_DA_DONA, senha: SENHA_DA_DONA }), (e) => e instanceof ErroDoServidor && e.status === 403 && /instalação/.test(e.message));
    assert.equal(c.cliente.estado().tela, 'entrada');

    await c.cliente.criarPrimeiraConta({ chave: ADMIN_SENHA_DE_TESTE, email: EMAIL_DA_DONA, senha: SENHA_DA_DONA });
    assert.deepEqual(c.cliente.estado().usuario, { email: EMAIL_DA_DONA, papel: 'dono' });
    assert.equal(c.cliente.estado().primeiroAcesso, false);
    await c.cliente.sincronizar();
    assert.equal(c.cliente.estado().tela, 'app');
    c.cliente.parar();
  }, { semDados: true });
});

test('login: senha errada mostra a mensagem do servidor; certa entra; sair apaga a cópia e a fila do celular', async () => {
  await comMundo(async (eco) => {
    const dona = criarCelular(eco);
    await entrarComoDona(dona);
    dona.cliente.parar();

    const c = criarCelular(eco);
    await c.cliente.iniciar();
    assert.equal(c.cliente.estado().tela, 'entrada');
    assert.equal(c.cliente.estado().primeiroAcesso, false);
    await assert.rejects(c.cliente.entrar(EMAIL_DA_DONA, 'senha errada 123'), (e) => e.status === 401 && e.message === 'E-mail ou senha não confere.');
    await c.cliente.entrar(EMAIL_DA_DONA, SENHA_DA_DONA);
    await c.cliente.sincronizar();
    await c.cliente.gravar([nova('c1', 'Ana'), venda('v1', 'c1')]);
    await c.cliente.sincronizar();
    await c.avancar(2000); // a cópia é guardada um instante depois
    assert.ok(await c.armazem.ler('copia'));

    // sem internet não dá para sair (o cookie continuaria valendo): o app avisa e não apaga nada
    c.rede.fora = true;
    await assert.rejects(c.cliente.sair(), (e) => e instanceof SemRede);
    assert.equal(c.cliente.estado().tela, 'app');
    assert.ok(await c.armazem.ler('copia'));
    c.rede.fora = false;

    await c.cliente.gravar([venda('v2', 'c1')]);
    await c.cliente.sair();
    assert.equal(c.cliente.estado().tela, 'entrada');
    assert.equal(c.cliente.estado().vendas.length, 0);
    assert.equal(await c.armazem.ler('copia'), undefined);
    assert.deepEqual(await c.armazem.listar('lote:'), []);
    c.cliente.parar();
  });
});

test('se o servidor não responde ao abrir, a tela mostra o motivo e dá para tentar de novo', async () => {
  await comMundo(async (eco) => {
    const c = criarCelular(eco);
    c.rede.fora = true;
    await c.cliente.iniciar();
    assert.equal(c.cliente.estado().tela, 'falha');
    assert.match(c.cliente.estado().falhaInicial, /Sem conexão/);
    c.rede.fora = false;
    await c.cliente.tentarDeNovo();
    assert.equal(c.cliente.estado().tela, 'entrada');

    // uma página qualquer (wifi de hotel) no lugar do servidor também não passa por resposta boa
    const d = criarCelular(eco);
    d.rede.respostaFalsa = { status: 200, texto: '<html>Entre no wifi</html>' };
    await d.cliente.iniciar();
    assert.equal(d.cliente.estado().tela, 'falha');
  });
});

/* ── dados e fila ─────────────────────────────────────────── */
test('lançar peça aparece na hora, sobe para o servidor e aparece no outro celular', async () => {
  await comMundo(async (eco) => {
    const a = criarCelular(eco);
    await entrarComoDona(a);
    const b = criarCelular(eco);
    await entrarComoDona(b);

    await a.cliente.gravar([nova('c1', 'Ana'), venda('v1', 'c1')]);
    // antes de enviar: já está na tela do celular A (e a fila mostra 1 pendente)
    const logo = a.cliente.estado();
    assert.equal(logo.vendas.length, 1);
    assert.equal(logo.clientes.length, 1);
    assert.equal(logo.pendentes >= 0, true);

    await a.cliente.sincronizar();
    assert.equal(a.cliente.estado().pendentes, 0);
    assert.equal(a.cliente.estado().conexao, 'ok');

    assert.equal(b.cliente.estado().vendas.length, 0);
    await b.cliente.sincronizar();
    assert.equal(b.cliente.estado().vendas.length, 1);
    assert.deepEqual(b.cliente.estado().vendas[0], { ...venda('v1', 'c1').dados, id: 'v1' });
    assert.equal(b.cliente.estado().clientes[0].nome, 'Ana');

    // alterar e apagar também chegam
    await b.cliente.gravar([{ col: 'vendas', id: 'v1', op: 'mesclar', dados: { pago: true } }]);
    await b.cliente.sincronizar();
    await a.cliente.sincronizar();
    assert.equal(a.cliente.estado().vendas[0].pago, true);

    await a.cliente.gravar([{ col: 'vendas', id: 'v1', op: 'apagar' }, { col: 'fotos', id: 'v1', op: 'apagar' }]);
    await a.cliente.sincronizar();
    await b.cliente.sincronizar();
    assert.equal(b.cliente.estado().vendas.length, 0);
    a.cliente.parar();
    b.cliente.parar();
  });
});

test('conferir o que mudou não refaz a tela quando nada mudou, e só pede o que é novo', async () => {
  await comMundo(async (eco) => {
    const a = criarCelular(eco);
    await entrarComoDona(a);
    await a.cliente.gravar([nova('c1', 'Ana'), venda('v1', 'c1')]);
    await a.cliente.sincronizar();
    let avisos = 0;
    const parar = a.cliente.assinar(() => (avisos += 1));
    const antes = a.cliente.estado();
    await a.cliente.sincronizar();
    await a.cliente.sincronizar();
    assert.equal(avisos, 0, 'conferir sem novidade não deve avisar as telas');
    assert.equal(a.cliente.estado(), antes);
    parar();
    a.cliente.parar();
  });
});

test('sem internet: a peça fica na fila (e no celular), a tela avisa, e tudo sobe em ordem quando a internet volta', async () => {
  await comMundo(async (eco) => {
    const a = criarCelular(eco);
    await entrarComoDona(a);
    a.rede.fora = true;

    await a.cliente.gravar([nova('c1', 'Ana'), venda('v1', 'c1', { codigo: '1' })]);
    await a.cliente.gravar([venda('v2', 'c1', { codigo: '2', peca: 'Saia' })]);
    await a.cliente.gravar([{ col: 'vendas', id: 'v1', op: 'mesclar', dados: { pago: true } }]);
    await a.cliente.sincronizar();

    const s = a.cliente.estado();
    assert.equal(s.pendentes, 3);
    assert.equal(s.conexao, 'sem-rede');
    assert.equal(s.vendas.length, 2, 'as peças aparecem na tela mesmo sem internet');
    assert.equal(s.vendas.find((v) => v.id === 'v1').pago, true, 'e as alterações em cima delas também');
    assert.equal((await a.armazem.listar('lote:')).length, 3, 'a fila está guardada no celular');

    // só uma tentativa por vez e nunca pula a ordem
    const antes = a.rede.chamadas.length;
    await a.cliente.sincronizar();
    assert.equal(a.rede.chamadas.length - antes, 1);

    // o celular é fechado e aberto de novo ainda sem internet: a fila continua lá
    const reaberto = criarCelular(eco, { armazem: a.armazem, navegador: a.navegador });
    reaberto.rede.fora = true;
    await reaberto.cliente.iniciar();
    assert.equal(reaberto.cliente.estado().pendentes, 3);

    // a internet volta
    reaberto.rede.fora = false;
    await reaberto.cliente.tentarDeNovo();
    await reaberto.cliente.sincronizar();
    assert.equal(reaberto.cliente.estado().pendentes, 0);
    assert.equal(reaberto.cliente.estado().conexao, 'ok');
    assert.deepEqual(await reaberto.armazem.listar('lote:'), []);

    const b = criarCelular(eco);
    await entrarComoDona(b);
    const vendas = b.cliente.estado().vendas;
    assert.deepEqual(vendas.map((v) => v.id).sort(), ['v1', 'v2']);
    assert.equal(vendas.find((v) => v.id === 'v1').pago, true);
    for (const x of [a, reaberto, b]) x.cliente.parar();
  });
});

test('o tempo entre as conferências: 4 s, 20 s depois de 5 minutos parado, e espera crescente quando a internet cai', async () => {
  await comMundo(async (eco) => {
    const a = criarCelular(eco);
    await entrarComoDona(a);
    assert.equal(await a.proximoCiclo(), 4000);
    assert.equal(await a.proximoCiclo(), 4000);

    a.relogio.t += 6 * 60_000; // ninguém mexe no app há 6 minutos
    assert.equal(await a.proximoCiclo(), 20_000);

    a.cliente.marcarAtividade();
    assert.equal(await a.proximoCiclo(), 4000, 'mexeu no app: volta ao ritmo normal');

    a.rede.fora = true;
    const esperas = [];
    for (let i = 0; i < 7; i += 1) esperas.push(await a.proximoCiclo());
    assert.deepEqual(esperas, [2000, 4000, 8000, 16_000, 30_000, 30_000, 30_000]);

    a.rede.fora = false;
    assert.equal(await a.proximoCiclo(), 4000, 'voltou ao normal quando a internet voltou');
    a.cliente.parar();
    assert.equal(a.agendados().length, 0, 'parar cancela o relógio');
  });
});

test('o servidor recusa uma alteração (dados inválidos): ela sai da fila com aviso e as seguintes continuam', async () => {
  await comMundo(async (eco) => {
    const a = criarCelular(eco);
    await entrarComoDona(a);
    await a.cliente.gravar([nova('c1', 'Ana')]);
    await a.cliente.gravar([venda('ruim', 'c1', { valor: -5 })]);
    await a.cliente.gravar([venda('boa', 'c1')]);
    await a.cliente.sincronizar();

    const s = a.cliente.estado();
    assert.equal(s.pendentes, 0);
    assert.deepEqual(s.vendas.map((v) => v.id), ['boa']);
    assert.match(s.aviso.texto, /não foi aceita/);
    assert.match(s.aviso.texto, /Valor inválido/);
    assert.deepEqual(await a.armazem.listar('lote:'), []);
    a.cliente.parar();
  });
});

test('erro do servidor (5xx) não perde nada: a fila espera e tenta de novo', async () => {
  await comMundo(async (eco) => {
    const a = criarCelular(eco);
    await entrarComoDona(a);
    a.rede.respostaFalsa = { status: 503, texto: '{"erro":"O servidor ainda não foi configurado.","codigo":"sem_configuracao"}' };
    await a.cliente.gravar([nova('c1', 'Ana')]);
    await a.cliente.sincronizar();
    assert.equal(a.cliente.estado().pendentes, 1);
    assert.equal(a.cliente.estado().conexao, 'erro');
    a.rede.respostaFalsa = null;
    await a.cliente.sincronizar();
    assert.equal(a.cliente.estado().pendentes, 0);
    assert.equal(a.cliente.estado().conexao, 'ok');
    a.cliente.parar();
  });
});

test('a sessão acaba no meio do uso: volta para a entrada SEM perder a fila, e ao entrar de novo ela sobe', async () => {
  await comMundo(async (eco) => {
    const dona = criarCelular(eco);
    await entrarComoDona(dona);
    await dona.cliente.equipe.adicionar('ana@exemplo.com', 'senha da ana 123');

    const ana = criarCelular(eco);
    await ana.cliente.iniciar();
    await ana.cliente.entrar('ana@exemplo.com', 'senha da ana 123');
    await ana.cliente.sincronizar();
    assert.equal(ana.cliente.estado().tela, 'app');

    // a dona tira a Ana da equipe; a sessão dela deixa de valer na hora
    await dona.cliente.equipe.remover('ana@exemplo.com');
    await ana.cliente.gravar([nova('c1', 'Bia'), venda('v1', 'c1')]);
    await ana.cliente.sincronizar();
    const s = ana.cliente.estado();
    assert.equal(s.tela, 'entrada');
    assert.equal(s.sessaoPerdida, true);
    assert.equal(s.conexao, 'sessao');
    assert.equal(s.pendentes, 1, 'o que ela lançou continua guardado');

    // a dona devolve o acesso (conta nova com a mesma senha) e a Ana entra de novo
    await dona.cliente.equipe.adicionar('ana@exemplo.com', 'senha da ana 123');
    await ana.cliente.entrar('ana@exemplo.com', 'senha da ana 123');
    await ana.cliente.sincronizar();
    assert.equal(ana.cliente.estado().tela, 'app');
    assert.equal(ana.cliente.estado().pendentes, 0);
    await dona.cliente.sincronizar();
    assert.equal(dona.cliente.estado().vendas.length, 1);
    ana.cliente.parar();
    dona.cliente.parar();
  });
});

test('duas abas no mesmo celular: cada alteração fica guardada separada (nenhuma se perde) e sobe em ordem', async () => {
  await comMundo(async (eco) => {
    const armazem = criarArmazemEmMemoria();
    const nav = criarNavegador(servidor, eco.env);
    const um = criarCelular(eco, { armazem, navegador: nav });
    await entrarComoDona(um);
    const dois = criarCelular(eco, { armazem, navegador: nav });
    await dois.cliente.iniciar();

    um.rede.fora = true;
    dois.rede.fora = true;
    await um.cliente.gravar([nova('c1', 'Ana')]);
    await dois.cliente.gravar([nova('c2', 'Bia')]);
    await um.cliente.gravar([venda('v1', 'c1')]);
    assert.equal((await armazem.listar('lote:')).length, 3);

    um.rede.fora = false;
    dois.rede.fora = false;
    await um.cliente.tentarDeNovo();
    await um.cliente.sincronizar();
    await dois.cliente.sincronizar();

    const c = criarCelular(eco);
    await entrarComoDona(c);
    assert.deepEqual(c.cliente.estado().clientes.map((x) => x.nome).sort(), ['Ana', 'Bia']);
    assert.equal(c.cliente.estado().vendas.length, 1);
    for (const x of [um, dois, c]) x.cliente.parar();
  });
});

test('a cópia guardada no celular acelera a abertura: só pede o que mudou depois', async () => {
  await comMundo(async (eco) => {
    const a = criarCelular(eco);
    await entrarComoDona(a);
    await a.cliente.gravar([nova('c1', 'Ana'), venda('v1', 'c1')]);
    await a.cliente.sincronizar();
    await a.avancar(2000); // a cópia é guardada um instante depois
    a.cliente.parar();

    const outroCelular = criarCelular(eco);
    await entrarComoDona(outroCelular);
    await outroCelular.cliente.gravar([venda('v2', 'c1', { peca: 'Saia' })]);
    await outroCelular.cliente.sincronizar();

    // o celular A é aberto de novo: mostra a cópia na hora e depois só traz a venda nova
    const reaberto = criarCelular(eco, { armazem: a.armazem, navegador: a.navegador });
    reaberto.rede.fora = true; // sem internet nem dá para conferir: mesmo assim a cópia já mostra o que havia
    await reaberto.cliente.iniciar();
    reaberto.rede.fora = false;
    assert.equal(reaberto.cliente.estado().tela, 'falha');
    await reaberto.cliente.tentarDeNovo();
    await reaberto.cliente.aguardar();
    assert.deepEqual(reaberto.cliente.estado().vendas.map((v) => v.id), ['v1', 'v2']);
    const pedidos = reaberto.rede.enderecos.filter((e) => e.includes('/api/app/estado'));
    assert.ok(pedidos.length >= 1);
    assert.ok(!pedidos[0].includes('desde=0&'), `devia pedir só o que é novo, mas pediu: ${pedidos[0]}`);
    await reaberto.cliente.sincronizar();
    assert.deepEqual(reaberto.cliente.estado().vendas.map((v) => v.id).sort(), ['v1', 'v2']);
    reaberto.cliente.parar();
    outroCelular.cliente.parar();
  });
});

test('servidor restaurado de um backup mais antigo: a cópia do celular é descartada e refeita', async () => {
  await comMundo(async (eco) => {
    const armazem = criarArmazemEmMemoria();
    await armazem.gravar('copia', {
      v: 1,
      cursor: 987_654,
      clientes: [['fantasma', { nome: 'Cliente que não existe mais', whatsapp: '', preExistente: false, criadaEm: DIA }]],
      vendas: [],
      config: [],
    });
    const c = criarCelular(eco, { armazem });
    await entrarComoDona(c);
    assert.equal(c.cliente.estado().clientes.length, 0);
    await c.cliente.gravar([nova('c1', 'Ana')]);
    await c.cliente.sincronizar();
    assert.deepEqual(c.cliente.estado().clientes.map((x) => x.id), ['c1']);
    c.cliente.parar();
  });
});

test('cópia local estragada ou de outra versão é ignorada sem derrubar o app', async () => {
  await comMundo(async (eco) => {
    for (const lixo of [null, 'texto', { v: 99 }, { v: 1, cursor: -1, clientes: [], vendas: [], config: [] }, { v: 1, cursor: 1, clientes: 'x', vendas: [], config: [] }, { v: 1, cursor: 1, clientes: [['a', null]], vendas: [], config: [] }]) {
      const armazem = criarArmazemEmMemoria();
      if (lixo !== null) await armazem.gravar('copia', lixo);
      await armazem.gravar('lote:1', { id: '1', ops: [] }); // lote vazio também não vale
      const c = criarCelular(eco, { armazem });
      await c.cliente.iniciar();
      assert.equal(c.cliente.estado().pendentes, 0);
      c.cliente.parar();
    }
  });
});

test('muitas peças: o app busca em várias páginas até ter tudo', async () => {
  await comMundo(async (eco) => {
    const a = criarCelular(eco);
    await entrarComoDona(a);
    const clientes = Array.from({ length: 5 }, (_, i) => ({ id: `c${i}`, nome: `Cliente ${i}`, whatsapp: '', preExistente: true, criadaEm: DIA }));
    const vendas = Array.from({ length: 1700 }, (_, i) => ({
      id: `v${String(i).padStart(4, '0')}`,
      data: DIA,
      criadaEm: 1_760_000_000_000 + i,
      clienteId: `c${i % 5}`,
      codigo: String(i),
      peca: `Peça ${i}`,
      valor: 10 + (i % 7),
      pago: i % 2 === 0,
      fila: [],
      temFoto: false,
    }));
    const backup = lerBackup(JSON.stringify({ clientes, vendas, config: {} }), DIA);
    let ultimo = 0;
    const total = await a.cliente.importarBackup(backup, (feito) => (ultimo = feito));
    assert.equal(total, 1705);
    assert.equal(ultimo, 1705);

    const b = criarCelular(eco);
    await entrarComoDona(b);
    assert.equal(b.cliente.estado().vendas.length, 1700);
    assert.equal(b.cliente.estado().clientes.length, 5);
    assert.ok(b.chamadasA('/api/app/estado') >= 2, 'precisou de mais de uma página');
    a.cliente.parar();
    b.cliente.parar();
  });
});

/* ── fotos ────────────────────────────────────────────────── */
test('foto: aparece na hora (da fila), depois vem do servidor para outro celular, e some quando apagada', async () => {
  await comMundo(async (eco) => {
    const a = criarCelular(eco);
    await entrarComoDona(a);
    a.rede.fora = true;
    await a.cliente.gravar([nova('c1', 'Ana'), venda('v1', 'c1', { temFoto: true }), { col: 'fotos', id: 'v1', op: 'set', dados: { imagem: FOTO } }]);
    assert.equal(await a.cliente.foto('v1'), FOTO, 'a foto ainda está na fila e já pode ser vista');
    a.rede.fora = false;
    await a.cliente.sincronizar();
    assert.equal(await a.cliente.foto('v1'), FOTO);
    assert.equal(a.chamadasA('/api/app/foto/'), 0, 'depois de enviada, a foto fica na memória: não precisa pedir de novo');

    const b = criarCelular(eco);
    await entrarComoDona(b);
    assert.equal(b.cliente.estado().vendas[0].temFoto, true);
    assert.equal(await b.cliente.foto('v1'), FOTO);
    assert.equal(b.chamadasA('/api/app/foto/'), 1);
    assert.equal(await b.cliente.foto('v1'), FOTO);
    assert.equal(b.chamadasA('/api/app/foto/'), 1, 'a segunda vez vem da memória');

    await a.cliente.gravar([{ col: 'vendas', id: 'v1', op: 'mesclar', dados: { temFoto: false } }, { col: 'fotos', id: 'v1', op: 'apagar' }]);
    assert.equal(await a.cliente.foto('v1'), null, 'apagada na fila já não aparece');
    await a.cliente.sincronizar();
    const c = criarCelular(eco);
    await entrarComoDona(c);
    assert.equal(await c.cliente.foto('v1'), null);
    for (const x of [a, b, c]) x.cliente.parar();
  });
});

test('foto inválida derruba só aquele lote (venda e foto juntas) e avisa', async () => {
  await comMundo(async (eco) => {
    const a = criarCelular(eco);
    await entrarComoDona(a);
    await a.cliente.gravar([nova('c1', 'Ana'), venda('v1', 'c1', { temFoto: true }), { col: 'fotos', id: 'v1', op: 'set', dados: { imagem: 'data:text/html;base64,PHNjcmlwdD4=' } }]);
    await a.cliente.sincronizar();
    assert.equal(a.cliente.estado().vendas.length, 0);
    assert.match(a.cliente.estado().aviso.texto, /Foto inválida/);
    a.cliente.parar();
  });
});

/* ── restaurar o backup antigo ────────────────────────────── */
test('restaurar backup: aproveita o que serve, ignora o que não serve e mantém os ids', async () => {
  await comMundo(async (eco) => {
    const a = criarCelular(eco);
    await entrarComoDona(a);
    const antigo = {
      clientes: [
        { id: 'Zx1AbCdEfGhIjKlMnOpQ', nome: 'Ana Souza', whatsapp: '(47) 99999-0000', preExistente: true, criadaEm: '2026-01-10', primeiraCompra: '2026-03-02' },
        { id: 'Aa1AbCdEfGhIjKlMnOpQ', nome: 'Bia', whatsapp: '', preExistente: false },
        { id: 'sem nome', nome: '', whatsapp: '' },
      ],
      vendas: [
        { id: 'Vv1AbCdEfGhIjKlMnOpQ', data: '2026-03-02', criadaEm: 1_772_000_000_000, clienteId: 'Zx1AbCdEfGhIjKlMnOpQ', codigo: '7', peca: 'Vestido', valor: 59.9, pago: true, fila: [{ nome: 'Bia', clienteId: 'Aa1AbCdEfGhIjKlMnOpQ' }], temFoto: true },
        { id: 'Vv2AbCdEfGhIjKlMnOpQ', data: 'ontem', clienteId: 'Zx1AbCdEfGhIjKlMnOpQ', peca: 'Saia', valor: 10 },
      ],
      config: { abertura: 'Oi {nome}', fechamento: 'Tchau' },
    };
    const backup = lerBackup(JSON.stringify(antigo), DIA);
    assert.equal(backup.clientes.length, 2);
    assert.equal(backup.vendas.length, 1);
    assert.equal(backup.ignorados, 2);
    assert.equal(backup.vendas[0].temFoto, false, 'o backup antigo não traz as fotos');
    assert.equal(backup.clientes[1].criadaEm, DIA, 'sem data de cadastro, usa o dia da restauração');

    await a.cliente.importarBackup(backup);
    await a.cliente.importarBackup(backup); // restaurar duas vezes não duplica
    const s = a.cliente.estado();
    assert.equal(s.clientes.length, 2);
    assert.equal(s.vendas.length, 1);
    assert.equal(s.vendas[0].id, 'Vv1AbCdEfGhIjKlMnOpQ');
    assert.equal(s.vendas[0].fila[0].nome, 'Bia');
    assert.equal(s.config.abertura, 'Oi {nome}');
    a.cliente.parar();
  });
});

test('lerBackup: texto que não é backup é recusado com explicação', () => {
  for (const ruim of ['', 'oi', '[]', '{}', '{"clientes":[],"vendas":[]}', '{"clientes":[{"nome":"x"}],"vendas":[]}']) {
    assert.throws(() => lerBackup(ruim, DIA), /backup|aproveitar|ler/i, ruim);
  }
  assert.doesNotThrow(() => lerBackup('﻿{"clientes":[{"id":"c1","nome":"Ana"}],"vendas":[]}', DIA));
});

/* ── conta e equipe ───────────────────────────────────────── */
test('equipe: a dona adiciona, lista, redefine senha e remove; quem é da equipe não faz nada disso', async () => {
  await comMundo(async (eco) => {
    const dona = criarCelular(eco);
    await entrarComoDona(dona);
    await dona.cliente.equipe.adicionar('ana@exemplo.com', 'senha da ana 123');
    await assert.rejects(dona.cliente.equipe.adicionar('ana@exemplo.com', 'outra senha 456'), (e) => e.status === 409);
    await assert.rejects(dona.cliente.equipe.adicionar('nao-e-email', 'senha da ana 123'), (e) => e.codigo === 'email_invalido');
    const lista = await dona.cliente.equipe.listar();
    assert.deepEqual(lista.map((p) => [p.email, p.papel]), [[EMAIL_DA_DONA, 'dono'], ['ana@exemplo.com', 'equipe']]);

    const ana = criarCelular(eco);
    await ana.cliente.iniciar();
    await ana.cliente.entrar('ana@exemplo.com', 'senha da ana 123');
    await assert.rejects(ana.cliente.equipe.listar(), (e) => e.status === 403);
    assert.equal(ana.cliente.estado().tela === 'entrada', false, 'um 403 não derruba a sessão');

    await dona.cliente.equipe.redefinirSenha('ana@exemplo.com', 'senha nova da ana 1');
    await ana.cliente.sincronizar();
    assert.equal(ana.cliente.estado().tela, 'entrada', 'trocar a senha encerra as sessões dela');
    await ana.cliente.entrar('ana@exemplo.com', 'senha nova da ana 1');

    await ana.cliente.trocarSenha('senha nova da ana 1', 'minha senha 12345');
    await assert.rejects(ana.cliente.trocarSenha('errada errada', 'qualquer coisa 1'), (e) => e.codigo === 'senha_atual_errada');
    await ana.cliente.sincronizar();
    assert.equal(ana.cliente.estado().tela, 'app', 'quem troca a própria senha continua logada');

    await dona.cliente.equipe.remover('ana@exemplo.com');
    await assert.rejects(dona.cliente.equipe.remover(EMAIL_DA_DONA), (e) => e.codigo === 'nao_remover_a_si');
    for (const x of [dona, ana]) x.cliente.parar();
  });
});
