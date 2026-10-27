/** O site de verdade (pasta site/): cabeçalhos de segurança, política de conteúdo, páginas sem código dentro e peças inteiras. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { criarSite, juntarSite, ARQUIVOS_OBRIGATORIOS, CSP_DA_PAGINA_DO_FRETE, CSP_DO_APP } from '../src/site.js';
import { lerSite } from '../scripts/ler-site.mjs';
import { PROIBIDOS } from '../scripts/proibidos.mjs';

const PASTA = path.join(import.meta.dirname, '..', 'site');
const arquivos = lerSite(PASTA);
const site = criarSite(arquivos);
const pedido = (caminho, { metodo = 'GET', headers = {} } = {}) => new Request(`https://loja.exemplo${caminho}`, { method: metodo, headers });
const original = (arq) => fs.readFileSync(path.join(PASTA, arq), 'utf8').replace(/\r\n/g, '\n');
const paginasHtml = Object.keys(arquivos).filter((c) => c.endsWith('.html'));

test('site: todos os arquivos indispensáveis existem e não sobra arquivo de tipo estranho', () => {
  assert.deepEqual(site.faltando(), []);
  for (const c of ARQUIVOS_OBRIGATORIOS) assert.ok(arquivos[c], c);
  for (const c of Object.keys(arquivos)) assert.match(c, /^\/[a-z0-9.-]+\.(html|js|css)$/, c);
});

test('site: a página inicial sai com os cabeçalhos de segurança de uma página', async () => {
  const r = await site.servir(pedido('/'));
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.match(r.headers.get('strict-transport-security'), /max-age=\d{7,}/);
  assert.equal(r.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.match(r.headers.get('permissions-policy'), /camera=\(self\)/);
  assert.match(r.headers.get('permissions-policy'), /geolocation=\(\)/);
  assert.match(r.headers.get('x-robots-tag'), /noindex/);
  assert.equal(r.headers.get('cache-control'), 'no-cache');
  assert.match(r.headers.get('etag'), /^"[0-9a-f]{16}"$/);
  assert.equal(await r.text(), original('index.html'));
});

test('site: o app e a tela de Fretes levam a política de conteúdo do app, sem "unsafe-inline" nem "unsafe-eval"', async () => {
  for (const caminho of ['/', '/index.html', '/fretes.html', '/404.html']) {
    const r = await site.servir(pedido(caminho));
    assert.equal(r.headers.get('content-security-policy'), CSP_DO_APP, caminho);
  }
  assert.doesNotMatch(CSP_DO_APP, /unsafe-inline|unsafe-eval/);
  assert.match(CSP_DO_APP, /default-src 'none'/);
  assert.match(CSP_DO_APP, /script-src 'self'(;|$)/);
  assert.match(CSP_DO_APP, /connect-src 'self'(;|$)/, 'o app só conversa com o próprio servidor');
  assert.match(CSP_DO_APP, /frame-ancestors 'none'/);
  assert.match(CSP_DO_APP, /form-action 'none'/);
  assert.match(CSP_DO_APP, /base-uri 'none'/);
});

test('site: arquivos de código e estilo têm o tipo certo e sempre conferem se mudaram; só páginas levam X-Frame-Options', async () => {
  for (const [caminho, tipo] of [['/app.js', /^text\/javascript/], ['/fretes.js', /^text\/javascript/], ['/biblioteca.js', /^text\/javascript/], ['/frete.js', /^text\/javascript/], ['/frete.css', /^text\/css/], ['/estilo.css', /^text\/css/]]) {
    const r = await site.servir(pedido(caminho));
    assert.equal(r.status, 200, caminho);
    assert.match(r.headers.get('content-type'), tipo, caminho);
    assert.equal(r.headers.get('cache-control'), 'no-cache', caminho);
    assert.equal(r.headers.get('x-frame-options'), null, caminho);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff', caminho);
    assert.equal(await r.text(), original(caminho.slice(1)), caminho);
  }
});

test('site: If-None-Match devolve 304 sem corpo; HEAD não devolve corpo', async () => {
  const primeiro = await site.servir(pedido('/index.html'));
  const etag = primeiro.headers.get('etag');
  const igual = await site.servir(pedido('/index.html', { headers: { 'if-none-match': etag } }));
  assert.equal(igual.status, 304);
  assert.equal(igual.headers.get('etag'), etag);
  assert.equal((await igual.arrayBuffer()).byteLength, 0);
  assert.equal((await site.servir(pedido('/index.html', { headers: { 'if-none-match': `W/${etag}, "outro"` } }))).status, 304);
  assert.equal((await site.servir(pedido('/index.html', { headers: { 'if-none-match': '"diferente"' } }))).status, 200);

  const cabeca = await site.servir(pedido('/app.js', { metodo: 'HEAD' }));
  assert.equal(cabeca.status, 200);
  assert.equal((await cabeca.arrayBuffer()).byteLength, 0);
  assert.match(cabeca.headers.get('content-type'), /javascript/);
});

test('site: só GET e HEAD', async () => {
  for (const metodo of ['POST', 'PUT', 'DELETE', 'PATCH']) {
    const r = await site.servir(pedido('/index.html', { metodo }));
    assert.equal(r.status, 405, metodo);
    assert.equal(r.headers.get('allow'), 'GET, HEAD');
  }
});

test('site: caminho desconhecido ou perigoso cai na página 404 (sem cache)', async () => {
  for (const caminho of ['/nao-existe', '/__proto__', '/constructor', '/toString', '/../package.json', '/%2e%2e/package.json', '/.env', '/worker.js', '/base.js', '/servidor.js', '/site-live-1.js', '/package.json', '/src/index.js', '/index.html/', '//index.html']) {
    const r = await site.servir(pedido(caminho));
    assert.equal(r.status, 404, caminho);
    assert.equal(r.headers.get('cache-control'), 'no-store', caminho);
    assert.match(await r.text(), /Página não encontrada/, caminho);
  }
});

test('site: a página da cliente leva a política estreita, sem cache e sem repassar o endereço', async () => {
  const r = await site.servir(pedido('/f/x'), '/frete.html');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.equal(r.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(r.headers.get('content-security-policy'), CSP_DA_PAGINA_DO_FRETE);
  assert.match(CSP_DA_PAGINA_DO_FRETE, /frame-ancestors 'none'/);
  assert.match(CSP_DA_PAGINA_DO_FRETE, /default-src 'none'/);
  assert.doesNotMatch(CSP_DA_PAGINA_DO_FRETE, /unsafe-|blob:/);
});

test('site: a política do cabeçalho é a mesma da tag <meta> do frete.html (mais a proibição de ser embutida)', () => {
  const meta = original('frete.html').match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  assert.equal(CSP_DA_PAGINA_DO_FRETE, `${meta}; frame-ancestors 'none'`);
});

test('site: nenhuma página tem código ou estilo escrito dentro dela (a política de conteúdo não deixaria rodar)', () => {
  for (const c of paginasHtml) {
    const html = arquivos[c].corpo;
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)/i, `${c}: <script> com código dentro`);
    assert.doesNotMatch(html, /<script[^>]*\bsrc=[^>]*>[^<]*\S[^<]*<\/script>/i, `${c}: <script src> com texto dentro`);
    assert.doesNotMatch(html, /<style/i, `${c}: <style>`);
    assert.doesNotMatch(html, /\sstyle\s*=/i, `${c}: atributo style`);
    assert.doesNotMatch(html, /\son[a-z]+\s*=/i, `${c}: manipulador de evento escrito na tag (onclick etc.)`);
    assert.doesNotMatch(html, /javascript:/i, `${c}: endereço javascript:`);
    assert.doesNotMatch(html, /<(iframe|object|embed|form)\b/i, `${c}: elemento que a política não permite`);
  }
});

test('site: tudo que as páginas pedem (script, estilo) existe no próprio site e nada vem de outro endereço', () => {
  for (const c of paginasHtml) {
    for (const [, alvo] of arquivos[c].corpo.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
      if (/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(alvo)) continue;
      assert.ok(alvo.startsWith('/') && !alvo.startsWith('//'), `${c}: "${alvo}" aponta para fora do site`);
      assert.ok(arquivos[alvo], `${c}: pede "${alvo}", que não existe`);
    }
  }
});

test('site: nada do sistema antigo, nada de eval e nenhuma chave escrita nos arquivos entregues', () => {
  for (const [c, a] of Object.entries(arquivos)) {
    for (const [padrao, motivo] of PROIBIDOS) assert.doesNotMatch(a.corpo, padrao, `${c}: ${motivo}`);
    assert.doesNotMatch(a.corpo, /\beval\s*\(|new\s+Function\s*\(|document\.write\s*\(/, `${c}: eval/new Function/document.write`);
    assert.doesNotMatch(a.corpo, /APP_USR-[A-Za-z0-9-]{20,}|TEST-[A-Za-z0-9-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|Bearer [A-Za-z0-9._-]{20,}/, `${c}: parece uma chave ou token`);
    assert.doesNotMatch(a.corpo, /sourceMappingURL/, `${c}: referência a mapa de código`);
  }
});

test('site: a página da cliente só escreve texto (nunca HTML montado com dados)', () => {
  assert.doesNotMatch(arquivos['/frete.js'].corpo, /\.innerHTML\s*=|insertAdjacentHTML|outerHTML\s*=/);
});

test('site: as páginas do app e de Fretes não pedem nenhum arquivo de configuração do navegador', () => {
  for (const c of ['/index.html', '/fretes.html']) assert.doesNotMatch(arquivos[c].corpo, /config\.js/, c);
  for (const nome of Object.keys(arquivos)) assert.doesNotMatch(nome, /config/, nome);
});

test('lerSite: recusa tipo desconhecido e junta o fim de linha do Windows (CRLF) ao do resto', () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'site-'));
  try {
    fs.writeFileSync(path.join(pasta, 'a.html'), '<p>um</p>\r\n<p>dois</p>\r\n');
    const lido = lerSite(pasta);
    assert.equal(lido['/a.html'].corpo, '<p>um</p>\n<p>dois</p>\n');
    assert.match(lido['/a.html'].etag, /^[0-9a-f]{16}$/);
    fs.writeFileSync(path.join(pasta, 'dados.xyz'), 'x');
    assert.throws(() => lerSite(pasta), /Tipo de arquivo desconhecido/);
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
  }
});

/* ── arquivos grandes em partes (site-*.js) ───────────────────── */
const parte = (n, de, corpo, extra = {}) => ({ tipo: 'text/javascript; charset=utf-8', etag: 'abc', corpo, parte: n, de, ...extra });

test('juntarSite: une as partes na ordem certa, venham na ordem que vierem, e deixa os arquivos inteiros como estão', () => {
  const inteiro = { tipo: 'text/html; charset=utf-8', etag: 'h', corpo: '<p>oi</p>' };
  const r = juntarSite([{ '/x.js': parte(2, 3, 'DDDD\nEEEE\n') }, { '/a.html': inteiro }, { '/x.js': parte(3, 3, 'FFFF') }, { '/x.js': parte(1, 3, 'AAAA\nBBBB\n') }]);
  assert.deepEqual(Object.keys(r).sort(), ['/a.html', '/x.js']);
  assert.equal(r['/x.js'].corpo, 'AAAA\nBBBB\nDDDD\nEEEE\nFFFF');
  assert.equal(r['/x.js'].etag, 'abc');
  assert.deepEqual(r['/a.html'], inteiro);
  assert.deepEqual(juntarSite([]), {});
  assert.deepEqual(juntarSite([undefined]), {});
});

test('juntarSite: recusa parte faltando, repetida, de outra versão, inteiro repetido ou item malformado', () => {
  assert.throws(() => juntarSite([{ '/x.js': parte(1, 2, 'AAAA') }]), /faltam as partes 2/);
  assert.throws(() => juntarSite([{ '/x.js': parte(2, 3, 'B') }, { '/x.js': parte(3, 3, 'C') }]), /faltam as partes 1/);
  assert.throws(() => juntarSite([{ '/x.js': parte(1, 2, 'AAAA') }, { '/x.js': parte(1, 2, 'AAAA') }]), /duas vezes/);
  assert.throws(() => juntarSite([{ '/x.js': parte(1, 2, 'AAAA') }, { '/x.js': parte(2, 2, 'BBBB', { etag: 'outra' }) }]), /não combinam/);
  assert.throws(() => juntarSite([{ '/x.js': parte(1, 2, 'AAAA') }, { '/x.js': parte(2, 3, 'BBBB') }]), /não combinam/);
  assert.throws(() => juntarSite([{ '/x.js': parte(0, 2, 'A') }]), /parte inválida/);
  assert.throws(() => juntarSite([{ '/x.js': parte(3, 2, 'A') }]), /parte inválida/);
  assert.throws(() => juntarSite([{ '/x.js': parte(1, 1, 'A') }]), /parte inválida/);
  assert.throws(() => juntarSite([{ '/x.js': { tipo: 'text/javascript', corpo: 'a' } }, { '/x.js': { tipo: 'text/javascript', corpo: 'b' } }]), /mais de um arquivo/);
  assert.throws(() => juntarSite([{ '/x.js': { tipo: 'text/javascript', corpo: 'a' } }, { '/x.js': parte(1, 2, 'b') }]), /inteiro e também dividido/);
  assert.throws(() => juntarSite([{ '/x.js': { tipo: 'text/html' } }]), /incompleto/);
  assert.throws(() => juntarSite([{ '/x.js': null }]), /incompleto/);
});

test('defeituosos: acha a página cujo texto não bate com o código de verificação (colagem cortada ou alterada)', async () => {
  assert.deepEqual(await site.defeituosos(), [], 'o site gerado está inteiro');
  const mexido = structuredClone(arquivos);
  mexido['/app.js'].corpo = mexido['/app.js'].corpo.slice(0, -10);
  mexido['/frete.css'].corpo += ' ';
  const s = criarSite(mexido);
  assert.deepEqual((await s.defeituosos()).sort(), ['/app.js', '/frete.css']);
  const semCodigo = structuredClone(arquivos);
  delete semCodigo['/app.js'].etag;
  assert.deepEqual(await criarSite(semCodigo).defeituosos(), [], 'sem código de verificação não há o que conferir');
});
