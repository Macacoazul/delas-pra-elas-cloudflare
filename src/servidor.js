/**
 * Delas pra Elas — um servidor só, no Cloudflare Workers (plano grátis), com o site dentro e o banco D1.
 *
 *   /                       o app da live (login da equipe, clientes, vendas, calendário)
 *   /fretes.html            a tela de Fretes (só a dona)
 *   /f/<código>             a página que a cliente abre para escolher o frete e pagar
 *   /api/...                a API (veja a tabela em rotas.js: cada rota diz quem pode chamar)
 *   a cada 30 minutos       rotina: confere os Pix pendentes e atualiza o rastreio
 *
 * Aqui ficam só as regras que valem para TODAS as rotas: configuração, origem do pedido, tamanho do corpo,
 * login, formato das respostas e registro. O assunto de cada rota fica nos arquivos rotas-*.js.
 */
import { lerConfiguracao } from './config.js';
import { criarSite } from './site.js';
import { BancoD1, prepararEsquema } from './banco-d1.js';
import { usuarioDaSessao, cookieDeSessao, cookieDeSaida, limparLimites } from './acesso.js';
import { achar } from './rotas.js';
import { rotina } from './fretes.js';
import { ErroNegocio } from './dados.js';
import { tokenValido } from './cripto.js';
import { limparParaLog } from './util.js';

/** Plano grátis: no máximo 50 chamadas externas por execução. Guardamos folga; a rotina usa esta conta para parar a tempo. */
const ORCAMENTO_DE_CHAMADAS = 44;

const CABECALHOS_DA_API = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000',
};

/* ── registro (uma linha JSON por evento; tokens, CPF e chaves são removidos antes de escrever) ── */
function escrever(nivel, mensagem, dados) {
  const linha = { nivel, mensagem: limparParaLog(mensagem) };
  for (const [k, v] of Object.entries(dados || {})) linha[k] = typeof v === 'number' || typeof v === 'boolean' ? v : limparParaLog(typeof v === 'string' ? v : JSON.stringify(v));
  (nivel === 'info' ? console.log : nivel === 'warn' ? console.warn : console.error)(JSON.stringify(linha));
}
const log = {
  info: (mensagem, dados) => escrever('info', mensagem, dados),
  warn: (mensagem, dados) => escrever('warn', mensagem, dados),
  error: (mensagem, dados) => escrever('error', mensagem, dados),
};

/* ── respostas ── */
/** @param {{http:number,corpo?:object,texto?:string,sessao?:{token?:string,sair?:boolean}}} r */
function resposta(r, seguro, extra = {}) {
  const cabecalhos = new Headers({ ...CABECALHOS_DA_API, ...extra });
  if (r.sessao) cabecalhos.append('Set-Cookie', r.sessao.sair ? cookieDeSaida(seguro) : cookieDeSessao(r.sessao.token, seguro));
  return new Response(r.texto !== undefined ? r.texto : JSON.stringify(r.corpo), { status: r.http, headers: cabecalhos });
}
const falha = (http, codigo, mensagem, extra) => resposta({ http, corpo: { erro: mensagem, codigo } }, true, extra);

/** Cria o que as rotas usam: banco, chamadas externas contadas (para o orçamento do plano grátis) e endereços. */
function montarContexto(cfg, agora) {
  // No Workers, passar o fetch "solto" adiante dá "Illegal invocation": por isso o embrulho (que também conta as chamadas).
  let gastas = 0;
  const buscar = (...args) => {
    gastas += 1;
    return globalThis.fetch(...args);
  };
  return {
    d1: cfg.d1,
    db: new BancoD1(cfg.d1, { segredo: cfg.segredo }),
    segredo: cfg.segredo,
    senhaDeInstalacao: cfg.senhaDeInstalacao,
    fetch: buscar,
    now: agora,
    urls: { viacep: cfg.enderecos.viacep, mp: cfg.enderecos.mp, meSandbox: cfg.enderecos.meSandbox, meProducao: cfg.enderecos.meProducao },
    log,
    dormir: (ms) => new Promise((r) => setTimeout(r, ms)),
    limiteRotina: cfg.limiteDaRotina,
    chamadasRestantes: () => ORCAMENTO_DE_CHAMADAS - gastas,
  };
}

/**
 * Pedido que muda algo e usa o cookie de login só vale se vier do próprio site. Navegadores sempre mandam Origin e
 * Sec-Fetch-Site; quem não manda (um programa, não um navegador) não carrega o cookie de ninguém.
 */
function veioDoProprioSite(request, url) {
  const origem = request.headers.get('origin');
  if (origem !== null && origem !== url.origin) return false;
  const de = request.headers.get('sec-fetch-site');
  return de === null || de === 'same-origin' || de === 'none';
}

/** Lê o corpo JSON sem aceitar mais que o limite (confere o tamanho declarado e também o que de fato chega). */
async function lerCorpo(request, limite) {
  const grande = { ok: false, http: 413, codigo: 'pedido_grande', mensagem: 'Pedido grande demais.' };
  if (Number(request.headers.get('content-length')) > limite) return grande;
  const partes = [];
  let total = 0;
  if (request.body) {
    const leitor = request.body.getReader();
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      total += value.byteLength;
      if (total > limite) {
        await leitor.cancel();
        return grande;
      }
      partes.push(value);
    }
  }
  const bytes = new Uint8Array(total);
  let posicao = 0;
  for (const p of partes) {
    bytes.set(p, posicao);
    posicao += p.byteLength;
  }
  const texto = new TextDecoder().decode(bytes);
  if (!texto.trim()) return { ok: true, corpo: {} };
  try {
    return { ok: true, corpo: JSON.parse(texto) };
  } catch {
    return { ok: false, http: 400, codigo: 'json_invalido', mensagem: 'O pedido não está em formato JSON.' };
  }
}

/* ── API ── */
async function api(request, cfg, url, site, agora) {
  const caminho = url.pathname.replace(/\/+$/, '') || '/';
  const seguro = url.protocol === 'https:';

  if (caminho === '/api/saude') return request.method === 'GET' ? saude(cfg, site) : falha(405, 'metodo_nao_permitido', 'Método não permitido.', { Allow: 'GET' });

  const achada = achar(request.method, caminho);
  if (!achada) return falha(404, 'nao_encontrado', 'Não encontrado.');
  if (achada.permitidos) return falha(405, 'metodo_nao_permitido', 'Método não permitido.', { Allow: achada.permitidos.join(', ') });
  const { rota, params } = achada;

  if (cfg.problemas.length) {
    log.error('Servidor sem configuração', { faltando: cfg.problemas.join(', ') });
    return falha(503, 'sem_configuracao', 'O servidor ainda não foi configurado.');
  }

  const mudaAlgo = request.method !== 'GET';
  if (mudaAlgo && !rota.externa) {
    if (!veioDoProprioSite(request, url)) return falha(403, 'origem_invalida', 'Pedido recusado: ele não veio do site.');
    const temCorpo = request.body !== null && request.headers.get('content-length') !== '0';
    if (temCorpo && !/^application\/json\b/i.test(request.headers.get('content-type') || '')) return falha(415, 'tipo_invalido', 'O pedido precisa ser JSON.');
  }
  if (Number(request.headers.get('content-length')) > rota.corpoMax) return falha(413, 'pedido_grande', 'Pedido grande demais.');

  const ctx = montarContexto(cfg, agora);
  await prepararEsquema(cfg.d1);

  let eu = null;
  if (rota.acesso !== 'publica') {
    eu = await usuarioDaSessao(ctx, request.headers.get('cookie'));
    if (!eu && (rota.acesso === 'sessao' || rota.acesso === 'dono')) return falha(401, 'nao_autenticado', 'Entre com o seu e-mail e senha.');
    if (rota.acesso === 'dono' && eu.papel !== 'dono') return falha(403, 'sem_permissao', 'Só a dona pode fazer isso.');
  }

  const lido = mudaAlgo ? await lerCorpo(request, rota.corpoMax) : { ok: true, corpo: {} };
  if (!lido.ok) return falha(lido.http, lido.codigo, lido.mensagem);

  const pedido = {
    metodo: request.method,
    caminho,
    consulta: Object.fromEntries(url.searchParams),
    params,
    corpo: lido.corpo,
    cabecalhos: Object.fromEntries(request.headers),
    ip: request.headers.get('cf-connecting-ip') || '',
    eu,
  };
  try {
    return resposta(await rota.fazer(ctx, pedido), seguro);
  } catch (e) {
    if (e instanceof ErroNegocio) return resposta({ http: e.http || 400, corpo: { erro: e.message, codigo: e.codigo } }, seguro);
    throw e;
  }
}

/** Para conferir a instalação: tudo verdadeiro = pronto. A resposta só tem verdadeiro/falso, nunca nomes nem valores. */
async function saude(cfg, site) {
  let banco = false;
  if (cfg.d1) {
    try {
      await prepararEsquema(cfg.d1);
      await cfg.d1.prepare('SELECT 1 AS ok').first();
      banco = true;
    } catch (e) {
      log.error('Banco indisponível', { motivo: String((e && e.message) || e) });
    }
  }
  const faltando = site.faltando();
  const defeituosos = faltando.length ? [] : await site.defeituosos();
  // Quem pergunta só vê "site: false"; quais páginas faltam ou chegaram diferentes vai para o log do Worker (só a dona vê).
  if (faltando.length || defeituosos.length) log.error('Site incompleto ou diferente do gerado', { faltando: faltando.join(' '), diferentes: defeituosos.join(' ') });
  const corpo = { ok: false, banco, segredo: !cfg.problemas.includes('SEGREDO'), site: faltando.length === 0 && defeituosos.length === 0 };
  corpo.ok = corpo.banco && corpo.segredo && corpo.site;
  return resposta({ http: corpo.ok ? 200 : 503, corpo }, true);
}

/** /f/<código> sempre entrega a mesma página; é ela que lê o código na barra de endereço e pede os dados à API. */
function ehLinkDeFrete(caminho) {
  const m = caminho.match(/^\/f\/([^/]+)\/?$/);
  return Boolean(m) && tokenValido(m[1]);
}

/**
 * @param {object} opcoes
 * @param {Record<string,{tipo:string,corpo:string,etag?:string}>} opcoes.arquivos  as páginas do site (veja site.js)
 * @param {() => number} [opcoes.agora]  o relógio (milissegundos); só os testes trocam, para "viajar no tempo"
 */
export function criarServidor({ arquivos, agora = () => Date.now() } = {}) {
  const site = criarSite(arquivos);

  return {
    async fetch(request, env) {
      try {
        const cfg = lerConfiguracao(env);
        const url = new URL(request.url);
        if (url.pathname.startsWith('/api/')) return await api(request, cfg, url, site, agora);
        if (ehLinkDeFrete(url.pathname)) return await site.servir(request, '/frete.html');
        return await site.servir(request, url.pathname);
      } catch (e) {
        log.error('Erro não tratado', { motivo: String((e && e.message) || e) });
        return falha(500, 'erro_interno', 'Algo deu errado do nosso lado. Tente de novo em instantes.');
      }
    },

    async scheduled(_evento, env, execucao) {
      execucao.waitUntil(
        (async () => {
          try {
            const cfg = lerConfiguracao(env);
            if (cfg.problemas.length) throw new Error(`faltando ou inválido: ${cfg.problemas.join(', ')}`);
            const ctx = montarContexto(cfg, agora);
            await prepararEsquema(cfg.d1);
            const resumo = await rotina(ctx);
            await limparLimites(ctx);
            log.info('Rotina de fretes concluída', resumo);
          } catch (e) {
            log.error('Rotina de fretes falhou', { motivo: String((e && e.message) || e) });
          }
        })(),
      );
    },
  };
}
