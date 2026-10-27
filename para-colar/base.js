/**
 * Delas pra Elas — base.js
 * Peças básicas: textos e dinheiro, criptografia, configuração, chamadas a serviços de fora, banco D1 e entrega do
 * site.
 *
 * Arquivo gerado por "npm run colar" (o texto de verdade fica nas pastas src/, app/ e site/ do projeto).
 * Cole o arquivo INTEIRO, num arquivo com o nome base.js no editor do Cloudflare. Não precisa mudar nada nele.
 *
 * Dentro, nesta ordem: util.js, cripto.js, config.js, http.js, dados.js, banco-d1.js, site.js.
 * Cada bloco é um arquivo de src/ (o mesmo código, com os comentários); o que um arquivo exporta, o bloco entrega
 * no "return" do fim; o que um arquivo importa, o bloco pega do bloco de origem no começo.
 */

/* ────────────────────────────────────────────────────────────────────────────────────────────────────
 * util_js  —  o arquivo src/util.js (o código abaixo é o do arquivo, sem alteração)
 * ──────────────────────────────────────────────────────────────────────────────────────────────────── */
export const util_js = (() => {
/**
 * Funções pequenas e sem dependência externa: dinheiro, CEP, CPF, telefone, texto e limpeza de log.
 * Todo valor em dinheiro circula em CENTAVOS (inteiro) dentro do servidor.
 */

/** "12,50" | "12.5" | 12.5 -> 1250 (centavos) ou null se inválido. */
function paraCentavos(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) return null;
    return Math.round(valor * 100);
  }
  if (typeof valor !== 'string') return null;
  let s = valor.trim().replace(/[^\d,.-]/g, '');
  if (!s) return null;
  // "1.234,56" (pt-BR) vs "1234.56" (API)
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/** 1250 -> 12.5 (para falar com APIs que querem decimal). */
function deCentavos(c) {
  return Math.round(Number(c)) / 100;
}

function reais(c) {
  return (Number(c) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Mantém só dígitos. */
function digitos(v) {
  return String(v === null || v === undefined ? '' : v).replace(/\D/g, '');
}

/** CEP com 8 dígitos ou '' */
function limparCep(v) {
  const d = digitos(v);
  return d.length === 8 ? d : '';
}

function cpfValido(v) {
  const c = digitos(v);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const calc = (base) => {
    let soma = 0;
    for (let i = 0; i < base; i += 1) soma += Number(c[i]) * (base + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(c[9]) && calc(10) === Number(c[10]);
}

function cnpjValido(v) {
  const c = digitos(v);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const calc = (len) => {
    const pesos = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < len; i += 1) soma += Number(c[i]) * pesos[i];
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
}

/** Telefone brasileiro com DDD (10 ou 11 dígitos); aceita +55. Devolve só dígitos ou ''. */
function limparTelefone(v) {
  let d = digitos(v);
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  return d.length === 10 || d.length === 11 ? d : '';
}

function emailValido(v) {
  const s = String(v || '').trim();
  return s.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

/** Texto curto e seguro: sem caracteres de controle, espaços normalizados, tamanho limitado. */
function texto(v, max = 120) {
  return String(v === null || v === undefined ? '' : v)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Texto com várias linhas (mensagens): mantém as quebras de linha, tira só caracteres de controle. */
function textoLongo(v, max = 4000) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, max);
}

function ufValida(v) {
  const uf = String(v || '').trim().toUpperCase();
  return /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(uf) ? uf : '';
}

/** Remove segredos de qualquer texto que vá para o log. */
function limparParaLog(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [oculto]')
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, '[jwt oculto]')
    .replace(/(APP_USR|TEST)-[A-Za-z0-9-]{12,}/g, '$1-[oculto]')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[cpf oculto]')
    .slice(0, 400);
}

return { paraCentavos, deCentavos, reais, digitos, limparCep, cpfValido, cnpjValido, limparTelefone, emailValido, texto, textoLongo, ufValida, limparParaLog };
})();

/* ────────────────────────────────────────────────────────────────────────────────────────────────────
 * cripto_js  —  o arquivo src/cripto.js (o código abaixo é o do arquivo, sem alteração)
 * ──────────────────────────────────────────────────────────────────────────────────────────────────── */
export const cripto_js = (() => {
/**
 * Códigos, tokens e assinaturas. Tudo usa só o que o Cloudflare Workers já traz (WebCrypto, atob/btoa):
 * nenhuma criptografia escrita à mão.
 */
const codificador = new TextEncoder();

function bytesAleatorios(n) {
  const b = new Uint8Array(n);
  globalThis.crypto.getRandomValues(b);
  return b;
}

function paraHex(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 1) s += bytes[i].toString(16).padStart(2, '0');
  return s;
}

/** Base64 "seguro para endereço" (- e _ no lugar de + e /, sem =). */
function paraBase64Url(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < arr.length; i += 1) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Lê base64 ou base64url; ignora o que não é do alfabeto e sobras no fim (nunca lança erro). */
function deBase64(texto) {
  let b64 = String(texto || '').replace(/-/g, '+').replace(/_/g, '/').replace(/[^A-Za-z0-9+/]/g, '');
  if (b64.length % 4 === 1) b64 = b64.slice(0, -1);
  b64 += '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(b64);
  const saida = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) saida[i] = bin.charCodeAt(i);
  return saida;
}

/** Lê base64url exigindo o formato certo (usado ao conferir logins e assinaturas): lança erro se vier algo estranho. */
function deBase64UrlEstrito(texto) {
  const t = String(texto);
  if (!/^[A-Za-z0-9_-]*$/.test(t) || t.length % 4 === 1) throw new Error('base64url inválido');
  const b64 = t.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const saida = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) saida[i] = bin.charCodeAt(i);
  return saida;
}

/** Token do link: 24 bytes aleatórios em base64url (32 caracteres, impossível de adivinhar). */
function novoToken() {
  return paraBase64Url(bytesAleatorios(24));
}

function tokenValido(t) {
  return typeof t === 'string' && /^[A-Za-z0-9_-]{32}$/.test(t);
}

async function sha256Hex(texto) {
  return paraHex(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', codificador.encode(String(texto)))));
}

function chaveHmac(chave, usos) {
  return globalThis.crypto.subtle.importKey('raw', codificador.encode(String(chave)), { name: 'HMAC', hash: 'SHA-256' }, false, usos);
}

/** HMAC-SHA256 em hexadecimal (chave e mensagem em texto UTF-8). */
async function hmacSha256Hex(chave, mensagem) {
  const k = await chaveHmac(chave, ['sign']);
  return paraHex(new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', k, codificador.encode(String(mensagem)))));
}

/** Confere uma assinatura HMAC-SHA256 (hex) em tempo constante (a comparação é feita pelo próprio WebCrypto). */
async function hmacSha256Confere(chave, mensagem, assinaturaHex) {
  if (!/^[0-9a-f]{64}$/i.test(String(assinaturaHex))) return false;
  const assinatura = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) assinatura[i] = parseInt(String(assinaturaHex).slice(i * 2, i * 2 + 2), 16);
  const k = await chaveHmac(chave, ['verify']);
  return globalThis.crypto.subtle.verify('HMAC', k, assinatura, codificador.encode(String(mensagem)));
}

/* ── chaves derivadas do SEGREDO do Worker ───────────────────
   Um segredo só (env.SEGREDO) gera chaves separadas para cada uso (sessão, senhas), de modo que uma nunca serve no lugar da outra. */
async function chaveDerivada(segredo, uso) {
  if (!segredo) throw new Error('Falta o SEGREDO do Worker.');
  const base = await globalThis.crypto.subtle.importKey('raw', codificador.encode(String(segredo)), 'HKDF', false, ['deriveKey']);
  return globalThis.crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: codificador.encode('delas-pra-elas'), info: codificador.encode(String(uso)) },
    base,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    false,
    ['sign', 'verify'],
  );
}

/** Assinatura HMAC-SHA256 em base64url (a chave vem de chaveDerivada). */
async function assinar(chave, texto) {
  return paraBase64Url(new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', chave, codificador.encode(String(texto)))));
}

/** Confere a assinatura em tempo constante (quem compara é o próprio WebCrypto). */
async function assinaturaConfere(chave, texto, assinatura) {
  try {
    return await globalThis.crypto.subtle.verify('HMAC', chave, deBase64UrlEstrito(String(assinatura)), codificador.encode(String(texto)));
  } catch {
    return false;
  }
}

/** Compara dois textos sem pressa diferente para iguais e diferentes. */
async function textosIguais(a, b) {
  const chave = await globalThis.crypto.subtle.importKey('raw', bytesAleatorios(32), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  const sig = await globalThis.crypto.subtle.sign('HMAC', chave, codificador.encode(String(a)));
  return globalThis.crypto.subtle.verify('HMAC', chave, sig, codificador.encode(String(b)));
}

/** UUID v4 determinístico a partir de uma semente (chave de idempotência do Mercado Pago). */
async function uuidDeSemente(semente) {
  const h = (await sha256Hex(semente)).slice(0, 32).split('');
  h[12] = '4';
  h[16] = '89ab'[parseInt(h[16], 16) % 4];
  const s = h.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}

return { bytesAleatorios, paraHex, paraBase64Url, deBase64, deBase64UrlEstrito, novoToken, tokenValido, sha256Hex, hmacSha256Hex, hmacSha256Confere, chaveDerivada, assinar, assinaturaConfere, textosIguais, uuidDeSemente };
})();

/* ────────────────────────────────────────────────────────────────────────────────────────────────────
 * config_js  —  o arquivo src/config.js (o código abaixo é o do arquivo, sem alteração)
 * ──────────────────────────────────────────────────────────────────────────────────────────────────── */
export const config_js = (() => {
/**
 * Lê a configuração do servidor a partir do que o painel do Cloudflare entrega (o objeto `env`).
 * Função pura: recebe `env`, devolve valores já conferidos.
 *
 * Ligações e segredos (criados no painel, nunca escritos no código):
 *   DB                       o banco D1 ligado ao Worker (Configurações → Associações → Banco de dados D1, nome DB).
 *   SEGREDO                  SEGREDO: uma frase longa e aleatória (20+ caracteres). Assina o login, protege as senhas e cifra tokens.
 *   ADMIN_SENHA              SEGREDO: a "senha de instalação" que cria a primeira conta (só é usada uma vez).
 * Opcionais:
 *   ROTINA_LIMITE            quantos fretes a rotina confere por execução (1 a 40; padrão 20).
 *   ENDERECOS_DE_TESTE       só para testes automáticos; só aceita endereços da própria máquina (loopback).
 */
const CHAVES_DE_TESTE = ['viacep', 'mp', 'meSandbox', 'meProducao'];
const SEGREDO_MINIMO = 20;

/** Só http://127.0.0.1, localhost e [::1]: um endereço de teste jamais pode apontar para a internet. */
function enderecoLocal(valor) {
  try {
    const u = new URL(String(valor));
    return u.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname) ? u.href.replace(/\/+$/, '') : '';
  } catch {
    return '';
  }
}

function enderecosDeTeste(texto) {
  if (!texto) return {};
  let bruto;
  try {
    bruto = JSON.parse(String(texto));
  } catch {
    return {};
  }
  const saida = {};
  for (const k of CHAVES_DE_TESTE) {
    const url = bruto && typeof bruto === 'object' ? enderecoLocal(bruto[k]) : '';
    if (url) saida[k] = url;
  }
  return saida;
}

/** @param {Record<string, any>} env */
function lerConfiguracao(env = {}) {
  const segredo = typeof env.SEGREDO === 'string' ? env.SEGREDO : '';
  const problemas = [];
  if (!env.DB) problemas.push('DB');
  if (segredo.length < SEGREDO_MINIMO) problemas.push('SEGREDO');

  return {
    d1: env.DB || null,
    segredo,
    senhaDeInstalacao: typeof env.ADMIN_SENHA === 'string' ? env.ADMIN_SENHA : '',
    enderecos: enderecosDeTeste(env.ENDERECOS_DE_TESTE),
    limiteDaRotina: Math.min(Math.max(Number(env.ROTINA_LIMITE) || 20, 1), 40),
    problemas,
  };
}

return { enderecoLocal, lerConfiguracao };
})();

/* ────────────────────────────────────────────────────────────────────────────────────────────────────
 * http_js  —  o arquivo src/http.js (o código abaixo é o do arquivo, sem alteração)
 * ──────────────────────────────────────────────────────────────────────────────────────────────────── */
export const http_js = (() => {
/**
 * Cliente HTTP único para os serviços externos (Melhor Envio, Mercado Pago, ViaCEP).
 *
 * - Os endereços base ficam fixos no código (nunca vêm de dados do usuário): sem risco de SSRF.
 * - Sem redirecionamento automático, tempo limite curto e resposta limitada.
 * - O log NUNCA recebe corpo, cabeçalhos ou URL completa: só serviço, método, caminho e status.
 */
const { limparParaLog } = util_js;

const LIMITE_RESPOSTA = 2 * 1024 * 1024;

/**
 * @returns {Promise<{ok:boolean,status:number,body:any,erro:string,rede:boolean}>}
 */
async function requisitar(ctx, servico, metodo, url, { headers = {}, json, timeoutMs = 20000 } = {}) {
  const caminho = (() => {
    try {
      return new URL(url).pathname;
    } catch {
      return '';
    }
  })();

  const init = {
    method: metodo,
    redirect: 'manual',
    headers: { Accept: 'application/json', ...headers },
    signal: AbortSignal.timeout(timeoutMs),
  };
  if (json !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(json);
  }

  let resp;
  let bruto = '';
  try {
    resp = await ctx.fetch(url, init);
    bruto = await resp.text();
    if (bruto.length > LIMITE_RESPOSTA) bruto = bruto.slice(0, LIMITE_RESPOSTA);
  } catch (e) {
    ctx.log.warn('Falha de rede ao chamar o serviço', { servico, metodo, caminho, motivo: limparParaLog(e && e.message) });
    return { ok: false, status: 0, body: null, erro: 'Não foi possível conectar ao serviço agora.', rede: true };
  }

  let body = null;
  if (bruto) {
    try {
      body = JSON.parse(bruto);
    } catch {
      body = null;
    }
  }

  const ok = resp.status >= 200 && resp.status < 300;
  const erro = ok ? '' : mensagemDeErro(body);
  if (!ok) {
    ctx.log.warn('O serviço respondeu com erro', { servico, metodo, caminho, status: resp.status, mensagem: erro });
  }
  return { ok, status: resp.status, body, erro, rede: false };
}

/** Extrai uma mensagem curta de corpos de erro comuns (message, error, cause[].description, errors{}). */
function mensagemDeErro(body) {
  if (!body || typeof body !== 'object') return '';
  const partes = [];
  for (const k of ['message', 'error']) {
    if (typeof body[k] === 'string') partes.push(body[k]);
  }
  if (Array.isArray(body.cause)) {
    for (const c of body.cause) {
      if (c && typeof c.description === 'string') partes.push(c.description);
    }
  }
  if (body.errors && typeof body.errors === 'object') {
    for (const [campo, msgs] of Object.entries(body.errors)) {
      const t = Array.isArray(msgs) ? msgs.filter((m) => typeof m === 'string').join(' ') : String(msgs);
      partes.push(`${campo}: ${t}`);
    }
  }
  return limparParaLog(partes.join(' | ')).slice(0, 300);
}

return { requisitar };
})();

/* ────────────────────────────────────────────────────────────────────────────────────────────────────
 * dados_js  —  o arquivo src/dados.js (o código abaixo é o do arquivo, sem alteração)
 * ──────────────────────────────────────────────────────────────────────────────────────────────────── */
export const dados_js = (() => {
/**
 * Acesso aos dados e normalização do que vem do banco.
 *
 * Coleções:
 *  - fretes/{id}            -> visível para a dona logada (tela de Fretes); ESCRITA só pelo servidor
 *  - fretes_privado/{id}    -> endereço completo, CPF, Pix, cotação: NINGUÉM lê pelo navegador
 *  - privado/credenciais    -> tokens do Melhor Envio e do Mercado Pago: NINGUÉM lê pelo navegador
 *  - ajustes/frete           -> ajustes da loja (caixas, CEP de origem...), editáveis pela equipe
 */
const { limparCep, texto, ufValida, limparTelefone, digitos } = util_js;

class ErroNegocio extends Error {
  /**
   * @param {string} codigo   identificador curto (ex.: 'link_invalido')
   * @param {string} mensagem texto para a pessoa, em português
   * @param {number} http     status HTTP quando a chamada é pública
   */
  constructor(codigo, mensagem, http = 400, extra = undefined) {
    super(mensagem);
    this.codigo = codigo;
    this.http = http;
    this.extra = extra;
  }
}

const CAIXAS_PADRAO = [
  { id: 'p', nome: 'Pequena', altura: 6, largura: 20, comprimento: 25 },
  { id: 'm', nome: 'Média', altura: 10, largura: 25, comprimento: 32 },
  { id: 'g', nome: 'Grande', altura: 15, largura: 30, comprimento: 40 },
];

const MENSAGEM_LINK_PADRAO =
  'Oi {nome}! Para receber suas peças, é só abrir o link, digitar o seu CEP e escolher o frete: {link}';

function numeroEntre(v, min, max, padrao) {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : padrao;
}

function normalizarCaixas(lista) {
  if (!Array.isArray(lista)) return CAIXAS_PADRAO.map((c) => ({ ...c }));
  const vistas = new Set();
  const saida = [];
  for (const c of lista.slice(0, 12)) {
    if (!c || typeof c !== 'object') continue;
    const id = texto(c.id, 20).replace(/[^A-Za-z0-9_-]/g, '');
    const altura = numeroEntre(c.altura, 0.5, 105, null);
    const largura = numeroEntre(c.largura, 0.5, 105, null);
    const comprimento = numeroEntre(c.comprimento, 0.5, 105, null);
    if (!id || vistas.has(id) || altura === null || largura === null || comprimento === null) continue;
    vistas.add(id);
    saida.push({ id, nome: texto(c.nome, 40) || id, altura, largura, comprimento });
  }
  return saida.length ? saida : CAIXAS_PADRAO.map((c) => ({ ...c }));
}

function normalizarRemetente(r) {
  const x = r && typeof r === 'object' ? r : {};
  return {
    nome: texto(x.nome, 80),
    telefone: limparTelefone(x.telefone),
    email: texto(x.email, 120),
    cep: limparCep(x.cep),
    endereco: texto(x.endereco, 120),
    numero: texto(x.numero, 20),
    complemento: texto(x.complemento, 60),
    bairro: texto(x.bairro, 60),
    cidade: texto(x.cidade, 60),
    uf: ufValida(x.uf),
  };
}

/** Endereço do site: https em qualquer domínio; http só para teste no próprio computador/rede local. */
const SITE_OK = /^(https:\/\/[A-Za-z0-9.-]+|http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}))(:\d+)?$/;

/** Valida/limita o documento ajustes/frete (a equipe grava direto pelo navegador, então nada é confiado). */
function normalizarConfig(raw) {
  const c = raw && typeof raw === 'object' ? raw : {};
  const transportadoras = Array.isArray(c.transportadoras)
    ? c.transportadoras.map((t) => texto(t, 30)).filter(Boolean).slice(0, 8)
    : ['Correios', 'Jadlog'];
  let siteUrl = typeof c.siteUrl === 'string' ? c.siteUrl.trim().replace(/\/+$/, '') : '';
  if (!SITE_OK.test(siteUrl)) siteUrl = '';
  return {
    origemCep: limparCep(c.origemCep),
    caixas: normalizarCaixas(c.caixas),
    transportadoras: transportadoras.length ? transportadoras : ['Correios', 'Jadlog'],
    mostrarOutras: c.mostrarOutras === true,
    pixValidadeMin: Math.round(numeroEntre(c.pixValidadeMin, 30, 43200, 1440)),
    siteUrl,
    etiquetaPublica: c.etiquetaPublica !== false,
    naoComercial: c.naoComercial !== false,
    valorDeclaradoPadrao: numeroEntre(c.valorDeclaradoPadrao, 1, 10000, 50),
    conteudoPadrao: texto(c.conteudoPadrao, 80) || 'Roupas',
    remetente: normalizarRemetente(c.remetente),
    mensagemLink: texto(c.mensagemLink, 600) || MENSAGEM_LINK_PADRAO,
  };
}

async function lerConfig(ctx) {
  const s = await ctx.db.doc('ajustes/frete').get();
  return normalizarConfig(s.exists ? s.data() : {});
}

/** Credenciais guardadas só no servidor. */
async function lerCredenciais(ctx) {
  const s = await ctx.db.doc('privado/credenciais').get();
  const d = s.exists ? s.data() : {};
  const me = d.melhorEnvio || {};
  const mp = d.mercadoPago || {};
  return {
    me: {
      token: typeof me.token === 'string' ? me.token : '',
      ambiente: me.ambiente === 'producao' ? 'producao' : 'sandbox',
      emailContato: typeof me.emailContato === 'string' ? me.emailContato : '',
    },
    mp: {
      accessToken: typeof mp.accessToken === 'string' ? mp.accessToken : '',
      webhookSecret: typeof mp.webhookSecret === 'string' ? mp.webhookSecret : '',
    },
    remetenteDocumento: digitos(d.remetenteDocumento),
  };
}

const refFrete = (ctx, id) => ctx.db.doc(`fretes/${id}`);
const refPriv = (ctx, id) => ctx.db.doc(`fretes_privado/${id}`);

/** Procura o frete pelo token do link (consulta por igualdade, índice automático). */
async function acharPorToken(ctx, token) {
  const q = await ctx.db.collection('fretes').where('token', '==', token).limit(1).get();
  if (q.empty) return null;
  const d = q.docs[0];
  return { id: d.id, frete: d.data() };
}

return { ErroNegocio, numeroEntre, normalizarConfig, lerConfig, lerCredenciais, refFrete, refPriv, acharPorToken };
})();

/* ────────────────────────────────────────────────────────────────────────────────────────────────────
 * banco_d1_js  —  o arquivo src/banco-d1.js (o código abaixo é o do arquivo, sem alteração)
 * ──────────────────────────────────────────────────────────────────────────────────────────────────── */
export const banco_d1_js = (() => {
/**
 * Banco de dados: o D1 da Cloudflare (SQLite), usado como um "caderno de fichas".
 *
 * Cada ficha é um documento (JSON) guardado pelo par coleção + id, por exemplo "fretes/Ab12…". O resto do servidor
 * conversa com este arquivo pelo mesmo jeito de falar que já usava (doc, collection, where, limit, runTransaction),
 * então a lógica dos fretes não precisou mudar.
 *
 *   db.doc('fretes/abc').get() / .set(dados, { merge }) / .update(dados) / .delete()
 *   db.collection('fretes').doc().id                 id novo
 *   db.collection('fretes').where('status', '==', 'pago').limit(10).get()
 *   db.runTransaction(async (tx) => { const s = await tx.get(ref); tx.update(ref, {...}); })
 *
 * Como as transações funcionam: o D1 não tem transação "aberta" onde se lê, pensa e grava. Então cada documento tem um
 * número de VERSÃO. A transação lê, guarda as versões que viu e, na hora de gravar, manda tudo num lote único que só passa
 * se ninguém tiver mexido nesses documentos no meio do caminho (senão refaz do começo). O lote do D1 é tudo-ou-nada.
 *
 * Coleções "privadas" (tokens, endereço completo, CPF) são gravadas CIFRADAS (AES-GCM) com uma chave derivada do SEGREDO
 * do Worker: quem só enxergar o banco não lê esses dados.
 *
 * Cada gravação também recebe um número de SEQUÊNCIA crescente (seq). É assim que o app pergunta "o que mudou desde o
 * número tal?" sem baixar tudo de novo.
 */
const { bytesAleatorios, paraBase64Url, deBase64UrlEstrito } = cripto_js;

const ESQUEMA_VERSAO = '1';

/** Tudo é "CREATE ... IF NOT EXISTS": rodar de novo não faz mal nem apaga nada. */
const ESQUEMA = [
  `CREATE TABLE IF NOT EXISTS documentos (
     colecao TEXT NOT NULL,
     id      TEXT NOT NULL,
     dados   TEXT NOT NULL,
     versao  INTEGER NOT NULL DEFAULT 1,
     seq     INTEGER NOT NULL,
     apagado INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (colecao, id)
   ) WITHOUT ROWID`,
  'CREATE INDEX IF NOT EXISTS documentos_seq ON documentos (seq)',
  "CREATE INDEX IF NOT EXISTS fretes_token ON documentos (json_extract(dados, '$.token')) WHERE colecao = 'fretes'",
  "CREATE INDEX IF NOT EXISTS fretes_status ON documentos (json_extract(dados, '$.status')) WHERE colecao = 'fretes'",
  "CREATE INDEX IF NOT EXISTS vendas_cliente ON documentos (json_extract(dados, '$.clienteId')) WHERE colecao = 'vendas'",
  // Trava das transações: inserir NULL aqui derruba o lote inteiro (ver gravarComTrava).
  'CREATE TABLE IF NOT EXISTS guarda (ok INTEGER NOT NULL CHECK (ok = 1))',
  `CREATE TABLE IF NOT EXISTS usuarios (
     email  TEXT PRIMARY KEY,
     papel  TEXT NOT NULL,
     sal    TEXT NOT NULL,
     hash   TEXT NOT NULL,
     sv     INTEGER NOT NULL DEFAULT 1,
     criado INTEGER NOT NULL
   ) WITHOUT ROWID`,
  'CREATE TABLE IF NOT EXISTS limites (chave TEXT PRIMARY KEY, n INTEGER NOT NULL, ate INTEGER NOT NULL) WITHOUT ROWID',
  'CREATE TABLE IF NOT EXISTS meta (chave TEXT PRIMARY KEY, valor TEXT NOT NULL) WITHOUT ROWID',
];

const SQL_PROXIMA_SEQ = '(SELECT COALESCE(MAX(seq), 0) + 1 FROM documentos)';

const preparados = new WeakMap(); // banco -> promessa da preparação (pedidos simultâneos esperam a mesma)

/** Cria as tabelas na primeira vez que o Worker acorda (uma vez por instância). */
function prepararEsquema(d1) {
  if (!preparados.has(d1)) {
    const comandos = [...ESQUEMA.map((s) => d1.prepare(s)), d1.prepare("INSERT OR IGNORE INTO meta (chave, valor) VALUES ('esquema', ?)").bind(ESQUEMA_VERSAO)];
    preparados.set(
      d1,
      d1.batch(comandos).catch((e) => {
        preparados.delete(d1); // falhou: o próximo pedido tenta de novo
        throw e;
      }),
    );
  }
  return preparados.get(d1);
}

class ErroDeConflito extends Error {}

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function idAutomatico() {
  const b = bytesAleatorios(20);
  let s = '';
  for (let i = 0; i < 20; i += 1) s += ALFABETO[b[i] % ALFABETO.length];
  return s;
}

/** Recusa o que o banco real também recusaria (valor undefined, função) — pega erro de programação cedo. */
function validar(v, caminho) {
  if (v === undefined) throw new Error(`Banco: valor undefined em "${caminho}"`);
  if (typeof v === 'function') throw new Error(`Banco: função em "${caminho}"`);
  if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`Banco: número inválido em "${caminho}"`);
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const [k, x] of Object.entries(v)) validar(x, `${caminho}.${k}`);
  } else if (Array.isArray(v)) {
    v.forEach((x, i) => validar(x, `${caminho}[${i}]`));
  }
}

const clonar = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

function mesclar(base, novo) {
  const saida = { ...base };
  for (const [k, v] of Object.entries(novo)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && saida[k] && typeof saida[k] === 'object' && !Array.isArray(saida[k])) {
      saida[k] = mesclar(saida[k], v);
    } else {
      saida[k] = clonar(v);
    }
  }
  return saida;
}

const COLECAO_OK = /^[a-z][a-z_]{0,30}$/;
const CAMPO_OK = /^[A-Za-z_][A-Za-z0-9_]{0,40}(\.[A-Za-z_][A-Za-z0-9_]{0,40}){0,3}$/;
const ID_OK = /^[A-Za-z0-9_-]{1,64}$/;

function separar(caminho) {
  const p = String(caminho).split('/');
  if (p.length !== 2 || !COLECAO_OK.test(p[0]) || !ID_OK.test(p[1])) throw new Error(`Banco: caminho inválido "${caminho}"`);
  return { colecao: p[0], id: p[1] };
}

/* ── cifra das coleções privadas ─────────────────────────── */
const codificador = new TextEncoder();
const decodificador = new TextDecoder();

class Cofre {
  constructor(segredo) {
    this.segredo = segredo;
    this.chave = null;
  }

  async obterChave() {
    if (!this.segredo) throw new Error('Banco: falta o SEGREDO para ler/gravar dados privados.');
    if (!this.chave) {
      this.chave = (async () => {
        const base = await globalThis.crypto.subtle.importKey('raw', codificador.encode(this.segredo), 'HKDF', false, ['deriveKey']);
        return globalThis.crypto.subtle.deriveKey(
          { name: 'HKDF', hash: 'SHA-256', salt: codificador.encode('delas-pra-elas'), info: codificador.encode('documentos-privados-v1') },
          base,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt'],
        );
      })();
    }
    return this.chave;
  }

  async cifrar(texto, aad) {
    const iv = bytesAleatorios(12);
    const ct = await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: codificador.encode(aad) }, await this.obterChave(), codificador.encode(texto));
    return `v1.${paraBase64Url(iv)}.${paraBase64Url(new Uint8Array(ct))}`;
  }

  async decifrar(valor, aad) {
    const m = /^v1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(valor);
    if (!m) throw new Error('Banco: dado privado em formato desconhecido.');
    const claro = await globalThis.crypto.subtle.decrypt({ name: 'AES-GCM', iv: deBase64UrlEstrito(m[1]), additionalData: codificador.encode(aad) }, await this.obterChave(), deBase64UrlEstrito(m[2]));
    return decodificador.decode(claro);
  }
}

/* ── documentos ──────────────────────────────────────────── */
class Snap {
  constructor(ref, dados, versao) {
    this.ref = ref;
    this.id = ref.id;
    this._d = dados;
    this._versao = versao;
    this.exists = dados !== undefined;
  }

  data() {
    return this._d === undefined ? undefined : clonar(this._d);
  }
}

class DocRef {
  constructor(banco, caminho) {
    const { colecao, id } = separar(caminho);
    this.banco = banco;
    this.path = caminho;
    this.colecao = colecao;
    this.id = id;
  }

  async get() {
    return (await this.banco._lerVarios([this]))[0];
  }

  async set(dados, opcoes = {}) {
    validar(dados, this.path);
    if (opcoes.merge) {
      await this.banco.runTransaction(async (tx) => {
        await tx.get(this);
        tx.set(this, dados, { merge: true });
      });
      return;
    }
    await this.banco._d1.batch([await this.banco._sqlGravar(this, dados)]);
  }

  async update(dados) {
    validar(dados, this.path);
    await this.banco.runTransaction(async (tx) => {
      await tx.get(this);
      tx.update(this, dados);
    });
  }

  async delete() {
    await this.banco._d1.batch([this.banco._sqlApagar(this)]);
  }
}

class CollRef {
  constructor(banco, nome, filtros = [], limite = null) {
    if (!COLECAO_OK.test(nome)) throw new Error(`Banco: coleção inválida "${nome}"`);
    this.banco = banco;
    this.nome = nome;
    this.filtros = filtros;
    this.limite = limite;
  }

  doc(id) {
    return new DocRef(this.banco, `${this.nome}/${id || idAutomatico()}`);
  }

  where(campo, op, valor) {
    if (op !== '==') throw new Error('Banco: só "==" é suportado');
    if (valor === undefined) throw new Error('Banco: where com undefined');
    if (!CAMPO_OK.test(campo)) throw new Error(`Banco: campo inválido "${campo}"`);
    return new CollRef(this.banco, this.nome, [...this.filtros, { campo, valor }], this.limite);
  }

  limit(n) {
    return new CollRef(this.banco, this.nome, this.filtros, n);
  }

  async get() {
    // O nome da coleção e os campos foram conferidos acima (só letras, números e _): entram direto no texto do SQL para o
    // índice parcial ser usado. Os VALORES sempre vão como parâmetros.
    const filtros = this.filtros.map((f) => `AND json_extract(dados, '$.${f.campo}') = ?`).join(' ');
    const valores = this.filtros.map((f) => (typeof f.valor === 'boolean' ? Number(f.valor) : f.valor));
    const limite = this.limite === null ? '' : `LIMIT ${Math.max(0, Math.min(Number(this.limite) || 0, 5000))}`;
    const sql = `SELECT id, dados, versao FROM documentos WHERE colecao = '${this.nome}' AND apagado = 0 ${filtros} ${limite}`;
    const r = await this.banco._d1.prepare(sql).bind(...valores).all();
    const docs = [];
    for (const linha of r.results || []) {
      const ref = new DocRef(this.banco, `${this.nome}/${linha.id}`);
      docs.push(new Snap(ref, await this.banco._lerDados(ref, linha.dados), linha.versao));
    }
    return { empty: docs.length === 0, size: docs.length, docs };
  }
}

class Tx {
  constructor(banco) {
    this.banco = banco;
    this.lidos = new Map(); // caminho -> { versao, dados }
    this.escritas = [];
  }

  async get(ref) {
    if (this.escritas.length) throw new Error('Banco: leituras devem vir antes das escritas na transação');
    const [s] = await this.getAll([ref]);
    return s;
  }

  async getAll(refs) {
    if (this.escritas.length) throw new Error('Banco: leituras devem vir antes das escritas na transação');
    const snaps = await this.banco._lerVarios(refs);
    snaps.forEach((s, i) => this.lidos.set(refs[i].path, { versao: s.exists ? s._versao : 0, dados: s._d }));
    return snaps;
  }

  set(ref, dados, opcoes = {}) {
    validar(dados, ref.path);
    this.escritas.push({ tipo: 'set', ref, dados: clonar(dados), merge: !!opcoes.merge });
    return this;
  }

  update(ref, dados) {
    validar(dados, ref.path);
    this.escritas.push({ tipo: 'update', ref, dados: clonar(dados) });
    return this;
  }

  delete(ref) {
    this.escritas.push({ tipo: 'delete', ref });
    return this;
  }

  /** Grava tudo de uma vez, se nenhum documento lido mudou. Lança ErroDeConflito se mudou. */
  async commit() {
    if (!this.escritas.length) return;
    // Escritas que dependem do conteúdo atual (mesclar, atualizar) em documentos que a transação ainda não leu: lê agora.
    const faltam = [];
    for (const e of this.escritas) {
      if ((e.tipo === 'update' || (e.tipo === 'set' && e.merge)) && !this.lidos.has(e.ref.path) && !faltam.some((r) => r.path === e.ref.path)) faltam.push(e.ref);
    }
    if (faltam.length) await this.getAllSemTrava(faltam);

    // Estado final de cada documento, aplicando as escritas na ordem.
    const estado = new Map();
    const atual = (ref) => (estado.has(ref.path) ? estado.get(ref.path) : this.lidos.has(ref.path) ? this.lidos.get(ref.path).dados : undefined);
    for (const e of this.escritas) {
      const antes = atual(e.ref);
      if (e.tipo === 'delete') {
        estado.set(e.ref.path, undefined);
      } else if (e.tipo === 'update') {
        if (antes === undefined) throw new Error(`5 NOT_FOUND: ${e.ref.path}`);
        estado.set(e.ref.path, { ...antes, ...clonar(e.dados) });
      } else {
        estado.set(e.ref.path, e.merge && antes !== undefined ? mesclar(antes, e.dados) : clonar(e.dados));
      }
    }

    const sql = [];
    for (const [caminho, { versao }] of this.lidos) {
      const { colecao, id } = separar(caminho);
      sql.push(this.banco._d1.prepare('INSERT INTO guarda (ok) SELECT CASE WHEN COALESCE((SELECT versao FROM documentos WHERE colecao = ? AND id = ? AND apagado = 0), 0) = ? THEN 1 END').bind(colecao, id, versao));
    }
    for (const [caminho, dados] of estado) {
      const ref = new DocRef(this.banco, caminho);
      sql.push(dados === undefined ? this.banco._sqlApagar(ref) : await this.banco._sqlGravar(ref, dados));
    }
    sql.push(this.banco._d1.prepare('DELETE FROM guarda'));
    try {
      await this.banco._d1.batch(sql);
    } catch (e) {
      if (/guarda\.ok/.test(String((e && e.message) || e) + String((e && e.cause && e.cause.message) || ''))) throw new ErroDeConflito('conflito');
      throw e;
    }
  }

  async getAllSemTrava(refs) {
    const snaps = await this.banco._lerVarios(refs);
    snaps.forEach((s, i) => this.lidos.set(refs[i].path, { versao: s.exists ? s._versao : 0, dados: s._d }));
  }
}

class BancoD1 {
  /**
   * @param {object} d1        o banco ligado ao Worker (env.DB)
   * @param {object} [opcoes]
   * @param {string} [opcoes.segredo]   chave-mestra (env.SEGREDO), usada para cifrar as coleções privadas
   * @param {string[]} [opcoes.privadas] coleções gravadas cifradas
   */
  constructor(d1, { segredo = '', privadas = ['privado', 'fretes_privado'] } = {}) {
    this._d1 = d1;
    this._cofre = new Cofre(segredo);
    this._privadas = new Set(privadas);
  }

  doc(caminho) {
    return new DocRef(this, caminho);
  }

  collection(nome) {
    return new CollRef(this, nome);
  }

  async runTransaction(fn, tentativas = 8) {
    for (let i = 1; ; i += 1) {
      const tx = new Tx(this);
      const r = await fn(tx);
      try {
        await tx.commit();
        return r;
      } catch (e) {
        if (!(e instanceof ErroDeConflito) || i >= tentativas) throw e;
        await new Promise((ok) => setTimeout(ok, 5 + Math.floor(Math.random() * 25 * i)));
      }
    }
  }

  async _lerDados(ref, texto) {
    if (this._privadas.has(ref.colecao)) return JSON.parse(await this._cofre.decifrar(texto, ref.path));
    return JSON.parse(texto);
  }

  async _lerVarios(refs) {
    if (!refs.length) return [];
    const stmts = refs.map((r) => this._d1.prepare('SELECT dados, versao FROM documentos WHERE colecao = ? AND id = ? AND apagado = 0').bind(r.colecao, r.id));
    const respostas = refs.length === 1 ? [await stmts[0].all()] : await this._d1.batch(stmts);
    const saida = [];
    for (let i = 0; i < refs.length; i += 1) {
      const linha = (respostas[i].results || [])[0];
      saida.push(linha ? new Snap(refs[i], await this._lerDados(refs[i], linha.dados), linha.versao) : new Snap(refs[i], undefined, 0));
    }
    return saida;
  }

  async _sqlGravar(ref, dados) {
    const json = JSON.stringify(dados);
    if (json.length > 1_500_000) throw new Error(`Banco: documento grande demais em ${ref.path}`);
    const guardado = this._privadas.has(ref.colecao) ? await this._cofre.cifrar(json, ref.path) : json;
    return this._d1
      .prepare(
        `INSERT INTO documentos (colecao, id, dados, versao, seq, apagado) VALUES (?, ?, ?, 1, ${SQL_PROXIMA_SEQ}, 0)
         ON CONFLICT (colecao, id) DO UPDATE SET dados = excluded.dados, versao = documentos.versao + 1, seq = excluded.seq, apagado = 0`,
      )
      .bind(ref.colecao, ref.id, guardado);
  }

  _sqlApagar(ref) {
    return this._d1
      .prepare(`UPDATE documentos SET dados = '{}', apagado = 1, versao = versao + 1, seq = ${SQL_PROXIMA_SEQ} WHERE colecao = ? AND id = ? AND apagado = 0`)
      .bind(ref.colecao, ref.id);
  }
}

/**
 * O que mudou nas coleções pedidas desde a sequência `desde`. Devolve JÁ PRONTO como texto JSON (o SQLite monta; o
 * Worker não precisa abrir e refazer milhares de registros — o plano grátis limita o tempo de processamento):
 *   { "de": <desde>, "ate": <nova sequência>, "completo": true|false, "reiniciar": true (só quando for o caso),
 *     "mudancas": [ { "c": coleção, "i": id, "s": seq, "a": 1 se apagado, "d": documento } ] }
 * Se "completo" for false, ainda há mais: pergunte de novo a partir de "ate".
 * Se "reiniciar" vier, o número informado estava À FRENTE do banco (por exemplo, o banco foi restaurado de um backup):
 * a resposta é a lista inteira, e quem pergunta deve descartar o que tinha guardado.
 */
async function mudancasEmJson(banco, colecoes, desde, { limite = 1500, recentes = null } = {}) {
  const lista = colecoes.map((c) => {
    if (!COLECAO_OK.test(c)) throw new Error('Banco: coleção inválida');
    return `'${c}'`;
  });
  if (!lista.length) throw new Error('Banco: nenhuma coleção pedida');
  const pedido = Math.floor(Number(desde));
  let de = Number.isSafeInteger(pedido) && pedido > 0 ? pedido : 0; // lixo, negativo ou gigante vira "do começo"
  const topo = Math.max(1, Math.min(Math.floor(Number(limite) || 1500), 5000));

  // Primeira vez (desde = 0) de uma coleção só: em vez de começar pelos mais antigos, traz os `n` mais novos pelo campo dado.
  if (recentes && de === 0 && colecoes.length === 1) {
    if (!CAMPO_OK.test(recentes.campo)) throw new Error('Banco: campo inválido');
    const n = Math.max(1, Math.min(Math.floor(Number(recentes.n) || 100), 1000));
    const novos = await banco._d1
      .prepare(
        `SELECT COUNT(*) AS n, (SELECT COALESCE(MAX(seq), 0) FROM documentos) AS ate,
                COALESCE(json_group_array(json_object('c', c, 'i', i, 's', s, 'a', 0, 'd', json(d))), '[]') AS j
         FROM (SELECT colecao AS c, id AS i, seq AS s, dados AS d FROM documentos
               WHERE colecao = ${lista[0]} AND apagado = 0 ORDER BY json_extract(dados, '$.${recentes.campo}') DESC LIMIT ${n})`,
      )
      .first();
    return `{"de":0,"ate":${Number(novos.ate) || 0},"completo":true,"mudancas":${Number(novos.n) ? novos.j : '[]'}}`;
  }

  const consultar = (a) =>
    banco._d1
      .prepare(
        `SELECT COUNT(*) AS n, COALESCE(MAX(s), ?1) AS ate, (SELECT COALESCE(MAX(seq), 0) FROM documentos) AS banco,
                COALESCE(json_group_array(json_object('c', c, 'i', i, 's', s, 'a', a, 'd', CASE WHEN a = 1 THEN NULL ELSE json(d) END)), '[]') AS j
         FROM (SELECT colecao AS c, id AS i, seq AS s, apagado AS a, dados AS d FROM documentos
               WHERE colecao IN (${lista.join(',')}) AND seq > ?1 ORDER BY seq LIMIT ${topo})`,
      )
      .bind(a)
      .first();

  let r = await consultar(de);
  let reiniciar = false;
  if (de > Number(r.banco)) {
    reiniciar = true;
    de = 0;
    r = await consultar(0);
  }
  const n = Number(r.n) || 0;
  return `{"de":${de},"ate":${Number(r.ate) || de},"completo":${n < topo}${reiniciar ? ',"reiniciar":true' : ''},"mudancas":${n ? r.j : '[]'}}`;
}

return { BancoD1, DocRef, CollRef, ErroDeConflito, prepararEsquema, mudancasEmJson, idAutomatico, ESQUEMA, validar, mesclar, clonar, separar };
})();

/* ────────────────────────────────────────────────────────────────────────────────────────────────────
 * site_js  —  o arquivo src/site.js (o código abaixo é o do arquivo, sem alteração)
 * ──────────────────────────────────────────────────────────────────────────────────────────────────── */
export const site_js = (() => {
/**
 * Entrega as páginas do site, que ficam dentro do próprio código do Worker como texto comum
 * (arquivos site-*.js; não existe "pasta de arquivos" quando se cola o código no painel do Cloudflare).
 *
 *   { '/index.html': { tipo: 'text/html; charset=utf-8', etag: 'a1b2c3…', corpo: '<!DOCTYPE html>…' }, … }
 *
 * A compressão para o navegador é feita pela própria Cloudflare. Aqui ficam: cabeçalhos de segurança, ETag (o celular
 * só baixa de novo o que mudou), HEAD, 405 e a página 404.
 */
const { sha256Hex } = cripto_js;

/** Mesma política que está na tag <meta> do frete.html (um teste confere que as duas não se afastam) + proibição de ser embutida em outro site. */
const CSP_DA_PAGINA_DO_FRETE =
  "default-src 'none'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

/**
 * Política do app e da tela de Fretes: só código e estilos do próprio site (mais as fontes do Google). Não há script nem
 * estilo escrito dentro das páginas; as telas aplicam os estilos pelo próprio JavaScript, que essa política permite.
 */
const CSP_DO_APP =
  "default-src 'none'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; worker-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const BASE = {
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000',
};

const PAGINA = {
  ...BASE,
  'Cache-Control': 'no-cache',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()',
  'X-Robots-Tag': 'noindex, nofollow',
  'Content-Security-Policy': CSP_DO_APP,
};

/** O endereço dela tem um código secreto: nada de cache, nada de repassar o endereço a outros sites. */
const PAGINA_DO_FRETE = {
  ...PAGINA,
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': CSP_DA_PAGINA_DO_FRETE,
};

const ARQUIVO = { ...BASE, 'Cache-Control': 'no-cache' };

function cabecalhosDe(caminho, arq) {
  const ehPagina = arq.tipo.startsWith('text/html');
  const base = caminho === '/frete.html' ? PAGINA_DO_FRETE : ehPagina ? PAGINA : ARQUIVO;
  return { ...base, 'Content-Type': arq.tipo };
}

/** Sem estes arquivos o app não funciona; /api/saude avisa quando algum faltar (colagem incompleta). */
const ARQUIVOS_OBRIGATORIOS = ['/index.html', '/estilo.css', '/app.js', '/biblioteca.js', '/fretes.html', '/fretes.js', '/frete.html', '/frete.js', '/frete.css', '/404.html'];

/**
 * Junta os pacotes de páginas (os arquivos site-*.js) no formato que criarSite() espera.
 * Um arquivo grande vem dividido em partes ({ parte: 1, de: 2, … }), que são coladas na ordem. Aceita só o que está
 * completo e sem repetição: uma parte faltando ou repetida é erro na hora, não uma página quebrada depois.
 *
 * @param {Array<Record<string,{tipo:string,etag?:string,corpo:string,parte?:number,de?:number}>>} pacotes
 * @returns {Record<string,{tipo:string,etag?:string,corpo:string}>}
 */
function juntarSite(pacotes) {
  const prontos = {};
  const emPartes = new Map(); // caminho -> { de, tipo, etag, partes: [] }
  for (const pacote of pacotes) {
    for (const [caminho, a] of Object.entries(pacote || {})) {
      if (!a || typeof a.corpo !== 'string' || typeof a.tipo !== 'string') throw new Error(`Site: "${caminho}" está incompleto (falta o texto ou o tipo).`);
      if (a.de === undefined) {
        if (prontos[caminho] || emPartes.has(caminho)) throw new Error(`Site: "${caminho}" aparece em mais de um arquivo site-*.js.`);
        prontos[caminho] = { tipo: a.tipo, etag: a.etag, corpo: a.corpo };
        continue;
      }
      if (prontos[caminho]) throw new Error(`Site: "${caminho}" aparece inteiro e também dividido em partes.`);
      if (!Number.isInteger(a.parte) || !Number.isInteger(a.de) || a.de < 2 || a.parte < 1 || a.parte > a.de) throw new Error(`Site: "${caminho}" tem uma parte inválida.`);
      if (!emPartes.has(caminho)) emPartes.set(caminho, { de: a.de, tipo: a.tipo, etag: a.etag, partes: [] });
      const grupo = emPartes.get(caminho);
      if (grupo.de !== a.de || grupo.tipo !== a.tipo || grupo.etag !== a.etag) throw new Error(`Site: as partes de "${caminho}" não combinam entre si (arquivos de versões diferentes?).`);
      if (grupo.partes[a.parte - 1] !== undefined) throw new Error(`Site: a parte ${a.parte} de "${caminho}" aparece duas vezes.`);
      grupo.partes[a.parte - 1] = a.corpo;
    }
  }
  for (const [caminho, g] of emPartes) {
    const faltam = Array.from({ length: g.de }, (_, i) => i + 1).filter((n) => g.partes[n - 1] === undefined);
    if (faltam.length) throw new Error(`Site: faltam as partes ${faltam.join(', ')} de "${caminho}" (algum arquivo site-*.js não foi colado?).`);
    prontos[caminho] = { tipo: g.tipo, etag: g.etag, corpo: g.partes.join('') };
  }
  return prontos;
}

/**
 * @param {Record<string,{tipo:string,corpo:string,etag?:string}>} arquivos  `etag` (opcional) vem pronto do build;
 *   sem ele, é calculado no primeiro pedido do arquivo.
 */
function criarSite(arquivos) {
  const tabela = new Map(Object.entries(arquivos || {}));
  const etags = new Map();

  const etagDe = async (caminho) => {
    if (!etags.has(caminho)) {
      const arq = tabela.get(caminho);
      etags.set(caminho, `"${arq.etag || (await sha256Hex(arq.corpo)).slice(0, 16)}"`);
    }
    return etags.get(caminho);
  };

  async function responder(pedido, caminho, status, extra = {}) {
    const arq = tabela.get(caminho);
    const cabecalhos = { ...cabecalhosDe(caminho, arq), ETag: await etagDe(caminho), ...extra };
    return new Response(pedido.method === 'HEAD' ? null : arq.corpo, { status, headers: cabecalhos });
  }

  return {
    existe: (caminho) => tabela.has(caminho),

    /** Quais arquivos indispensáveis não estão no site (lista vazia = completo). */
    faltando: () => ARQUIVOS_OBRIGATORIOS.filter((c) => !tabela.has(c)),

    /**
     * Quais arquivos chegaram diferentes do que foi gerado (colagem cortada ou alterada): o código de verificação
     * (etag) calculado na geração precisa bater com o texto que está no Worker. Lista vazia = tudo certo.
     */
    async defeituosos() {
      const ruins = [];
      for (const [caminho, arq] of tabela) {
        if (arq.etag && (await sha256Hex(arq.corpo)).slice(0, 16) !== arq.etag) ruins.push(caminho);
      }
      return ruins;
    },

    /** Responde a um GET/HEAD. `caminho` é o endereço pedido (ou o arquivo que deve ser entregue no lugar dele). */
    async servir(pedido, caminho = new URL(pedido.url).pathname) {
      if (pedido.method !== 'GET' && pedido.method !== 'HEAD') {
        return new Response('Método não permitido.', { status: 405, headers: { ...BASE, Allow: 'GET, HEAD', 'Cache-Control': 'no-store' } });
      }
      const alvo = caminho === '/' ? '/index.html' : caminho;
      if (!tabela.has(alvo)) {
        if (tabela.has('/404.html')) return responder(pedido, '/404.html', 404, { 'Cache-Control': 'no-store' });
        return new Response('Não encontrado.', { status: 404, headers: { ...BASE, 'Cache-Control': 'no-store' } });
      }
      const etag = await etagDe(alvo);
      const jaTem = (pedido.headers.get('if-none-match') || '').split(',').map((s) => s.trim().replace(/^W\//, ''));
      if (jaTem.includes(etag) || jaTem.includes('*')) {
        const cabecalhos = { ...cabecalhosDe(alvo, tabela.get(alvo)), ETag: etag };
        delete cabecalhos['Content-Type'];
        return new Response(null, { status: 304, headers: cabecalhos });
      }
      return responder(pedido, alvo, 200);
    },
  };
}

return { CSP_DA_PAGINA_DO_FRETE, CSP_DO_APP, ARQUIVOS_OBRIGATORIOS, juntarSite, criarSite };
})();
