import test from 'node:test';
import assert from 'node:assert/strict';

import * as Cred from '../src/credenciais.js';
import * as Api from '../src/rotas-publicas.js';
import * as Fretes from '../src/fretes.js';
import { ErroNegocio } from '../src/dados.js';
import { criarAmbiente, dadosCliente, CPF_CLIENTE } from './helpers/ambiente.js';

async function comAmbiente(fn, opcoes) {
  const env = await criarAmbiente(opcoes);
  try {
    await fn(env);
  } finally {
    await env.parar();
  }
}

function jwt(payload) {
  return `${Buffer.from('{"alg":"RS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.assinatura-de-teste`;
}

/* -------------------------------------------------------------- credenciais */

test('credenciais: salvar aceita token colado com "Bearer", nunca devolve o valor e mostra o que falta', () => comAmbiente(async (env) => {
  env.db.gravar('privado/credenciais', {});
  const token = jwt({ exp: Math.floor(env.relogio.t / 1000) + 20 * 86400, scopes: ['shipping-calculate', 'cart-read', 'cart-write', 'notifications-read'] });
  const s = await Cred.salvar(env.ctx, { melhorEnvio: { token: `Bearer ${token}`, ambiente: 'producao', emailContato: 'contato@exemplo.com' } });

  assert.equal(s.melhorEnvio.configurado, true);
  assert.equal(s.melhorEnvio.ambiente, 'producao');
  assert.equal(s.melhorEnvio.final, '…este');
  assert.deepEqual(s.melhorEnvio.escoposFaltando, ['shipping-checkout', 'shipping-generate', 'shipping-print', 'shipping-tracking', 'orders-read']);
  assert.ok(s.melhorEnvio.expiraEm > env.relogio.t);
  assert.equal(JSON.stringify(s).includes(token), false, 'a resposta nunca contém o token');
  assert.equal(env.db.ler('privado/credenciais').melhorEnvio.token, token, 'o token foi guardado limpo, sem "Bearer"');
}));

test('credenciais: campos em branco mantêm o que já existe; remover apaga', () => comAmbiente(async (env) => {
  const antes = env.db.ler('privado/credenciais');
  const s = await Cred.salvar(env.ctx, { melhorEnvio: { token: '', ambiente: 'sandbox' }, mercadoPago: { accessToken: '   ' } });
  assert.equal(env.db.ler('privado/credenciais').melhorEnvio.token, antes.melhorEnvio.token);
  assert.equal(env.db.ler('privado/credenciais').mercadoPago.accessToken, antes.mercadoPago.accessToken);
  assert.equal(s.mercadoPago.configurado, true);
  assert.equal(s.mercadoPago.producao, true);
  assert.equal(s.mercadoPago.webhookConfigurado, true);
  assert.equal(s.remetenteDocumentoConfigurado, true);

  const r = await Cred.salvar(env.ctx, { remover: ['mercadoPagoWebhook', 'melhorEnvioToken'] });
  assert.equal(r.mercadoPago.webhookConfigurado, false);
  assert.equal(r.melhorEnvio.configurado, false);
  assert.equal(r.mercadoPago.configurado, true);
}));

test('credenciais: recusa valores inválidos com mensagem clara', async () => {
  await comAmbiente(async (env) => {
    const erro = async (entrada, codigo) => {
      await assert.rejects(Cred.salvar(env.ctx, entrada), (e) => e instanceof ErroNegocio && e.codigo === codigo, JSON.stringify(entrada).slice(0, 60));
    };
    await erro({ melhorEnvio: { token: 'abc def' } }, 'token_invalido');
    await erro({ melhorEnvio: { token: 'curto' } }, 'token_invalido');
    await erro({ melhorEnvio: { token: 'x'.repeat(5000) } }, 'token_invalido');
    await erro({ melhorEnvio: { ambiente: 'teste' } }, 'ambiente_invalido');
    await erro({ melhorEnvio: { emailContato: 'sem-arroba' } }, 'email_invalido');
    await erro({ mercadoPago: { accessToken: 'qualquer-coisa-aqui-123456' } }, 'token_invalido');
    await erro({ mercadoPago: { webhookSecret: 'curto' } }, 'segredo_invalido');
    await erro({ remetenteDocumento: '123' }, 'documento_invalido');
  });
});

test('credenciais: token do Melhor Envio com mais de 512 caracteres é aceito (até 4096)', () => comAmbiente(async (env) => {
  const longo = jwt({ exp: 1900000000, scopes: ['shipping-calculate'], dados: 'x'.repeat(1500) });
  assert.ok(longo.length > 1500);
  await Cred.salvar(env.ctx, { melhorEnvio: { token: longo } });
  assert.equal(env.db.ler('privado/credenciais').melhorEnvio.token, longo);
}));

test('credenciais: testar conexões — certo e errado', () => comAmbiente(async (env) => {
  const ok = await Cred.testar(env.ctx);
  assert.equal(ok.melhorEnvio.ok, true);
  assert.match(ok.melhorEnvio.mensagem, /Cotação e carrinho funcionando/);
  assert.equal(ok.mercadoPago.ok, true);

  await Cred.salvar(env.ctx, { melhorEnvio: { token: 'token-que-nao-existe-aaaaaaaaaaaaaaaa' } });
  env.db.gravar('privado/credenciais', { ...env.db.ler('privado/credenciais'), mercadoPago: { accessToken: 'APP_USR-NAO-ATIVADO', webhookSecret: 'x'.repeat(20) } });
  const ruim = await Cred.testar(env.ctx);
  assert.equal(ruim.melhorEnvio.ok, false);
  assert.match(ruim.melhorEnvio.mensagem, /recusou o token/);
  assert.equal(ruim.mercadoPago.ok, false);
  assert.match(ruim.mercadoPago.mensagem, /credenciais de produção/);
}));

test('credenciais: sem nada configurado o teste explica o que falta', () => comAmbiente(async (env) => {
  const r = await Cred.testar(env.ctx);
  assert.match(r.melhorEnvio.mensagem, /token/i);
  assert.match(r.mercadoPago.mensagem, /Access Token/);
}, { semCredenciais: true }));

/* ---------------------------------------------------------------------- API */

const req = (method, path, extra = {}) => ({ method, path, query: {}, headers: {}, body: undefined, ...extra });

test('api: saúde, 404 e método errado', () => comAmbiente(async (env) => {
  assert.equal((await Api.tratar(env.ctx, req('GET', '/api/saude'))).http, 404, 'a rota de saúde é do servidor (Worker), não destas rotas');
  assert.equal((await Api.tratar(env.ctx, req('GET', '/api/nada'))).http, 404);
  assert.equal((await Api.tratar(env.ctx, req('DELETE', `/api/frete/${'a'.repeat(32)}`))).http, 405);
  assert.equal((await Api.tratar(env.ctx, req('GET', '/api/mp/webhook'))).http, 405);
  assert.equal((await Api.tratar(env.ctx, req('GET', `/api/frete/${'a'.repeat(32)}/cotar`))).http, 405);
  assert.equal((await Api.tratar(env.ctx, req('GET', '/api/frete/curto'))).http, 404);
}));

test('api: o caminho da cliente de ponta a ponta pelas rotas públicas', () => comAmbiente(async (env) => {
  const f = await Fretes.criarFrete(env.ctx, { email: 'e@x.com' }, { clienteNome: 'Maria da Silva', caixaId: 'p', pesoKg: 0.8 });
  const base = `/api/frete/${f.token}`;

  let r = await Api.tratar(env.ctx, req('GET', base));
  assert.equal(r.http, 200);
  assert.equal(r.corpo.nome, 'Maria');
  assert.equal(r.corpo.status, 'criado');
  assert.deepEqual(r.corpo.pacote, { altura: 6, largura: 20, comprimento: 25, pesoKg: 0.8 });

  r = await Api.tratar(env.ctx, req('POST', `${base}/cotar`, { body: { cep: '01310-100' } }));
  assert.equal(r.http, 200);
  assert.equal(r.corpo.opcoes.length, 4);

  r = await Api.tratar(env.ctx, req('POST', `${base}/cotar`, { body: { cep: '000' } }));
  assert.equal(r.http, 400);
  assert.equal(r.corpo.codigo, 'cep_invalido');

  r = await Api.tratar(env.ctx, req('POST', `${base}/cotar`, { body: 'texto solto' }));
  assert.equal(r.http, 400, 'corpo que não é objeto vira CEP inválido, não erro 500');

  r = await Api.tratar(env.ctx, req('POST', `${base}/pagar`, { body: { opcaoId: 'o1', ...dadosCliente({ cpf: '000' }) } }));
  assert.equal(r.http, 400);
  assert.equal(r.corpo.codigo, 'cpf_invalido');

  r = await Api.tratar(env.ctx, req('POST', `${base}/pagar`, { body: { opcaoId: 'o1', ...dadosCliente() } }));
  assert.equal(r.http, 200);
  assert.match(r.corpo.pix.copiaECola, /^000201/);

  const idPix = env.db.ler(`fretes/${f.id}`).pagamento.id;
  r = await Api.tratar(env.ctx, req('GET', `${base}/status`));
  assert.equal(r.corpo.status, 'aguardando_pagamento');

  env.mocks.aprovar(idPix);
  const wh = await Api.tratar(env.ctx, req('POST', '/api/mp/webhook', { query: { 'data.id': idPix, type: 'payment' }, headers: env.mocks.assinar(idPix), body: { type: 'payment', data: { id: idPix } } }));
  assert.equal(wh.http, 200);

  r = await Api.tratar(env.ctx, req('GET', base));
  assert.equal(r.corpo.status, 'pago');
  assert.equal(r.corpo.pagamento.status, 'approved');

  const tudo = JSON.stringify(r.corpo);
  for (const proibido of [CPF_CLIENTE, 'maria@exemplo.com', f.token, env.mocks.meToken, env.mocks.mpToken, 'Paulista']) {
    assert.ok(!tudo.includes(proibido), `a resposta pública vazou: ${proibido}`);
  }
}));

test('api: erro inesperado devolve mensagem genérica e não vaza detalhes nem o token do link', () => comAmbiente(async (env) => {
  const f = await Fretes.criarFrete(env.ctx, { email: 'e@x.com' }, { clienteNome: 'Ana Lima', caixaId: 'p', pesoKg: 1 });
  env.ctx.db = { ...env.db, collection: () => { throw new Error(`falha interna com segredo ${env.mocks.mpToken}`); } };
  const r = await Api.tratar(env.ctx, req('GET', `/api/frete/${f.token}`));
  assert.equal(r.http, 500);
  assert.ok(!JSON.stringify(r.corpo).includes('segredo'));
  const log = JSON.stringify(env.logs);
  assert.ok(!log.includes(f.token), 'o token do link não vai para o log');
  assert.ok(!log.includes(env.mocks.mpToken), 'o token do Mercado Pago não vai para o log');
  assert.ok(log.includes('/api/frete/[token]'));
}));
