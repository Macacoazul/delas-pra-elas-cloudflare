import test from 'node:test';
import assert from 'node:assert/strict';
import { criarBancoDeTeste } from './helpers/d1-sqlite.js';
import * as AppApi from '../src/app-api.js';
import { ErroNegocio } from '../src/dados.js';

const FOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIx==';

async function preparar() {
  const t = await criarBancoDeTeste();
  const ctx = { d1: t.d1, db: t.banco, now: () => Date.now() };
  return { t, ctx };
}

const cliente = (extra = {}) => ({ nome: 'Ana Paula', whatsapp: '47999990000', preExistente: false, criadaEm: '2026-10-25', ...extra });
const venda = (extra = {}) => ({ data: '2026-10-25', criadaEm: 1761393600000, clienteId: 'c1', codigo: 'A12', peca: 'Blusa de seda', valor: 49.9, pago: false, fila: [], temFoto: false, ...extra });
const set = (col, id, dados) => ({ col, id, op: 'set', dados });
const invalido = (trecho) => (e) => e instanceof ErroNegocio && e.codigo === 'dados_invalidos' && e.http === 400 && (trecho ? new RegExp(trecho, 'i').test(e.message) : true);

test('grava cliente, venda e configuração; o estado devolve tudo e depois só o que mudou', async () => {
  const { t, ctx } = await preparar();
  const r = await AppApi.gravar(ctx, { ops: [set('clientes', 'c1', cliente()), set('vendas', 'v1', venda()), set('config', 'geral', { abertura: 'Oi!\nVamos começar', fechamento: 'Obrigada 💛' })] });
  assert.equal(r.ok, true);
  assert.equal(r.seq, 3);

  const estado = JSON.parse(await AppApi.estado(ctx, { desde: '0' }));
  assert.deepEqual(estado.mudancas.map((m) => `${m.c}/${m.i}`), ['clientes/c1', 'vendas/v1', 'config/geral']);
  assert.equal(estado.mudancas[2].d.abertura, 'Oi!\nVamos começar', 'quebras de linha das mensagens ficam');
  assert.equal(estado.ate, 3);

  await AppApi.gravar(ctx, { ops: [{ col: 'vendas', id: 'v1', op: 'mesclar', dados: { pago: true } }] });
  const delta = JSON.parse(await AppApi.estado(ctx, { desde: String(estado.ate) }));
  assert.equal(delta.mudancas.length, 1);
  assert.deepEqual(delta.mudancas[0].d, venda({ pago: true }), 'mesclar mexe só no campo informado');
  assert.deepEqual(t.ler('vendas/v1'), venda({ pago: true }));
});

test('apagar remove e o estado avisa (para os outros aparelhos também apagarem)', async () => {
  const { ctx } = await preparar();
  await AppApi.gravar(ctx, { ops: [set('vendas', 'v1', venda())] });
  const antes = JSON.parse(await AppApi.estado(ctx, { desde: '0' }));
  await AppApi.gravar(ctx, { ops: [{ col: 'vendas', id: 'v1', op: 'apagar' }] });
  const depois = JSON.parse(await AppApi.estado(ctx, { desde: String(antes.ate) }));
  assert.deepEqual(depois.mudancas.map((m) => [m.c, m.i, m.a]), [['vendas', 'v1', 1]]);
  assert.equal(JSON.parse(await AppApi.estado(ctx, { desde: '0', c: 'vendas' })).mudancas.length === 1, true, 'a marca de apagado fica para quem ainda não viu');
});

test('o lote é tudo-ou-nada: uma operação ruim no meio não deixa nenhuma gravada', async () => {
  const { t, ctx } = await preparar();
  await assert.rejects(() => AppApi.gravar(ctx, { ops: [set('clientes', 'c1', cliente()), set('vendas', 'v1', venda({ valor: -5 })), set('clientes', 'c2', cliente())] }), invalido('Valor'));
  assert.equal(t.listar('clientes').length, 0);
  assert.equal(t.listar('vendas').length, 0);
});

test('duas mesclagens no mesmo documento, no mesmo lote, se somam', async () => {
  const { t, ctx } = await preparar();
  await AppApi.gravar(ctx, { ops: [set('vendas', 'v1', venda())] });
  await AppApi.gravar(ctx, {
    ops: [
      { col: 'vendas', id: 'v1', op: 'mesclar', dados: { pago: true } },
      { col: 'vendas', id: 'v1', op: 'mesclar', dados: { codigo: 'Z9' } },
    ],
  });
  assert.equal(t.ler('vendas/v1').pago, true);
  assert.equal(t.ler('vendas/v1').codigo, 'Z9');
});

test('mesclar num documento que não existe só vale se o resultado ficar completo', async () => {
  const { t, ctx } = await preparar();
  await assert.rejects(() => AppApi.gravar(ctx, { ops: [{ col: 'vendas', id: 'fantasma', op: 'mesclar', dados: { pago: true } }] }), invalido('Falta o campo'));
  assert.equal(t.ler('vendas/fantasma'), undefined);
  await AppApi.gravar(ctx, { ops: [{ col: 'clientes', id: 'c9', op: 'mesclar', dados: { nome: 'Nova' } }] });
  assert.deepEqual(t.ler('clientes/c9'), { nome: 'Nova', whatsapp: '', preExistente: false }, 'campos que faltam recebem o valor de partida');
});

test('coleções, operações e campos desconhecidos são recusados', async () => {
  const { ctx } = await preparar();
  const tenta = (op) => AppApi.gravar(ctx, { ops: [op] });
  await assert.rejects(() => tenta(set('fretes', 'f1', { status: 'pago' })), invalido('Coleção'));
  await assert.rejects(() => tenta(set('privado', 'credenciais', {})), invalido('Coleção'));
  await assert.rejects(() => tenta(set('usuarios', 'x', {})), invalido('Coleção'));
  await assert.rejects(() => tenta(set('__proto__', 'x', {})), invalido('Coleção'));
  await assert.rejects(() => tenta(set('constructor', 'x', {})), invalido('Coleção'));
  await assert.rejects(() => tenta({ col: 'clientes', id: 'c1', op: 'destruir', dados: cliente() }), invalido('Tipo de alteração'));
  await assert.rejects(() => tenta(set('clientes', 'c1', { ...cliente(), admin: true })), invalido('Campo desconhecido'));
  await assert.rejects(() => tenta(set('clientes', 'c1', JSON.parse('{"nome":"Ana","__proto__":{"x":1}}'))), invalido('Campo desconhecido'));
  await assert.rejects(() => tenta(set('clientes', 'c1', 'texto')), invalido('Dados'));
  await assert.rejects(() => tenta(set('clientes', 'c1', [1, 2])), invalido('Dados'));
  await assert.rejects(() => tenta(set('clientes', 'c1', null)), invalido('Dados'));
  await assert.rejects(() => tenta(null), invalido('Alteração'));
  await assert.rejects(() => tenta('x'), invalido('Alteração'));
});

test('ids: só letras, números, _ e -; configuração só existe como "geral" e não se apaga', async () => {
  const { ctx } = await preparar();
  for (const id of ['', 'a/b', 'a b', '../x', 'x'.repeat(65), "x'--", 7, null, undefined, {}]) {
    await assert.rejects(() => AppApi.gravar(ctx, { ops: [set('clientes', id, cliente())] }), invalido('id'), String(id));
  }
  await assert.rejects(() => AppApi.gravar(ctx, { ops: [set('config', 'outra', {})] }), invalido('Configuração'));
  await assert.rejects(() => AppApi.gravar(ctx, { ops: [{ col: 'config', id: 'geral', op: 'apagar' }] }), invalido('não pode ser apagada'));
});

test('clientes: nome obrigatório, tamanhos limitados, tipos conferidos, datas reais', async () => {
  const { t, ctx } = await preparar();
  const ruim = (dados, trecho) => assert.rejects(() => AppApi.gravar(ctx, { ops: [set('clientes', 'c1', dados)] }), invalido(trecho));
  await ruim(cliente({ nome: '   ' }), 'nome');
  await ruim(cliente({ nome: undefined }), 'nome');
  await ruim(cliente({ preExistente: 'sim' }), 'verdadeiro ou falso');
  await ruim(cliente({ criadaEm: '25/10/2026' }), 'data');
  await ruim(cliente({ criadaEm: '2026-13-01' }), 'data');
  await ruim(cliente({ criadaEm: '2026-02-30x' }), 'data');

  await AppApi.gravar(ctx, { ops: [set('clientes', 'c1', cliente({ nome: `  ${'N'.repeat(200)}  `, whatsapp: '9'.repeat(100) }))] });
  assert.equal(t.ler('clientes/c1').nome.length, 80, 'nome cortado em 80');
  assert.equal(t.ler('clientes/c1').whatsapp.length, 30);

  await AppApi.gravar(ctx, { ops: [set('clientes', 'c2', cliente({ nome: 'Maria\u0000\n<script>alert(1)</script>' }))] });
  assert.equal(t.ler('clientes/c2').nome, 'Maria <script>alert(1)</script>', 'sem caracteres de controle; o texto é guardado como texto (a tela nunca o trata como HTML)');
});

test('vendas: valor, datas, fila e clienteId conferidos', async () => {
  const { t, ctx } = await preparar();
  const ruim = (dados, trecho) => assert.rejects(() => AppApi.gravar(ctx, { ops: [set('vendas', 'v1', dados)] }), invalido(trecho));
  await ruim(venda({ valor: '10' }), 'Valor');
  await ruim(venda({ valor: Number.NaN }), 'Valor');
  await ruim(venda({ valor: Infinity }), 'Valor');
  await ruim(venda({ valor: 10_000_001 }), 'Valor');
  await ruim(venda({ peca: '' }), 'peça');
  await ruim(venda({ pago: 1 }), 'verdadeiro ou falso');
  await ruim(venda({ data: '2026-1-1' }), 'data');
  await ruim(venda({ criadaEm: -1 }), 'criadaEm');
  await ruim(venda({ criadaEm: 'ontem' }), 'criadaEm');
  await ruim(venda({ clienteId: 'a/b' }), 'clienteId');
  await ruim(venda({ fila: 'Ana' }), 'Fila');
  await ruim(venda({ fila: Array.from({ length: 31 }, () => ({ nome: 'x', clienteId: 'c1' })) }), 'Fila');
  await ruim(venda({ fila: [{ nome: 'x', clienteId: '../x' }] }), 'clienteId');
  await ruim(venda({ fila: [null] }), 'Fila');
  await ruim(venda({ temFoto: 'sim' }), 'verdadeiro ou falso');
  await ruim({ ...venda(), peca: undefined }, 'peça');
  const semData = venda();
  delete semData.data;
  await ruim(semData, 'Falta o campo data');

  await AppApi.gravar(ctx, { ops: [set('vendas', 'v1', venda({ valor: 12.3456, fila: [{ nome: 'Bia', clienteId: 'c2' }], peca: 'p'.repeat(300) }))] });
  const v = t.ler('vendas/v1');
  assert.equal(v.valor, 12.35, 'arredonda para centavos');
  assert.equal(v.peca.length, 160);
  assert.deepEqual(v.fila, [{ nome: 'Bia', clienteId: 'c2' }]);
  assert.deepEqual(Object.keys(v).sort(), ['clienteId', 'codigo', 'criadaEm', 'data', 'fila', 'pago', 'peca', 'temFoto', 'valor'], 'só campos conhecidos são guardados');
});

test('backup antigo: id e primeiraCompra são ignorados em vez de recusados', async () => {
  const { t, ctx } = await preparar();
  await AppApi.gravar(ctx, { ops: [set('clientes', 'c1', { ...cliente(), id: 'c1', primeiraCompra: '2026-01-01' })] });
  assert.deepEqual(Object.keys(t.ler('clientes/c1')).sort(), ['criadaEm', 'nome', 'preExistente', 'whatsapp']);
});

test('fotos: só imagem jpeg/png/webp em base64, até o tamanho máximo; svg e outros tipos não entram', async () => {
  const { t, ctx } = await preparar();
  await AppApi.gravar(ctx, { ops: [set('fotos', 'v1', { imagem: FOTO })] });
  assert.equal(t.ler('fotos/v1').imagem, FOTO);

  const ruim = (imagem) => assert.rejects(() => AppApi.gravar(ctx, { ops: [set('fotos', 'v2', { imagem })] }), invalido('Foto'));
  await ruim('data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+');
  await ruim('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==');
  await ruim('javascript:alert(1)');
  await ruim('https://exemplo.com/foto.jpg');
  await ruim('data:image/jpeg;base64,');
  await ruim('data:image/jpeg;base64,abc"onerror="alert(1)');
  await ruim(`data:image/png;base64,${'A'.repeat(600_000)}`);
  await ruim(123);
  await ruim(undefined);
  assert.equal(t.ler('fotos/v2'), undefined);
  await assert.rejects(() => AppApi.gravar(ctx, { ops: [set('fotos', 'v3', {})] }), invalido('Falta o campo imagem'));
});

test('estado: só clientes, vendas e configuração; fretes, fotos e dados privados não passam por aqui', async () => {
  const { t, ctx } = await preparar();
  t.gravar('fretes/f1', { token: 'x'.repeat(32), status: 'pago', clienteNome: 'Ana' });
  t.gravar('privado/credenciais', { melhorEnvio: { token: 'SEGREDO-123456789' } });
  t.gravar('ajustes/frete', { origemCep: '89201001' });
  await AppApi.gravar(ctx, { ops: [set('clientes', 'c1', cliente()), set('fotos', 'v1', { imagem: FOTO })] });

  const tudo = await AppApi.estado(ctx, {});
  assert.ok(!/SEGREDO-123456789|"token"|origemCep|data:image/.test(tudo), 'nada de fretes, ajustes, credenciais ou fotos');
  assert.deepEqual(JSON.parse(tudo).mudancas.map((m) => m.c), ['clientes']);

  for (const c of ['fretes', 'fotos', 'privado', 'ajustes', 'fretes_privado', 'usuarios', 'documentos', 'clientes,fretes', "clientes') --"]) {
    await assert.rejects(() => AppApi.estado(ctx, { c }), invalido('Coleção'), c);
  }
  assert.equal(JSON.parse(await AppApi.estado(ctx, { c: 'vendas' })).mudancas.length, 0);
  assert.equal(JSON.parse(await AppApi.estado(ctx, { c: 'clientes,clientes' })).mudancas.length, 1);
});

test('estado: o número "desde" ruim vira zero (nunca quebra a consulta)', async () => {
  const { ctx } = await preparar();
  await AppApi.gravar(ctx, { ops: [set('clientes', 'c1', cliente())] });
  for (const desde of ['abc', '-5', '', undefined, "1; DROP TABLE documentos", '1e999', '0x10']) {
    const r = JSON.parse(await AppApi.estado(ctx, { desde }));
    assert.equal(r.mudancas.length, 1, String(desde));
  }
});

test('foto: devolve a imagem; id ruim, inexistente ou apagada dá 404', async () => {
  const { ctx } = await preparar();
  await AppApi.gravar(ctx, { ops: [set('fotos', 'v1', { imagem: FOTO })] });
  assert.deepEqual(JSON.parse(await AppApi.foto(ctx, 'v1')), { imagem: FOTO });
  for (const id of ['nao-existe', '../x', 'a/b', 'x'.repeat(65), '']) {
    await assert.rejects(() => AppApi.foto(ctx, id), (e) => e instanceof ErroNegocio && e.http === 404, id);
  }
  await AppApi.gravar(ctx, { ops: [{ col: 'fotos', id: 'v1', op: 'apagar' }] });
  await assert.rejects(() => AppApi.foto(ctx, 'v1'), (e) => e.http === 404);
});

test('limites do lote: vazio, sem lista, ou com mais de 100 alterações', async () => {
  const { ctx } = await preparar();
  await assert.rejects(() => AppApi.gravar(ctx, { ops: [] }), invalido('Nenhuma'));
  await assert.rejects(() => AppApi.gravar(ctx, {}), invalido('Nenhuma'));
  await assert.rejects(() => AppApi.gravar(ctx, { ops: 'x' }), invalido('Nenhuma'));
  await assert.rejects(() => AppApi.gravar(ctx, null), invalido('Nenhuma'));
  const cem = Array.from({ length: 100 }, (_, i) => set('clientes', `c${i}`, cliente()));
  assert.equal((await AppApi.gravar(ctx, { ops: cem })).ok, true);
  await assert.rejects(() => AppApi.gravar(ctx, { ops: [...cem, set('clientes', 'extra', cliente())] }), invalido('No máximo 100'));
});
