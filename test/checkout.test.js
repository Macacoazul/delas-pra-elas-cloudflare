/**
 * Pagamento na página do Mercado Pago: peças da live + frete numa cobrança só (Pix, crédito, débito).
 * Contra os simuladores — o cartão de verdade só pode ser conferido na conta real do Mercado Pago.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import * as Fretes from '../src/fretes.js';
import * as MP from '../src/mercado-pago.js';
import { ErroNegocio, normalizarConfig } from '../src/dados.js';
import { criarAmbiente, dadosCliente } from './helpers/ambiente.js';

const ADMIN = { email: 'equipe@exemplo.com' };
const CEP_SP = '01310100';

async function comAmbiente(fn, opcoes) {
  const env = await criarAmbiente(opcoes);
  try {
    await fn(env);
  } finally {
    await env.parar();
  }
}

async function rejeita(promessa, codigo) {
  try {
    await promessa;
  } catch (e) {
    assert.ok(e instanceof ErroNegocio, `esperava ErroNegocio, veio: ${e && e.stack}`);
    assert.equal(e.codigo, codigo, e.message);
    return e;
  }
  assert.fail('deveria ter falhado');
  return null;
}

function semearVendas(env) {
  env.db.gravar('vendas/v1', { data: '2026-10-10', clienteId: 'c1', peca: 'Vestido azul', valor: 59.9, pago: false, criadaEm: 1 });
  env.db.gravar('vendas/v2', { data: '2026-10-10', clienteId: 'c1', peca: 'Blusa listrada', valor: 39.9, pago: false, criadaEm: 2 });
  env.db.gravar('vendas/v3', { data: '2026-10-10', clienteId: 'c1', peca: 'Saia', valor: 30, pago: true, criadaEm: 3 });
  env.db.gravar('vendas/v4', { data: '2026-10-10', clienteId: 'c2', peca: 'Calça da outra', valor: 80, pago: false, criadaEm: 4 });
}

async function novoComPecas(env, vendaIds = ['v1', 'v2'], extra = {}) {
  return Fretes.criarFrete(env.ctx, ADMIN, { clienteId: 'c1', clienteNome: 'Maria da Silva', whatsapp: '47999998888', caixaId: 'p', pesoKg: '0,8', vendaIds, ...extra });
}

async function ateCheckout(env, vendaIds = ['v1', 'v2'], opcaoIndex = 0) {
  const f = await novoComPecas(env, vendaIds);
  const cot = await Fretes.cotar(env.ctx, f.token, CEP_SP);
  const op = cot.opcoes[opcaoIndex];
  const vis = await Fretes.pagar(env.ctx, f.token, { opcaoId: op.id, ...dadosCliente() });
  return { ...f, op, vis };
}

const webhook = (env, idPag) => Fretes.tratarWebhookMp(env.ctx, { headers: env.mocks.assinar(idPag), query: { 'data.id': idPag }, body: { type: 'payment', data: { id: idPag } } });

test('link com peças: o servidor lê as vendas e guarda o total (nada vem da tela)', () => comAmbiente(async (env) => {
  semearVendas(env);
  const f = await novoComPecas(env);
  const doc = env.db.ler(`fretes/${f.id}`);
  assert.equal(doc.forma, 'checkout');
  assert.equal(doc.pecasCentavos, 9980);
  assert.deepEqual(doc.pecas.map((p) => [p.id, p.nome, p.centavos]), [['v1', 'Vestido azul', 5990], ['v2', 'Blusa listrada', 3990]]);
  const vis = await Fretes.infoPublica(env.ctx, f.token);
  assert.equal(vis.pecasCentavos, 9980);
  assert.deepEqual(vis.pecas.map((p) => p.nome), ['Vestido azul', 'Blusa listrada']);
  assert.ok(!JSON.stringify(vis).includes('"id":"v1"'), 'ids internos das vendas não vão para a cliente');
}));

test('link com peças: recusa peça paga, de outra cliente, inexistente, sem cliente cadastrada ou lista grande demais', () => comAmbiente(async (env) => {
  semearVendas(env);
  await rejeita(novoComPecas(env, ['v3']), 'peca_invalida');
  await rejeita(novoComPecas(env, ['v4']), 'peca_invalida');
  await rejeita(novoComPecas(env, ['v1', 'nao-existe']), 'peca_invalida');
  await rejeita(novoComPecas(env, ['v1'], { clienteId: '' }), 'sem_cliente');
  await rejeita(novoComPecas(env, ['../v1']), 'pecas_invalidas');
  await rejeita(novoComPecas(env, Array.from({ length: 31 }, (_, i) => `x${i}`)), 'pecas_invalidas');
  await rejeita(novoComPecas(env, 'v1'), 'pecas_invalidas');
}));

test('pagar no checkout: uma cobrança com as peças e o frete, só Pix/crédito/débito, parcelas conforme o total', () => comAmbiente(async (env) => {
  semearVendas(env);
  const f = await ateCheckout(env);
  const pref = env.mocks.ultimaPreferencia();
  assert.equal(pref.external_reference, `DPE-${f.id}`);
  assert.deepEqual(pref.items.map((i) => i.id), ['pecas', 'frete']);
  assert.equal(Math.round(pref.items[0].unit_price * 100), 9980);
  assert.equal(Math.round(pref.items[1].unit_price * 100), f.op.precoCentavos);
  assert.deepEqual(pref.payment_methods.excluded_payment_types.map((x) => x.id).sort(), ['atm', 'ticket']);
  assert.equal(pref.payment_methods.installments, 3, 'acima de R$ 120: até 3x');
  assert.equal(pref.notification_url, 'https://loja-teste.workers.dev/api/mp/webhook');
  assert.equal(pref.back_urls.success, `https://loja-teste.workers.dev/f/${f.token}`);
  assert.equal(pref.auto_return, 'approved');
  assert.ok(!JSON.stringify(pref).includes(String(11144477735)), 'CPF não vai para a preferência');

  const doc = env.db.ler(`fretes/${f.id}`);
  assert.equal(doc.status, 'aguardando_pagamento');
  assert.equal(doc.pagamento.tipo, 'checkout');
  assert.equal(doc.pagamento.valorCentavos, 9980 + f.op.precoCentavos);
  assert.equal(doc.servico.precoCentavos, f.op.precoCentavos, 'a etiqueta continua comprada só com o preço do frete');

  assert.ok(f.vis.checkout.url.startsWith('https://www.mercadopago.com.br/'));
  assert.deepEqual(Object.keys(f.vis.checkout).sort(), ['expiraEm', 'parcelasMax', 'url', 'valorCentavos'], 'a cliente só recebe o necessário');
  assert.equal(f.vis.checkout.valorCentavos, 9980 + f.op.precoCentavos);
  assert.equal(f.vis.checkout.parcelasMax, 3);
  assert.equal(f.vis.pix, null);
  assert.ok(!JSON.stringify(f.vis).includes('DPE-'), 'nada interno na visão da cliente');
}));

test('pagar no checkout: total abaixo de R$ 120 não parcela; sem peças o link segue o ajuste de forma de pagamento', () => comAmbiente(async (env) => {
  semearVendas(env);
  const f = await ateCheckout(env, ['v2']); // R$ 39,90 + frete
  const pref = env.mocks.ultimaPreferencia();
  assert.ok(f.op.precoCentavos + 3990 < 12000);
  assert.equal(pref.payment_methods.installments, 1);

  const so = await novoComPecas(env, []);
  assert.equal(env.db.ler(`fretes/${so.id}`).forma, 'pix', 'sem peças segue o ajuste (aqui: pix)');
}));

test('pagar no checkout com ajuste "checkout": só o frete é cobrado e o limite de parcelas vem dos ajustes', () => comAmbiente(async (env) => {
  const f = await novoComPecas(env, []);
  const cot = await Fretes.cotar(env.ctx, f.token, CEP_SP);
  assert.equal(env.db.ler(`fretes/${f.id}`).forma, 'checkout');
  const vis = await Fretes.pagar(env.ctx, f.token, { opcaoId: cot.opcoes[0].id, ...dadosCliente() });
  const pref = env.mocks.ultimaPreferencia();
  assert.deepEqual(pref.items.map((i) => i.id), ['frete']);
  assert.equal(pref.payment_methods.installments, 6);
  assert.equal(vis.checkout.parcelasMax, 6);
}, { config: { formaPagamento: 'checkout', parcelasMax: 6, parcelasAPartirDe: 10 } }));

test('pagar no checkout: repetir a escolha devolve o mesmo pagamento; trocar de frete cria outro', () => comAmbiente(async (env) => {
  semearVendas(env);
  const f = await ateCheckout(env);
  const url1 = f.vis.checkout.url;
  const de_novo = await Fretes.pagar(env.ctx, f.token, { opcaoId: f.op.id, ...dadosCliente() });
  assert.equal(de_novo.checkout.url, url1);
  assert.equal(env.mocks.preferencias.size, 1);
  const outra = f.cot ? f.cot.opcoes[1] : (await Fretes.cotar(env.ctx, f.token, CEP_SP)).opcoes[1];
  const v2 = await Fretes.pagar(env.ctx, f.token, { opcaoId: outra.id, ...dadosCliente() });
  assert.notEqual(v2.checkout.url, url1);
  assert.equal(v2.checkout.valorCentavos, 9980 + outra.precoCentavos);
}));

test('pagar no checkout: Mercado Pago fora do ar não deixa o link preso', () => comAmbiente(async (env) => {
  semearVendas(env);
  const f = await novoComPecas(env);
  const cot = await Fretes.cotar(env.ctx, f.token, CEP_SP);
  env.mocks.falhas.preferencia = 1;
  await rejeita(Fretes.pagar(env.ctx, f.token, { opcaoId: cot.opcoes[0].id, ...dadosCliente() }), 'pagamento_indisponivel');
  assert.equal(env.db.ler(`fretes/${f.id}`).pagando, null);
  assert.match(env.db.ler(`fretes/${f.id}`).alerta.texto, /Mercado Pago/);
  const ok = await Fretes.pagar(env.ctx, f.token, { opcaoId: cot.opcoes[0].id, ...dadosCliente() });
  assert.ok(ok.checkout.url);
}));

test('pagamento no checkout aprovado (webhook): frete pago, peças marcadas como pagas, uma vez só', () => comAmbiente(async (env) => {
  semearVendas(env);
  const f = await ateCheckout(env);
  const pag = env.mocks.pagarNaPagina(env.mocks.ultimaPreferencia(), { parcelas: 3 });
  const r = await webhook(env, String(pag.id));
  assert.equal(r.http, 200);
  const doc = env.db.ler(`fretes/${f.id}`);
  assert.equal(doc.status, 'pago');
  assert.equal(doc.pagamento.id, String(pag.id));
  assert.equal(doc.pagamento.valorCentavos, 9980 + f.op.precoCentavos);
  assert.equal(env.db.ler('vendas/v1').pago, true);
  assert.equal(env.db.ler('vendas/v2').pago, true);
  assert.equal(env.db.ler('vendas/v4').pago, false, 'peça de outra cliente não é tocada');
  await webhook(env, String(pag.id)); // reenvio
  assert.equal(env.db.ler(`fretes/${f.id}`).status, 'pago');
  assert.equal(env.db.ler(`fretes/${f.id}`).alerta, null);
}));

test('pagamento no checkout: a página da cliente percebe o pagamento mesmo sem webhook (busca pela referência)', () => comAmbiente(async (env) => {
  semearVendas(env);
  const f = await ateCheckout(env);
  env.mocks.pagarNaPagina(env.mocks.ultimaPreferencia(), { metodo: 'debvisa', tipo: 'debit_card' });
  const v = await Fretes.consultarStatus(env.ctx, f.token);
  assert.equal(v.status, 'pago');
  assert.equal(v.checkout, null);
  assert.equal(env.db.ler('vendas/v1').pago, true);
}));

test('pagamento no checkout: cartão recusado não encerra o link; depois outra tentativa aprovada paga', () => comAmbiente(async (env) => {
  semearVendas(env);
  const f = await ateCheckout(env);
  const ruim = env.mocks.pagarNaPagina(env.mocks.ultimaPreferencia(), { status: 'rejected' });
  await webhook(env, String(ruim.id));
  let doc = env.db.ler(`fretes/${f.id}`);
  assert.equal(doc.status, 'aguardando_pagamento');
  assert.equal(doc.pagamento.status, 'pending');
  assert.equal(env.db.ler('vendas/v1').pago, false);
  const bom = env.mocks.pagarNaPagina(env.mocks.ultimaPreferencia());
  await webhook(env, String(bom.id));
  doc = env.db.ler(`fretes/${f.id}`);
  assert.equal(doc.status, 'pago');
  assert.equal(doc.pagamento.id, String(bom.id));
}));

test('pagamento no checkout: valor diferente do total vira aviso, não pagamento (e não marca peças)', () => comAmbiente(async (env) => {
  semearVendas(env);
  const f = await ateCheckout(env);
  const pag = env.mocks.pagarNaPagina(env.mocks.ultimaPreferencia(), { valorCentavos: 1000 });
  await webhook(env, String(pag.id));
  const doc = env.db.ler(`fretes/${f.id}`);
  assert.equal(doc.status, 'aguardando_pagamento');
  assert.match(doc.alerta.texto, /não confere com o total do link/);
  assert.equal(env.db.ler('vendas/v1').pago, false);
}));

test('pagamento no checkout: segundo pagamento aprovado gera aviso de duplicidade; estorno é registrado', () => comAmbiente(async (env) => {
  semearVendas(env);
  const f = await ateCheckout(env);
  const a = env.mocks.pagarNaPagina(env.mocks.ultimaPreferencia());
  await webhook(env, String(a.id));
  const b = env.mocks.pagarNaPagina(env.mocks.ultimaPreferencia());
  await webhook(env, String(b.id));
  let doc = env.db.ler(`fretes/${f.id}`);
  assert.equal(doc.pagamento.id, String(a.id));
  assert.match(doc.alerta.texto, /duplicidade/);
  env.mocks.estornar(a.id);
  await webhook(env, String(a.id));
  doc = env.db.ler(`fretes/${f.id}`);
  assert.equal(doc.pagamento.status, 'refunded');
}));

test('pagamento no checkout: pagamento de Pix direto não vale em frete de checkout e vice-versa', () => comAmbiente(async (env) => {
  semearVendas(env);
  const f = await ateCheckout(env);
  // pagamento "fantasma" com a referência do frete mas valor errado e sem preferência: só alerta
  const fantasma = { id: 99999991, status: 'approved', transaction_amount: 1, external_reference: `DPE-${f.id}` };
  env.mocks.pagamentos.set('99999991', fantasma);
  await webhook(env, '99999991');
  assert.equal(env.db.ler(`fretes/${f.id}`).status, 'aguardando_pagamento');
}));

test('cancelar link de checkout: antes de pagar cancela; pagamento que chegar depois vira aviso', () => comAmbiente(async (env) => {
  semearVendas(env);
  const f = await ateCheckout(env);
  await Fretes.cancelarFrete(env.ctx, f.id);
  assert.equal(env.db.ler(`fretes/${f.id}`).status, 'cancelado');
  const pag = env.mocks.pagarNaPagina(env.mocks.ultimaPreferencia());
  await webhook(env, String(pag.id));
  const doc = env.db.ler(`fretes/${f.id}`);
  assert.equal(doc.status, 'cancelado');
  assert.match(doc.alerta.texto, /cancelado/);
  assert.equal(env.db.ler('vendas/v1').pago, false);
}));

test('pagamento no checkout: a etiqueta usa só o preço do frete', () => comAmbiente(async (env) => {
  semearVendas(env);
  const f = await ateCheckout(env);
  env.mocks.pagarNaPagina(env.mocks.ultimaPreferencia());
  await Fretes.sincronizarPagamento(env.ctx, f.id, {});
  const r = await Fretes.gerarEtiqueta(env.ctx, f.id, {});
  assert.ok(r, 'etiqueta gerada');
  assert.equal(env.db.ler(`fretes/${f.id}`).status, 'etiqueta');
}));

test('rotina: confere link de checkout pendente sozinha', () => comAmbiente(async (env) => {
  semearVendas(env);
  const f = await ateCheckout(env);
  env.mocks.pagarNaPagina(env.mocks.ultimaPreferencia());
  const resumo = await Fretes.rotina(env.ctx);
  assert.equal(resumo.pagamentos, 1);
  assert.equal(env.db.ler(`fretes/${f.id}`).status, 'pago');
}));

test('configuração: parcelas e forma de pagamento viram valores seguros', () => {
  const c = normalizarConfig({ parcelasMax: 99, parcelasAPartirDe: -5, formaPagamento: 'boleto' });
  assert.equal(c.parcelasMax, 3);
  assert.equal(c.parcelasAPartirDe, 120);
  assert.equal(c.formaPagamento, 'checkout');
  const d = normalizarConfig({ parcelasMax: '6', parcelasAPartirDe: '100,5', formaPagamento: 'pix' });
  assert.equal(d.parcelasMax, 6);
  assert.equal(d.parcelasAPartirDe, 100.5);
  assert.equal(d.formaPagamento, 'pix');
});

test('pagamento de um link que ainda não tem cobrança aberta não é aceito', () => comAmbiente(async (env) => {
  semearVendas(env);
  const f = await novoComPecas(env);
  await Fretes.cotar(env.ctx, f.token, CEP_SP); // a cliente nem chegou a pagar
  env.mocks.pagamentos.set('99999992', { id: 99999992, status: 'approved', transaction_amount: 99.8, external_reference: `DPE-${f.id}` });
  const r = await webhook(env, '99999992');
  assert.equal(r.http, 200);
  assert.equal(env.db.ler(`fretes/${f.id}`).status, 'criado');
  assert.ok(!env.db.ler(`fretes/${f.id}`).alerta, 'ignorado, sem mexer no link');
  assert.equal(env.db.ler('vendas/v1').pago, false);
}));

test('endereço da página de pagamento: só https e só do Mercado Pago', () => {
  assert.equal(MP.enderecoDoCheckout('https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=1'), 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=1');
  for (const ruim of ['http://www.mercadopago.com.br/x', 'https://mercadopago.com.br.golpe.com/x', 'https://golpe.com/mercadopago.com', 'javascript:alert(1)', '', null, 'https://evilmercadopago.com/x']) {
    assert.equal(MP.enderecoDoCheckout(ruim), '', String(ruim));
  }
});
