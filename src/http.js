/**
 * Cliente HTTP único para os serviços externos (Melhor Envio, Mercado Pago, ViaCEP).
 *
 * - Os endereços base ficam fixos no código (nunca vêm de dados do usuário): sem risco de SSRF.
 * - Sem redirecionamento automático, tempo limite curto e resposta limitada.
 * - O log NUNCA recebe corpo, cabeçalhos ou URL completa: só serviço, método, caminho e status.
 */
import { limparParaLog } from './util.js';

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

export { requisitar };
