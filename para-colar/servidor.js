/**
 * Delas pra Elas — servidor.js
 * As rotas da API e o servidor em si (os pedidos e a rotina agendada).
 *
 * Arquivo gerado por "npm run colar" (o texto de verdade fica nas pastas src/, app/ e site/ do projeto).
 * Cole o arquivo INTEIRO, num arquivo com o nome servidor.js no editor do Cloudflare. Não precisa mudar nada nele.
 *
 * Dentro, nesta ordem: acoes.js, rotas-admin.js, rotas-app.js, rotas-conta.js, rotas-publicas.js, rotas.js, servidor.js.
 * Cada bloco é um arquivo de src/ (o mesmo código, com os comentários); o que um arquivo exporta, o bloco entrega
 * no "return" do fim; o que um arquivo importa, o bloco pega do bloco de origem no começo.
 */
import { acesso_js, app_api_js, fretes_js } from './negocio.js';
import { credenciais_js } from './servicos.js';
import { banco_d1_js, config_js, cripto_js, dados_js, site_js, util_js } from './base.js';

/* ────────────────────────────────────────────────────────────────────────────────────────────────────
 * acoes_js  —  o arquivo src/acoes.js (o código abaixo é o do arquivo, sem alteração)
 * ──────────────────────────────────────────────────────────────────────────────────────────────────── */
export const acoes_js = (() => {
/**
 * Comandos da dona (chamados pela tela de Fretes):  POST /api/admin/<comando>.
 * Quem pode chamar é conferido em servidor.js (só a conta "dono"); aqui ficam as regras de cada comando.
 */
const Fretes = fretes_js;
const Cred = credenciais_js;
const { ErroNegocio, lerConfig, normalizarConfig } = dados_js;
const { mudancasEmJson } = banco_d1_js;

/** Resposta que já é texto JSON (o banco monta; o Worker só repassa — economiza processamento no plano grátis). */
class JsonPronto {
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

return { JsonPronto, acoes };
})();

/* ────────────────────────────────────────────────────────────────────────────────────────────────────
 * rotas_admin_js  —  o arquivo src/rotas-admin.js (o código abaixo é o do arquivo, sem alteração)
 * ──────────────────────────────────────────────────────────────────────────────────────────────────── */
export const rotas_admin_js = (() => {
/**
 * Comandos da dona por HTTP:  POST /api/admin/<comando>   (corpo JSON = parâmetros)
 * Resposta: { data } ou { erro, codigo }.
 *
 * Quem é a pessoa logada e se ela é "dono" já foi conferido em rotas.js/servidor.js; aqui só se executa o comando.
 * Função de roteamento: recebe o pedido já lido e devolve { http, corpo } (ou { http, texto } quando já é JSON pronto).
 */
const { acoes, JsonPronto } = acoes_js;
const { ErroNegocio } = dados_js;
const U = util_js;

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

return { tratarAdmin };
})();

/* ────────────────────────────────────────────────────────────────────────────────────────────────────
 * rotas_app_js  —  o arquivo src/rotas-app.js (o código abaixo é o do arquivo, sem alteração)
 * ──────────────────────────────────────────────────────────────────────────────────────────────────── */
export const rotas_app_js = (() => {
/**
 * Dados do app da live (clientes, vendas, fotos, mensagens). As conferências ficam em app-api.js.
 * Cada função devolve { http, corpo } ou { http, texto } quando o banco já entregou o JSON pronto.
 */
const AppApi = app_api_js;

async function estado(ctx, p) {
  return { http: 200, texto: await AppApi.estado(ctx, p.consulta) };
}

async function gravar(ctx, p) {
  return { http: 200, corpo: await AppApi.gravar(ctx, p.corpo) };
}

async function foto(ctx, p) {
  return { http: 200, texto: await AppApi.foto(ctx, p.params.id) };
}

return { estado, gravar, foto };
})();

/* ────────────────────────────────────────────────────────────────────────────────────────────────────
 * rotas_conta_js  —  o arquivo src/rotas-conta.js (o código abaixo é o do arquivo, sem alteração)
 * ──────────────────────────────────────────────────────────────────────────────────────────────────── */
export const rotas_conta_js = (() => {
/**
 * Conta e equipe (login, primeiro acesso, troca de senha, cadastro de pessoas).
 * Cada função recebe (ctx, pedido) e devolve { http, corpo } — e, quando muda a sessão, também `sessao`:
 *   { token }  grava o cookie de sessão       { sair: true }  apaga o cookie
 * Quem pode chamar cada uma é decidido na tabela de rotas (rotas.js), nunca aqui dentro.
 */
const Acesso = acesso_js;

const RENOVAR_QUANDO_FALTAR_S = 7 * 24 * 3600;

const objeto = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const ok = (corpo, extra = {}) => ({ http: 200, corpo, ...extra });

/** Quem está logado. Se faltar pouco para a sessão vencer, já renova (quem usa o app toda semana nunca é deslogado). */
async function eu(ctx, p) {
  if (!p.eu) return ok({ usuario: null, primeiroAcesso: (await Acesso.quantasPessoas(ctx)) === 0 });
  const restante = p.eu.expira - Math.floor(ctx.now() / 1000);
  const sessao = restante < RENOVAR_QUANDO_FALTAR_S ? { token: await Acesso.criarSessao(ctx, p.eu) } : undefined;
  return ok({ usuario: { email: p.eu.email, papel: p.eu.papel } }, { sessao });
}

async function entrar(ctx, p) {
  const c = objeto(p.corpo);
  const r = await Acesso.entrar(ctx, { email: c.email, senha: c.senha, ip: p.ip });
  return ok({ usuario: r.usuario }, { sessao: { token: r.token } });
}

async function primeiroAcesso(ctx, p) {
  const c = objeto(p.corpo);
  const r = await Acesso.primeiroAcesso(ctx, { email: c.email, senha: c.senha, chave: c.chave, ip: p.ip });
  return ok({ usuario: r.usuario }, { sessao: { token: r.token } });
}

async function sair() {
  return ok({ ok: true }, { sessao: { sair: true } });
}

async function trocarSenha(ctx, p) {
  const c = objeto(p.corpo);
  const r = await Acesso.trocarSenha(ctx, p.eu, { atual: c.atual, nova: c.nova, ip: p.ip });
  return ok({ ok: true }, { sessao: { token: r.token } });
}

async function listarEquipe(ctx) {
  return ok({ pessoas: await Acesso.listarEquipe(ctx) });
}

async function adicionarPessoa(ctx, p) {
  const c = objeto(p.corpo);
  return ok({ pessoa: await Acesso.adicionarPessoa(ctx, { email: c.email, senha: c.senha }) });
}

async function removerPessoa(ctx, p) {
  return ok(await Acesso.removerPessoa(ctx, p.eu, { email: objeto(p.corpo).email }));
}

async function redefinirSenha(ctx, p) {
  const c = objeto(p.corpo);
  return ok(await Acesso.redefinirSenha(ctx, { email: c.email, senha: c.senha }));
}

return { eu, entrar, primeiroAcesso, sair, trocarSenha, listarEquipe, adicionarPessoa, removerPessoa, redefinirSenha };
})();

/* ────────────────────────────────────────────────────────────────────────────────────────────────────
 * rotas_publicas_js  —  o arquivo src/rotas-publicas.js (o código abaixo é o do arquivo, sem alteração)
 * ──────────────────────────────────────────────────────────────────────────────────────────────────── */
export const rotas_publicas_js = (() => {
/**
 * Rotas públicas (a página que a cliente abre e o webhook do Mercado Pago).
 * Função pura de roteamento: recebe a requisição já lida e devolve { http, corpo } — assim dá para
 * testar sem subir servidor nenhum.
 */
const Fretes = fretes_js;
const { ErroNegocio } = dados_js;
const U = util_js;

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

return { tratar };
})();

/* ────────────────────────────────────────────────────────────────────────────────────────────────────
 * rotas_js  —  o arquivo src/rotas.js (o código abaixo é o do arquivo, sem alteração)
 * ──────────────────────────────────────────────────────────────────────────────────────────────────── */
export const rotas_js = (() => {
/**
 * TABELA DAS ROTAS DA API — o único lugar que diz quem pode chamar o quê.
 *
 *   acesso   'publica'   qualquer pessoa (a cliente com o link, o Mercado Pago, a tela de entrada)
 *            'opcional'  qualquer pessoa; se houver sessão, o servidor a lê (a pergunta "quem sou eu?")
 *            'sessao'    precisa estar logada (equipe ou dona)
 *            'dono'      precisa estar logada como dona
 *
 *   Por padrão, todo pedido que muda algo e usa o cookie de login só vale se vier do próprio site (conferência de
 *   Origin/Sec-Fetch-Site) e com corpo JSON. As rotas da cliente e do Mercado Pago (`externa`) não usam cookie.
 *   O corpo é limitado a 64 KB, salvo onde a rota diz outro tamanho.
 *
 * O servidor aplica as regras; as funções de cada rota só cuidam do assunto delas.
 */
const Conta = rotas_conta_js;
const App = rotas_app_js;
const { tratarAdmin } = rotas_admin_js;
const { tratar: tratarPublica } = rotas_publicas_js;

const CORPO_PADRAO = 64 * 1024;

/** Cliente e Mercado Pago: sem cookie, sem conferência de origem. */
const publicaDaCliente = (ctx, p) => tratarPublica(ctx, { method: p.metodo, path: p.caminho, query: p.consulta, headers: p.cabecalhos, body: p.corpo });
const admin = (ctx, p) => tratarAdmin(ctx, { method: p.metodo, path: p.caminho, body: p.corpo }, p.eu);

const ACESSOS = ['publica', 'opcional', 'sessao', 'dono'];

function rota(metodo, caminho, acesso, fazer, { corpoMax = CORPO_PADRAO, externa = false } = {}) {
  // Um erro de digitação aqui (por exemplo 'sesao') deixaria a rota aberta sem ninguém perceber: por isso trava na partida.
  if (!ACESSOS.includes(acesso)) throw new Error(`Rota ${metodo} ${caminho}: acesso "${acesso}" não existe.`);
  return {
    metodo,
    caminho,
    acesso,
    fazer,
    corpoMax,
    externa,
    padrao: new RegExp(`^${caminho.replace(/:[a-z]+/g, '([^/]+)')}$`),
    nomes: [...caminho.matchAll(/:([a-z]+)/g)].map((m) => m[1]),
  };
}

const ROTAS = [
  rota('GET', '/api/auth/eu', 'opcional', Conta.eu),
  rota('POST', '/api/auth/entrar', 'publica', Conta.entrar),
  rota('POST', '/api/auth/primeiro-acesso', 'publica', Conta.primeiroAcesso),
  rota('POST', '/api/auth/sair', 'publica', Conta.sair),
  rota('POST', '/api/auth/trocar-senha', 'sessao', Conta.trocarSenha),

  rota('GET', '/api/equipe', 'dono', Conta.listarEquipe),
  rota('POST', '/api/equipe/adicionar', 'dono', Conta.adicionarPessoa),
  rota('POST', '/api/equipe/remover', 'dono', Conta.removerPessoa),
  rota('POST', '/api/equipe/redefinir-senha', 'dono', Conta.redefinirSenha),

  rota('GET', '/api/app/estado', 'sessao', App.estado),
  rota('POST', '/api/app/gravar', 'sessao', App.gravar, { corpoMax: 1_000_000 }),
  rota('GET', '/api/app/foto/:id', 'sessao', App.foto),

  rota('POST', '/api/admin/:comando', 'dono', admin),

  rota('GET', '/api/frete/:token', 'publica', publicaDaCliente, { externa: true }),
  rota('GET', '/api/frete/:token/status', 'publica', publicaDaCliente, { externa: true }),
  rota('POST', '/api/frete/:token/cotar', 'publica', publicaDaCliente, { externa: true }),
  rota('POST', '/api/frete/:token/pagar', 'publica', publicaDaCliente, { externa: true }),
  rota('POST', '/api/mp/webhook', 'publica', publicaDaCliente, { externa: true }),
];

/**
 * Acha a rota do pedido.
 * @returns {{rota:object, params:Record<string,string>} | {permitidos:string[]} | null}
 *   null = esse endereço não existe; { permitidos } = existe, mas não com esse método (405).
 */
function achar(metodo, caminho) {
  const permitidos = [];
  for (const r of ROTAS) {
    const m = r.padrao.exec(caminho);
    if (!m) continue;
    if (r.metodo !== metodo) {
      permitidos.push(r.metodo);
      continue;
    }
    const params = {};
    r.nomes.forEach((nome, i) => {
      params[nome] = m[i + 1];
    });
    return { rota: r, params };
  }
  return permitidos.length ? { permitidos: [...new Set(permitidos)] } : null;
}

return { ROTAS, ACESSOS, achar, CORPO_PADRAO };
})();

/* ────────────────────────────────────────────────────────────────────────────────────────────────────
 * servidor_js  —  o arquivo src/servidor.js (o código abaixo é o do arquivo, sem alteração)
 * ──────────────────────────────────────────────────────────────────────────────────────────────────── */
export const servidor_js = (() => {
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
const { lerConfiguracao } = config_js;
const { criarSite } = site_js;
const { BancoD1, prepararEsquema } = banco_d1_js;
const { usuarioDaSessao, cookieDeSessao, cookieDeSaida, limparLimites } = acesso_js;
const { achar } = rotas_js;
const { rotina } = fretes_js;
const { ErroNegocio } = dados_js;
const { tokenValido } = cripto_js;
const { limparParaLog } = util_js;

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
function criarServidor({ arquivos, agora = () => Date.now() } = {}) {
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

return { criarServidor };
})();
