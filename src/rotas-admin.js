/**
 * Comandos da dona por HTTP:  POST /api/admin/<comando>   (corpo JSON = parâmetros)
 * Resposta: { data } ou { erro, codigo }.
 *
 * Quem é a pessoa logada e se ela é "dono" já foi conferido em rotas.js/servidor.js; aqui só se executa o comando.
 * Função de roteamento: recebe o pedido já lido e devolve { http, corpo } (ou { http, texto } quando já é JSON pronto).
 */
import { acoes, JsonPronto } from './acoes.js';
import { ErroNegocio } from './dados.js';
import * as U from './util.js';

const erro = (http, codigo, mensagem) => ({ http, corpo: { erro: mensagem, codigo } });

/**
 * @param {object} ctx
 * @param {{method:string,path:string,body?:any}} req
 * @param {{email:string,papel:string}} usuario
 * @returns {Promise<{http:number,corpo?:object,texto?:string}>}
 */
async function tratarAdmin(ctx, req, usuario) {
  const caminho = String(req.path || '').replace(/\/+$/, '');
  const m = caminho.match(/^\/api\/admin\/([A-Za-z]+)$/);
  if (!m || !Object.prototype.hasOwnProperty.call(acoes, m[1])) return erro(404, 'nao_encontrado', 'Comando desconhecido.');
  if (String(req.method || '').toUpperCase() !== 'POST') return erro(405, 'metodo_nao_permitido', 'Método não permitido.');

  const dados = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  try {
    const resultado = await acoes[m[1]](ctx, { email: usuario.email }, dados);
    if (resultado instanceof JsonPronto) return { http: 200, texto: `{"data":${resultado.texto}}` };
    return { http: 200, corpo: { data: resultado === undefined ? null : resultado } };
  } catch (e) {
    if (e instanceof ErroNegocio) return erro(e.http || 400, e.codigo, e.message);
    ctx.log.error(`Erro inesperado em ${m[1]}`, { motivo: U.limparParaLog(e && e.message) });
    return erro(500, 'erro_interno', 'Algo deu errado do nosso lado. Tente de novo.');
  }
}

export { tratarAdmin };
