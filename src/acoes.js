/**
 * Comandos da dona (chamados pela tela de Fretes):  POST /api/admin/<comando>.
 * Quem pode chamar é conferido em servidor.js (só a conta "dono"); aqui ficam as regras de cada comando.
 */
import * as Fretes from './fretes.js';
import * as Cred from './credenciais.js';
import { ErroNegocio, lerConfig, normalizarConfig } from './dados.js';
import { mudancasEmJson } from './banco-d1.js';

/** Resposta que já é texto JSON (o banco monta; o Worker só repassa — economiza processamento no plano grátis). */
export class JsonPronto {
  constructor(texto) {
    this.texto = texto;
  }
}

function exigirTexto(v, nome) {
  if (typeof v !== 'string' || v.length < 5 || v.length > 40 || !/^[A-Za-z0-9]+$/.test(v)) throw new ErroNegocio('parametro_invalido', `Parâmetro inválido: ${nome}.`);
  return v;
}

/** Lista de fretes para a tela: na primeira vez os 200 mais novos; depois, só o que mudou desde o último número. */
async function listarFretes(ctx, _u, d) {
  const desde = Math.max(0, Math.floor(Number(d && d.desde) || 0));
  return new JsonPronto(await mudancasEmJson(ctx.db, ['fretes'], desde, { limite: 300, recentes: { campo: 'criadoEm', n: 200 } }));
}

async function salvarAjustes(ctx, _u, d) {
  const limpo = normalizarConfig(d);
  await ctx.db.doc('ajustes/frete').set(limpo);
  return limpo;
}

/** Peças da cliente (data e valor), para sugerir o valor declarado do envio. */
async function vendasDaCliente(ctx, _u, d) {
  const id = d && d.clienteId;
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw new ErroNegocio('parametro_invalido', 'Parâmetro inválido: clienteId.');
  const q = await ctx.db.collection('vendas').where('clienteId', '==', id).get();
  return q.docs.map((s) => s.data()).filter((v) => v && v.data).map((v) => ({ data: v.data, valor: Number(v.valor) || 0 }));
}

const acoes = {
  criarFrete: (ctx, usuario, d) => Fretes.criarFrete(ctx, usuario, d || {}),
  cancelarFrete: (ctx, _u, d) => Fretes.cancelarFrete(ctx, exigirTexto(d && d.freteId, 'freteId')),
  gerarEtiqueta: (ctx, _u, d) => Fretes.gerarEtiqueta(ctx, exigirTexto(d && d.freteId, 'freteId'), { confirmarDiferenca: !!(d && d.confirmarDiferenca) }),
  urlEtiqueta: (ctx, _u, d) => Fretes.urlEtiqueta(ctx, exigirTexto(d && d.freteId, 'freteId')),
  atualizarFrete: (ctx, _u, d) => Fretes.atualizarAgora(ctx, exigirTexto(d && d.freteId, 'freteId')),
  statusCredenciais: (ctx) => Cred.status(ctx),
  salvarCredenciais: (ctx, _u, d) => Cred.salvar(ctx, d || {}),
  testarConexoes: (ctx) => Cred.testar(ctx),
  listarFretes,
  lerAjustes: (ctx) => lerConfig(ctx),
  salvarAjustes,
  vendasDaCliente,
};

export { acoes };
