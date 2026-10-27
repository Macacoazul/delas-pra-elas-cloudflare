import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import * as U from '../src/util.js';
import * as Cripto from '../src/cripto.js';
import * as MP from '../src/mercado-pago.js';
import * as ME from '../src/melhor-envio.js';
import { normalizarConfig } from '../src/dados.js';
import * as Cred from '../src/credenciais.js';
import * as ViaCep from '../src/viacep.js';
import { PNG_1X1 } from './helpers/mocks.js';

test('util: dinheiro em centavos', () => {
  assert.equal(U.paraCentavos('12,50'), 1250);
  assert.equal(U.paraCentavos('1.234,56'), 123456);
  assert.equal(U.paraCentavos('25.35'), 2535);
  assert.equal(U.paraCentavos(25.35), 2535);
  assert.equal(U.paraCentavos('19.90'), 1990);
  assert.equal(U.paraCentavos(''), null);
  assert.equal(U.paraCentavos(null), null);
  assert.equal(U.paraCentavos('abc'), null);
  assert.equal(U.paraCentavos(0.1 + 0.2), 30);
  assert.equal(U.deCentavos(2535), 25.35);
  assert.match(U.reais(2535), /25,35/);
});

test('util: CEP, CPF, CNPJ, telefone, e-mail', () => {
  assert.equal(U.limparCep('89.201-001'), '89201001');
  assert.equal(U.limparCep('8920100'), '');
  assert.ok(U.cpfValido('529.982.247-25'));
  assert.ok(!U.cpfValido('529.982.247-24'));
  assert.ok(!U.cpfValido('111.111.111-11'));
  assert.ok(U.cnpjValido('11.222.333/0001-81'));
  assert.ok(!U.cnpjValido('11.222.333/0001-80'));
  assert.equal(U.limparTelefone('+55 (47) 99999-8888'), '47999998888');
  assert.equal(U.limparTelefone('4733334444'), '4733334444');
  assert.equal(U.limparTelefone('99999-8888'), '');
  assert.ok(U.emailValido('a@b.com'));
  assert.ok(!U.emailValido('a@b'));
  assert.ok(!U.emailValido('a b@c.com'));
  assert.equal(U.ufValida('sc'), 'SC');
  assert.equal(U.ufValida('XX'), '');
});

test('util: token do link tem 32 caracteres e não repete', () => {
  const a = Cripto.novoToken();
  const b = Cripto.novoToken();
  assert.ok(Cripto.tokenValido(a));
  assert.notEqual(a, b);
  assert.ok(!Cripto.tokenValido('curto'));
  assert.ok(!Cripto.tokenValido(`${a}x`));
  assert.ok(!Cripto.tokenValido('../../etc/passwd../../etc/passwd'));
});

test('util: UUID de idempotência é estável e válido', async () => {
  const x = await Cripto.uuidDeSemente('abc');
  assert.equal(x, await Cripto.uuidDeSemente('abc'));
  assert.notEqual(x, await Cripto.uuidDeSemente('abd'));
  assert.match(x, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('util: log nunca carrega token, JWT ou CPF', () => {
  const sujo = 'erro Bearer abc.def-123 e eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.assinaturaaaaa e APP_USR-1234567890123456-abc e 111.444.777-35';
  const limpo = U.limparParaLog(sujo);
  assert.ok(!/abc\.def-123/.test(limpo));
  assert.ok(!/eyJhbGci/.test(limpo));
  assert.ok(!/1234567890123456/.test(limpo));
  assert.ok(!/111\.444\.777-35/.test(limpo));
});

test('mercado pago: assinatura do webhook (válida, adulterada, sem request-id)', async () => {
  const segredo = 'segredo-de-teste-0123456789';
  const assina = (dataId, rid, ts) => {
    let m = '';
    if (dataId) m += `id:${String(dataId).toLowerCase()};`;
    if (rid) m += `request-id:${rid};`;
    m += `ts:${ts};`;
    return crypto.createHmac('sha256', segredo).update(m).digest('hex');
  };
  const ts = '1704908010';
  assert.ok(await MP.verificarAssinatura(`ts=${ts},v1=${assina('123456', 'rid-1', ts)}`, 'rid-1', '123456', segredo));
  assert.ok(await MP.verificarAssinatura(`ts=${ts}, v1=${assina('123456', '', ts)}`, '', '123456', segredo), 'sem request-id');
  assert.ok(await MP.verificarAssinatura(`ts=${ts},v1=${assina('ABC123', 'r', ts)}`, 'r', 'ABC123', segredo), 'data.id alfanumérico em minúsculas');
  assert.ok(!await MP.verificarAssinatura(`ts=${ts},v1=${assina('123456', 'rid-1', ts)}`, 'rid-1', '123457', segredo), 'outro data.id');
  assert.ok(!await MP.verificarAssinatura(`ts=${ts},v1=${assina('123456', 'rid-1', ts)}`, 'outro', '123456', segredo), 'outro request-id');
  assert.ok(!await MP.verificarAssinatura(`ts=1704908011,v1=${assina('123456', 'rid-1', ts)}`, 'rid-1', '123456', segredo), 'ts adulterado');
  assert.ok(!await MP.verificarAssinatura(`ts=${ts},v1=${assina('123456', 'rid-1', ts)}`, 'rid-1', '123456', 'outro-segredo'));
  assert.ok(!await MP.verificarAssinatura('', 'rid-1', '123456', segredo));
  assert.ok(!await MP.verificarAssinatura('lixo', 'rid-1', '123456', segredo));
  assert.ok(!await MP.verificarAssinatura(`ts=${ts},v1=zzzz`, 'rid-1', '123456', segredo));
  assert.ok(!await MP.verificarAssinatura(`ts=${ts},v1=${assina('123456', 'rid-1', ts)}`, 'rid-1', '123456', ''), 'segredo vazio nunca valida');
});

test('mercado pago: status, pagamento e imagem do QR', () => {
  assert.equal(MP.mapearStatus('approved'), 'approved');
  assert.equal(MP.mapearStatus('pending'), 'pending');
  assert.equal(MP.mapearStatus('in_process'), 'pending');
  assert.equal(MP.mapearStatus('rejected'), 'rejected');
  assert.equal(MP.mapearStatus('cancelled', 'expired'), 'expired');
  assert.equal(MP.mapearStatus('cancelled', 'by_collector'), 'cancelled');
  assert.equal(MP.mapearStatus('charged_back'), 'refunded');

  const p = MP.interpretarPagamento({
    id: 123,
    status: 'pending',
    transaction_amount: 25.35,
    external_reference: 'DPE-x',
    date_of_expiration: '2026-10-13T10:00:00.000-03:00',
    point_of_interaction: { transaction_data: { qr_code: ' 0002... ', qr_code_base64: PNG_1X1, ticket_url: 'https://www.mercadopago.com.br/x' } },
  });
  assert.equal(p.id, '123');
  assert.equal(p.valorCentavos, 2535);
  assert.equal(p.qrCode, '0002...');
  assert.equal(p.qrImagem, PNG_1X1);
  assert.equal(p.expiraEmMs, Date.parse('2026-10-13T13:00:00.000Z'));
  assert.equal(MP.interpretarPagamento({ id: 'abc' }), null);
  assert.equal(MP.interpretarPagamento({}), null);

  assert.equal(MP.sanitizarImagemQr('<script>alert(1)</script>'), '');
  assert.equal(MP.sanitizarImagemQr(Buffer.from('GIF89a....').toString('base64')), '');
  assert.equal(MP.sanitizarImagemQr(PNG_1X1), PNG_1X1);
  assert.equal(MP.mimeDaImagem(PNG_1X1), 'image/png');
  assert.equal(MP.interpretarPagamento({ id: 5, point_of_interaction: { transaction_data: { ticket_url: 'javascript:alert(1)' } } }).ticketUrl, '');
});

test('mercado pago: data de expiração no fuso de Brasília', () => {
  assert.equal(MP.formatarExpiracao(Date.parse('2026-10-13T13:00:00.000Z')), '2026-10-13T10:00:00.000-03:00');
});

test('mercado pago: erros conhecidos viram mensagens claras', () => {
  const t = MP.traduzirErro;
  assert.match(t({ status: 401, erro: 'Unauthorized use of live credentials' }), /credenciais de produção/i);
  assert.match(t({ status: 400, erro: 'Collector user without key enabled for QR render' }), /chave Pix/i);
  assert.match(t({ status: 401, erro: 'invalid access token' }), /recusou o token/i);
  assert.match(t({ rede: true, status: 0, erro: '' }), /Não foi possível falar/);
});

test('melhor envio: cotação usa custom_price, ignora erro e ordena', () => {
  const o = ME.interpretarCotacao([
    { id: 1, name: 'PAC', price: '21.90', custom_price: '19.90', delivery_time: 9, custom_delivery_time: 8, company: { name: 'Correios' } },
    { id: 4, name: '.Com', price: '31.00', delivery_time: 4, company: { name: 'Jadlog' } },
    { id: 15, name: 'Azul', error: 'fora do limite', price: '10.00', company: { name: 'Azul' } },
    { id: 9, name: 'Sem preço', company: { name: 'X' } },
    { id: 'abc', name: 'Id ruim', price: '5.00', company: { name: 'X' } },
    null,
  ]);
  assert.deepEqual(o.map((x) => [x.servicoId, x.precoCentavos, x.prazoDias]), [[1, 1990, 8], [4, 3100, 4]]);
  assert.deepEqual(ME.interpretarCotacao({ message: 'x' }), []);
});

test('melhor envio: filtro das transportadoras principais', () => {
  const todas = [
    { empresa: 'Correios', nome: 'PAC', precoCentavos: 2000 },
    { empresa: 'Jadlog', nome: '.Package', precoCentavos: 1800 },
    { empresa: 'Loggi', nome: 'Express', precoCentavos: 1400 },
  ];
  assert.deepEqual(ME.filtrarTransportadoras(todas, ['Correios', 'Jadlog'], false).map((x) => x.empresa), ['Correios', 'Jadlog']);
  assert.equal(ME.filtrarTransportadoras(todas, ['correios'], false).length, 1, 'sem diferenciar maiúsculas');
  assert.equal(ME.filtrarTransportadoras(todas, ['Correios'], true).length, 3, 'mostrar outras');
  assert.equal(ME.filtrarTransportadoras(todas, [], false).length, 3, 'sem filtro devolve tudo');
});

test('melhor envio: corpo do carrinho (pessoa física, empresa, não comercial)', () => {
  const base = {
    servicoId: 3,
    remetente: { nome: 'Loja', telefone: '47997919934', email: 'l@x.com', documento: '52998224725', endereco: 'Rua A', numero: '1', bairro: 'Centro', cidade: 'Joinville', cep: '89201001', uf: 'SC' },
    destinatario: { nome: 'Maria', telefone: '47999998888', email: 'm@x.com', documento: '11144477735', endereco: 'Rua B', numero: '2', complemento: 'ap 1', bairro: 'Bela Vista', cidade: 'São Paulo', cep: '01310100', uf: 'SP' },
    caixa: { alturaCm: 6, larguraCm: 20, comprimentoCm: 25 },
    pesoKg: 0.8,
    declaradoCentavos: 5000,
    conteudo: 'Roupas',
    naoComercial: true,
    tag: 'frete:abc',
  };
  const c = ME.montarCarrinho(base);
  assert.equal(c.service, 3);
  assert.equal(c.from.document, '52998224725');
  assert.equal(c.from.company_document, undefined);
  assert.equal(c.from.state_register, undefined);
  assert.equal(c.to.postal_code, '01310100');
  assert.equal(c.to.state_abbr, 'SP');
  assert.equal(c.to.country_id, 'BR');
  assert.deepEqual(c.volumes, [{ height: 6, width: 20, length: 25, weight: 0.8 }]);
  assert.deepEqual(c.products, [{ name: 'Roupas', quantity: 1, unitary_value: 50 }]);
  assert.equal(c.options.non_commercial, true);
  assert.equal(c.options.insurance_value, 50);
  assert.equal(c.options.invoice, undefined, 'envio não comercial não leva nota fiscal');
  assert.deepEqual(c.options.tags, [{ tag: 'frete:abc', url: null }]);

  const pj = ME.montarCarrinho({ ...base, remetente: { ...base.remetente, documento: '11222333000181' } });
  assert.equal(pj.from.company_document, '11222333000181');
  assert.equal(pj.from.document, undefined);
  assert.equal(pj.from.state_register, 'ISENTO');

  const barato = ME.montarCarrinho({ ...base, declaradoCentavos: 10 });
  assert.equal(barato.products[0].unitary_value, 1, 'valor declarado mínimo de R$ 1,00');
});

test('melhor envio: erros viram mensagens claras', () => {
  const t = ME.traduzirErro;
  assert.match(t({ status: 401, erro: 'Unauthenticated.' }), /recusou o token/);
  assert.match(t({ status: 403, erro: '' }), /não tem permissão/);
  assert.match(t({ status: 422, erro: 'Saldo insuficiente para concluir a compra.' }), /Saldo insuficiente/);
  assert.match(t({ status: 422, erro: 'to.document: obrigatório' }), /não aceitou os dados: to\.document/);
  assert.match(t({ rede: true, status: 0, erro: '' }), /Não foi possível falar/);
});

test('melhor envio: User-Agent leva nome do app e e-mail de contato', () => {
  assert.equal(ME.userAgent({ emailContato: 'a@b.com' }), 'Delas pra Elas (a@b.com)');
  assert.match(ME.prontas({ token: 'x', emailContato: '' }), /e-mail de contato/);
  assert.match(ME.prontas({ token: '', emailContato: 'a@b.com' }), /token/);
  assert.equal(ME.prontas({ token: 'x', emailContato: 'a@b.com' }), '');
});

test('configuração: valores soltos viram valores seguros', () => {
  const c = normalizarConfig({
    origemCep: '89.201-001',
    caixas: [{ id: 'a b', nome: '<b>X</b>', altura: '7,5', largura: 20, comprimento: 30 }, { id: 'ruim', altura: -1, largura: 1, comprimento: 1 }, 'lixo', null],
    transportadoras: ['Correios', '', 'Jadlog'],
    pixValidadeMin: 5,
    siteUrl: 'http://inseguro.com/',
    valorDeclaradoPadrao: 'abc',
    remetente: { telefone: '(47) 99791-9934', uf: 'sc', cep: '89201001' },
  });
  assert.equal(c.origemCep, '89201001');
  assert.equal(c.caixas.length, 1);
  assert.equal(c.caixas[0].id, 'ab');
  assert.equal(c.caixas[0].altura, 7.5);
  assert.deepEqual(c.transportadoras, ['Correios', 'Jadlog']);
  assert.equal(c.pixValidadeMin, 1440, 'abaixo de 30 minutos volta ao padrão');
  assert.equal(c.siteUrl, '', 'só https');
  assert.equal(c.valorDeclaradoPadrao, 50);
  assert.equal(c.remetente.telefone, '47997919934');
  assert.equal(c.remetente.uf, 'SC');
  const vazio = normalizarConfig(undefined);
  assert.equal(vazio.caixas.length, 3);
  assert.deepEqual(vazio.transportadoras, ['Correios', 'Jadlog']);
});

test('configuração: endereço do site — https sempre, http só local', () => {
  const site = (s) => normalizarConfig({ siteUrl: s }).siteUrl;
  assert.equal(site('https://brecho.workers.dev/'), 'https://brecho.workers.dev');
  assert.equal(site('http://localhost:5000'), 'http://localhost:5000');
  assert.equal(site('http://127.0.0.1:5000'), 'http://127.0.0.1:5000');
  assert.equal(site('http://192.168.0.15:5000'), 'http://192.168.0.15:5000');
  for (const ruim of ['http://loja.com', 'http://localhost.evil.com', 'http://192.168.0.15.evil.com', 'http://8.8.8.8', 'ftp://localhost', 'https://a.com/x', 'http://localhost:5000/f']) {
    assert.equal(site(ruim), '', ruim);
  }
});

test('credenciais: lê validade e permissões do JWT sem expor nada', () => {
  const payload = { exp: 1800000000, scopes: ['shipping-calculate', 'cart-read'] };
  const jwt = `${Buffer.from('{"alg":"RS256"}').toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.assinatura`;
  const r = Cred.lerJwt(jwt);
  assert.equal(r.expiraEm, 1800000000000);
  assert.deepEqual(r.escopos, ['shipping-calculate', 'cart-read']);
  assert.equal(Cred.lerJwt('nao-e-jwt'), null);
  assert.equal(Cred.limparToken('  Bearer abc123def  ', 100), 'abc123def');
  assert.throws(() => Cred.limparToken('abc\ndef', 100), /espaços ou quebras/);
  assert.throws(() => Cred.limparToken('a'.repeat(5000), 4096), /longo demais/);
});

test('ViaCEP: sem endereços de teste, usa o endereço oficial (https://viacep.com.br)', async () => {
  ViaCep.limparCache();
  const pedidos = [];
  const ctx = {
    urls: {},
    now: () => Date.now(),
    log: { info() {}, warn() {}, error() {} },
    fetch: async (url) => {
      pedidos.push(String(url));
      return new Response(JSON.stringify({ logradouro: 'Rua A', bairro: 'Centro', localidade: 'Joinville', uf: 'SC' }), { status: 200 });
    },
  };
  const r = await ViaCep.consultar(ctx, '89201-001');
  assert.equal(r.ok, true);
  assert.equal(pedidos[0], 'https://viacep.com.br/ws/89201001/json/');
  ViaCep.limparCache();
});
