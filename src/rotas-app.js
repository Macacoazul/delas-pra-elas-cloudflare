/**
 * Dados do app da live (clientes, vendas, fotos, mensagens). As conferências ficam em app-api.js.
 * Cada função devolve { http, corpo } ou { http, texto } quando o banco já entregou o JSON pronto.
 */
import * as AppApi from './app-api.js';

async function estado(ctx, p) {
  return { http: 200, texto: await AppApi.estado(ctx, p.consulta) };
}

async function gravar(ctx, p) {
  return { http: 200, corpo: await AppApi.gravar(ctx, p.corpo) };
}

async function foto(ctx, p) {
  return { http: 200, texto: await AppApi.foto(ctx, p.params.id) };
}

export { estado, gravar, foto };
