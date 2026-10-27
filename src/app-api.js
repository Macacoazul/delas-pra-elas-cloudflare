/**
 * Dados do app da live: clientes, vendas, fotos das peças e as mensagens do WhatsApp.
 *
 * O app não fala com o banco: ele pede "o que mudou desde o número tal?" (estado) e manda lotes de alterações (gravar).
 * Tudo que chega é conferido e limpo aqui antes de ir para o banco: tipos, tamanhos, datas, ids. Campo desconhecido é recusado.
 *
 *   GET  /api/app/estado?desde=N&c=clientes,vendas,config   -> o que mudou (ver mudancasEmJson em banco-d1.js)
 *   POST /api/app/gravar   { ops: [ { col, id, op: 'set'|'mesclar'|'apagar', dados } ] }   -> tudo-ou-nada
 *   GET  /api/app/foto/<id>                                  -> { imagem }
 */
import { ErroNegocio } from './dados.js';
import { mudancasEmJson } from './banco-d1.js';
import { texto, textoLongo } from './util.js';

const COLECOES_DO_ESTADO = ['clientes', 'vendas', 'config'];
const MAX_OPERACOES = 100;
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const DIA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const FOTO = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const TAMANHO_MAX_FOTO = 600_000;

const invalido = (msg) => new ErroNegocio('dados_invalidos', msg, 400);

function exigirBool(v, campo) {
  if (typeof v !== 'boolean') throw invalido(`${campo} precisa ser verdadeiro ou falso.`);
  return v;
}
function exigirId(v, campo) {
  if (typeof v !== 'string' || !ID.test(v)) throw invalido(`${campo} inválido.`);
  return v;
}
function exigirDia(v, campo) {
  if (typeof v !== 'string' || !DIA.test(v)) throw invalido(`${campo} precisa ser uma data (AAAA-MM-DD).`);
  return v;
}

/** Cada campo conhecido tem a sua conferência. Devolve o valor limpo ou lança um erro em português. */
const CAMPOS = {
  clientes: {
    nome: (v) => {
      const n = texto(v, 80);
      if (!n) throw invalido('A cliente precisa ter um nome.');
      return n;
    },
    whatsapp: (v) => texto(v, 30),
    preExistente: (v) => exigirBool(v, 'preExistente'),
    criadaEm: (v) => exigirDia(v, 'criadaEm'),
  },
  vendas: {
    data: (v) => exigirDia(v, 'data'),
    criadaEm: (v) => {
      if (!Number.isFinite(v) || v <= 0 || v > 4e12) throw invalido('criadaEm inválido.');
      return Math.round(v);
    },
    clienteId: (v) => exigirId(v, 'clienteId'),
    codigo: (v) => texto(v, 40),
    peca: (v) => {
      const p = texto(v, 160);
      if (!p) throw invalido('A peça precisa ter um nome.');
      return p;
    },
    valor: (v) => {
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 10_000_000) throw invalido('Valor inválido.');
      return Math.round(v * 100) / 100;
    },
    pago: (v) => exigirBool(v, 'pago'),
    fila: (v) => {
      if (!Array.isArray(v) || v.length > 30) throw invalido('Fila inválida.');
      return v.map((f) => {
        if (!f || typeof f !== 'object') throw invalido('Fila inválida.');
        return { nome: texto(f.nome, 80), clienteId: exigirId(f.clienteId, 'clienteId da fila') };
      });
    },
    temFoto: (v) => exigirBool(v, 'temFoto'),
  },
  fotos: {
    imagem: (v) => {
      if (typeof v !== 'string' || v.length > TAMANHO_MAX_FOTO || !FOTO.test(v)) throw invalido('Foto inválida ou grande demais.');
      return v;
    },
  },
  config: {
    abertura: (v) => textoLongo(v, 4000),
    fechamento: (v) => textoLongo(v, 4000),
  },
};

/** Campos que um documento COMPLETO precisa ter. */
const OBRIGATORIOS = {
  clientes: ['nome'],
  vendas: ['data', 'criadaEm', 'clienteId', 'peca', 'valor', 'pago'],
  fotos: ['imagem'],
  config: [],
};
/** Valores de partida quando o campo não vem. */
const PADROES = {
  clientes: { whatsapp: '', preExistente: false },
  vendas: { codigo: '', fila: [], temFoto: false },
  fotos: {},
  config: {},
};

/** Confere os campos que vieram. Campo que não existe para a coleção é recusado (nada de lixo no banco). */
function conferirCampos(col, dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw invalido('Dados inválidos.');
  const conferidos = {};
  for (const [campo, valor] of Object.entries(dados)) {
    if (campo === 'id' || campo === 'primeiraCompra') continue; // vêm no backup antigo; o app recalcula
    if (!Object.prototype.hasOwnProperty.call(CAMPOS[col], campo)) throw invalido(`Campo desconhecido: ${campo}.`);
    conferidos[campo] = CAMPOS[col][campo](valor);
  }
  return conferidos;
}

function completar(col, dados) {
  const completo = { ...PADROES[col], ...dados };
  for (const campo of OBRIGATORIOS[col]) {
    if (completo[campo] === undefined) throw invalido(`Falta o campo ${campo}.`);
  }
  return completo;
}

/** Valida o pedido inteiro ANTES de tocar no banco. */
function conferirOperacoes(ops) {
  if (!Array.isArray(ops) || !ops.length) throw invalido('Nenhuma alteração para gravar.');
  if (ops.length > MAX_OPERACOES) throw invalido(`No máximo ${MAX_OPERACOES} alterações por vez.`);
  return ops.map((o) => {
    if (!o || typeof o !== 'object') throw invalido('Alteração inválida.');
    if (!Object.prototype.hasOwnProperty.call(CAMPOS, o.col)) throw invalido('Coleção desconhecida.');
    if (!['set', 'mesclar', 'apagar'].includes(o.op)) throw invalido('Tipo de alteração desconhecido.');
    const id = exigirId(o.id, 'id');
    if (o.col === 'config' && id !== 'geral') throw invalido('Configuração desconhecida.');
    const dados = o.op === 'apagar' ? null : conferirCampos(o.col, o.dados);
    if (o.op === 'apagar' && o.col === 'config') throw invalido('A configuração não pode ser apagada.');
    if (o.op === 'set' && o.col !== 'config') completar(o.col, dados); // já recusa se faltar campo
    return { col: o.col, id, op: o.op, dados };
  });
}

async function gravar(ctx, corpo) {
  const ops = conferirOperacoes(corpo && corpo.ops);
  await ctx.db.runTransaction(async (tx) => {
    const precisaLer = ops.filter((o) => o.op === 'mesclar').map((o) => ctx.db.doc(`${o.col}/${o.id}`));
    const lidos = precisaLer.length ? await tx.getAll(precisaLer) : [];
    const atual = new Map(lidos.map((s) => [s.ref.path, s.data()]));
    for (const o of ops) {
      const ref = ctx.db.doc(`${o.col}/${o.id}`);
      if (o.op === 'apagar') tx.delete(ref);
      else if (o.op === 'set') tx.set(ref, o.col === 'config' ? { ...PADROES.config, ...o.dados } : completar(o.col, o.dados));
      else {
        const base = atual.get(ref.path);
        const mesclado = completar(o.col, { ...(base || {}), ...o.dados });
        tx.set(ref, mesclado);
        atual.set(ref.path, mesclado); // duas mesclagens no mesmo documento, no mesmo lote, somam
      }
    }
  });
  const r = await ctx.d1.prepare('SELECT COALESCE(MAX(seq), 0) AS seq FROM documentos').first();
  return { ok: true, seq: Number(r.seq) || 0 };
}

/** @returns {Promise<string>} texto JSON pronto (ver mudancasEmJson) */
async function estado(ctx, consulta) {
  const pedidas = String(consulta.c || '').split(',').map((s) => s.trim()).filter(Boolean);
  const colecoes = pedidas.length ? pedidas : COLECOES_DO_ESTADO;
  if (colecoes.some((c) => !COLECOES_DO_ESTADO.includes(c))) throw invalido('Coleção desconhecida.');
  return mudancasEmJson(ctx.db, [...new Set(colecoes)], consulta.desde);
}

/** A foto vai como o banco guarda ({"imagem":"data:…"}): sem abrir e refazer o texto. */
async function foto(ctx, id) {
  if (!ID.test(id)) throw new ErroNegocio('nao_encontrada', 'Foto não encontrada.', 404);
  const r = await ctx.d1.prepare("SELECT dados FROM documentos WHERE colecao = 'fotos' AND id = ? AND apagado = 0").bind(id).first();
  if (!r) throw new ErroNegocio('nao_encontrada', 'Foto não encontrada.', 404);
  return r.dados;
}

export { gravar, estado, foto, conferirOperacoes, CAMPOS };
