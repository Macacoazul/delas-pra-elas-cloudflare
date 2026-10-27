/**
 * Entrega as páginas do site, que ficam dentro do próprio código do Worker como texto comum
 * (arquivos site-*.js; não existe "pasta de arquivos" quando se cola o código no painel do Cloudflare).
 *
 *   { '/index.html': { tipo: 'text/html; charset=utf-8', etag: 'a1b2c3…', corpo: '<!DOCTYPE html>…' }, … }
 *
 * A compressão para o navegador é feita pela própria Cloudflare. Aqui ficam: cabeçalhos de segurança, ETag (o celular
 * só baixa de novo o que mudou), HEAD, 405 e a página 404.
 */
import { sha256Hex } from './cripto.js';

/** Mesma política que está na tag <meta> do frete.html (um teste confere que as duas não se afastam) + proibição de ser embutida em outro site. */
export const CSP_DA_PAGINA_DO_FRETE =
  "default-src 'none'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

/**
 * Política do app e da tela de Fretes: só código e estilos do próprio site (mais as fontes do Google). Não há script nem
 * estilo escrito dentro das páginas; as telas aplicam os estilos pelo próprio JavaScript, que essa política permite.
 */
export const CSP_DO_APP =
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
export const ARQUIVOS_OBRIGATORIOS = ['/index.html', '/estilo.css', '/app.js', '/biblioteca.js', '/fretes.html', '/fretes.js', '/frete.html', '/frete.js', '/frete.css', '/404.html'];

/**
 * Junta os pacotes de páginas (os arquivos site-*.js) no formato que criarSite() espera.
 * Um arquivo grande vem dividido em partes ({ parte: 1, de: 2, … }), que são coladas na ordem. Aceita só o que está
 * completo e sem repetição: uma parte faltando ou repetida é erro na hora, não uma página quebrada depois.
 *
 * @param {Array<Record<string,{tipo:string,etag?:string,corpo:string,parte?:number,de?:number}>>} pacotes
 * @returns {Record<string,{tipo:string,etag?:string,corpo:string}>}
 */
export function juntarSite(pacotes) {
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
export function criarSite(arquivos) {
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
