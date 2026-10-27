/**
 * Fluxo completo contra o banco de testes e os simuladores dos serviços:
 * criar link -> CEP/cotação -> Pix do frete -> pagamento -> etiqueta -> rastreio.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import * as Fretes from '../src/fretes.js';
import { ErroNegocio } from '../src/dados.js';
import { criarAmbiente, dadosCliente, CPF_CLIENTE, CPF_LOJA } from './helpers/ambiente.js';

const ADMIN = { email: 'equipe@exemplo.com' };
const CEP_SP = '01310100';

async function rejeita(promessa, codigo, trecho) {
  try {
    await promessa;
  } catch (e) {
    assert.ok(e instanceof ErroNegocio, `esperava ErroNegocio, veio: ${e && e.stack}`);
    if (codigo) assert.equal(e.codigo, codigo, `código: ${e.message}`);
    if (trecho) assert.match(e.message, trecho);
    return e;
  }
  assert.fail('deveria ter falhado');
  return null;
}

async function novoFrete(env, extra = {}) {
  return Fretes.criarFrete(env.ctx, ADMIN, { clienteId: 'c1', clienteNome: 'Maria da Silva', whatsapp: '47999998888', caixaId: 'p', pesoKg: '0,8', ...extra });
}

async function ateCotado(env, extra = {}, cep = CEP_SP) {
  const f = await novoFrete(env, extra);
  const cot = await Fretes.cotar(env.ctx, f.token, cep);
  return { ...f, cot };
}

async function ateAguardandoPagamento(env, opcaoIndex = 0, cep = CEP_SP, extraDest = {}) {
  const f = await ateCotado(env, {}, cep);
  const op = f.cot.opcoes[opcaoIndex];
  const vis = await Fretes.pagar(env.ctx, f.token, { opcaoId: op.id, ...dadosCliente(extraDest) });
  return { ...f, op, vis };
}

async function atePago(env) {
  const f = await ateAguardandoPagamento(env);
  env.mocks.aprovar(env.db.ler(`fretes/${f.id}`).pagamento.id);
  await Fretes.sincronizarPagamento(env.ctx, f.id, {});
  return f;
}

async function comAmbiente(fn, opcoes) {
  const env = await criarAmbiente(opcoes);
  try {
    await fn(env);
  } finally {
    await env.parar();
  }
}

/* ------------------------------------------------------------------ criar */

test('criar: valida os dados e grava o link', () => comAmbiente(async (env) => {
  await rejeita(Fretes.criarFrete(env.ctx, ADMIN, { clienteNome: 'Ana', caixaId: 'zzz', pesoKg: 1 }), 'caixa_invalida');
  await rejeita(Fretes.criarFrete(env.ctx, ADMIN, { clienteNome: 'Ana', caixaId: 'p', pesoKg: 0 }), 'peso_invalido');
  await rejeita(Fretes.criarFrete(env.ctx, ADMIN, { clienteNome: 'Ana', caixaId: 'p', pesoKg: 31 }), 'peso_invalido');
  await rejeita(Fretes.criarFrete(env.ctx, ADMIN, { clienteNome: 'Ana', caixaId: 'p', pesoKg: 'abc' }), 'peso_invalido');
  await rejeita(Fretes.criarFrete(env.ctx, ADMIN, { clienteNome: '', caixaId: 'p', pesoKg: 1 }), 'sem_nome');
  await rejeita(Fretes.criarFrete(env.ctx, ADMIN, { clienteNome: 'Ana', caixaId: 'p', pesoKg: 1, valorDeclarado: '0,50' }), 'declarado_invalido');

  const r = await Fretes.criarFrete(env.ctx, ADMIN, { clienteId: 'c9', clienteNome: '  Maria   da Silva ', whatsapp: '(47) 99999-8888', caixaId: 'm', pesoKg: '1,25', valorDeclarado: '120,00', observacao: 'peças da live' });
  assert.match(r.token, /^[A-Za-z0-9_-]{32}$/);
  const f = env.db.ler(`fretes/${r.id}`);
  assert.equal(f.status, 'criado');
  assert.equal(f.clienteNome, 'Maria da Silva');
  assert.equal(f.whatsapp, '47999998888');
  assert.deepEqual(f.caixa, { id: 'm', nome: 'Média', altura: 10, largura: 25, comprimento: 32 });
  assert.equal(f.pesoKg, 1.25);
  assert.equal(f.declaradoCentavos, 12000);
  assert.equal(f.criadoPor, ADMIN.email);
  assert.ok(env.db.ler(`fretes_privado/${r.id}`));

  const padrao = await novoFrete(env);
  assert.equal(env.db.ler(`fretes/${padrao.id}`).declaradoCentavos, 5000, 'usa o valor declarado padrão');
}));

test('criar: sem CEP de origem não deixa criar link', () => comAmbiente(async (env) => {
  await rejeita(novoFrete(env), 'sem_origem');
}, { semConfig: true }));

/* ------------------------------------------------------------------ cotar */

test('cotar: mostra só Correios e Jadlog, do mais barato ao mais caro, e monta a chamada certa', () => comAmbiente(async (env) => {
  const f = await novoFrete(env, { valorDeclarado: '80,00' });
  const r = await Fretes.cotar(env.ctx, f.token, CEP_SP);
  assert.equal(r.cep, '01310100');
  assert.equal(r.endereco.cidade, 'São Paulo');
  assert.deepEqual(r.opcoes.map((o) => `${o.empresa} ${o.nome}`), ['Jadlog .Package', 'Correios PAC', 'Jadlog .Com', 'Correios SEDEX']);
  assert.equal(r.opcoes[0].precoCentavos, 1875 + 240, 'usa custom_price (preço da conta) + peso');
  assert.equal(r.opcoes[0].prazoDias, 6);
  assert.deepEqual(r.opcoes.map((o) => o.id), ['o1', 'o2', 'o3', 'o4']);
  assert.ok(!r.opcoes.some((o) => o.empresa === 'Loggi'));
  assert.ok(!('servicoId' in r.opcoes[0]), 'a cliente não recebe ids internos do Melhor Envio');

  const chamada = env.mocks.chamadas.find((c) => c.caminho === '/me/api/v2/me/shipment/calculate');
  assert.equal(chamada.headers.authorization, `Bearer ${env.mocks.meToken}`);
  assert.match(chamada.headers['user-agent'], /Delas pra Elas \(contato@exemplo\.com\)/);
  assert.deepEqual(chamada.corpo.from, { postal_code: '89201001' });
  assert.deepEqual(chamada.corpo.to, { postal_code: '01310100' });
  assert.deepEqual(chamada.corpo.products, [{ id: '1', width: 20, height: 6, length: 25, weight: 0.8, insurance_value: 80, quantity: 1 }]);

  const salvo = env.db.ler(`fretes/${f.id}`);
  assert.equal(salvo.cep, '01310100');
  assert.equal(salvo.cidade, 'São Paulo');
  assert.equal(salvo.uf, 'SP');
  assert.equal(env.db.ler(`fretes_privado/${f.id}`).cotacao.opcoes[0].servicoId, 3);
}));

test('cotar: com "mostrar outras" as demais transportadoras aparecem', () => comAmbiente(async (env) => {
  const f = await novoFrete(env);
  const r = await Fretes.cotar(env.ctx, f.token, CEP_SP);
  assert.ok(r.opcoes.some((o) => o.empresa === 'Loggi'));
}, { config: { mostrarOutras: true } }));

test('cotar: CEP inexistente, inválido e ViaCEP fora do ar', () => comAmbiente(async (env) => {
  const f = await novoFrete(env);
  await rejeita(Fretes.cotar(env.ctx, f.token, '123'), 'cep_invalido');
  const antes = env.mocks.contar('melhorenvio', 'POST', '/me/api/v2/me/shipment/calculate');
  await rejeita(Fretes.cotar(env.ctx, f.token, '12345678'), 'cep_nao_encontrado');
  assert.equal(env.mocks.contar('melhorenvio', 'POST', '/me/api/v2/me/shipment/calculate'), antes, 'não cota CEP que não existe');

  env.mocks.viacepForaDoAr = true;
  const r = await Fretes.cotar(env.ctx, f.token, '30140071');
  assert.equal(r.endereco, null, 'sem ViaCEP a cliente digita o endereço');
  assert.ok(r.opcoes.length >= 2);
}));

test('cotar: token errado do Melhor Envio — a cliente vê mensagem simples e a loja vê o motivo', () => comAmbiente(async (env) => {
  const f = await novoFrete(env);
  env.db.gravar('privado/credenciais', { ...env.db.ler('privado/credenciais'), melhorEnvio: { token: 'token-errado-xxxxxxxxxxxxxxxxxxxx', ambiente: 'sandbox', emailContato: 'contato@exemplo.com' } });
  const e = await rejeita(Fretes.cotar(env.ctx, f.token, CEP_SP), 'cotacao_indisponivel');
  assert.equal(e.http, 502);
  assert.ok(!/token|permiss/i.test(e.message), `a cliente não deve ver detalhes técnicos: ${e.message}`);
  assert.match(env.db.ler(`fretes/${f.id}`).alerta.texto, /recusou o token/);
}));

test('cotar: sem transportadora para o CEP', () => comAmbiente(async (env) => {
  const f = await novoFrete(env);
  env.mocks.cotacaoVazia = true;
  const e = await rejeita(Fretes.cotar(env.ctx, f.token, CEP_SP), 'sem_atendimento');
  assert.equal(e.http, 422);
}));

test('cotar: limite de 20 tentativas por hora por link', () => comAmbiente(async (env) => {
  const f = await novoFrete(env);
  for (let i = 0; i < 20; i += 1) await Fretes.cotar(env.ctx, f.token, CEP_SP);
  const e = await rejeita(Fretes.cotar(env.ctx, f.token, CEP_SP), 'muitas_tentativas');
  assert.equal(e.http, 429);
  env.avancar(61 * 60 * 1000);
  await Fretes.cotar(env.ctx, f.token, CEP_SP);
}));

test('link inválido, cancelado ou já pago não cota', () => comAmbiente(async (env) => {
  await rejeita(Fretes.infoPublica(env.ctx, 'x'.repeat(32)), 'link_invalido');
  await rejeita(Fretes.infoPublica(env.ctx, '../../etc'), 'link_invalido');
  const f = await novoFrete(env);
  await Fretes.cancelarFrete(env.ctx, f.id);
  await rejeita(Fretes.cotar(env.ctx, f.token, CEP_SP), 'encerrado', /cancelado/);
  const g = await atePago(env);
  await rejeita(Fretes.cotar(env.ctx, g.token, CEP_SP), 'encerrado', /já foi pago/);
}));

/* ------------------------------------------------------------------ pagar */

test('pagar: exige cotação e valida cada campo', () => comAmbiente(async (env) => {
  const f = await novoFrete(env);
  await rejeita(Fretes.pagar(env.ctx, f.token, { opcaoId: 'o1', ...dadosCliente() }), 'sem_cotacao');
  const cot = await Fretes.cotar(env.ctx, f.token, CEP_SP);
  const id = cot.opcoes[0].id;
  await rejeita(Fretes.pagar(env.ctx, f.token, { opcaoId: 'o99', ...dadosCliente() }), 'opcao_invalida');
  await rejeita(Fretes.pagar(env.ctx, f.token, { opcaoId: id, ...dadosCliente({ nome: 'Maria' }) }), 'nome_invalido');
  await rejeita(Fretes.pagar(env.ctx, f.token, { opcaoId: id, ...dadosCliente({ telefone: '1234' }) }), 'telefone_invalido');
  await rejeita(Fretes.pagar(env.ctx, f.token, { opcaoId: id, ...dadosCliente({ email: 'maria@' }) }), 'email_invalido');
  await rejeita(Fretes.pagar(env.ctx, f.token, { opcaoId: id, ...dadosCliente({ cpf: '123.456.789-00' }) }), 'cpf_invalido');
  await rejeita(Fretes.pagar(env.ctx, f.token, { opcaoId: id, ...dadosCliente({ numero: '' }) }), 'numero_invalido');
  assert.equal(env.mocks.contar('mercadopago', 'POST', '/mp/v1/payments'), 0, 'nada vai ao Mercado Pago com dados inválidos');
  assert.equal(env.db.ler(`fretes/${f.id}`).status, 'criado');

  env.avancar(3 * 60 * 60 * 1000 + 1000);
  await rejeita(Fretes.pagar(env.ctx, f.token, { opcaoId: id, ...dadosCliente() }), 'cotacao_vencida');
}));

test('pagar: cria o Pix do frete com o valor exato e guarda os dados com segurança', () => comAmbiente(async (env) => {
  const f = await ateAguardandoPagamento(env, 1);
  const { vis, op } = f;
  assert.equal(vis.status, 'aguardando_pagamento');
  assert.equal(vis.servico.precoCentavos, op.precoCentavos);
  assert.equal(vis.pagamento.status, 'pending');
  assert.match(vis.pix.copiaECola, /^000201/);
  assert.equal(vis.pix.mime, 'image/png');

  const req = env.mocks.chamadas.find((c) => c.metodo === 'POST' && c.caminho === '/mp/v1/payments');
  assert.equal(req.headers.authorization, `Bearer ${env.mocks.mpToken}`);
  assert.match(req.headers['x-idempotency-key'], /^[0-9a-f-]{36}$/);
  assert.equal(req.corpo.transaction_amount, op.precoCentavos / 100);
  assert.equal(req.corpo.payment_method_id, 'pix');
  assert.equal(req.corpo.external_reference, `DPE-${f.id}`);
  assert.deepEqual(req.corpo.payer, { email: 'maria@exemplo.com', first_name: 'Maria', last_name: 'da Silva', identification: { type: 'CPF', number: CPF_CLIENTE } });
  assert.equal(req.corpo.notification_url, 'https://loja-teste.workers.dev/api/mp/webhook');
  assert.ok(Date.parse(req.corpo.date_of_expiration) - env.relogio.t > 23 * 3600 * 1000, 'Pix vale cerca de 24 h');

  const frete = env.db.ler(`fretes/${f.id}`);
  assert.equal(frete.status, 'aguardando_pagamento');
  assert.equal(frete.pagando, null);
  assert.equal(frete.destinatarioNome, 'Maria da Silva');
  assert.equal(frete.servico.empresa, op.empresa);
  assert.ok(!JSON.stringify(frete).includes(CPF_CLIENTE), 'CPF não fica no documento que a equipe lê pelo navegador');
  assert.ok(!JSON.stringify(frete).includes('maria@exemplo.com'));
  const priv = env.db.ler(`fretes_privado/${f.id}`);
  assert.equal(priv.destinatario.cpf, CPF_CLIENTE);
  assert.equal(priv.destinatario.rua, 'Avenida Paulista');
  assert.equal(priv.destinatario.cidade, 'São Paulo');
  assert.deepEqual(priv.pagamentos, [frete.pagamento.id]);

  const publico = JSON.stringify(vis);
  assert.ok(!publico.includes(CPF_CLIENTE) && !publico.includes('maria@exemplo.com') && !publico.includes(f.token) && !publico.includes('Paulista'), 'a visão pública não vaza dados pessoais');
}));

test('pagar: CEP sem rua/bairro exige que a cliente complete', () => comAmbiente(async (env) => {
  const f = await novoFrete(env);
  const cot = await Fretes.cotar(env.ctx, f.token, '88010400');
  const id = cot.opcoes[0].id;
  await rejeita(Fretes.pagar(env.ctx, f.token, { opcaoId: id, ...dadosCliente() }), 'rua_invalida');
  await rejeita(Fretes.pagar(env.ctx, f.token, { opcaoId: id, ...dadosCliente({ rua: 'Rua das Flores' }) }), 'bairro_invalido');
  await Fretes.pagar(env.ctx, f.token, { opcaoId: id, ...dadosCliente({ rua: 'Rua das Flores', bairro: 'Trindade', cidade: 'Outra', uf: 'RJ' }) });
  const d = env.db.ler(`fretes_privado/${f.id}`).destinatario;
  assert.equal(d.cidade, 'Florianópolis', 'cidade e estado vêm do CEP, não do formulário');
  assert.equal(d.uf, 'SC');
  assert.equal(d.rua, 'Rua das Flores');
}));

test('pagar: duplo clique não gera dois Pix', () => comAmbiente(async (env) => {
  const f = await ateCotado(env);
  const corpo = { opcaoId: f.cot.opcoes[0].id, ...dadosCliente() };
  const resultados = await Promise.allSettled([Fretes.pagar(env.ctx, f.token, corpo), Fretes.pagar(env.ctx, f.token, corpo)]);
  assert.equal(env.mocks.contar('mercadopago', 'POST', '/mp/v1/payments'), 1);
  assert.ok(resultados.some((r) => r.status === 'fulfilled'));
  for (const r of resultados) if (r.status === 'rejected') assert.equal(r.reason.codigo, 'em_andamento');
  assert.equal(env.db.ler(`fretes_privado/${f.id}`).pagamentos.length, 1);
}));

test('pagar: repetir a mesma escolha devolve o mesmo Pix; trocar de frete cancela o antigo', () => comAmbiente(async (env) => {
  const f = await ateAguardandoPagamento(env, 0);
  const pix1 = env.db.ler(`fretes/${f.id}`).pagamento.id;
  const outra = await Fretes.pagar(env.ctx, f.token, { opcaoId: f.op.id, ...dadosCliente() });
  assert.equal(outra.pix.copiaECola, f.vis.pix.copiaECola);
  assert.equal(env.mocks.contar('mercadopago', 'POST', '/mp/v1/payments'), 1);

  const segunda = f.cot.opcoes[1];
  const troca = await Fretes.pagar(env.ctx, f.token, { opcaoId: segunda.id, ...dadosCliente() });
  assert.equal(troca.servico.precoCentavos, segunda.precoCentavos);
  assert.notEqual(troca.pix.copiaECola, f.vis.pix.copiaECola);
  assert.equal(env.mocks.contar('mercadopago', 'POST', '/mp/v1/payments'), 2);
  assert.equal(env.mocks.contar('mercadopago', 'PUT', `/mp/v1/payments/${pix1}`), 1, 'o Pix antigo foi cancelado no Mercado Pago');
  assert.equal(env.mocks.pagamentos.get(pix1).status, 'cancelled');
  assert.equal(env.db.ler(`fretes_privado/${f.id}`).pagamentos.length, 2);
}));

test('pagar: Pix vencido pode ser gerado de novo', () => comAmbiente(async (env) => {
  const f = await ateAguardandoPagamento(env, 0);
  env.avancar(25 * 60 * 60 * 1000);
  const info = await Fretes.infoPublica(env.ctx, f.token);
  assert.equal(info.pix, null, 'Pix vencido não é mostrado');
  await Fretes.cotar(env.ctx, f.token, CEP_SP);
  const cot = env.db.ler(`fretes_privado/${f.id}`).cotacao;
  const novo = await Fretes.pagar(env.ctx, f.token, { opcaoId: cot.opcoes[0].id, ...dadosCliente() });
  assert.ok(novo.pix);
  assert.equal(env.mocks.contar('mercadopago', 'POST', '/mp/v1/payments'), 2);
}));

test('pagar: erros do Mercado Pago (sem chave Pix, credencial não ativada) e recuperação', () => comAmbiente(async (env) => {
  const f = await ateCotado(env);
  const corpo = { opcaoId: f.cot.opcoes[0].id, ...dadosCliente() };
  env.mocks.semChavePix = true;
  const e = await rejeita(Fretes.pagar(env.ctx, f.token, corpo), 'pix_indisponivel');
  assert.equal(e.http, 502);
  assert.ok(!/chave|token/i.test(e.message), 'a cliente não vê detalhes técnicos');
  assert.match(env.db.ler(`fretes/${f.id}`).alerta.texto, /chave Pix/);
  assert.equal(env.db.ler(`fretes/${f.id}`).pagando, null, 'a reserva é liberada para tentar de novo');

  env.mocks.semChavePix = false;
  const ok = await Fretes.pagar(env.ctx, f.token, corpo);
  assert.ok(ok.pix);
  assert.equal(env.db.ler(`fretes/${f.id}`).alerta, null, 'o aviso some quando resolve');

  const g = await ateCotado(env);
  env.db.gravar('privado/credenciais', { ...env.db.ler('privado/credenciais'), mercadoPago: { accessToken: 'APP_USR-NAO-ATIVADO', webhookSecret: 'x'.repeat(20) } });
  await rejeita(Fretes.pagar(env.ctx, g.token, { opcaoId: g.cot.opcoes[0].id, ...dadosCliente() }), 'pix_indisponivel');
  assert.match(env.db.ler(`fretes/${g.id}`).alerta.texto, /credenciais de produção/);
}));

test('pagar: se o Mercado Pago devolver valor diferente, cancela e não registra', () => comAmbiente(async (env) => {
  const f = await ateCotado(env);
  env.mocks.mpValorErrado = true;
  await rejeita(Fretes.pagar(env.ctx, f.token, { opcaoId: f.cot.opcoes[0].id, ...dadosCliente() }), 'pix_divergente');
  assert.equal(env.mocks.contar('mercadopago', 'PUT', `/mp/v1/payments/${env.mocks.ultimoPagamento().id}`), 1);
  assert.equal(env.db.ler(`fretes/${f.id}`).status, 'criado');
  assert.equal(env.db.ler(`fretes/${f.id}`).pagamento, undefined);
}));

/* --------------------------------------------------------------- pagamento */

test('webhook: sem segredo configurado recusa; assinatura inválida recusa', () => comAmbiente(async (env) => {
  const f = await ateAguardandoPagamento(env);
  const idPix = env.db.ler(`fretes/${f.id}`).pagamento.id;
  env.mocks.aprovar(idPix);

  const query = { 'data.id': idPix, type: 'payment' };
  const body = { type: 'payment', data: { id: idPix } };

  const ruim = await Fretes.tratarWebhookMp(env.ctx, { headers: { 'x-signature': 'ts=1760000000,v1=' + 'a'.repeat(64), 'x-request-id': 'r1' }, query, body });
  assert.equal(ruim.http, 401);
  const semAssinatura = await Fretes.tratarWebhookMp(env.ctx, { headers: {}, query, body });
  assert.equal(semAssinatura.http, 401);
  assert.equal(env.db.ler(`fretes/${f.id}`).status, 'aguardando_pagamento', 'notificação falsa não muda nada');

  env.db.gravar('privado/credenciais', { ...env.db.ler('privado/credenciais'), mercadoPago: { accessToken: env.mocks.mpToken } });
  const semSegredo = await Fretes.tratarWebhookMp(env.ctx, { headers: env.mocks.assinar(idPix), query, body });
  assert.equal(semSegredo.http, 503);
}));

test('webhook: assinatura fora do formato é recusada antes de qualquer leitura do banco', () => comAmbiente(async (env) => {
  const semBanco = { ...env.ctx, db: new Proxy({}, { get() { throw new Error('não era para tocar no banco'); } }) };
  const query = { 'data.id': '123456', type: 'payment' };
  const body = { type: 'payment', data: { id: '123456' } };
  for (const assinatura of ['', 'lixo', 'ts=1,v1=curto', 'v1=' + 'a'.repeat(64), `ts=1760000000,v1=${'z'.repeat(64)}`, 'a'.repeat(5000)]) {
    const r = await Fretes.tratarWebhookMp(semBanco, { headers: { 'x-signature': assinatura, 'x-request-id': 'r1' }, query, body });
    assert.equal(r.http, 401, `assinatura ${assinatura.slice(0, 20)}`);
  }
}));

test('pagar: no máximo 10 tentativas por hora por link (protege o Mercado Pago e a conta)', () => comAmbiente(async (env) => {
  const f = await ateCotado(env);
  const ruim = { opcaoId: 'o99', ...dadosCliente() };
  for (let i = 0; i < 10; i += 1) await rejeita(Fretes.pagar(env.ctx, f.token, ruim), 'opcao_invalida');
  const e = await rejeita(Fretes.pagar(env.ctx, f.token, ruim), 'muitas_tentativas');
  assert.equal(e.http, 429);
  assert.equal(env.mocks.contar('mercadopago', 'POST', '/mp/v1/payments'), 0);
  env.avancar(61 * 60 * 1000);
  await rejeita(Fretes.pagar(env.ctx, f.token, ruim), 'opcao_invalida');
}));

test('webhook: pagamento aprovado marca o frete como pago (uma vez só)', () => comAmbiente(async (env) => {
  const f = await ateAguardandoPagamento(env);
  const idPix = env.db.ler(`fretes/${f.id}`).pagamento.id;
  const query = { 'data.id': idPix, type: 'payment' };
  const body = { type: 'payment', action: 'payment.updated', data: { id: idPix } };

  let r = await Fretes.tratarWebhookMp(env.ctx, { headers: env.mocks.assinar(idPix), query, body });
  assert.equal(r.http, 200);
  assert.equal(env.db.ler(`fretes/${f.id}`).status, 'aguardando_pagamento', 'ainda pendente no Mercado Pago');

  env.mocks.aprovar(idPix);
  r = await Fretes.tratarWebhookMp(env.ctx, { headers: env.mocks.assinar(idPix), query, body });
  assert.equal(r.http, 200);
  assert.equal(r.corpo.status, 'pago');
  let frete = env.db.ler(`fretes/${f.id}`);
  assert.equal(frete.status, 'pago');
  assert.equal(frete.pagamento.status, 'approved');
  assert.equal(frete.pagamento.pagoEm, env.relogio.t);
  const pagoEm = frete.pagamento.pagoEm;

  env.avancar(60000);
  r = await Fretes.tratarWebhookMp(env.ctx, { headers: env.mocks.assinar(idPix), query, body });
  assert.equal(r.http, 200);
  frete = env.db.ler(`fretes/${f.id}`);
  assert.equal(frete.pagamento.pagoEm, pagoEm, 'repetição não altera nada');
  assert.equal(frete.status, 'pago');
}));

test('webhook: ignora outros tipos, ids trocados, pagamentos de outra origem; reenvio quando a consulta falha', () => comAmbiente(async (env) => {
  const f = await ateAguardandoPagamento(env);
  const idPix = env.db.ler(`fretes/${f.id}`).pagamento.id;

  let r = await Fretes.tratarWebhookMp(env.ctx, { headers: env.mocks.assinar(idPix), query: { 'data.id': idPix, type: 'merchant_order' }, body: { type: 'merchant_order', data: { id: idPix } } });
  assert.equal(r.corpo.status, 'ignorado');

  r = await Fretes.tratarWebhookMp(env.ctx, { headers: env.mocks.assinar(idPix), query: { 'data.id': idPix }, body: { type: 'payment', data: { id: '999' } } });
  assert.equal(r.http, 400);

  // pagamento de outra venda da mesma conta (sem a nossa referência)
  env.mocks.pagamentos.set('555', { id: 555, status: 'approved', transaction_amount: 10, external_reference: 'OUTRA-LOJA-1' });
  r = await Fretes.tratarWebhookMp(env.ctx, { headers: env.mocks.assinar('555'), query: { 'data.id': '555' }, body: { type: 'payment', data: { id: '555' } } });
  assert.equal(r.http, 200);
  assert.equal(r.corpo.status, 'sem_referencia');

  // referência nossa, mas Pix que nós nunca criamos
  env.mocks.pagamentos.set('556', { id: 556, status: 'approved', transaction_amount: 10, external_reference: `DPE-${f.id}` });
  r = await Fretes.tratarWebhookMp(env.ctx, { headers: env.mocks.assinar('556'), query: { 'data.id': '556' }, body: { type: 'payment', data: { id: '556' } } });
  assert.equal(r.corpo.status, 'pagamento_desconhecido');
  assert.equal(env.db.ler(`fretes/${f.id}`).status, 'aguardando_pagamento');

  env.mocks.aprovar(idPix);
  env.mocks.falhas.consulta = 1;
  r = await Fretes.tratarWebhookMp(env.ctx, { headers: env.mocks.assinar(idPix), query: { 'data.id': idPix }, body: { type: 'payment', data: { id: idPix } } });
  assert.equal(r.http, 503, 'pede ao Mercado Pago para reenviar');
  r = await Fretes.tratarWebhookMp(env.ctx, { headers: env.mocks.assinar(idPix), query: { 'data.id': idPix }, body: { type: 'payment', data: { id: idPix } } });
  assert.equal(r.http, 200);
  assert.equal(env.db.ler(`fretes/${f.id}`).status, 'pago');
}));

test('pagamento: a página da cliente percebe o pagamento mesmo sem webhook', () => comAmbiente(async (env) => {
  const f = await ateAguardandoPagamento(env);
  const idPix = env.db.ler(`fretes/${f.id}`).pagamento.id;
  let v = await Fretes.consultarStatus(env.ctx, f.token);
  assert.equal(v.status, 'aguardando_pagamento');
  const consultas = () => env.mocks.contar('mercadopago', 'GET', `/mp/v1/payments/${idPix}`);
  assert.equal(consultas(), 1);

  env.mocks.aprovar(idPix);
  await Fretes.consultarStatus(env.ctx, f.token);
  assert.equal(consultas(), 1, 'consultas muito seguidas não repetem a chamada');

  env.avancar(5000);
  v = await Fretes.consultarStatus(env.ctx, f.token);
  assert.equal(consultas(), 2);
  assert.equal(v.status, 'pago');
  assert.equal(v.pix, null);
}));

test('pagamento: Pix aprovado com valor que não confere vira aviso, não pagamento', () => comAmbiente(async (env) => {
  const f = await ateAguardandoPagamento(env, 0);
  const pix1 = env.db.ler(`fretes/${f.id}`).pagamento.id;
  await Fretes.pagar(env.ctx, f.token, { opcaoId: f.cot.opcoes[1].id, ...dadosCliente() }); // troca de frete
  env.mocks.pagamentos.get(pix1).status = 'approved'; // a cliente pagou o antigo mesmo assim
  await Fretes.tratarWebhookMp(env.ctx, { headers: env.mocks.assinar(pix1), query: { 'data.id': pix1 }, body: { type: 'payment', data: { id: pix1 } } });
  const frete = env.db.ler(`fretes/${f.id}`);
  assert.equal(frete.status, 'aguardando_pagamento');
  assert.match(frete.alerta.texto, /não confere com o frete escolhido/);
}));

test('pagamento: segundo Pix aprovado no mesmo frete gera aviso de duplicidade; estorno também', () => comAmbiente(async (env) => {
  const f = await ateAguardandoPagamento(env, 0);
  const pix1 = env.db.ler(`fretes/${f.id}`).pagamento.id;
  env.mocks.aprovar(pix1);
  await Fretes.sincronizarPagamento(env.ctx, f.id, {});
  assert.equal(env.db.ler(`fretes/${f.id}`).status, 'pago');

  // um segundo Pix do mesmo frete (de uma geração anterior) também é pago
  env.db.gravar(`fretes_privado/${f.id}`, { ...env.db.ler(`fretes_privado/${f.id}`), pagamentos: [pix1, '700'] });
  env.mocks.pagamentos.set('700', { id: 700, status: 'approved', transaction_amount: 1, external_reference: `DPE-${f.id}` });
  await Fretes.tratarWebhookMp(env.ctx, { headers: env.mocks.assinar('700'), query: { 'data.id': '700' }, body: { type: 'payment', data: { id: '700' } } });
  assert.match(env.db.ler(`fretes/${f.id}`).alerta.texto, /duplicidade/);

  env.mocks.estornar(pix1);
  await Fretes.tratarWebhookMp(env.ctx, { headers: env.mocks.assinar(pix1), query: { 'data.id': pix1 }, body: { type: 'payment', data: { id: pix1 } } });
  const frete = env.db.ler(`fretes/${f.id}`);
  assert.equal(frete.pagamento.status, 'refunded');
  assert.match(frete.alerta.texto, /estornado/);
}));

test('pagamento: Pix expirado fica marcado; frete segue aguardando', () => comAmbiente(async (env) => {
  const f = await ateAguardandoPagamento(env);
  const idPix = env.db.ler(`fretes/${f.id}`).pagamento.id;
  env.mocks.expirar(idPix);
  await Fretes.sincronizarPagamento(env.ctx, f.id, {});
  const frete = env.db.ler(`fretes/${f.id}`);
  assert.equal(frete.pagamento.status, 'expired');
  assert.equal(frete.status, 'aguardando_pagamento');
}));

/* ---------------------------------------------------------------- cancelar */

test('cancelar: antes de pagar cancela o Pix; depois de pago não deixa', () => comAmbiente(async (env) => {
  const f = await ateAguardandoPagamento(env);
  const idPix = env.db.ler(`fretes/${f.id}`).pagamento.id;
  await Fretes.cancelarFrete(env.ctx, f.id);
  assert.equal(env.db.ler(`fretes/${f.id}`).status, 'cancelado');
  assert.equal(env.mocks.pagamentos.get(idPix).status, 'cancelled');
  await rejeita(Fretes.cancelarFrete(env.ctx, f.id), 'nao_cancela', /já está cancelado/);
  await rejeita(Fretes.pagar(env.ctx, f.token, { opcaoId: 'o1', ...dadosCliente() }), 'encerrado');

  const g = await atePago(env);
  await rejeita(Fretes.cancelarFrete(env.ctx, g.id), 'nao_cancela', /já foi pago/);
}));

/* ---------------------------------------------------------------- etiqueta */

test('etiqueta: só depois do pagamento e com os dados de quem envia completos', () => comAmbiente(async (env) => {
  const f = await ateAguardandoPagamento(env);
  await rejeita(Fretes.gerarEtiqueta(env.ctx, f.id), 'nao_pago');
  await rejeita(Fretes.gerarEtiqueta(env.ctx, 'inexistenteXXXXXXXXXX'), 'nao_existe');

  env.mocks.aprovar(env.db.ler(`fretes/${f.id}`).pagamento.id);
  await Fretes.sincronizarPagamento(env.ctx, f.id, {});
  const cfg = env.db.ler('ajustes/frete');
  env.db.gravar('ajustes/frete', { ...cfg, remetente: { ...cfg.remetente, numero: '', bairro: '' } });
  await rejeita(Fretes.gerarEtiqueta(env.ctx, f.id), 'sem_remetente', /número, bairro/);
  env.db.gravar('ajustes/frete', cfg);
  const cred = env.db.ler('privado/credenciais');
  env.db.gravar('privado/credenciais', { ...cred, remetenteDocumento: '' });
  await rejeita(Fretes.gerarEtiqueta(env.ctx, f.id), 'sem_remetente', /CPF ou CNPJ/);
  assert.equal(env.mocks.orders.size, 0, 'nada foi ao carrinho do Melhor Envio');
}));

test('etiqueta: caminho feliz — carrinho, compra, geração, link de impressão e rastreio', () => comAmbiente(async (env) => {
  const f = await atePago(env);
  const frete0 = env.db.ler(`fretes/${f.id}`);
  const saldo0 = env.mocks.saldo;

  const r = await Fretes.gerarEtiqueta(env.ctx, f.id);
  assert.equal(r.ok, true);
  assert.match(r.url, /\/me\/imprimir\/pub/);
  assert.match(r.codigo, /^ME\d+ABCBR$/);

  assert.equal(env.mocks.orders.size, 1);
  const ordem = env.mocks.ultimaEtiqueta();
  assert.equal(ordem.status, 'generated');
  assert.equal(ordem.service_id, frete0.servico.servicoId);
  assert.equal(ordem.from.document, CPF_LOJA);
  assert.equal(ordem.from.postal_code, '89201001');
  assert.equal(ordem.to.document, CPF_CLIENTE);
  assert.equal(ordem.to.name, 'Maria da Silva');
  assert.equal(ordem.to.address, 'Avenida Paulista');
  assert.equal(ordem.to.number, '250');
  assert.equal(ordem.to.complement, 'Apto 12');
  assert.equal(ordem.to.district, 'Bela Vista');
  assert.equal(ordem.to.city, 'São Paulo');
  assert.equal(ordem.to.state_abbr, 'SP');
  assert.equal(ordem.to.phone, '47999998888');
  assert.equal(ordem.non_commercial, true);
  assert.deepEqual(ordem.volumes, [{ height: 6, width: 20, length: 25, weight: 0.8 }]);
  assert.deepEqual(ordem.tags, [{ tag: `frete:${f.id}`, url: null }]);
  assert.equal(saldo0 - env.mocks.saldo, Math.round(ordem.price * 100), 'o saldo da carteira foi usado');
  assert.equal(Math.round(ordem.price * 100), frete0.servico.precoCentavos, 'etiqueta custou o que a cliente pagou');

  const frete = env.db.ler(`fretes/${f.id}`);
  assert.equal(frete.status, 'etiqueta');
  assert.equal(frete.etiqueta.etapa, 'gerada');
  assert.equal(frete.etiqueta.meId, ordem.id);
  assert.equal(frete.etiqueta.trava, null);
  assert.equal(frete.rastreio.codigo, r.codigo);
  assert.equal(frete.rastreio.url, `https://www.melhorrastreio.com.br/rastreio/${r.codigo}`);
  assert.equal(env.mocks.chamadas.find((c) => c.caminho === '/me/api/v2/me/shipment/print').corpo.mode, 'public');

  // repetir não compra de novo
  const outra = await Fretes.gerarEtiqueta(env.ctx, f.id);
  assert.equal(outra.ok, true);
  assert.equal(env.mocks.orders.size, 1);
  assert.equal(env.mocks.contar('melhorenvio', 'POST', '/me/api/v2/me/shipment/checkout'), 1);

  const novo = await Fretes.urlEtiqueta(env.ctx, f.id);
  assert.match(novo.url, /imprimir/);
}));

test('etiqueta: link privado quando a loja prefere', () => comAmbiente(async (env) => {
  const f = await atePago(env);
  const r = await Fretes.gerarEtiqueta(env.ctx, f.id);
  assert.match(r.url, /imprimir\/priv/);
  assert.equal(env.mocks.chamadas.find((c) => c.caminho === '/me/api/v2/me/shipment/print').corpo.mode, undefined);
}, { config: { etiquetaPublica: false } }));

test('etiqueta: saldo insuficiente — continua do ponto em que parou, sem duplicar o carrinho', () => comAmbiente(async (env) => {
  const f = await atePago(env);
  env.mocks.saldo = 0;
  const e = await rejeita(Fretes.gerarEtiqueta(env.ctx, f.id), 'etiqueta_falhou', /Saldo insuficiente/);
  assert.ok(e);
  let frete = env.db.ler(`fretes/${f.id}`);
  assert.equal(frete.status, 'pago');
  assert.equal(frete.etiqueta.etapa, 'carrinho');
  assert.equal(frete.etiqueta.trava, null);
  assert.match(frete.etiqueta.erro, /Saldo insuficiente/);

  env.mocks.saldo = 1000000;
  const r = await Fretes.gerarEtiqueta(env.ctx, f.id);
  assert.equal(r.ok, true);
  assert.equal(env.mocks.orders.size, 1, 'a mesma etiqueta do carrinho foi paga');
  frete = env.db.ler(`fretes/${f.id}`);
  assert.equal(frete.status, 'etiqueta');
  assert.equal(frete.etiqueta.erro, null);
}));

test('etiqueta: preço do carrinho maior que o frete pago pede confirmação', () => comAmbiente(async (env) => {
  const f = await atePago(env);
  env.mocks.precoCarrinhoExtra = 500;
  const r = await Fretes.gerarEtiqueta(env.ctx, f.id);
  assert.equal(r.precisaConfirmar, true);
  assert.equal(r.precoCentavos - r.pagoCentavos, 500);
  assert.equal(env.mocks.contar('melhorenvio', 'POST', '/me/api/v2/me/shipment/checkout'), 0, 'não gastou o saldo sem confirmar');
  assert.equal(env.db.ler(`fretes/${f.id}`).etiqueta.trava, null);

  const ok = await Fretes.gerarEtiqueta(env.ctx, f.id, { confirmarDiferenca: true });
  assert.equal(ok.ok, true);
  assert.equal(env.mocks.orders.size, 1);
}));

test('etiqueta: o Melhor Envio demora a liberar — tenta de novo; se não liberar, retoma depois sem pagar outra vez', () => comAmbiente(async (env) => {
  const f = await atePago(env);
  env.mocks.falhas.generate = 2;
  const r = await Fretes.gerarEtiqueta(env.ctx, f.id);
  assert.equal(r.ok, true);
  assert.equal(env.mocks.contar('melhorenvio', 'POST', '/me/api/v2/me/shipment/generate'), 3);

  const g = await atePago(env);
  env.mocks.falhas.generate = 5;
  await rejeita(Fretes.gerarEtiqueta(env.ctx, g.id), 'etiqueta_falhou', /não gerou a etiqueta/);
  assert.equal(env.db.ler(`fretes/${g.id}`).etiqueta.etapa, 'comprada');
  env.mocks.falhas.generate = 0;
  const checkouts = env.mocks.contar('melhorenvio', 'POST', '/me/api/v2/me/shipment/checkout');
  const ok = await Fretes.gerarEtiqueta(env.ctx, g.id);
  assert.equal(ok.ok, true);
  assert.equal(env.mocks.contar('melhorenvio', 'POST', '/me/api/v2/me/shipment/checkout'), checkouts, 'não pagou duas vezes');
}));

test('etiqueta: dados recusados pelo Melhor Envio aparecem para a loja', () => comAmbiente(async (env) => {
  const f = await atePago(env);
  const priv = env.db.ler(`fretes_privado/${f.id}`);
  env.db.gravar(`fretes_privado/${f.id}`, { ...priv, destinatario: { ...priv.destinatario, telefone: '123' } });
  const e = await rejeita(Fretes.gerarEtiqueta(env.ctx, f.id), 'etiqueta_falhou', /não aceitou os dados/);
  assert.match(e.message, /to\.phone/);
  assert.equal(env.db.ler(`fretes/${f.id}`).etiqueta.meId, undefined);
  assert.equal(env.mocks.saldo, 1000000, 'nada foi cobrado');
}));

test('etiqueta: duas pessoas tocando ao mesmo tempo geram uma etiqueta só', () => comAmbiente(async (env) => {
  const f = await atePago(env);
  const rs = await Promise.allSettled([Fretes.gerarEtiqueta(env.ctx, f.id), Fretes.gerarEtiqueta(env.ctx, f.id)]);
  assert.equal(env.mocks.orders.size, 1, 'nunca duas etiquetas');
  assert.ok(rs.some((r) => r.status === 'fulfilled'), 'uma das duas conclui');
  // A outra ou recebe "em andamento" ou, se chegar depois de terminar, recebe a mesma etiqueta pronta (nunca outra).
  for (const r of rs.filter((x) => x.status === 'rejected')) assert.equal(r.reason.codigo, 'em_andamento');
}));

test('etiqueta: trava esquecida (queda no meio) expira em 2 minutos', () => comAmbiente(async (env) => {
  const f = await atePago(env);
  const frete = env.db.ler(`fretes/${f.id}`);
  env.db.gravar(`fretes/${f.id}`, { ...frete, etiqueta: { trava: env.relogio.t } });
  await rejeita(Fretes.gerarEtiqueta(env.ctx, f.id), 'em_andamento');
  env.avancar(121000);
  const r = await Fretes.gerarEtiqueta(env.ctx, f.id);
  assert.equal(r.ok, true);
}));

test('etiqueta: se o link de impressão falhar, a etiqueta existe e a loja é avisada', () => comAmbiente(async (env) => {
  const f = await atePago(env);
  const original = env.ctx.fetch;
  env.ctx.fetch = (url, init) => (String(url).includes('/shipment/print') ? Promise.resolve(new Response(JSON.stringify({ message: 'erro' }), { status: 500 })) : original(url, init));
  const r = await Fretes.gerarEtiqueta(env.ctx, f.id);
  assert.equal(r.ok, true);
  assert.equal(r.url, '');
  assert.ok(r.avisoImpressao);
  assert.equal(env.db.ler(`fretes/${f.id}`).status, 'etiqueta');
  env.ctx.fetch = original;
  assert.match((await Fretes.urlEtiqueta(env.ctx, f.id)).url, /imprimir/);
}));

test('etiqueta: link de impressão vindo de outro endereço é recusado', () => comAmbiente(async (env) => {
  const f = await atePago(env);
  const original = env.ctx.fetch;
  env.ctx.fetch = async (url, init) => {
    const r = await original(url, init);
    if (String(url).includes('/shipment/print')) return new Response(JSON.stringify({ url: 'https://site-malicioso.example/imprimir/abc' }), { status: 200 });
    return r;
  };
  const r = await Fretes.gerarEtiqueta(env.ctx, f.id);
  assert.equal(r.url, '');
  assert.match(r.avisoImpressao, /link de impressão válido/);
}));

/* ---------------------------------------------------------------- rastreio */

test('rastreio: etiqueta -> postado -> entregue, com datas e código', () => comAmbiente(async (env) => {
  const f = await atePago(env);
  const r0 = await Fretes.gerarEtiqueta(env.ctx, f.id);
  const meId = env.db.ler(`fretes/${f.id}`).etiqueta.meId;

  let r = await Fretes.atualizarRastreio(env.ctx, f.id, {});
  assert.equal(r.mudou, false);
  assert.equal(env.db.ler(`fretes/${f.id}`).status, 'etiqueta');

  env.mocks.postar(meId);
  env.avancar(1000);
  r = await Fretes.atualizarRastreio(env.ctx, f.id, {});
  assert.equal(r.mudou, true);
  let frete = env.db.ler(`fretes/${f.id}`);
  assert.equal(frete.status, 'postado');
  assert.equal(frete.rastreio.postadoEm, Date.parse('2026-10-14T13:30:00.000Z'), '10:30 de Brasília');
  assert.equal(frete.rastreio.codigo, r0.codigo, 'o código gerado continua o mesmo');

  env.mocks.entregar(meId);
  env.avancar(1000);
  await Fretes.atualizarRastreio(env.ctx, f.id, {});
  frete = env.db.ler(`fretes/${f.id}`);
  assert.equal(frete.status, 'entregue');
  assert.equal(frete.rastreio.entregueEm, Date.parse('2026-10-18T18:00:00.000Z'));

  const v = await Fretes.infoPublica(env.ctx, f.token);
  assert.equal(v.status, 'entregue');
  assert.equal(v.rastreio.url, `https://www.melhorrastreio.com.br/rastreio/${r0.codigo}`);
}));

test('rastreio: consultas muito seguidas são evitadas; falha do serviço não estraga o estado', () => comAmbiente(async (env) => {
  const f = await atePago(env);
  await Fretes.gerarEtiqueta(env.ctx, f.id);
  const meId = env.db.ler(`fretes/${f.id}`).etiqueta.meId;
  const chamadas = () => env.mocks.contar('melhorenvio', 'POST', '/me/api/v2/me/shipment/tracking');
  await Fretes.atualizarRastreio(env.ctx, f.id, { minIntervaloMs: 600000 });
  assert.equal(chamadas(), 0, 'acabou de gerar: não precisa consultar de novo');
  env.avancar(600001);
  await Fretes.atualizarRastreio(env.ctx, f.id, { minIntervaloMs: 600000 });
  assert.equal(chamadas(), 1);

  env.mocks.postar(meId);
  env.mocks.falhas.tracking = 1;
  env.avancar(600001);
  const r = await Fretes.atualizarRastreio(env.ctx, f.id, {});
  assert.equal(r.mudou, false);
  assert.ok(r.erro);
  assert.equal(env.db.ler(`fretes/${f.id}`).status, 'etiqueta');
}));

test('rastreio: etiqueta cancelada no Melhor Envio volta o frete para "pago" e permite gerar outra', () => comAmbiente(async (env) => {
  const f = await atePago(env);
  await Fretes.gerarEtiqueta(env.ctx, f.id);
  const meId = env.db.ler(`fretes/${f.id}`).etiqueta.meId;
  env.mocks.cancelarEtiqueta(meId);
  await Fretes.atualizarRastreio(env.ctx, f.id, {});
  const frete = env.db.ler(`fretes/${f.id}`);
  assert.equal(frete.status, 'pago');
  assert.equal(frete.etiqueta, null);
  assert.equal(frete.etiquetasAnteriores.length, 1);
  assert.equal(frete.etiquetasAnteriores[0].meId, meId);
  assert.match(frete.alerta.texto, /cancelada/);

  const r = await Fretes.gerarEtiqueta(env.ctx, f.id);
  assert.equal(r.ok, true);
  assert.equal(env.mocks.orders.size, 2);
  assert.notEqual(env.db.ler(`fretes/${f.id}`).etiqueta.meId, meId);
}));

test('consultarStatus: a página da cliente atualiza o rastreio sozinha', () => comAmbiente(async (env) => {
  const f = await atePago(env);
  await Fretes.gerarEtiqueta(env.ctx, f.id);
  const meId = env.db.ler(`fretes/${f.id}`).etiqueta.meId;
  env.mocks.postar(meId);
  env.avancar(11 * 60 * 1000);
  const v = await Fretes.consultarStatus(env.ctx, f.token);
  assert.equal(v.status, 'postado');
  assert.match(v.rastreio.codigo, /^ME\d+ABCBR$/);
  assert.ok(v.rastreio.postadoEm > 0);
}));

/* ------------------------------------------------------------------ rotina */

test('rotina: confere Pix pendentes e atualiza rastreios', () => comAmbiente(async (env) => {
  const a = await ateAguardandoPagamento(env);
  env.mocks.aprovar(env.db.ler(`fretes/${a.id}`).pagamento.id);

  const b = await atePago(env);
  await Fretes.gerarEtiqueta(env.ctx, b.id);
  env.mocks.postar(env.db.ler(`fretes/${b.id}`).etiqueta.meId);
  env.avancar(4 * 60 * 60 * 1000);

  const resumo = await Fretes.rotina(env.ctx);
  assert.equal(resumo.pagamentos, 1);
  assert.equal(resumo.rastreios, 1);
  assert.equal(resumo.erros, 0);
  assert.equal(env.db.ler(`fretes/${a.id}`).status, 'pago');
  assert.equal(env.db.ler(`fretes/${b.id}`).status, 'postado');
}));

test('rotina: sem orçamento de chamadas, não confere ninguém e conta os adiados', () => comAmbiente(async (env) => {
  const a = await ateAguardandoPagamento(env);
  env.mocks.aprovar(env.db.ler(`fretes/${a.id}`).pagamento.id);
  env.ctx.chamadasRestantes = () => 3; // menos que o custo de um frete
  const resumo = await Fretes.rotina(env.ctx);
  assert.equal(resumo.pagamentos, 0);
  assert.equal(resumo.adiados, 1);
  assert.equal(env.db.ler(`fretes/${a.id}`).status, 'aguardando_pagamento', 'nada foi mexido');
  delete env.ctx.chamadasRestantes;
  assert.equal((await Fretes.rotina(env.ctx)).pagamentos, 1, 'na rodada seguinte, com orçamento, é conferido');
}));

test('rotina: com orçamento curto confere o mais antigo primeiro, entre todas as filas', () => comAmbiente(async (env) => {
  const velho = await ateAguardandoPagamento(env);
  const novo = await ateAguardandoPagamento(env);
  env.db.gravar(`fretes/${velho.id}`, { ...env.db.ler(`fretes/${velho.id}`), pagamentoVerificadoEm: 1000 });
  env.db.gravar(`fretes/${novo.id}`, { ...env.db.ler(`fretes/${novo.id}`), pagamentoVerificadoEm: 9000 });

  // Orçamento que só comporta um frete: depois da primeira chamada externa, restam menos que o custo de outro.
  let gastas = 0;
  const fetchOriginal = env.ctx.fetch;
  env.ctx.fetch = (...a) => {
    gastas += 1;
    return fetchOriginal(...a);
  };
  env.ctx.chamadasRestantes = () => 4 - gastas; // 4 = custo máximo de um frete (CUSTO_MAXIMO_POR_FRETE)

  const resumo = await Fretes.rotina(env.ctx);
  assert.equal(resumo.adiados, 1);
  assert.ok(env.db.ler(`fretes/${velho.id}`).pagamentoVerificadoEm > 1000, 'o conferido há mais tempo foi o primeiro');
  assert.equal(env.db.ler(`fretes/${novo.id}`).pagamentoVerificadoEm, 9000, 'o outro ficou para a próxima rodada');

  // Próxima rodada: o que ficou de fora agora é o mais antigo da lista.
  gastas = 0;
  const resumo2 = await Fretes.rotina(env.ctx);
  assert.equal(resumo2.adiados, 1);
  assert.ok(env.db.ler(`fretes/${novo.id}`).pagamentoVerificadoEm > 9000, 'na segunda rodada foi a vez do outro');
}));

test('atualizarAgora: força a conferência pedida pela administradora', () => comAmbiente(async (env) => {
  const f = await ateAguardandoPagamento(env);
  env.mocks.aprovar(env.db.ler(`fretes/${f.id}`).pagamento.id);
  const r = await Fretes.atualizarAgora(env.ctx, f.id);
  assert.equal(r.pagamento.mudou, true);
  assert.equal(env.db.ler(`fretes/${f.id}`).status, 'pago');
}));

/* --------------------------------------------------------------- segredos */

test('segurança: nenhum segredo nem dado pessoal chega ao log', () => comAmbiente(async (env) => {
  const f = await atePago(env);
  env.mocks.saldo = 0;
  await Fretes.gerarEtiqueta(env.ctx, f.id).catch(() => {});
  env.db.gravar('privado/credenciais', { ...env.db.ler('privado/credenciais'), melhorEnvio: { token: 'errado-errado-errado-errado', ambiente: 'sandbox', emailContato: 'contato@exemplo.com' } });
  const g = await novoFrete(env);
  await Fretes.cotar(env.ctx, g.token, CEP_SP).catch(() => {});
  const texto = JSON.stringify(env.logs);
  assert.ok(env.logs.length > 0, 'houve registros de falha');
  for (const segredo of [env.mocks.meToken, env.mocks.mpToken, env.mocks.mpSecret, CPF_CLIENTE, CPF_LOJA, 'errado-errado', f.token, 'maria@exemplo.com']) {
    assert.ok(!texto.includes(segredo), `vazou no log: ${segredo}`);
  }
}));
