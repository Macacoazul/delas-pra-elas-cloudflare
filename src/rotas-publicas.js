/**
 * Rotas públicas (a página que a cliente abre e o webhook do Mercado Pago).
 * Função pura de roteamento: recebe a requisição já lida e devolve { http, corpo } — assim dá para
 * testar sem subir servidor nenhum.
 */
import * as Fretes from './fretes.js';
import { ErroNegocio } from './dados.js';
import * as U from './util.js';

function exigirObjeto(body) {
  return body && typeof body === 'object' && !Array.isArray(body) ? body : {};
}

/**
 * @param {object} ctx
 * @param {{method:string,path:string,query?:object,headers?:object,body?:any}} req
 * @returns {Promise<{http:number,corpo:object}>}
 */
async function tratar(ctx, req) {
  const metodo = String(req.method || 'GET').toUpperCase();
  const caminho = String(req.path || '/').replace(/\/+$/, '') || '/';
  const m = caminho.match(/^\/api\/frete\/([^/]+)(?:\/(cotar|pagar|status))?$/);

  try {
    if (caminho === '/api/mp/webhook') {
      if (metodo !== 'POST') return { http: 405, corpo: { erro: 'Método não permitido.' } };
      return await Fretes.tratarWebhookMp(ctx, { headers: req.headers || {}, query: req.query || {}, body: exigirObjeto(req.body) });
    }

    if (m) {
      const token = m[1];
      const acao = m[2] || '';
      if (!acao && metodo === 'GET') return { http: 200, corpo: await Fretes.infoPublica(ctx, token) };
      if (acao === 'status' && metodo === 'GET') return { http: 200, corpo: await Fretes.consultarStatus(ctx, token) };
      if (acao === 'cotar' && metodo === 'POST') return { http: 200, corpo: await Fretes.cotar(ctx, token, exigirObjeto(req.body).cep) };
      if (acao === 'pagar' && metodo === 'POST') return { http: 200, corpo: await Fretes.pagar(ctx, token, exigirObjeto(req.body)) };
      return { http: 405, corpo: { erro: 'Método não permitido.' } };
    }

    return { http: 404, corpo: { erro: 'Não encontrado.' } };
  } catch (e) {
    if (e instanceof ErroNegocio) return { http: e.http || 400, corpo: { erro: e.message, codigo: e.codigo } };
    ctx.log.error('Erro inesperado na rota pública', { caminho: caminho.replace(/\/frete\/[^/]+/, '/frete/[token]'), motivo: U.limparParaLog(e && e.message) });
    return { http: 500, corpo: { erro: 'Algo deu errado do nosso lado. Tente de novo em instantes.' } };
  }
}

export { tratar };
