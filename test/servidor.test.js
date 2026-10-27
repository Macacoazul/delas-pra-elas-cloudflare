/**
 * O servidor completo (src/servidor.js) respondendo pedidos HTTP de verdade, com o banco D1 (SQLite) e os simuladores
 * dos serviços: páginas, login, permissões de cada rota, proteção contra pedidos vindos de outro site, limites,
 * falta de configuração, rotina agendada e log sem segredos.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { criarServidor } from '../src/servidor.js';
import { ROTAS, ACESSOS } from '../src/rotas.js';
import * as Acesso from '../src/acesso.js';
import { criarEcossistema, criarNavegador, ADMIN_SENHA_DE_TESTE, EMAIL_DA_DONA, SENHA_DA_DONA, ORIGEM } from './helpers/ecossistema.js';
import { arquivosDeTeste } from './helpers/site-de-teste.js';
import { dadosCliente, SEGREDO_DE_TESTE } from './helpers/ambiente.js';
import { novoToken } from '../src/cripto.js';

const servidor = criarServidor({ arquivos: arquivosDeTeste() });
const LIMITE_GRATIS_EXTERNAS = 50;
const LIMITE_GRATIS_BANCO = 1000;
const TOKEN_QUALQUER = 'AbCdEf0123456789AbCdEf0123456789';

let eco;
let dona; // navegador da dona, já logado
let equipe; // navegador de uma pessoa da equipe

before(async () => {
  eco = await criarEcossistema();
  dona = criarNavegador(servidor, eco.env);
  await dona.criarDona();
  const r = await dona.pedir('POST', '/api/equipe/adicionar', { corpo: { email: 'ana@exemplo.com', senha: 'senha da ana 123' } });
  assert.equal(r.status, 200, r.texto);
  equipe = criarNavegador(servidor, eco.env);
  await equipe.entrar('ana@exemplo.com', 'senha da ana 123');
});
after(async () => {
  await eco.parar();
});

/** Captura o que o servidor escreve no log. */
async function comLog(fn) {
  const linhas = [];
  const originais = { log: console.log, warn: console.warn, error: console.error };
  for (const k of Object.keys(originais)) console[k] = (...a) => linhas.push(a.join(' '));
  try {
    return { resultado: await fn(), log: linhas.join('\n') };
  } finally {
    Object.assign(console, originais);
  }
}

/** Um pedido qualquer, conferindo que cabe nos limites do plano grátis (chamadas externas e idas ao banco). */
async function pedir(navegador, metodo, caminho, opcoes) {
  const externasAntes = eco.totalDeChamadas();
  const idasAntes = eco.idasAoBanco();
  const r = await navegador.pedir(metodo, caminho, opcoes);
  const externas = eco.totalDeChamadas() - externasAntes;
  const idas = eco.idasAoBanco() - idasAntes;
  assert.ok(externas <= LIMITE_GRATIS_EXTERNAS - 5, `${metodo} ${caminho}: ${externas} chamadas externas (limite ${LIMITE_GRATIS_EXTERNAS}, com folga de 5)`);
  assert.ok(idas <= 40, `${metodo} ${caminho}: ${idas} idas ao banco (limite ${LIMITE_GRATIS_BANCO}; aqui exigimos pouco para a resposta ser rápida)`);
  return { ...r, externas, idas };
}

const visitante = () => criarNavegador(servidor, eco.env);
let ipDoTeste = 0;
const ipNovo = () => ({ 'cf-connecting-ip': `203.0.113.${(ipDoTeste += 1)}` }); // cada teste de bloqueio usa o seu endereço

/* ── páginas ──────────────────────────────────────────────────── */
test('páginas: app, tela de Fretes e link da cliente, com os cabeçalhos certos', async () => {
  const v = visitante();
  const raiz = await pedir(v, 'GET', '/');
  assert.equal(raiz.status, 200);
  assert.match(raiz.texto, /<html/i);
  assert.equal(raiz.headers.get('x-frame-options'), 'DENY');
  assert.equal(raiz.headers.get('x-content-type-options'), 'nosniff');
  assert.match(raiz.headers.get('content-security-policy'), /default-src 'none'/);
  assert.match(raiz.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.match(raiz.headers.get('strict-transport-security'), /max-age/);
  assert.equal(raiz.headers.get('x-robots-tag'), 'noindex, nofollow');

  assert.equal((await pedir(v, 'GET', '/fretes.html')).status, 200);
  assert.equal((await pedir(v, 'GET', '/app.js')).headers.get('content-type'), 'text/javascript; charset=utf-8');

  const link = novoToken();
  const cliente = await pedir(v, 'GET', `/f/${link}`);
  assert.equal(cliente.status, 200);
  assert.match(cliente.texto, /frete\.js/);
  assert.equal(cliente.headers.get('cache-control'), 'no-store');
  assert.equal(cliente.headers.get('referrer-policy'), 'no-referrer');
  assert.equal((await pedir(v, 'GET', `/f/${link}/`)).status, 200);

  for (const ruim of ['/f', '/f/', '/f/curto', `/f/${link}/extra`, `/f/${link}x`, '/f/%2e%2e%2fapp.js', `/f/${'a'.repeat(31)}!`]) {
    assert.equal((await pedir(v, 'GET', ruim)).status, 404, ruim);
  }
  assert.equal((await pedir(v, 'POST', `/f/${link}`, { corpo: {} })).status, 405);
  for (const naoEsta of ['/worker.js', '/servidor.js', '/package.json', '/.env', '/nao-existe', '/src/acesso.js']) assert.equal((await pedir(v, 'GET', naoEsta)).status, 404, naoEsta);
});

test('páginas: o navegador só baixa de novo o que mudou (ETag) e HEAD não devolve corpo', async () => {
  const v = visitante();
  const a = await pedir(v, 'GET', '/app.js');
  const etag = a.headers.get('etag');
  assert.match(etag, /^"[0-9a-f]{16}"$/);
  const igual = await pedir(v, 'GET', '/app.js', { headers: { 'If-None-Match': etag } });
  assert.equal(igual.status, 304);
  assert.equal(igual.texto, '');
  assert.equal((await pedir(v, 'GET', '/app.js', { headers: { 'If-None-Match': '"outro"' } })).status, 200);
  const head = await pedir(v, 'HEAD', '/app.js');
  assert.equal(head.status, 200);
  assert.equal(head.texto, '');
});

/* ── saúde e configuração ─────────────────────────────────────── */
test('/api/saude diz só se está tudo pronto, sem nomes, versões nem segredos, e sem chamadas externas', async () => {
  const v = visitante();
  const r = await pedir(v, 'GET', '/api/saude');
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { ok: true, banco: true, segredo: true, site: true });
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.equal(r.externas, 0);
  assert.equal((await pedir(v, 'POST', '/api/saude', { corpo: {} })).status, 405);

  const semBanco = await pedir(v, 'GET', '/api/saude', { ambiente: { ...eco.env, DB: undefined } });
  assert.equal(semBanco.status, 503);
  assert.deepEqual(semBanco.json, { ok: false, banco: false, segredo: true, site: true });

  const segredoCurto = await pedir(v, 'GET', '/api/saude', { ambiente: { ...eco.env, SEGREDO: 'curto' } });
  assert.deepEqual(segredoCurto.json, { ok: false, banco: true, segredo: false, site: true });
  assert.ok(!segredoCurto.texto.includes('curto'));

  const { SEGREDO: _s, ...semSegredo } = eco.env;
  assert.equal((await pedir(v, 'GET', '/api/saude', { ambiente: semSegredo })).json.segredo, false);
});

test('/api/saude avisa quando falta algum arquivo do site (colagem incompleta)', async () => {
  const { '/fretes.js': _tirado, ...incompleto } = arquivosDeTeste();
  const s = criarServidor({ arquivos: incompleto });
  const r = await criarNavegador(s, eco.env).pedir('GET', '/api/saude');
  assert.equal(r.status, 503);
  assert.equal(r.json.site, false);
  assert.ok(!r.texto.includes('fretes.js'), 'não conta o nome do arquivo para quem pergunta');
});

test('sem configuração: 503 genérico (nunca diz o que falta) e o motivo vai só para o log', async () => {
  const v = visitante();
  for (const [ambiente, faltando] of [
    [{ ...eco.env, DB: undefined }, 'DB'],
    [{ ...eco.env, SEGREDO: '' }, 'SEGREDO'],
    [{ ...eco.env, SEGREDO: 'curto' }, 'SEGREDO'],
  ]) {
    const { resultado: r, log } = await comLog(() => v.pedir('POST', `/api/frete/${TOKEN_QUALQUER}/cotar`, { corpo: { cep: '01310100' }, ambiente }));
    assert.equal(r.status, 503);
    assert.deepEqual(r.json, { erro: 'O servidor ainda não foi configurado.', codigo: 'sem_configuracao' });
    assert.ok(!/SEGREDO|DB|ADMIN_SENHA/.test(r.texto), 'quem visita não vê nomes de configuração');
    assert.match(log, new RegExp(faltando), 'mas o log da loja diz o que falta');
    assert.ok(!log.includes('curto'), 'e nunca o valor');
  }
  assert.equal((await visitante().pedir('GET', '/api/auth/eu', { ambiente: { ...eco.env, DB: undefined } })).status, 503);
  assert.equal((await visitante().pedir('GET', '/', { ambiente: { ...eco.env, DB: undefined } })).status, 200, 'o site continua abrindo (a tela de entrada avisa)');
});

/* ── entrar, sair e a sessão ──────────────────────────────────── */
test('primeiro acesso → sessão → sair, com o cookie do jeito certo', async () => {
  const eco2 = await criarEcossistema();
  try {
    const n = criarNavegador(servidor, eco2.env);
    const antes = await n.pedir('GET', '/api/auth/eu');
    assert.deepEqual(antes.json, { usuario: null, primeiroAcesso: true });

    const errada = await n.pedir('POST', '/api/auth/primeiro-acesso', { corpo: { email: EMAIL_DA_DONA, senha: SENHA_DA_DONA, chave: 'chute' }, headers: ipNovo() });
    assert.equal(errada.status, 403);
    assert.equal(errada.json.codigo, 'chave_errada');
    assert.equal(n.temSessao(), false);

    const ok = await n.pedir('POST', '/api/auth/primeiro-acesso', { corpo: { email: EMAIL_DA_DONA, senha: SENHA_DA_DONA, chave: ADMIN_SENHA_DE_TESTE } });
    assert.equal(ok.status, 200, ok.texto);
    assert.deepEqual(ok.json, { usuario: { email: EMAIL_DA_DONA, papel: 'dono' } });
    const cookie = ok.headers.getSetCookie();
    assert.equal(cookie.length, 1);
    assert.match(cookie[0], /^dpe_sessao=v1\.[\w-]+\.[\w-]+; Path=\/; HttpOnly; SameSite=Strict; Max-Age=1209600; Secure$/);
    assert.ok(!ok.texto.includes('v1.'), 'o token da sessão só vai no cookie, nunca no corpo da resposta');

    const eu = await n.pedir('GET', '/api/auth/eu');
    assert.deepEqual(eu.json, { usuario: { email: EMAIL_DA_DONA, papel: 'dono' } });
    assert.equal(eu.headers.getSetCookie().length, 0, 'sessão nova não precisa ser renovada');

    const outra = criarNavegador(servidor, eco2.env);
    const segunda = await outra.pedir('POST', '/api/auth/primeiro-acesso', { corpo: { email: 'intruso@exemplo.com', senha: SENHA_DA_DONA, chave: ADMIN_SENHA_DE_TESTE } });
    assert.equal(segunda.status, 409, 'depois da primeira conta, a chave não cria mais nada');
    const tardia = await outra.pedir('POST', '/api/auth/primeiro-acesso', { corpo: { email: 'intruso@exemplo.com', senha: SENHA_DA_DONA, chave: 'chute' }, headers: ipNovo() });
    assert.equal(tardia.status, 409, 'depois da primeira conta, nem dá para ficar testando chutes da senha de instalação');
    assert.deepEqual((await outra.pedir('GET', '/api/auth/eu')).json, { usuario: null, primeiroAcesso: false });

    const sair = await n.pedir('POST', '/api/auth/sair');
    assert.equal(sair.status, 200);
    assert.match(sair.headers.getSetCookie()[0], /^dpe_sessao=; Path=\/; HttpOnly; SameSite=Strict; Max-Age=0; Secure$/);
    assert.equal(n.temSessao(), false);
    assert.deepEqual((await n.pedir('GET', '/api/auth/eu')).json, { usuario: null, primeiroAcesso: false });
  } finally {
    await eco2.parar();
  }
});

test('cookie não leva "Secure" quando o teste local roda em http (e leva em https)', async () => {
  const eco2 = await criarEcossistema();
  try {
    const local = criarNavegador(servidor, eco2.env, { origem: 'http://127.0.0.1:8787' });
    const r = await local.criarDona();
    assert.doesNotMatch(r.headers.getSetCookie()[0], /Secure/);
    assert.match(r.headers.getSetCookie()[0], /HttpOnly; SameSite=Strict/);
  } finally {
    await eco2.parar();
  }
});

test('entrar: senha errada e e-mail que não existe dão a mesma resposta; o bloqueio vale mesmo com a senha certa', async () => {
  const ip = ipNovo();
  const v = visitante();
  const errada = await v.pedir('POST', '/api/auth/entrar', { corpo: { email: EMAIL_DA_DONA, senha: 'senha errada 999' }, headers: ip });
  const inexistente = await v.pedir('POST', '/api/auth/entrar', { corpo: { email: 'ninguem@exemplo.com', senha: 'senha errada 999' }, headers: ip });
  assert.equal(errada.status, 401);
  assert.deepEqual(errada.json, inexistente.json);
  assert.equal(v.temSessao(), false);

  const alvo = 'bloqueio@exemplo.com';
  for (let i = 0; i < 6; i += 1) await v.pedir('POST', '/api/auth/entrar', { corpo: { email: alvo, senha: 'senha errada 999' }, headers: ipNovo() });
  const bloqueado = await v.pedir('POST', '/api/auth/entrar', { corpo: { email: alvo, senha: 'senha errada 999' }, headers: ipNovo() });
  assert.equal(bloqueado.status, 429);
  assert.equal(bloqueado.json.codigo, 'muitas_tentativas');
});

test('sessão: cookie adulterado, de outro segredo ou lixo vira "não entrou" (nunca erro de servidor)', async () => {
  const bom = dona.cookies.get('dpe_sessao');
  const [versao, corpo, assinatura] = bom.split('.');
  const falso = Buffer.from(JSON.stringify({ e: EMAIL_DA_DONA, x: 9_999_999_999, v: 1 })).toString('base64url');
  const outroSegredo = await Acesso.criarSessao({ segredo: 'outro-segredo-diferente-bem-longo', now: () => Date.now() }, { email: EMAIL_DA_DONA, sv: 1 });
  const casos = [`${versao}.${falso}.${assinatura}`, `${versao}.${corpo}.${assinatura.slice(0, -3)}AAA`, outroSegredo, 'lixo', '', 'v1..', `v1.${'A'.repeat(900)}.${assinatura}`];
  for (const c of casos) {
    const v = visitante();
    const r = await v.pedir('GET', '/api/auth/eu', { headers: { Cookie: `dpe_sessao=${c}` } });
    assert.equal(r.status, 200, c.slice(0, 30));
    assert.equal(r.json.usuario, null, c.slice(0, 30));
    const adm = await v.pedir('POST', '/api/admin/statusCredenciais', { corpo: {}, headers: { Cookie: `dpe_sessao=${c}` } });
    assert.equal(adm.status, 401, c.slice(0, 30));
  }
});

test('sessão perto de vencer é renovada pelo "quem sou eu"', async () => {
  const quase = await Acesso.criarSessao({ segredo: SEGREDO_DE_TESTE, now: () => Date.now() - 10 * 24 * 3600 * 1000 }, { email: EMAIL_DA_DONA, sv: (await eco.banco.d1.prepare('SELECT sv FROM usuarios WHERE email = ?').bind(EMAIL_DA_DONA).first()).sv });
  const v = visitante();
  const r = await v.pedir('GET', '/api/auth/eu', { headers: { Cookie: `dpe_sessao=${quase}` } });
  assert.equal(r.json.usuario.email, EMAIL_DA_DONA);
  assert.equal(r.headers.getSetCookie().length, 1, 'mandou um cookie novo');
  assert.notEqual(v.cookies.get('dpe_sessao'), quase);
});

/* ── permissões de TODAS as rotas, lendo a tabela ─────────────── */
function caminhoDeExemplo(rota) {
  return rota.caminho.replace(':id', 'x1').replace(':token', TOKEN_QUALQUER).replace(':comando', 'statusCredenciais');
}

test('permissões: o nível de acesso de cada rota é exatamente este (mexer na tabela exige mexer aqui, de propósito)', () => {
  assert.deepEqual(
    ROTAS.map((r) => [r.metodo, r.caminho, r.acesso]),
    [
      ['GET', '/api/auth/eu', 'opcional'],
      ['POST', '/api/auth/entrar', 'publica'],
      ['POST', '/api/auth/primeiro-acesso', 'publica'],
      ['POST', '/api/auth/sair', 'publica'],
      ['POST', '/api/auth/trocar-senha', 'sessao'],
      ['GET', '/api/equipe', 'dono'],
      ['POST', '/api/equipe/adicionar', 'dono'],
      ['POST', '/api/equipe/remover', 'dono'],
      ['POST', '/api/equipe/redefinir-senha', 'dono'],
      ['GET', '/api/app/estado', 'sessao'],
      ['POST', '/api/app/gravar', 'sessao'],
      ['GET', '/api/app/foto/:id', 'sessao'],
      ['POST', '/api/admin/:comando', 'dono'],
      ['GET', '/api/frete/:token', 'publica'],
      ['GET', '/api/frete/:token/status', 'publica'],
      ['POST', '/api/frete/:token/cotar', 'publica'],
      ['POST', '/api/frete/:token/pagar', 'publica'],
      ['POST', '/api/mp/webhook', 'publica'],
    ],
  );
  // Só a cliente (com o link) e o Mercado Pago ficam fora da conferência de origem do pedido.
  assert.deepEqual(
    ROTAS.filter((r) => r.externa).map((r) => `${r.metodo} ${r.caminho}`),
    ['GET /api/frete/:token', 'GET /api/frete/:token/status', 'POST /api/frete/:token/cotar', 'POST /api/frete/:token/pagar', 'POST /api/mp/webhook'],
  );
});

test('permissões: a tabela só usa níveis de acesso conhecidos e toda rota protegida recusa quem não pode', async () => {
  assert.ok(ROTAS.length >= 15);
  for (const r of ROTAS) assert.ok(ACESSOS.includes(r.acesso), `${r.metodo} ${r.caminho}`);
  assert.ok(ROTAS.filter((r) => r.acesso === 'dono').length >= 5);

  for (const r of ROTAS) {
    const caminho = caminhoDeExemplo(r);
    const opcoes = r.metodo === 'POST' ? { corpo: {} } : {};
    const rotulo = `${r.metodo} ${caminho} (${r.acesso})`;

    // Cada rota pode responder 401/403 por outros motivos (senha errada, por exemplo): o que se confere é o CÓDIGO de acesso.
    const barrada = (resp) => resp.json && (resp.json.codigo === 'nao_autenticado' || resp.json.codigo === 'sem_permissao');

    const semLogin = await visitante().pedir(r.metodo, caminho, { ...opcoes, headers: ipNovo() });
    if (r.acesso === 'sessao' || r.acesso === 'dono') {
      assert.equal(semLogin.status, 401, rotulo);
      assert.equal(semLogin.json.codigo, 'nao_autenticado', rotulo);
    } else {
      assert.equal(barrada(semLogin), false, rotulo);
    }

    const comoEquipe = await equipe.clone().pedir(r.metodo, caminho, opcoes);
    if (r.acesso === 'dono') {
      assert.equal(comoEquipe.status, 403, rotulo);
      assert.equal(comoEquipe.json.codigo, 'sem_permissao', rotulo);
    } else {
      assert.equal(barrada(comoEquipe), false, rotulo);
    }

    assert.equal(barrada(await dona.clone().pedir(r.metodo, caminho, opcoes)), false, rotulo);
  }
});

test('rotas: método errado dá 405 com a lista do que vale; endereço que não existe dá 404', async () => {
  const v = visitante();
  const a = await v.pedir('GET', '/api/auth/entrar');
  assert.equal(a.status, 405);
  assert.equal(a.headers.get('allow'), 'POST');
  assert.equal((await v.pedir('DELETE', `/api/frete/${TOKEN_QUALQUER}`)).status, 405);
  assert.equal((await v.pedir('GET', '/api/mp/webhook')).status, 405);
  assert.equal((await v.pedir('PUT', '/api/app/gravar', { corpo: {} })).status, 405, 'o método errado é recusado antes do login');
  assert.equal((await v.pedir('GET', '/api/nao-existe')).status, 404);
  assert.equal((await v.pedir('GET', '/api/')).status, 404);
  assert.equal((await v.pedir('GET', '/api/admin/')).status, 404);
  assert.equal((await dona.pedir('GET', '/api/admin/statusCredenciais')).status, 405);
  assert.equal((await dona.pedir('POST', '/api/admin/naoExiste', { corpo: {} })).status, 404);
  for (const nome of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) assert.equal((await dona.pedir('POST', `/api/admin/${nome}`, { corpo: {} })).status, 404, nome);
  for (const caminho of ['/api/app/foto/%2e%2e', '/api/app/foto/a%2Fb', `/api/app/foto/${'x'.repeat(100)}`]) assert.equal((await equipe.pedir('GET', caminho)).status, 404, caminho);
  assert.equal((await v.pedir('OPTIONS', '/api/auth/entrar')).status, 405, 'não existe CORS: outros sites não têm resposta de pré-verificação');
  const r = await v.pedir('GET', '/api/auth/eu');
  assert.equal(r.headers.get('access-control-allow-origin'), null);
});

/* ── pedidos vindos de outro site (CSRF) e formato do corpo ───── */
test('pedido de outro site é recusado antes de qualquer coisa — com cookie válido ou não', async () => {
  const rotasQueMudamAlgo = ROTAS.filter((r) => r.metodo !== 'GET' && !r.externa);
  assert.ok(rotasQueMudamAlgo.length >= 8);
  const dados = {
    'Origin de outro site': { Origin: 'https://site-do-mal.example', 'Sec-Fetch-Site': 'cross-site' },
    'só Origin de outro site': { Origin: 'https://site-do-mal.example' },
    'Origin nulo (página isolada)': { Origin: 'null' },
    'subdomínio (same-site)': { Origin: ORIGEM, 'Sec-Fetch-Site': 'same-site' },
    'só Sec-Fetch-Site cross-site': { 'Sec-Fetch-Site': 'cross-site' },
    'outra porta': { Origin: 'https://loja.exemplo:8443' },
    'http no lugar de https': { Origin: 'http://loja.exemplo' },
  };
  for (const r of rotasQueMudamAlgo) {
    for (const [nome, cabecalhos] of Object.entries(dados)) {
      const resp = await dona.pedir(r.metodo, caminhoDeExemplo(r), { corpo: {}, headers: cabecalhos, comoNavegador: false });
      assert.equal(resp.status, 403, `${r.metodo} ${r.caminho} — ${nome}`);
      assert.equal(resp.json.codigo, 'origem_invalida');
    }
  }
  const antes = (await eco.banco.d1.prepare('SELECT COUNT(*) AS n FROM usuarios').first()).n;
  const r = await dona.pedir('POST', '/api/equipe/adicionar', { corpo: { email: 'x@exemplo.com', senha: 'senha boa 1234' }, headers: { Origin: 'https://site-do-mal.example' }, comoNavegador: false });
  assert.equal(r.status, 403);
  assert.equal((await eco.banco.d1.prepare('SELECT COUNT(*) AS n FROM usuarios').first()).n, antes, 'nada foi criado');
});

test('pedido de programa (sem Origin) e pedido do próprio site passam; as rotas da cliente não exigem Origin', async () => {
  const v = visitante();
  const semOrigem = await v.pedir('POST', '/api/auth/entrar', { corpo: { email: 'a@exemplo.com', senha: 'senha errada 999' }, comoNavegador: false, headers: ipNovo() });
  assert.equal(semOrigem.status, 401, 'chegou até a conferência da senha');
  const doSite = await v.pedir('POST', '/api/auth/entrar', { corpo: { email: 'a@exemplo.com', senha: 'senha errada 999' }, headers: { ...ipNovo(), 'Sec-Fetch-Site': 'same-origin' } });
  assert.equal(doSite.status, 401);
  const cliente = await v.pedir('POST', `/api/frete/${TOKEN_QUALQUER}/cotar`, { corpo: { cep: '01310100' }, headers: { Origin: 'https://qualquer.example' }, comoNavegador: false });
  assert.equal(cliente.status, 404, 'a rota da cliente responde normalmente (o link nem existe)');
});

test('pedido sem corpo (como "sair") não precisa de tipo de conteúdo; com corpo, só JSON', async () => {
  const sair = criarNavegador(servidor, eco.env);
  await sair.entrar('ana@exemplo.com', 'senha da ana 123');
  const r = await sair.pedir('POST', '/api/auth/sair');
  assert.equal(r.status, 200);
  assert.equal(sair.temSessao(), false);
  const vazio = await dona.pedir('POST', '/api/admin/statusCredenciais', { headers: { 'Content-Length': '0' } });
  assert.equal(vazio.status, 200, 'corpo vazio vale como {}');
});

test('corpo precisa ser JSON: outros tipos de conteúdo são recusados', async () => {
  for (const tipo of ['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x', '', 'application/jsonx']) {
    const r = await dona.pedir('POST', '/api/admin/statusCredenciais', { bruto: '{}', headers: tipo ? { 'Content-Type': tipo } : {} });
    assert.equal(r.status, 415, tipo || '(sem tipo)');
    assert.equal(r.json.codigo, 'tipo_invalido');
  }
  for (const tipo of ['application/json', 'application/json; charset=utf-8', 'Application/JSON']) {
    assert.equal((await dona.pedir('POST', '/api/admin/statusCredenciais', { bruto: '{}', headers: { 'Content-Type': tipo } })).status, 200, tipo);
  }
});

test('corpo: JSON inválido = 400; grande demais = 413 (declarado ou em pedaços), sem tocar nos dados', async () => {
  const ruim = await dona.pedir('POST', '/api/admin/statusCredenciais', { bruto: '{não é json', headers: { 'Content-Type': 'application/json' } });
  assert.equal(ruim.status, 400);
  assert.equal(ruim.json.codigo, 'json_invalido');

  const texto = JSON.stringify({ x: 'y'.repeat(70 * 1024) });
  const grande = await pedir(dona, 'POST', '/api/admin/statusCredenciais', { bruto: texto, headers: { 'Content-Type': 'application/json', 'Content-Length': String(texto.length) } });
  assert.equal(grande.status, 413);
  assert.equal(grande.json.codigo, 'pedido_grande');
  assert.equal(grande.idas, 0, 'com o tamanho declarado, é recusado antes de ir ao banco');
  const semDeclarar = await dona.pedir('POST', '/api/admin/statusCredenciais', { bruto: texto, headers: { 'Content-Type': 'application/json' } });
  assert.equal(semDeclarar.status, 413, 'e sem declarar, o limite vale pelo que chega');

  const pedacos = new ReadableStream({
    start(c) {
      for (let i = 0; i < 10; i += 1) c.enqueue(new TextEncoder().encode('x'.repeat(10 * 1024)));
      c.close();
    },
  });
  const cookie = [...dona.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  const r = await servidor.fetch(new Request(`${ORIGEM}/api/admin/statusCredenciais`, { method: 'POST', body: pedacos, duplex: 'half', headers: { 'Content-Type': 'application/json', Cookie: cookie } }), eco.env);
  assert.equal(r.status, 413, 'sem Content-Length, o limite vale pelo que realmente chega');

  for (const estranho of ['[1,2,3]', '"texto"', 'null', '42']) {
    const e = await dona.pedir('POST', '/api/admin/statusCredenciais', { bruto: estranho, headers: { 'Content-Type': 'application/json' } });
    assert.ok(e.status === 200 || (e.status >= 400 && e.status < 500), `${estranho} → ${e.status}`);
  }
  const login = await visitante().pedir('POST', '/api/auth/entrar', { corpo: { email: 'a@exemplo.com', senha: 'x'.repeat(70 * 1024) } });
  assert.equal(login.status, 413);
});

test('gravar aceita até ~1 MB (uma foto grande cabe) e recusa mais que isso', async () => {
  const foto = `data:image/jpeg;base64,${'A'.repeat(590_000)}`;
  const ok = await equipe.pedir('POST', '/api/app/gravar', { corpo: { ops: [{ col: 'fotos', id: 'grande', op: 'set', dados: { imagem: foto } }] } });
  assert.equal(ok.status, 200, ok.texto.slice(0, 200));
  const enorme = await equipe.pedir('POST', '/api/app/gravar', { corpo: { ops: [{ col: 'fotos', id: 'gigante', op: 'set', dados: { imagem: `data:image/jpeg;base64,${'A'.repeat(1_100_000)}` } }] } });
  assert.equal(enorme.status, 413);
});

/* ── o app da live pelo HTTP ──────────────────────────────────── */
test('app: a equipe grava e lê clientes, vendas, fotos e mensagens; erros voltam em português com código', async () => {
  const cliente = { nome: 'Joana Lima', whatsapp: '47999991111', preExistente: false, criadaEm: '2026-10-25' };
  const venda = { data: '2026-10-25', criadaEm: Date.now(), clienteId: 'cj1', codigo: 'B7', peca: 'Saia midi', valor: 59.9, pago: false, fila: [], temFoto: true };
  const g = await pedir(equipe, 'POST', '/api/app/gravar', { corpo: { ops: [{ col: 'clientes', id: 'cj1', op: 'set', dados: cliente }, { col: 'vendas', id: 'vj1', op: 'set', dados: venda }, { col: 'fotos', id: 'vj1', op: 'set', dados: { imagem: 'data:image/png;base64,iVBORw0KGgo=' } }, { col: 'config', id: 'geral', op: 'set', dados: { abertura: 'Oi, meninas!', fechamento: 'Tchau!' } }] } });
  assert.equal(g.status, 200, g.texto);
  assert.equal(g.json.ok, true);

  const estado = await pedir(dona, 'GET', '/api/app/estado?desde=0');
  assert.equal(estado.status, 200);
  assert.match(estado.headers.get('content-type'), /application\/json/);
  const ids = estado.json.mudancas.map((m) => `${m.c}/${m.i}`);
  assert.ok(ids.includes('clientes/cj1') && ids.includes('vendas/vj1') && ids.includes('config/geral'));
  assert.ok(!estado.texto.includes('iVBORw0KGgo'), 'fotos não vão junto do estado');
  assert.ok(!estado.texto.includes(eco.mocks.mpToken));

  const delta = await pedir(dona, 'GET', `/api/app/estado?desde=${estado.json.ate}`);
  assert.deepEqual(delta.json.mudancas, []);

  const foto = await pedir(equipe, 'GET', '/api/app/foto/vj1');
  assert.deepEqual(foto.json, { imagem: 'data:image/png;base64,iVBORw0KGgo=' });
  assert.equal((await equipe.pedir('GET', '/api/app/foto/nao-tem')).status, 404);

  const ruim = await equipe.pedir('POST', '/api/app/gravar', { corpo: { ops: [{ col: 'vendas', id: 'v2', op: 'set', dados: { ...venda, valor: -1 } }] } });
  assert.equal(ruim.status, 400);
  assert.equal(ruim.json.codigo, 'dados_invalidos');
  assert.match(ruim.json.erro, /Valor inválido/);
  const proibida = await equipe.pedir('POST', '/api/app/gravar', { corpo: { ops: [{ col: 'fretes', id: 'f1', op: 'set', dados: { status: 'pago' } }] } });
  assert.equal(proibida.status, 400);
  assert.equal((await equipe.pedir('GET', '/api/app/estado?c=fretes')).status, 400, 'a equipe não lê fretes pelo app');
  assert.equal((await equipe.pedir('GET', '/api/app/estado?c=privado')).status, 400);
});

test('app: duas pessoas gravando ao mesmo tempo não perdem nada', async () => {
  const ops = (prefixo) => Array.from({ length: 10 }, (_, i) => ({ col: 'clientes', id: `${prefixo}${i}`, op: 'set', dados: { nome: `Cliente ${prefixo}${i}`, whatsapp: '', preExistente: false, criadaEm: '2026-10-25' } }));
  const rs = await Promise.all([equipe.pedir('POST', '/api/app/gravar', { corpo: { ops: ops('a') } }), dona.pedir('POST', '/api/app/gravar', { corpo: { ops: ops('b') } })]);
  assert.deepEqual(rs.map((r) => r.status), [200, 200]);
  const estado = await dona.pedir('GET', '/api/app/estado?desde=0&c=clientes');
  const nomes = estado.json.mudancas.map((m) => m.i);
  for (let i = 0; i < 10; i += 1) assert.ok(nomes.includes(`a${i}`) && nomes.includes(`b${i}`), `faltou ${i}`);
});

/* ── equipe pelo HTTP ─────────────────────────────────────────── */
test('equipe: só a dona cadastra; a pessoa nova entra, troca a senha e é derrubada quando removida', async () => {
  const ana = criarNavegador(servidor, eco.env);
  await ana.entrar('ana@exemplo.com', 'senha da ana 123');
  const outroCelularDaAna = criarNavegador(servidor, eco.env);
  await outroCelularDaAna.entrar('ana@exemplo.com', 'senha da ana 123');

  for (const [metodo, caminho, corpo] of [['GET', '/api/equipe'], ['POST', '/api/equipe/adicionar', { email: 'b@exemplo.com', senha: 'senha boa 1234' }], ['POST', '/api/equipe/remover', { email: 'dona@exemplo.com' }], ['POST', '/api/equipe/redefinir-senha', { email: 'dona@exemplo.com', senha: 'hackeada 12345' }]]) {
    assert.equal((await ana.pedir(metodo, caminho, { corpo })).status, 403, caminho);
  }
  assert.deepEqual((await dona.pedir('GET', '/api/equipe')).json.pessoas.map((p) => [p.email, p.papel]), [[EMAIL_DA_DONA, 'dono'], ['ana@exemplo.com', 'equipe']]);
  assert.ok(!(await dona.pedir('GET', '/api/equipe')).texto.match(/hash|sal"/), 'a lista nunca traz hash nem sal');

  const troca = await ana.pedir('POST', '/api/auth/trocar-senha', { corpo: { atual: 'senha da ana 123', nova: 'senha nova da ana 456' } });
  assert.equal(troca.status, 200, troca.texto);
  assert.equal((await ana.pedir('GET', '/api/auth/eu')).json.usuario.email, 'ana@exemplo.com', 'quem trocou continua logada');
  assert.equal((await outroCelularDaAna.pedir('GET', '/api/app/estado')).status, 401, 'o outro celular precisa entrar de novo');
  const errada = await ana.pedir('POST', '/api/auth/trocar-senha', { corpo: { atual: 'não é essa', nova: 'outra senha qualquer 1' }, headers: ipNovo() });
  assert.equal(errada.status, 403);
  assert.equal(errada.json.codigo, 'senha_atual_errada');

  const reaparece = criarNavegador(servidor, eco.env);
  await reaparece.entrar('ana@exemplo.com', 'senha nova da ana 456');
  assert.equal((await dona.pedir('POST', '/api/equipe/remover', { corpo: { email: 'ana@exemplo.com' } })).status, 200);
  assert.equal((await ana.pedir('GET', '/api/app/estado')).status, 401, 'removida, a sessão que ela tinha deixa de valer na hora');
  assert.equal((await reaparece.pedir('GET', '/api/app/estado')).status, 401);
  assert.equal((await visitante().pedir('POST', '/api/auth/entrar', { corpo: { email: 'ana@exemplo.com', senha: 'senha nova da ana 456' }, headers: ipNovo() })).status, 401);

  // devolve a Ana para os outros testes
  await dona.pedir('POST', '/api/equipe/adicionar', { corpo: { email: 'ana@exemplo.com', senha: 'senha da ana 123' } });
  await equipe.entrar('ana@exemplo.com', 'senha da ana 123');
});

test('equipe: a dona não se remove, e-mail repetido e senha fraca são recusados com mensagem clara', async () => {
  const mesmo = await dona.pedir('POST', '/api/equipe/remover', { corpo: { email: EMAIL_DA_DONA } });
  assert.equal(mesmo.status, 400);
  assert.equal(mesmo.json.codigo, 'nao_remover_a_si');
  const dup = await dona.pedir('POST', '/api/equipe/adicionar', { corpo: { email: 'ANA@exemplo.com', senha: 'senha boa 1234' } });
  assert.equal(dup.status, 409);
  const fraca = await dona.pedir('POST', '/api/equipe/adicionar', { corpo: { email: 'nova@exemplo.com', senha: '123' } });
  assert.equal(fraca.status, 400);
  assert.match(fraca.json.erro, /pelo menos 8/);
});

/* ── comandos da dona ─────────────────────────────────────────── */
test('admin: os tokens guardados nunca voltam em nenhuma resposta', async () => {
  const status = await pedir(dona, 'POST', '/api/admin/statusCredenciais', { corpo: {} });
  assert.equal(status.status, 200, status.texto);
  const todas = [status.texto];
  todas.push((await pedir(dona, 'POST', '/api/admin/lerAjustes', { corpo: {} })).texto);
  todas.push((await pedir(dona, 'POST', '/api/admin/listarFretes', { corpo: {} })).texto);
  todas.push((await pedir(dona, 'GET', '/api/app/estado')).texto);
  todas.push((await pedir(dona, 'GET', '/api/auth/eu')).texto);
  todas.push((await pedir(dona, 'GET', '/api/equipe')).texto);
  todas.push((await pedir(dona, 'GET', '/api/saude')).texto);
  for (const texto of todas) for (const segredo of [eco.mocks.meToken, eco.mocks.mpToken, eco.mocks.mpSecret, SEGREDO_DE_TESTE, ADMIN_SENHA_DE_TESTE, SENHA_DA_DONA]) assert.ok(!texto.includes(segredo), `vazou: ${segredo.slice(0, 12)}…`);
});

test('admin: salvar credenciais cifra no banco e o servidor passa a usá-las', async () => {
  const eco2 = await criarEcossistema({ semDados: true });
  try {
    const n = criarNavegador(servidor, eco2.env);
    await n.criarDona();
    const vazio = await n.admin('statusCredenciais');
    assert.equal(vazio.status, 200);
    assert.equal(vazio.json.data.melhorEnvio.configurado, false);

    const salvo = await n.admin('salvarCredenciais', { melhorEnvio: { token: eco2.mocks.meToken, ambiente: 'sandbox', emailContato: 'contato@exemplo.com' }, mercadoPago: { accessToken: eco2.mocks.mpToken, webhookSecret: eco2.mocks.mpSecret } });
    assert.equal(salvo.status, 200, salvo.texto);
    assert.ok(!salvo.texto.includes(eco2.mocks.meToken) && !salvo.texto.includes(eco2.mocks.mpToken));
    const bruto = eco2.banco.bruto('privado/credenciais');
    assert.match(bruto, /^v1\./);
    assert.ok(!bruto.includes(eco2.mocks.meToken) && !bruto.includes(eco2.mocks.mpToken), 'no banco, os tokens estão cifrados');
    assert.equal(eco2.banco.ler('privado/credenciais').melhorEnvio.token.endsWith(eco2.mocks.meToken.slice(-6)), true);

    const testar = await n.admin('testarConexoes');
    assert.equal(testar.status, 200, testar.texto);
  } finally {
    await eco2.parar();
  }
});

test('admin: ajustes, clientes da live, fretes listados e peças da cliente', async () => {
  const ajustes = await pedir(dona, 'POST', '/api/admin/lerAjustes', { corpo: {} });
  assert.equal(ajustes.status, 200);
  assert.equal(ajustes.json.data.origemCep, '89201001');
  const novo = await pedir(dona, 'POST', '/api/admin/salvarAjustes', { corpo: { ...ajustes.json.data, mensagemLink: 'Oi {nome}! {link}', siteUrl: 'https://brecho.exemplo.workers.dev/' } });
  assert.equal(novo.status, 200, novo.texto);
  assert.equal(novo.json.data.siteUrl, 'https://brecho.exemplo.workers.dev', 'endereço limpo');
  const ruim = await pedir(dona, 'POST', '/api/admin/salvarAjustes', { corpo: { ...ajustes.json.data, siteUrl: 'javascript:alert(1)', origemCep: '123' } });
  assert.equal(ruim.json.data.siteUrl, '');
  assert.equal(ruim.json.data.origemCep, '');
  await dona.pedir('POST', '/api/admin/salvarAjustes', { corpo: ajustes.json.data });

  await equipe.pedir('POST', '/api/app/gravar', { corpo: { ops: [{ col: 'vendas', id: 'vp1', op: 'set', dados: { data: '2026-10-20', criadaEm: 1760918400000, clienteId: 'cp1', codigo: '', peca: 'Vestido', valor: 80, pago: true, fila: [], temFoto: false } }] } });
  const pecas = await pedir(dona, 'POST', '/api/admin/vendasDaCliente', { corpo: { clienteId: 'cp1' } });
  assert.deepEqual(pecas.json.data, [{ data: '2026-10-20', valor: 80 }]);
  assert.equal((await dona.pedir('POST', '/api/admin/vendasDaCliente', { corpo: { clienteId: '../x' } })).status, 400);

  const c = await pedir(dona, 'POST', '/api/admin/criarFrete', { corpo: { clienteId: 'cp1', clienteNome: 'Paula Reis', whatsapp: '47999990001', caixaId: 'm', pesoKg: '1,2' } });
  assert.equal(c.status, 200, c.texto);
  const lista = await pedir(dona, 'POST', '/api/admin/listarFretes', { corpo: {} });
  assert.equal(lista.status, 200);
  const doFrete = lista.json.data.mudancas.find((m) => m.i === c.json.data.id);
  assert.ok(doFrete, 'o frete novo aparece na lista');
  assert.equal(doFrete.d.clienteNome, 'Paula Reis');
  assert.ok(!JSON.stringify(doFrete).match(/cpf|endereco|rua/i), 'só o resumo do frete, sem CPF nem endereço');
  const depois = await dona.pedir('POST', '/api/admin/listarFretes', { corpo: { desde: lista.json.data.ate } });
  assert.deepEqual(depois.json.data.mudancas, []);
});

test('admin: erro de regra volta com a mensagem para a dona e o código', async () => {
  const r = await dona.pedir('POST', '/api/admin/criarFrete', { corpo: { clienteId: 'c1', clienteNome: 'Maria', whatsapp: '47999998888', caixaId: 'caixa-que-nao-existe', pesoKg: '0,8' } });
  assert.equal(r.status, 400);
  assert.equal(r.json.codigo, 'caixa_invalida');
  assert.match(r.json.erro, /caixas/i);
  const id = await dona.pedir('POST', '/api/admin/cancelarFrete', { corpo: { freteId: '../x' } });
  assert.equal(id.status, 400);
  assert.equal(id.json.codigo, 'parametro_invalido');
});

/* ── percurso completo do frete ───────────────────────────────── */
async function criarEPagar() {
  const c = await pedir(dona, 'POST', '/api/admin/criarFrete', { corpo: { clienteId: 'c1', clienteNome: 'Maria da Silva', whatsapp: '47999998888', caixaId: 'p', pesoKg: '0,8' } });
  assert.equal(c.status, 200, c.texto);
  const { id, token } = c.json.data;
  const cliente = visitante();
  const cot = await pedir(cliente, 'POST', `/api/frete/${token}/cotar`, { corpo: { cep: '01310100' } });
  assert.equal(cot.status, 200, cot.texto);
  const pag = await pedir(cliente, 'POST', `/api/frete/${token}/pagar`, { corpo: { opcaoId: cot.json.opcoes[0].id, ...dadosCliente() } });
  assert.equal(pag.status, 200, pag.texto);
  return { id, token, cliente, idPix: eco.banco.ler(`fretes/${id}`).pagamento.id };
}

test('percurso completo: link, CEP, Pix, aviso do Mercado Pago, etiqueta e rastreio — cada passo dentro dos limites', async () => {
  const f = await criarEPagar();
  const info = await pedir(f.cliente, 'GET', `/api/frete/${f.token}`);
  assert.equal(info.status, 200);
  assert.equal(info.json.status, 'aguardando_pagamento');
  assert.ok(info.json.pix.copiaECola);
  assert.ok(!info.texto.includes(eco.mocks.mpToken));

  const falso = await pedir(f.cliente, 'POST', `/api/mp/webhook?data.id=${f.idPix}&type=payment`, { corpo: { type: 'payment', data: { id: f.idPix } }, headers: { 'x-signature': 'lixo' } });
  assert.equal(falso.status, 401);
  assert.equal(falso.idas, 0, 'aviso com assinatura fora do formato nem toca no banco');
  const semAssinatura = await pedir(f.cliente, 'POST', `/api/mp/webhook?data.id=${f.idPix}&type=payment`, { corpo: { type: 'payment', data: { id: f.idPix } } });
  assert.equal(semAssinatura.status, 401);
  assert.equal(eco.banco.ler(`fretes/${f.id}`).status, 'aguardando_pagamento');

  eco.mocks.aprovar(f.idPix);
  const wh = await pedir(f.cliente, 'POST', `/api/mp/webhook?data.id=${f.idPix}&type=payment`, { corpo: { type: 'payment', action: 'payment.updated', data: { id: f.idPix } }, headers: eco.mocks.assinar(f.idPix) });
  assert.equal(wh.status, 200, wh.texto);
  assert.equal(eco.banco.ler(`fretes/${f.id}`).status, 'pago');

  const et = await pedir(dona, 'POST', '/api/admin/gerarEtiqueta', { corpo: { freteId: f.id } });
  assert.equal(et.status, 200, et.texto);
  assert.equal(eco.banco.ler(`fretes/${f.id}`).status, 'etiqueta');
  const dupla = await pedir(dona, 'POST', '/api/admin/gerarEtiqueta', { corpo: { freteId: f.id } });
  assert.equal(dupla.status, 200);
  assert.equal(eco.mocks.orders.size >= 1, true);
  const etiquetasDoFrete = [...eco.mocks.orders.values()].filter((o) => o.id === eco.banco.ler(`fretes/${f.id}`).etiqueta.meId);
  assert.equal(etiquetasDoFrete.length, 1, 'nunca duas etiquetas para o mesmo frete');

  eco.mocks.postar(eco.banco.ler(`fretes/${f.id}`).etiqueta.meId);
  assert.equal((await pedir(dona, 'POST', '/api/admin/atualizarFrete', { corpo: { freteId: f.id } })).status, 200);
  const pub = await pedir(f.cliente, 'GET', `/api/frete/${f.token}`);
  assert.equal(pub.json.status, 'postado');
  const cancelar = await dona.pedir('POST', '/api/admin/cancelarFrete', { corpo: { freteId: f.id } });
  assert.equal(cancelar.status, 400, 'frete já postado não cancela');
});

test('link com código inválido: 404 sem nem ir ao banco', async () => {
  const v = visitante();
  for (const ruim of ['curto', 'x'.repeat(31), 'x'.repeat(33), `${'a'.repeat(31)}!`, `${'a'.repeat(30)}%20x`]) {
    for (const [metodo, sufixo, corpo] of [['GET', ''], ['GET', '/status'], ['POST', '/cotar', { cep: '01310100' }], ['POST', '/pagar', { opcaoId: 'o1', ...dadosCliente() }]]) {
      const r = await pedir(v, metodo, `/api/frete/${ruim}${sufixo}`, corpo ? { corpo } : undefined);
      assert.equal(r.status, 404, `${metodo} ${ruim}${sufixo}`);
      assert.equal(r.json.codigo, 'link_invalido');
      assert.equal(r.idas, 0, `${metodo} ${ruim}${sufixo}: código inválido não pode gastar consulta ao banco`);
    }
  }
});

test('o que a cliente vê não traz CPF, endereço completo nem dados de outras clientes', async () => {
  const f = await criarEPagar();
  const info = await f.cliente.pedir('GET', `/api/frete/${f.token}`);
  assert.ok(!info.texto.includes(dadosCliente().cpf), 'CPF não volta');
  assert.ok(!/fretes_privado|privado|credenciais/.test(info.texto));
  const status = await f.cliente.pedir('GET', `/api/frete/${f.token}/status`);
  assert.equal(status.status, 200);
  assert.ok(!status.texto.includes(dadosCliente().cpf));
});

test('limite por link: depois de 10 tentativas de pagar na hora, responde 429', async () => {
  const c = await dona.pedir('POST', '/api/admin/criarFrete', { corpo: { clienteId: 'c9', clienteNome: 'Joana Souza', whatsapp: '47999990000', caixaId: 'p', pesoKg: '0,5' } });
  const { token } = c.json.data;
  const cliente = visitante();
  assert.equal((await cliente.pedir('POST', `/api/frete/${token}/cotar`, { corpo: { cep: '01310100' } })).status, 200);
  const status = [];
  for (let i = 0; i < 12; i += 1) status.push((await cliente.pedir('POST', `/api/frete/${token}/pagar`, { corpo: { opcaoId: 'o99', ...dadosCliente() } })).status);
  assert.deepEqual(status.slice(0, 10).filter((s) => s === 429), []);
  assert.deepEqual(status.slice(10), [429, 429]);
});

/* ── rotina agendada e log ────────────────────────────────────── */
test('rotina agendada: confere o Pix pendente sozinha e termina dentro dos limites de uma execução', async () => {
  const f = await criarEPagar();
  eco.mocks.aprovar(f.idPix);
  const esperar = [];
  const antes = eco.totalDeChamadas();
  const idasAntes = eco.idasAoBanco();
  const { log } = await comLog(async () => {
    await servidor.scheduled({}, eco.env, { waitUntil: (p) => esperar.push(p) });
    await Promise.all(esperar);
  });
  assert.equal(eco.banco.ler(`fretes/${f.id}`).status, 'pago');
  assert.ok(eco.totalDeChamadas() - antes <= LIMITE_GRATIS_EXTERNAS);
  assert.ok(eco.idasAoBanco() - idasAntes <= LIMITE_GRATIS_BANCO);
  assert.match(log, /Rotina de fretes concluída/);
  assert.ok(!log.includes(eco.mocks.mpToken) && !log.includes(eco.mocks.meToken));
});

test('rotina agendada: sem configuração não faz nada e avisa no log', async () => {
  const esperar = [];
  const { log } = await comLog(async () => {
    await servidor.scheduled({}, { ...eco.env, SEGREDO: '' }, { waitUntil: (p) => esperar.push(p) });
    await Promise.all(esperar);
  });
  assert.match(log, /Rotina de fretes falhou/);
  assert.match(log, /SEGREDO/);
});

test('rotina agendada: esquece bloqueios de login já vencidos', async () => {
  await eco.banco.d1.prepare("INSERT OR REPLACE INTO limites (chave, n, ate) VALUES ('login:e:velho', 9, 1000)").run();
  const esperar = [];
  await comLog(async () => {
    await servidor.scheduled({}, eco.env, { waitUntil: (p) => esperar.push(p) });
    await Promise.all(esperar);
  });
  assert.equal(await eco.banco.d1.prepare("SELECT COUNT(*) AS n FROM limites WHERE chave = 'login:e:velho'").first('n'), 0);
});

test('log: falha de serviço externo é registrada sem Bearer, JWT, chave do Mercado Pago nem CPF', async () => {
  const sujo = http.createServer((req, res) => {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'falhou Bearer SEGREDO1234567890abc eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.assinaturaaaaa APP_USR-1234567890123456-abc 111.444.777-35' }));
  });
  await new Promise((ok) => sujo.listen(0, '127.0.0.1', ok));
  try {
    const f = await criarEPagar();
    const ambienteRuim = { ...eco.env, ENDERECOS_DE_TESTE: JSON.stringify({ ...eco.mocks.urls, mp: `http://127.0.0.1:${sujo.address().port}` }) };
    const esperar = [];
    const { log } = await comLog(async () => {
      await servidor.scheduled({}, ambienteRuim, { waitUntil: (p) => esperar.push(p) });
      await Promise.all(esperar);
    });
    assert.match(log, /falha|erro/i);
    for (const segredo of ['SEGREDO1234567890abc', 'eyJhbGciOiJSUzI1NiJ9', '1234567890123456', '111.444.777-35', f.token]) assert.ok(!log.includes(segredo), `o log vazou ${segredo}`);
  } finally {
    await new Promise((ok) => sujo.close(ok));
  }
});

test('erro inesperado vira 500 genérico, sem detalhes internos', async () => {
  const eco2 = await criarEcossistema();
  try {
    const n = criarNavegador(servidor, eco2.env);
    await n.criarDona();
    eco2.banco.fechar(); // o banco "cai": qualquer ida a ele dá erro
    const { resultado: r, log } = await comLog(() => n.pedir('POST', '/api/admin/statusCredenciais', { corpo: {} }));
    assert.equal(r.status, 500);
    assert.deepEqual(r.json, { erro: 'Algo deu errado do nosso lado. Tente de novo em instantes.', codigo: 'erro_interno' });
    assert.ok(!/sqlite|SQLITE|D1_|database|stack|at \w+ \(/.test(r.texto), r.texto);
    assert.match(log, /Erro não tratado/);
    const saude = await comLog(() => n.pedir('GET', '/api/saude'));
    assert.equal(saude.resultado.status, 503);
    assert.equal(saude.resultado.json.banco, false);
  } finally {
    await eco2.mocks.parar();
  }
});

test('toda resposta da API vem sem cache e sem adivinhação de tipo', async () => {
  for (const [navegador, metodo, caminho, corpo] of [[dona, 'GET', '/api/auth/eu'], [dona, 'POST', '/api/admin/statusCredenciais', {}], [equipe, 'GET', '/api/app/estado'], [visitante(), 'GET', '/api/nao-existe'], [visitante(), 'POST', '/api/auth/entrar', { email: 'a@exemplo.com', senha: 'senha errada 999' }]]) {
    const r = await navegador.pedir(metodo, caminho, { corpo, headers: ipNovo() });
    assert.equal(r.headers.get('cache-control'), 'no-store', caminho);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff', caminho);
    assert.match(r.headers.get('content-type'), /^application\/json/, caminho);
  }
});
