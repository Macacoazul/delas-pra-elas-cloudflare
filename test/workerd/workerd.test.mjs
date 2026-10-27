/**
 * Roda os arquivos GERADOS (a pasta para-colar/, exatamente os que vão para o painel do Cloudflare) dentro do motor do
 * Cloudflare (workerd), pelo `wrangler dev`, com um banco D1 de teste local. Tudo por HTTP, como o navegador faria:
 * primeiro acesso, login, app da live, Fretes e rotina agendada.
 *
 * Melhor Envio, Mercado Pago e ViaCEP são simuladores na própria máquina: nenhum serviço real é chamado, e o banco D1 é o
 * de brinquedo do wrangler. O teste prova que os arquivos colados funcionam no Workers (WebCrypto, fetch, D1, cabeçalhos,
 * cron) e que cada requisição fica dentro do limite de chamadas externas do plano grátis.
 * Antes de rodar: npm run colar
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';

import { Mocks } from '../helpers/mocks.js';
import { CONFIG_BASE, CPF_LOJA, dadosCliente } from '../helpers/ambiente.js';
import { iniciarWorkerLocal } from './worker-local.mjs';

const raiz = path.join(import.meta.dirname, '..', '..');
const LIMITE_GRATIS = 50;

const SEGREDO = 'segredo-do-teste-no-workerd-com-mais-de-vinte-letras';
const SENHA_DE_INSTALACAO = 'senha-de-instalacao-do-teste-workerd';
const EMAIL_DA_DONA = 'dona@exemplo.com';
const SENHA_DA_DONA = 'senha da dona 12345';
const EMAIL_DA_ANA = 'ana@exemplo.com';
const SENHA_DA_ANA = 'senha da ana 123';

let mocks;
let worker;
let base;
let pasta;
let dona; // navegador da dona, depois do primeiro acesso
let ana; // navegador de uma pessoa da equipe
const medidas = [];

before(async () => {
  mocks = await new Mocks().iniciar();
  worker = await iniciarWorkerLocal({ segredo: SEGREDO, senhaDeInstalacao: SENHA_DE_INSTALACAO, enderecos: mocks.urls });
  base = worker.base;
  pasta = worker.pasta;
});

after(async () => {
  if (worker) await worker.parar();
  if (mocks) await mocks.parar();
  console.log('\nChamadas externas por requisição (limite do plano grátis: 50):');
  for (const m of medidas) console.log(`  ${String(m.chamadas).padStart(3)}  ${m.rotulo}`);
  setTimeout(() => process.exit(0), 300).unref();
});

/**
 * Um navegador mínimo: guarda os cookies que o Worker manda e, nos pedidos que mudam algo, manda Origin e Sec-Fetch-Site
 * como o navegador de verdade faz. Com `rotulo`, confere que o pedido ficou dentro do limite de chamadas externas.
 */
function criarNavegador() {
  const cookies = new Map();

  async function pedir(metodo, caminho, { corpo, bruto, headers = {}, rotulo, comoPrograma = false } = {}) {
    const h = new Headers(headers);
    if (!comoPrograma && metodo !== 'GET' && metodo !== 'HEAD') {
      if (!h.has('Origin')) h.set('Origin', base);
      if (!h.has('Sec-Fetch-Site')) h.set('Sec-Fetch-Site', 'same-origin');
    }
    if (cookies.size && !h.has('Cookie')) h.set('Cookie', [...cookies].map(([k, v]) => `${k}=${v}`).join('; '));
    let body;
    if (bruto !== undefined) body = bruto;
    else if (corpo !== undefined) {
      if (!h.has('Content-Type')) h.set('Content-Type', 'application/json');
      body = JSON.stringify(corpo);
    }
    const antes = mocks.chamadas.length;
    const r = await fetch(`${base}${caminho}`, { method: metodo, headers: h, body, redirect: 'manual' });
    for (const linha of r.headers.getSetCookie()) {
      const [par, ...atributos] = linha.split(';').map((p) => p.trim());
      const i = par.indexOf('=');
      const nome = par.slice(0, i);
      const valor = par.slice(i + 1);
      if (!valor || atributos.some((a) => /^max-age=0$/i.test(a))) cookies.delete(nome);
      else cookies.set(nome, valor);
    }
    const texto = await r.text();
    let json = null;
    try {
      json = JSON.parse(texto);
    } catch {
      json = null;
    }
    const chamadas = mocks.chamadas.length - antes;
    if (rotulo) {
      medidas.push({ rotulo, chamadas });
      assert.ok(chamadas <= LIMITE_GRATIS - 5, `${rotulo}: ${chamadas} chamadas externas (limite ${LIMITE_GRATIS}, com folga de 5)`);
    }
    return { status: r.status, headers: r.headers, texto, json, chamadas };
  }

  return {
    pedir,
    cookies,
    temSessao: () => cookies.has('dpe_sessao'),
    /** Comando da dona: POST /api/admin/<nome>. */
    admin: (nome, dados, opcoes = {}) => pedir('POST', `/api/admin/${nome}`, { corpo: dados || {}, rotulo: `admin/${nome}`, ...opcoes }),
  };
}

const visitante = criarNavegador;

/** Pedido cru (sem navegador), para conferir exatamente o que o Cloudflare devolve na rede (compressão, por exemplo). */
function pedidoCru(caminho, headers) {
  return new Promise((ok, falha) => {
    http
      .get(`${base}${caminho}`, { headers }, (res) => {
        const partes = [];
        res.on('data', (c) => partes.push(c));
        res.on('end', () => ok({ status: res.statusCode, headers: res.headers, corpo: Buffer.concat(partes) }));
      })
      .on('error', falha);
  });
}

const lerSite = (arquivo) => fs.readFileSync(path.join(raiz, 'site', arquivo), 'utf8').replace(/\r\n/g, '\n');

/** Cria um frete, a cliente escolhe a entrega e gera o Pix. Devolve o necessário para os próximos passos. */
async function criarEPagar(clienteId = 'c1') {
  const c = await dona.admin('criarFrete', { clienteId, clienteNome: 'Maria da Silva', whatsapp: '47999998888', caixaId: 'p', pesoKg: '0,8' });
  assert.equal(c.status, 200, c.texto);
  const { id, token } = c.json.data;
  const cliente = visitante();
  const cot = await cliente.pedir('POST', `/api/frete/${token}/cotar`, { corpo: { cep: '01310100' }, rotulo: 'cliente: cotar' });
  assert.equal(cot.status, 200, cot.texto);
  const pag = await cliente.pedir('POST', `/api/frete/${token}/pagar`, { corpo: { opcaoId: cot.json.opcoes[0].id, ...dadosCliente() }, rotulo: 'cliente: gerar Pix' });
  assert.equal(pag.status, 200, pag.texto);
  return { id, token, cliente, idPix: mocks.ultimoPagamento().id };
}

/** O frete na lista da dona (o que a tela de Fretes mostra). */
async function freteNaLista(id) {
  const lista = await dona.admin('listarFretes', {}, { rotulo: undefined });
  assert.equal(lista.status, 200, lista.texto);
  const m = lista.json.data.mudancas.find((x) => x.i === id);
  assert.ok(m, `o frete ${id} não está na lista`);
  return m.d;
}

/* ── o Worker de pé ───────────────────────────────────────────── */
test('Workers: /api/saude diz que está tudo pronto (banco D1, segredo e site)', async () => {
  const r = await visitante().pedir('GET', '/api/saude');
  assert.equal(r.status, 200, r.texto);
  assert.deepEqual(r.json, { ok: true, banco: true, segredo: true, site: true });
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
});

test('Workers: o site de dentro dos arquivos — páginas, código, compressão, cache e cabeçalhos', async () => {
  const v = visitante();
  const raizHtml = await v.pedir('GET', '/');
  assert.equal(raizHtml.status, 200);
  assert.match(raizHtml.texto, /<html/i);
  assert.equal(raizHtml.headers.get('x-frame-options'), 'DENY');
  assert.match(raizHtml.headers.get('strict-transport-security'), /max-age/);
  assert.match(raizHtml.headers.get('content-security-policy'), /default-src 'none'/);

  for (const arq of ['/index.html', '/estilo.css', '/app.js', '/biblioteca.js', '/fretes.html', '/fretes.js', '/frete.html', '/frete.js', '/frete.css']) {
    const r = await v.pedir('GET', arq);
    assert.equal(r.status, 200, arq);
    assert.ok(r.texto.length > 100, arq);
  }
  for (const arq of ['app.js', 'fretes.js', 'frete.js', 'frete.css', 'estilo.css', 'index.html']) {
    assert.equal((await v.pedir('GET', `/${arq}`)).texto, lerSite(arq), `${arq} chega inteiro, letra por letra`);
  }

  // gzip de ponta a ponta: pedido cru, para ver exatamente o que o Cloudflare devolve
  const original = lerSite('app.js');
  const cru = await pedidoCru('/app.js', { 'accept-encoding': 'gzip' });
  assert.equal(cru.headers['content-encoding'], 'gzip');
  assert.equal(zlib.gunzipSync(cru.corpo).toString('utf8'), original);
  assert.ok(cru.corpo.length < original.length / 2, 'vai comprimido pela rede');
  const semGzip = await pedidoCru('/frete.css', { 'accept-encoding': 'identity' });
  assert.equal(semGzip.headers['content-encoding'], undefined);
  assert.equal(semGzip.corpo.toString('utf8'), lerSite('frete.css'));

  const primeira = await v.pedir('GET', '/index.html');
  const igual = await fetch(`${base}/index.html`, { headers: { 'If-None-Match': primeira.headers.get('etag') } });
  assert.equal(igual.status, 304);

  for (const nome of ['/worker.js', '/base.js', '/servicos.js', '/negocio.js', '/servidor.js', '/site-paginas.js', '/site-live-1.js', '/site-fretes-2.js', '/wrangler.toml']) {
    assert.equal((await v.pedir('GET', nome)).status, 404, `${nome}: o código do servidor não é público`);
  }
  assert.equal((await v.pedir('GET', '/.dev.vars')).status, 404, 'segredos não são públicos');
  assert.equal((await v.pedir('GET', '/nao-existe.txt')).status, 404);
  assert.equal((await v.pedir('POST', '/index.html', { corpo: {} })).status, 405);
});

test('Workers: o link da cliente abre a página dela, com cabeçalhos de proteção', async () => {
  const cliente = await visitante().pedir('GET', '/f/AbCdEf0123456789AbCdEf0123456789');
  assert.equal(cliente.status, 200);
  assert.match(cliente.texto, /frete\.js/);
  assert.equal(cliente.headers.get('cache-control'), 'no-store');
  assert.equal(cliente.headers.get('referrer-policy'), 'no-referrer');
  assert.match(cliente.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.match(cliente.headers.get('x-robots-tag'), /noindex/);
  assert.equal((await visitante().pedir('GET', '/f/curto')).status, 404);
});

/* ── entrar ───────────────────────────────────────────────────── */
test('Workers: primeiro acesso cria a conta da dona; a sessão vai num cookie protegido', async () => {
  const n = visitante();
  assert.deepEqual((await n.pedir('GET', '/api/auth/eu')).json, { usuario: null, primeiroAcesso: true });
  assert.equal((await n.pedir('POST', '/api/admin/statusCredenciais', { corpo: {} })).status, 401, 'sem login, nada de comandos da dona');
  assert.equal((await n.pedir('GET', '/api/app/estado')).status, 401, 'sem login, nada do app');

  const errada = await n.pedir('POST', '/api/auth/primeiro-acesso', { corpo: { email: EMAIL_DA_DONA, senha: SENHA_DA_DONA, chave: 'chute' } });
  assert.equal(errada.status, 403);
  assert.equal(errada.json.codigo, 'chave_errada');
  assert.equal(n.temSessao(), false);

  const ok = await n.pedir('POST', '/api/auth/primeiro-acesso', { corpo: { email: EMAIL_DA_DONA, senha: SENHA_DA_DONA, chave: SENHA_DE_INSTALACAO } });
  assert.equal(ok.status, 200, ok.texto);
  assert.deepEqual(ok.json, { usuario: { email: EMAIL_DA_DONA, papel: 'dono' } });
  const cookie = ok.headers.getSetCookie();
  assert.equal(cookie.length, 1);
  assert.match(cookie[0], /^dpe_sessao=v1\.[\w-]+\.[\w-]+; Path=\/; HttpOnly; SameSite=Strict; Max-Age=1209600$/, 'no teste local (http) o cookie vai sem "Secure"');
  assert.ok(!ok.texto.includes('v1.'), 'o código da sessão só vai no cookie, nunca no corpo da resposta');
  dona = n;

  assert.deepEqual((await dona.pedir('GET', '/api/auth/eu')).json, { usuario: { email: EMAIL_DA_DONA, papel: 'dono' } });
  const outra = await visitante().pedir('POST', '/api/auth/primeiro-acesso', { corpo: { email: 'intruso@exemplo.com', senha: SENHA_DA_DONA, chave: SENHA_DE_INSTALACAO } });
  assert.equal(outra.status, 409, 'depois da primeira conta, a senha de instalação não cria mais nada');
});

test('Workers: pedido que não veio do próprio site não usa a sessão da dona', async () => {
  const deOutroSite = await dona.pedir('POST', '/api/admin/statusCredenciais', { corpo: {}, headers: { Origin: 'https://site-malvado.exemplo' } });
  assert.equal(deOutroSite.status, 403);
  assert.equal(deOutroSite.json.codigo, 'origem_invalida');
  const entreSites = await dona.pedir('POST', '/api/admin/statusCredenciais', { corpo: {}, headers: { 'Sec-Fetch-Site': 'cross-site' } });
  assert.equal(entreSites.status, 403);
  const semTipo = await dona.pedir('POST', '/api/admin/statusCredenciais', { bruto: '{}', headers: { 'Content-Type': 'text/plain' } });
  assert.equal(semTipo.status, 415, 'um formulário comum de outro site manda texto, não JSON');
  assert.equal((await dona.pedir('GET', '/api/admin/statusCredenciais')).status, 405);
  assert.equal((await dona.pedir('POST', '/api/admin/naoExiste', { corpo: {} })).status, 404, 'comando que não existe');
});

test('Workers: a dona cadastra a equipe; a equipe entra, mas não mexe em nada da dona', async () => {
  const add = await dona.pedir('POST', '/api/equipe/adicionar', { corpo: { email: EMAIL_DA_ANA, senha: SENHA_DA_ANA } });
  assert.equal(add.status, 200, add.texto);

  const v = visitante();
  const errada = await v.pedir('POST', '/api/auth/entrar', { corpo: { email: EMAIL_DA_ANA, senha: 'senha errada 999' } });
  assert.equal(errada.status, 401);
  assert.equal(v.temSessao(), false);
  const ok = await v.pedir('POST', '/api/auth/entrar', { corpo: { email: EMAIL_DA_ANA, senha: SENHA_DA_ANA } });
  assert.equal(ok.status, 200, ok.texto);
  ana = v;

  assert.equal((await ana.pedir('GET', '/api/app/estado')).status, 200, 'a equipe usa o app');
  for (const [metodo, caminho, corpo] of [['POST', '/api/admin/statusCredenciais', {}], ['POST', '/api/admin/listarFretes', {}], ['GET', '/api/equipe'], ['POST', '/api/equipe/adicionar', { email: 'b@exemplo.com', senha: 'senha boa 1234' }]]) {
    assert.equal((await ana.pedir(metodo, caminho, { corpo })).status, 403, `${caminho}: só a dona`);
  }
  assert.ok(!(await dona.pedir('GET', '/api/equipe')).texto.match(/hash|"sal"/), 'a lista da equipe nunca traz senha nem sal');
});

test('Workers: pedido que não é JSON ou é grande demais é recusado', async () => {
  const v = visitante();
  assert.equal((await v.pedir('POST', '/api/frete/abc/cotar', { bruto: '{não é json', headers: { 'Content-Type': 'application/json' } })).status, 400);
  assert.equal((await v.pedir('POST', '/api/frete/abc/cotar', { corpo: { cep: 'x'.repeat(300000) } })).status, 413);
  assert.equal((await dona.pedir('POST', '/api/auth/entrar', { corpo: { email: 'a@exemplo.com', senha: 'x'.repeat(70 * 1024) } })).status, 413);
});

/* ── configurar (credenciais e ajustes) ───────────────────────── */
test('Workers: a dona guarda as chaves e os ajustes; as chaves nunca voltam', async () => {
  const vazio = await dona.admin('statusCredenciais');
  assert.equal(vazio.status, 200, vazio.texto);
  assert.equal(vazio.json.data.melhorEnvio.configurado, false);

  const tokenGrande = `ME-${'x'.repeat(2500)}`;
  const grande = await dona.admin('salvarCredenciais', { melhorEnvio: { token: tokenGrande, ambiente: 'sandbox', emailContato: 'novo@exemplo.com' } });
  assert.equal(grande.status, 200, grande.texto);
  assert.ok(!grande.texto.includes(tokenGrande), 'chave enorme também não volta');

  const salvo = await dona.admin('salvarCredenciais', {
    melhorEnvio: { token: mocks.meToken, ambiente: 'sandbox', emailContato: 'contato@exemplo.com' },
    mercadoPago: { accessToken: mocks.mpToken, webhookSecret: mocks.mpSecret },
    remetenteDocumento: CPF_LOJA,
  });
  assert.equal(salvo.status, 200, salvo.texto);
  const status = await dona.admin('statusCredenciais');
  assert.equal(status.json.data.melhorEnvio.configurado, true);
  for (const resposta of [grande.texto, salvo.texto, status.texto]) {
    for (const segredo of [mocks.meToken, mocks.mpToken, mocks.mpSecret, tokenGrande, SEGREDO, SENHA_DE_INSTALACAO]) assert.ok(!resposta.includes(segredo), `vazou ${segredo.slice(0, 10)}…`);
  }

  const ajustes = await dona.admin('salvarAjustes', { ...CONFIG_BASE });
  assert.equal(ajustes.status, 200, ajustes.texto);
  const lidos = await dona.admin('lerAjustes');
  assert.equal(lidos.json.data.origemCep, '89201001');
  assert.equal(lidos.json.data.caixas.length, 2);

  const testar = await dona.admin('testarConexoes');
  assert.equal(testar.status, 200, testar.texto);
});

/* ── o app da live ────────────────────────────────────────────── */
test('Workers: a equipe grava e a dona lê (clientes, vendas, foto); só muda o que mudou', async () => {
  const cliente = { nome: 'Joana Lima', whatsapp: '47999991111', preExistente: false, criadaEm: '2026-10-25' };
  const venda = { data: '2026-10-25', criadaEm: Date.now(), clienteId: 'cj1', codigo: 'B7', peca: 'Saia midi', valor: 59.9, pago: false, fila: [], temFoto: true };
  const g = await ana.pedir('POST', '/api/app/gravar', {
    corpo: { ops: [{ col: 'clientes', id: 'cj1', op: 'set', dados: cliente }, { col: 'vendas', id: 'vj1', op: 'set', dados: venda }, { col: 'fotos', id: 'vj1', op: 'set', dados: { imagem: 'data:image/png;base64,iVBORw0KGgo=' } }] },
  });
  assert.equal(g.status, 200, g.texto);

  const estado = await dona.pedir('GET', '/api/app/estado?desde=0');
  assert.equal(estado.status, 200, estado.texto);
  const ids = estado.json.mudancas.map((m) => `${m.c}/${m.i}`);
  assert.ok(ids.includes('clientes/cj1') && ids.includes('vendas/vj1'));
  assert.ok(!estado.texto.includes('iVBORw0KGgo'), 'fotos não vão junto do estado');
  assert.deepEqual((await dona.pedir('GET', `/api/app/estado?desde=${estado.json.ate}`)).json.mudancas, []);
  assert.deepEqual((await ana.pedir('GET', '/api/app/foto/vj1')).json, { imagem: 'data:image/png;base64,iVBORw0KGgo=' });

  const ruim = await ana.pedir('POST', '/api/app/gravar', { corpo: { ops: [{ col: 'vendas', id: 'v2', op: 'set', dados: { ...venda, valor: -1 } }] } });
  assert.equal(ruim.status, 400);
  assert.equal(ruim.json.codigo, 'dados_invalidos');
  assert.equal((await ana.pedir('POST', '/api/app/gravar', { corpo: { ops: [{ col: 'fretes', id: 'f1', op: 'set', dados: { status: 'pago' } }] } })).status, 400, 'a equipe não escreve em fretes');
  assert.equal((await ana.pedir('GET', '/api/app/estado?c=fretes')).status, 400);
  assert.equal((await ana.pedir('GET', '/api/app/estado?c=privado')).status, 400);

  const juntas = await Promise.all([ana.pedir('POST', '/api/app/gravar', { corpo: { ops: Array.from({ length: 8 }, (_, i) => ({ col: 'clientes', id: `a${i}`, op: 'set', dados: { ...cliente, nome: `A${i}` } })) } }), dona.pedir('POST', '/api/app/gravar', { corpo: { ops: Array.from({ length: 8 }, (_, i) => ({ col: 'clientes', id: `b${i}`, op: 'set', dados: { ...cliente, nome: `B${i}` } })) } })]);
  assert.deepEqual(juntas.map((r) => r.status), [200, 200]);
  const todos = (await dona.pedir('GET', '/api/app/estado?desde=0&c=clientes')).json.mudancas.map((m) => m.i);
  for (let i = 0; i < 8; i += 1) assert.ok(todos.includes(`a${i}`) && todos.includes(`b${i}`), `faltou ${i}`);
});

/* ── Fretes, do começo ao fim ─────────────────────────────────── */
test('Workers: percurso completo — link, CEP, Pix, aviso do Mercado Pago, etiqueta, rastreio (cada passo cabe no limite de chamadas)', async () => {
  const f = await criarEPagar();
  const info = await f.cliente.pedir('GET', `/api/frete/${f.token}`, { rotulo: 'cliente: abrir o link' });
  assert.equal(info.json.status, 'aguardando_pagamento');
  assert.ok(info.json.pix.copiaECola);
  assert.ok(!info.texto.includes(mocks.mpToken));
  assert.ok(!info.texto.includes(dadosCliente().cpf), 'o CPF dela não volta');
  assert.equal((await f.cliente.pedir('GET', `/api/frete/${f.token}/status`, { rotulo: 'cliente: conferir status (Pix pendente)' })).json.status, 'aguardando_pagamento');

  const aviso = (extra) => f.cliente.pedir('POST', `/api/mp/webhook?data.id=${f.idPix}&type=payment`, { corpo: { type: 'payment', action: 'payment.updated', data: { id: f.idPix } }, ...extra });
  assert.equal((await aviso({})).status, 401, 'aviso sem assinatura');
  assert.equal((await aviso({ headers: { 'x-signature': 'lixo' } })).status, 401, 'aviso com assinatura falsa');
  assert.equal((await aviso({ headers: mocks.assinar(f.idPix, 'req-1', '1760000000', 'outro-segredo-qualquer-0123456789') })).status, 401, 'aviso assinado com a chave errada');
  assert.equal((await freteNaLista(f.id)).status, 'aguardando_pagamento');

  mocks.aprovar(f.idPix);
  const wh = await aviso({ headers: mocks.assinar(f.idPix), rotulo: 'webhook do Mercado Pago' });
  assert.equal(wh.status, 200, wh.texto);
  assert.equal((await freteNaLista(f.id)).status, 'pago');

  const et = await dona.admin('gerarEtiqueta', { freteId: f.id });
  assert.equal(et.status, 200, et.texto);
  assert.equal((await freteNaLista(f.id)).status, 'etiqueta');
  assert.equal((await dona.admin('gerarEtiqueta', { freteId: f.id })).status, 200, 'apertar de novo não compra outra etiqueta');
  assert.equal(mocks.orders.size, 1, 'nunca duas etiquetas para o mesmo frete');
  const url = await dona.admin('urlEtiqueta', { freteId: f.id });
  assert.equal(url.status, 200, url.texto);

  mocks.postar(mocks.ultimaEtiqueta().id);
  assert.equal((await dona.admin('atualizarFrete', { freteId: f.id })).status, 200);
  const pub = await f.cliente.pedir('GET', `/api/frete/${f.token}`);
  assert.equal(pub.json.status, 'postado');
  assert.ok(pub.json.rastreio.codigo, 'o código de rastreio aparece para a cliente');
  assert.equal((await dona.admin('cancelarFrete', { freteId: f.id })).status, 400, 'frete já postado não cancela');
});

test('Workers: o limite de tentativas de pagar por link vale também aqui (429)', async () => {
  const c = await dona.admin('criarFrete', { clienteId: 'c9', clienteNome: 'Joana Souza', whatsapp: '47999990000', caixaId: 'p', pesoKg: '0,5' });
  const { token } = c.json.data;
  const cliente = visitante();
  assert.equal((await cliente.pedir('POST', `/api/frete/${token}/cotar`, { corpo: { cep: '01310100' } })).status, 200);
  const status = [];
  for (let i = 0; i < 12; i += 1) status.push((await cliente.pedir('POST', `/api/frete/${token}/pagar`, { corpo: { opcaoId: 'o99', ...dadosCliente() } })).status);
  assert.deepEqual(status.slice(0, 10).filter((s) => s === 429), []);
  assert.deepEqual(status.slice(10), [429, 429]);
});

/* ── rotina agendada (cron) ───────────────────────────────────── */
async function dispararCron() {
  for (const caminho of ['/cdn-cgi/handler/scheduled?cron=*%2F30+*+*+*+*', '/__scheduled?cron=*%2F30+*+*+*+*']) {
    const r = await fetch(`${base}${caminho}`);
    if (r.status === 200) {
      await r.text();
      return;
    }
  }
  throw new Error('Não achei o endereço de teste do cron no wrangler.');
}

/** Espera o Worker parar de chamar os serviços (a rotina termina depois de a resposta do disparo voltar). */
async function esperarAssentar() {
  let ultimo = -1;
  let iguais = 0;
  for (let i = 0; i < 200 && iguais < 4; i += 1) {
    await new Promise((r) => setTimeout(r, 100));
    const agora = mocks.chamadas.length;
    iguais = agora === ultimo ? iguais + 1 : 0;
    ultimo = agora;
  }
}

async function rodada() {
  const antes = mocks.chamadas.length;
  await dispararCron();
  await esperarAssentar();
  return mocks.chamadas.length - antes;
}

test('Workers: a rotina agendada confere vários Pix pendentes de uma vez, dentro do limite de chamadas', async () => {
  const lote = [];
  for (let i = 0; i < 12; i += 1) lote.push(await criarEPagar(`lote${i}`));
  for (const f of lote) mocks.aprovar(f.idPix);
  const lista = async () => (await dona.admin('listarFretes', {})).json.data.mudancas;
  const pagos = async () => {
    const m = await lista();
    return lote.filter((f) => m.find((x) => x.i === f.id).d.status === 'pago').length;
  };
  assert.equal(await pagos(), 0, 'antes da rotina, nenhum aparece como pago (o aviso do Mercado Pago não chegou)');

  const rodadas = [];
  for (let i = 0; i < 6 && (await pagos()) < lote.length; i += 1) {
    const gastou = await rodada();
    rodadas.push({ gastou, pagos: await pagos() });
    assert.ok(gastou <= LIMITE_GRATIS, `rodada ${i + 1} gastou ${gastou} chamadas (limite ${LIMITE_GRATIS})`);
    medidas.push({ rotulo: `rotina (cron), rodada ${i + 1}: ${rodadas[i].pagos} de ${lote.length} pagos`, chamadas: gastou });
  }
  assert.equal(await pagos(), lote.length, `todos pagos ao fim das rodadas: ${JSON.stringify(rodadas)}`);
});

/** Só o teste mexe no relógio do rastreio, direto no arquivo do banco de brinquedo (a rotina só confere de 3 em 3 horas). */
function envelhecerRastreio(freteId) {
  const raizBanco = path.join(pasta, '.wrangler', 'state', 'v3', 'd1');
  const achar = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? achar(path.join(dir, e.name)) : e.name.endsWith('.sqlite') && e.name !== 'metadata.sqlite' ? [path.join(dir, e.name)] : []));
  const arquivos = achar(raizBanco);
  assert.equal(arquivos.length, 1, `esperava 1 banco local, achei ${arquivos.length}`);
  const banco = new DatabaseSync(arquivos[0]);
  try {
    banco.exec('PRAGMA busy_timeout = 5000');
    const r = banco.prepare("UPDATE documentos SET dados = json_set(dados, '$.rastreio.atualizadoEm', 1000) WHERE colecao = 'fretes' AND id = ?").run(freteId);
    assert.equal(Number(r.changes), 1);
  } finally {
    banco.close();
  }
}

test('Workers: a rotina agendada também atualiza etiquetas e postagens, dentro do limite', async () => {
  const fretes = [];
  for (const nome of ['etq1', 'etq2']) {
    const f = await criarEPagar(nome);
    mocks.aprovar(f.idPix);
    const wh = await f.cliente.pedir('POST', `/api/mp/webhook?data.id=${f.idPix}&type=payment`, { corpo: { type: 'payment', action: 'payment.updated', data: { id: f.idPix } }, headers: mocks.assinar(f.idPix) });
    assert.equal(wh.status, 200, wh.texto);
    assert.equal((await dona.admin('gerarEtiqueta', { freteId: f.id })).status, 200);
    assert.equal((await freteNaLista(f.id)).status, 'etiqueta');
    fretes.push(f);
  }
  const [a, b] = fretes;
  const etiquetaDe = async (f) => (await dona.admin('urlEtiqueta', { freteId: f.id })).status;
  assert.equal(await etiquetaDe(a), 200);
  // A etiqueta mais nova do simulador é a do segundo frete; a do primeiro é a anterior.
  const todas = [...mocks.orders.values()];
  mocks.postar(todas[todas.length - 2].id);
  for (const f of fretes) envelhecerRastreio(f.id);

  const gastou = await rodada();
  medidas.push({ rotulo: 'rotina (cron): 1 etiqueta vira postada, 1 segue igual', chamadas: gastou });
  assert.ok(gastou > 0 && gastou <= LIMITE_GRATIS, `gastou ${gastou}`);
  assert.equal((await freteNaLista(a.id)).status, 'postado');
  assert.equal((await freteNaLista(b.id)).status, 'etiqueta');
});

/* ── o que o Worker escreve no log ────────────────────────────── */
test('Workers: o registro do Worker (Logs do painel) não tem chaves, senhas, CPF nem códigos de link', async () => {
  const registro = worker.saida();
  assert.match(registro, /Pix do frete criado/, 'o Worker registra o que faz');
  const proibidos = [mocks.meToken, mocks.mpToken, mocks.mpSecret, SEGREDO, SENHA_DE_INSTALACAO, SENHA_DA_DONA, SENHA_DA_ANA, CPF_LOJA, dadosCliente().cpf, 'dpe_sessao=v1.'];
  for (const segredo of proibidos) assert.ok(!registro.includes(segredo), `o registro mostrou "${segredo.slice(0, 12)}…"`);
  assert.ok(!/\b[A-Za-z0-9]{32}\b.*\/f\//.test(registro), 'nenhum link de cliente no registro');
});
