/**
 * Acesso aos dados e normalização do que vem do banco.
 *
 * Coleções:
 *  - fretes/{id}            -> visível para a dona logada (tela de Fretes); ESCRITA só pelo servidor
 *  - fretes_privado/{id}    -> endereço completo, CPF, Pix, cotação: NINGUÉM lê pelo navegador
 *  - privado/credenciais    -> tokens do Melhor Envio e do Mercado Pago: NINGUÉM lê pelo navegador
 *  - ajustes/frete           -> ajustes da loja (caixas, CEP de origem...), editáveis pela equipe
 */
import { limparCep, texto, ufValida, limparTelefone, digitos } from './util.js';

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

export {
  ErroNegocio,
  numeroEntre,
  normalizarConfig,
  lerConfig,
  lerCredenciais,
  refFrete,
  refPriv,
  acharPorToken,
};
