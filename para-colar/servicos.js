/**
 * Delas pra Elas — servicos.js
 * A conversa com os serviços de fora (CEP, Melhor Envio, Mercado Pago) e o cofre das chaves de acesso deles.
 *
 * Arquivo gerado por "npm run colar" (o texto de verdade fica nas pastas src/, app/ e site/ do projeto).
 * Cole o arquivo INTEIRO, num arquivo com o nome servicos.js no editor do Cloudflare. Não precisa mudar nada nele.
 *
 * Dentro, nesta ordem: viacep.js, melhor-envio.js, mercado-pago.js, credenciais.js.
 * Cada bloco é um arquivo de src/ (o mesmo código, com os comentários); o que um arquivo exporta, o bloco entrega
 * no "return" do fim; o que um arquivo importa, o bloco pega do bloco de origem no começo.
 */
import { cripto_js, dados_js, http_js, util_js } from './base.js';

/* ────────────────────────────────────────────────────────────────────────────────────────────────────
 * viacep_js  —  o arquivo src/viacep.js (o código abaixo é o do arquivo, sem alteração)
 * ──────────────────────────────────────────────────────────────────────────────────────────────────── */
export const viacep_js = (() => {
/**
 * Consulta de endereço por CEP (ViaCEP). Falha nunca bloqueia: a cliente pode digitar o endereço.
 * Cache em memória por 24 h, no máximo 500 CEPs (cada instância do servidor tem o seu; o ViaCEP é gratuito e rápido).
 */
const { requisitar } = http_js;
const { limparCep, texto, ufValida } = util_js;

const cache = new Map();
const VALIDADE_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRADAS = 500; // teto de memória: ao encher, descarta a mais antiga
const BASE_PADRAO = 'https://viacep.com.br';

function limparCache() {
  cache.clear();
}

/**
 * @returns {Promise<{ok:boolean, naoEncontrado?:boolean, erro?:string, endereco?:{cep:string,rua:string,bairro:string,cidade:string,uf:string}}>}
 */
async function consultar(ctx, cepBruto) {
  const cep = limparCep(cepBruto);
  if (!cep) return { ok: false, erro: 'CEP inválido. Confira os 8 números.' };

  const guardado = cache.get(cep);
  if (guardado && guardado.ate > ctx.now()) return { ok: true, endereco: guardado.endereco };

  const r = await requisitar(ctx, 'viacep', 'GET', `${(ctx.urls && ctx.urls.viacep) || BASE_PADRAO}/ws/${cep}/json/`, { timeoutMs: 8000 });
  if (!r.ok || !r.body || typeof r.body !== 'object') {
    return { ok: false, erro: 'Não foi possível consultar o CEP agora.' };
  }
  if (r.body.erro) return { ok: false, naoEncontrado: true, erro: 'CEP não encontrado. Confira os números.' };

  const endereco = {
    cep,
    rua: texto(r.body.logradouro, 160),
    bairro: texto(r.body.bairro, 80),
    cidade: texto(r.body.localidade, 80),
    uf: ufValida(r.body.uf),
  };
  if (cache.size >= MAX_ENTRADAS) cache.delete(cache.keys().next().value);
  cache.set(cep, { endereco, ate: ctx.now() + VALIDADE_MS });
  return { ok: true, endereco };
}

return { consultar, limparCache };
})();

/* ────────────────────────────────────────────────────────────────────────────────────────────────────
 * melhor_envio_js  —  o arquivo src/melhor-envio.js (o código abaixo é o do arquivo, sem alteração)
 * ──────────────────────────────────────────────────────────────────────────────────────────────────── */
export const melhor_envio_js = (() => {
/**
 * Melhor Envio — cotação, carrinho, compra, geração, impressão e rastreio da etiqueta.
 *
 * Contratos conferidos na documentação oficial (docs.melhorenvio.com.br):
 *  - Produção https://melhorenvio.com.br · Sandbox https://sandbox.melhorenvio.com.br
 *  - Cabeçalhos: Authorization (Bearer), Accept, Content-Type e User-Agent com o nome do app + e-mail de contato.
 *  - POST /api/v2/me/shipment/calculate     -> cotação (escopo shipping-calculate)
 *  - POST /api/v2/me/cart                   -> insere a etiqueta no carrinho (cart-write); devolve o id
 *  - POST /api/v2/me/shipment/checkout      -> paga com o saldo da carteira (shipping-checkout)
 *  - POST /api/v2/me/shipment/generate      -> gera a etiqueta (shipping-generate)
 *  - POST /api/v2/me/shipment/print         -> link de impressão (shipping-print), mode private|public
 *  - POST /api/v2/me/shipment/tracking      -> status do ciclo de vida (shipping-tracking)
 *  - GET  /api/v2/me/orders/{id}            -> dados da etiqueta, inclui o código de rastreio (orders-read)
 *
 * NÃO foi possível testar contra a conta real do Melhor Envio neste ambiente: a verificação foi feita contra um
 * simulador que segue os formatos acima. O primeiro teste de verdade deve ser no SANDBOX.
 */
const { requisitar } = http_js;
const { paraCentavos, deCentavos, texto, digitos, limparCep, limparTelefone, ufValida } = util_js;

const BASES = { producao: 'https://melhorenvio.com.br', sandbox: 'https://sandbox.melhorenvio.com.br' };

function baseUrl(ctx, creds) {
  const urls = ctx.urls || {};
  return creds && creds.ambiente === 'producao'
    ? urls.meProducao || BASES.producao
    : urls.meSandbox || BASES.sandbox;
}

function userAgent(creds) {
  const email = texto(creds && creds.emailContato, 120);
  return `Delas pra Elas (${email})`;
}

function cabecalhos(creds) {
  return { Authorization: `Bearer ${creds.token}`, 'User-Agent': userAgent(creds) };
}

function prontas(creds) {
  if (!creds || !creds.token) return 'O token do Melhor Envio ainda não foi salvo (tela Fretes → Ajustes).';
  if (!creds.emailContato || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(creds.emailContato)) {
    return 'Falta o e-mail de contato do Melhor Envio (tela Fretes → Ajustes).';
  }
  return '';
}

/** Mensagem em português para um erro de resposta do Melhor Envio. */
function traduzirErro(r, padrao) {
  if (r.rede) return 'Não foi possível falar com o Melhor Envio agora. Tente de novo em instantes.';
  const msg = String(r.erro || '');
  if (r.status === 401) {
    return 'O Melhor Envio recusou o token. Confira se ele não está vencido, se foi copiado inteiro e se o ambiente (sandbox/produção) é o mesmo em que foi criado.';
  }
  if (r.status === 403) {
    return 'O token do Melhor Envio não tem permissão para isso. Gere um novo token marcando todas as permissões listadas no guia.';
  }
  if (/saldo|balance|insufficient|insuficiente/i.test(msg)) {
    return 'Saldo insuficiente na carteira do Melhor Envio. Adicione saldo e tente de novo.';
  }
  if (r.status === 429) return 'O Melhor Envio pediu para esperar um pouco. Tente de novo em alguns minutos.';
  if (r.status === 422 || r.status === 400) {
    return `O Melhor Envio não aceitou os dados${msg ? `: ${msg}` : '.'}`;
  }
  return padrao || 'O Melhor Envio devolveu um erro. Tente de novo.';
}

/* --------------------------------------------------------------- Cotação */

/**
 * @param {{origemCep:string,destinoCep:string,caixa:{alturaCm:number,larguraCm:number,comprimentoCm:number},pesoKg:number,seguroCentavos:number}} p
 */
async function cotar(ctx, creds, p) {
  const falta = prontas(creds);
  if (falta) return { ok: false, erro: falta, opcoes: [] };
  const origem = limparCep(p.origemCep);
  const destino = limparCep(p.destinoCep);
  if (!origem) return { ok: false, erro: 'O CEP de origem da loja não está configurado (tela Fretes → Ajustes).', opcoes: [] };
  if (!destino) return { ok: false, erro: 'CEP inválido. Confira os 8 números.', opcoes: [] };

  const r = await requisitar(ctx, 'melhorenvio', 'POST', `${baseUrl(ctx, creds)}/api/v2/me/shipment/calculate`, {
    headers: cabecalhos(creds),
    json: {
      from: { postal_code: origem },
      to: { postal_code: destino },
      products: [
        {
          id: '1',
          width: Number(p.caixa.larguraCm),
          height: Number(p.caixa.alturaCm),
          length: Number(p.caixa.comprimentoCm),
          weight: Math.max(0.01, Math.round(Number(p.pesoKg) * 1000) / 1000),
          insurance_value: deCentavos(p.seguroCentavos || 0),
          quantity: 1,
        },
      ],
      options: { receipt: false, own_hand: false },
    },
    timeoutMs: 25000,
  });

  if (!r.ok) return { ok: false, status: r.status, erro: traduzirErro(r, 'Não foi possível calcular o frete agora. Tente de novo em instantes.'), opcoes: [] };

  const opcoes = interpretarCotacao(r.body);
  if (!opcoes.length) return { ok: false, erro: 'Nenhuma transportadora atende este CEP com este pacote.', opcoes: [] };
  return { ok: true, opcoes };
}

/**
 * Ignora serviços com erro ou sem preço válido, usa custom_price/custom_delivery_time quando existirem
 * (refletem descontos e taxas da conta) e ordena do mais barato ao mais caro.
 */
function interpretarCotacao(corpo) {
  const lista = Array.isArray(corpo) ? corpo : [];
  const opcoes = [];
  for (const s of lista) {
    if (!s || typeof s !== 'object' || s.id === undefined || s.id === null) continue;
    if (s.error) continue;
    const preco = paraCentavos(s.custom_price ?? s.price ?? null);
    if (preco === null || preco <= 0) continue;
    let dias = s.custom_delivery_time ?? s.delivery_time ?? null;
    dias = Number.isInteger(dias) ? dias : /^\d+$/.test(String(dias)) ? Number(dias) : null;
    const servicoId = Number(s.id);
    if (!Number.isInteger(servicoId)) continue;
    opcoes.push({
      servicoId,
      empresa: texto(s.company && s.company.name, 60),
      nome: texto(s.name, 60) || String(servicoId),
      precoCentavos: preco,
      prazoDias: dias,
    });
  }
  return opcoes.sort((a, b) => a.precoCentavos - b.precoCentavos);
}

/** Mantém só as transportadoras escolhidas (comparação sem maiúsculas); sem filtro, devolve tudo. */
function filtrarTransportadoras(opcoes, permitidas, mostrarOutras) {
  const lista = (permitidas || []).map((p) => String(p).toLowerCase().trim()).filter(Boolean);
  if (!lista.length || mostrarOutras) return opcoes;
  const doPrincipais = opcoes.filter((o) => lista.some((p) => o.empresa.toLowerCase().includes(p)));
  return doPrincipais;
}

/* ---------------------------------------------------------------- Carrinho */

/**
 * Monta o corpo do POST /me/cart.
 * Pessoa física -> `document` (CPF); empresa -> `company_document` (CNPJ).
 * Envio não comercial: sem `invoice` (declaração de conteúdo) e state_register vazio/ISENTO.
 */
function montarCarrinho({ servicoId, remetente, destinatario, caixa, pesoKg, declaradoCentavos, conteudo, naoComercial, tag }) {
  const doc = (pessoa) => {
    const d = digitos(pessoa.documento);
    return d.length === 14 ? { company_document: d } : { document: d };
  };
  const de = {
    name: texto(remetente.nome, 80),
    phone: limparTelefone(remetente.telefone),
    email: texto(remetente.email, 120),
    ...doc(remetente),
    address: texto(remetente.endereco, 120),
    complement: texto(remetente.complemento, 60),
    number: texto(remetente.numero, 20),
    district: texto(remetente.bairro, 60),
    city: texto(remetente.cidade, 60),
    postal_code: limparCep(remetente.cep),
    state_abbr: ufValida(remetente.uf),
    country_id: 'BR',
  };
  if (naoComercial && digitos(remetente.documento).length === 14) de.state_register = 'ISENTO';

  const para = {
    name: texto(destinatario.nome, 80),
    phone: limparTelefone(destinatario.telefone),
    email: texto(destinatario.email, 120),
    ...doc(destinatario),
    address: texto(destinatario.endereco, 120),
    complement: texto(destinatario.complemento, 60),
    number: texto(destinatario.numero, 20),
    district: texto(destinatario.bairro, 60),
    city: texto(destinatario.cidade, 60),
    postal_code: limparCep(destinatario.cep),
    state_abbr: ufValida(destinatario.uf),
    country_id: 'BR',
  };

  const valor = deCentavos(Math.max(100, declaradoCentavos || 0));
  const options = {
    insurance_value: valor,
    receipt: false,
    own_hand: false,
    reverse: false,
    non_commercial: !!naoComercial,
    platform: 'Delas pra Elas',
  };
  if (tag) options.tags = [{ tag: String(tag).slice(0, 60), url: null }];

  return {
    service: servicoId,
    from: de,
    to: para,
    products: [{ name: texto(conteudo, 80) || 'Roupas', quantity: 1, unitary_value: valor }],
    volumes: [
      {
        height: Number(caixa.alturaCm),
        width: Number(caixa.larguraCm),
        length: Number(caixa.comprimentoCm),
        weight: Math.max(0.01, Math.round(Number(pesoKg) * 1000) / 1000),
      },
    ],
    options,
  };
}

async function inserirNoCarrinho(ctx, creds, corpo) {
  const falta = prontas(creds);
  if (falta) return { ok: false, erro: falta };
  const r = await requisitar(ctx, 'melhorenvio', 'POST', `${baseUrl(ctx, creds)}/api/v2/me/cart`, {
    headers: cabecalhos(creds),
    json: corpo,
    timeoutMs: 25000,
  });
  if (!r.ok) return { ok: false, status: r.status, erro: traduzirErro(r, 'O Melhor Envio não aceitou a etiqueta.') };
  const b = r.body || {};
  if (typeof b.id !== 'string' || b.id.length < 30) return { ok: false, erro: 'O Melhor Envio não devolveu o número da etiqueta. Tente de novo.' };
  const preco = paraCentavos(b.price ?? b.quote ?? null);
  return {
    ok: true,
    id: b.id,
    protocolo: texto(b.protocol, 40),
    precoCentavos: preco === null ? null : preco,
    status: texto(b.status, 30),
  };
}

/* ------------------------------------------------------------------ Compra */

async function comprar(ctx, creds, idsEtiquetas) {
  const falta = prontas(creds);
  if (falta) return { ok: false, erro: falta };
  const r = await requisitar(ctx, 'melhorenvio', 'POST', `${baseUrl(ctx, creds)}/api/v2/me/shipment/checkout`, {
    headers: cabecalhos(creds),
    json: { orders: idsEtiquetas },
    timeoutMs: 30000,
  });
  if (!r.ok) {
    // "já foram pagas": a compra de uma tentativa anterior já aconteceu — quem chamou segue para a geração.
    if (r.status === 422 && /já foram pagas|already.*paid/i.test(r.erro)) return { ok: true, jaPaga: true };
    return { ok: false, status: r.status, erro: traduzirErro(r, 'Não foi possível pagar a etiqueta com o saldo do Melhor Envio.') };
  }
  const compra = (r.body && r.body.purchase) || {};
  const orders = Array.isArray(compra.orders) ? compra.orders : [];
  return {
    ok: true,
    compraStatus: texto(compra.status, 20),
    orders: orders.map((o) => ({ id: o.id, status: texto(o.status, 20), tracking: texto(o.tracking, 40) })),
  };
}

/* ------------------------------------------------------------------ Geração */

async function gerar(ctx, creds, idsEtiquetas) {
  const falta = prontas(creds);
  if (falta) return { ok: false, erro: falta };
  const r = await requisitar(ctx, 'melhorenvio', 'POST', `${baseUrl(ctx, creds)}/api/v2/me/shipment/generate`, {
    headers: cabecalhos(creds),
    json: { orders: idsEtiquetas },
    timeoutMs: 30000,
  });
  if (!r.ok) return { ok: false, status: r.status, erro: traduzirErro(r, 'Não foi possível gerar a etiqueta.') };
  const b = r.body && typeof r.body === 'object' ? r.body : {};
  const falhas = [];
  for (const id of idsEtiquetas) {
    const item = b[id];
    if (!item || item.status !== true) falhas.push(texto(item && item.message, 160) || 'sem resposta para esta etiqueta');
  }
  if (falhas.length) return { ok: false, erro: `O Melhor Envio não gerou a etiqueta: ${falhas.join(' | ')}` };
  return { ok: true };
}

/* ---------------------------------------------------------------- Impressão */

function urlPermitida(ctx, creds, url) {
  try {
    const u = new URL(url);
    const base = new URL(baseUrl(ctx, creds));
    if (u.origin === base.origin) return true;
    return u.protocol === 'https:' && /(^|\.)melhorenvio\.com\.br$/.test(u.hostname);
  } catch {
    return false;
  }
}

/** @param {'public'|'private'} modo */
async function imprimir(ctx, creds, idsEtiquetas, modo) {
  const falta = prontas(creds);
  if (falta) return { ok: false, erro: falta };
  const corpo = { orders: idsEtiquetas };
  if (modo === 'public') corpo.mode = 'public';
  const r = await requisitar(ctx, 'melhorenvio', 'POST', `${baseUrl(ctx, creds)}/api/v2/me/shipment/print`, {
    headers: cabecalhos(creds),
    json: corpo,
    timeoutMs: 25000,
  });
  if (!r.ok) return { ok: false, status: r.status, erro: traduzirErro(r, 'Não foi possível gerar o link de impressão.') };
  const url = r.body && typeof r.body.url === 'string' ? r.body.url : '';
  if (!url || !urlPermitida(ctx, creds, url)) return { ok: false, erro: 'O Melhor Envio não devolveu um link de impressão válido.' };
  return { ok: true, url };
}

/* ------------------------------------------------------------------ Rastreio */

async function rastrear(ctx, creds, idsEtiquetas) {
  const falta = prontas(creds);
  if (falta) return { ok: false, erro: falta };
  const r = await requisitar(ctx, 'melhorenvio', 'POST', `${baseUrl(ctx, creds)}/api/v2/me/shipment/tracking`, {
    headers: cabecalhos(creds),
    json: { orders: idsEtiquetas },
    timeoutMs: 25000,
  });
  if (!r.ok) return { ok: false, status: r.status, erro: traduzirErro(r, 'Não foi possível consultar o rastreio.') };
  const b = r.body && typeof r.body === 'object' ? r.body : {};
  const itens = {};
  for (const id of idsEtiquetas) {
    const x = b[id];
    if (!x || typeof x !== 'object') continue;
    itens[id] = {
      status: texto(x.status, 20),
      codigo: texto(x.tracking || x.melhorenvio_tracking, 40),
      geradaEm: texto(x.generated_at, 30) || null,
      postadoEm: texto(x.posted_at, 30) || null,
      entregueEm: texto(x.delivered_at, 30) || null,
      canceladaEm: texto(x.canceled_at, 30) || null,
      expiradaEm: texto(x.expired_at, 30) || null,
    };
  }
  return { ok: true, itens };
}

/** Dados completos de uma etiqueta (traz o código de rastreio da transportadora em `self_tracking`/`tracking`). */
async function consultarEtiqueta(ctx, creds, id) {
  const falta = prontas(creds);
  if (falta) return { ok: false, erro: falta };
  if (typeof id !== 'string' || !/^[A-Za-z0-9-]{30,60}$/.test(id)) return { ok: false, erro: 'Etiqueta inválida.' };
  const r = await requisitar(ctx, 'melhorenvio', 'GET', `${baseUrl(ctx, creds)}/api/v2/me/orders/${id}`, {
    headers: cabecalhos(creds),
    timeoutMs: 20000,
  });
  if (!r.ok) return { ok: false, status: r.status, erro: traduzirErro(r, 'Não foi possível consultar a etiqueta.') };
  const b = r.body || {};
  const preco = paraCentavos(b.price ?? null);
  return {
    ok: true,
    status: texto(b.status, 20),
    protocolo: texto(b.protocol, 40),
    codigo: texto(b.tracking || b.self_tracking, 40),
    codigoTransportadora: texto(b.self_tracking, 40),
    precoCentavos: preco,
    postadoEm: texto(b.posted_at, 30) || null,
    entregueEm: texto(b.delivered_at, 30) || null,
    canceladaEm: texto(b.canceled_at, 30) || null,
  };
}

/* -------------------------------------------------------------------- Teste */

/**
 * Teste de conexão sem efeitos colaterais: uma cotação do CEP de origem para ele mesmo (valida o token e o
 * escopo shipping-calculate) e a leitura do carrinho (escopo cart-read). Os demais escopos só podem ser
 * comprovados de verdade na primeira etiqueta.
 */
async function testar(ctx, creds, origemCep) {
  const falta = prontas(creds);
  if (falta) return { ok: false, mensagem: falta };
  const c = await cotar(ctx, creds, {
    origemCep,
    destinoCep: origemCep,
    caixa: { alturaCm: 5, larguraCm: 15, comprimentoCm: 20 },
    pesoKg: 0.3,
    seguroCentavos: 5000,
  });
  if (!c.ok) return { ok: false, mensagem: c.erro };
  const k = await requisitar(ctx, 'melhorenvio', 'GET', `${baseUrl(ctx, creds)}/api/v2/me/cart`, { headers: cabecalhos(creds), timeoutMs: 20000 });
  if (!k.ok) {
    return {
      ok: true,
      parcial: true,
      mensagem: `Cotação funcionando, mas a leitura do carrinho falhou (${traduzirErro(k)}). Sem a permissão do carrinho a etiqueta não será criada.`,
    };
  }
  return { ok: true, mensagem: 'Cotação e carrinho funcionando. As demais permissões (compra, geração, impressão, rastreio) só são comprovadas ao emitir a primeira etiqueta.' };
}

return { baseUrl, userAgent, prontas, traduzirErro, cotar, interpretarCotacao, filtrarTransportadoras, montarCarrinho, inserirNoCarrinho, comprar, gerar, imprimir, rastrear, consultarEtiqueta, testar };
})();

/* ────────────────────────────────────────────────────────────────────────────────────────────────────
 * mercado_pago_js  —  o arquivo src/mercado-pago.js (o código abaixo é o do arquivo, sem alteração)
 * ──────────────────────────────────────────────────────────────────────────────────────────────────── */
export const mercado_pago_js = (() => {
/**
 * Mercado Pago — cobrança Pix, consulta, cancelamento e verificação da assinatura do webhook.
 *
 * Contratos conferidos na documentação oficial (developers do Mercado Pago):
 *  - POST /v1/payments com `X-Idempotency-Key`; `payment_method_id` "pix"; e-mail e CPF do pagador;
 *    `date_of_expiration` entre 30 minutos e 30 dias; QR em `point_of_interaction.transaction_data`
 *    (`qr_code`, `qr_code_base64`, `ticket_url`).
 *  - Webhook: cabeçalho `x-signature` (`ts=...,v1=...`) com o manifesto `id:[data.id];request-id:[x-request-id];ts:[ts];`
 *    assinado com HMAC-SHA256 e a assinatura secreta da aplicação. Depois da notificação, sempre consultar
 *    `GET /v1/payments/{id}`.
 * O cancelamento (`PUT /v1/payments/{id}` com status "cancelled") e `GET /users/me` seguem o uso corrente da API
 * e não foram confirmados nas páginas lidas.
 *
 * Não testado contra a conta real do Mercado Pago neste ambiente (só contra simulador).
 */
const { requisitar } = http_js;
const { paraCentavos, deCentavos, texto } = util_js;
const { deBase64, hmacSha256Confere } = cripto_js;

function baseUrl(ctx) {
  return (ctx.urls && ctx.urls.mp) || 'https://api.mercadopago.com';
}

function auth(creds) {
  return { Authorization: `Bearer ${creds.accessToken}` };
}

/** Mensagens do Mercado Pago -> português claro (os três erros que já apareceram em produção + comuns). */
function traduzirErro(r, padrao) {
  if (r.rede) return 'Não foi possível falar com o Mercado Pago agora. Tente de novo em instantes.';
  const msg = String(r.erro || '');
  if (/unauthorized use of live credentials/i.test(msg)) {
    return 'As credenciais de produção do Mercado Pago ainda não foram ativadas. Ative-as no painel do Mercado Pago (Suas integrações → Credenciais de produção) e salve o Access Token novo.';
  }
  if (/without key enabled for QR/i.test(msg)) {
    return 'A conta do Mercado Pago que recebe não tem chave Pix cadastrada. Cadastre uma chave Pix na conta e tente de novo.';
  }
  if (r.status === 401) return 'O Mercado Pago recusou o token (não autorizado). Confira se copiou o Access Token da aplicação correta.';
  if (r.status === 403) return 'O Mercado Pago negou a operação com este token.';
  if (r.status === 429) return 'O Mercado Pago pediu para esperar um pouco. Tente de novo em alguns minutos.';
  if (r.status === 400 || r.status === 422) return `O Mercado Pago não aceitou os dados${msg ? `: ${msg}` : '.'}`;
  return padrao || 'O Mercado Pago devolveu um erro. Tente de novo.';
}

/** "2026-10-12T01:23:45.000-03:00" (o Brasil não usa horário de verão desde 2019). */
function formatarExpiracao(ms) {
  const d = new Date(ms - 3 * 3600 * 1000);
  return `${d.toISOString().replace('Z', '').replace(/\.\d+$/, '.000')}-03:00`;
}

/**
 * @param {{valorCentavos:number,descricao:string,referencia:string,email:string,nome:string,sobrenome:string,cpf:string,expiraEmMs:number,chaveIdempotencia:string,notificationUrl?:string}} p
 */
async function criarPix(ctx, creds, p) {
  if (!creds || !creds.accessToken) return { ok: false, retentavel: false, erro: 'O Access Token do Mercado Pago ainda não foi salvo (tela Fretes → Ajustes).' };

  const corpo = {
    transaction_amount: deCentavos(p.valorCentavos),
    description: texto(p.descricao, 200),
    payment_method_id: 'pix',
    external_reference: p.referencia,
    date_of_expiration: formatarExpiracao(p.expiraEmMs),
    payer: {
      email: p.email,
      first_name: texto(p.nome, 60),
      last_name: texto(p.sobrenome, 60),
      identification: { type: 'CPF', number: p.cpf },
    },
  };
  if (p.notificationUrl && p.notificationUrl.startsWith('https://')) corpo.notification_url = p.notificationUrl;

  const r = await requisitar(ctx, 'mercadopago', 'POST', `${baseUrl(ctx)}/v1/payments`, {
    headers: { ...auth(creds), 'X-Idempotency-Key': p.chaveIdempotencia },
    json: corpo,
    timeoutMs: 25000,
  });
  if (!r.ok) {
    return { ok: false, retentavel: r.rede || r.status >= 500, erro: traduzirErro(r, 'O Mercado Pago recusou a criação do Pix.') };
  }
  const pagamento = interpretarPagamento(r.body);
  if (!pagamento || !pagamento.qrCode) {
    return { ok: false, retentavel: true, erro: 'O Mercado Pago não devolveu o código Pix. Tente novamente.' };
  }
  return { ok: true, pagamento };
}

async function consultarPagamento(ctx, creds, id) {
  if (!creds || !creds.accessToken || !/^\d{1,20}$/.test(String(id))) return { ok: false, retentavel: false, erro: 'Pagamento ou credencial inválidos.' };
  const r = await requisitar(ctx, 'mercadopago', 'GET', `${baseUrl(ctx)}/v1/payments/${id}`, { headers: auth(creds), timeoutMs: 20000 });
  if (!r.ok) return { ok: false, retentavel: r.rede || r.status >= 500 || r.status === 429, erro: traduzirErro(r) };
  const pagamento = interpretarPagamento(r.body);
  if (!pagamento) return { ok: false, retentavel: false, erro: 'Resposta inesperada do Mercado Pago.' };
  return { ok: true, pagamento };
}

/** Cancela uma cobrança pendente para que o Pix antigo não possa mais ser pago. */
async function cancelarPagamento(ctx, creds, id) {
  if (!creds || !creds.accessToken || !/^\d{1,20}$/.test(String(id))) return { ok: false, erro: 'Pagamento ou credencial inválidos.' };
  const r = await requisitar(ctx, 'mercadopago', 'PUT', `${baseUrl(ctx)}/v1/payments/${id}`, {
    headers: auth(creds),
    json: { status: 'cancelled' },
    timeoutMs: 20000,
  });
  return { ok: r.ok, erro: r.ok ? '' : traduzirErro(r) };
}

/** Teste de conexão: pede ao Mercado Pago os dados da conta dona do token. */
async function testar(ctx, creds) {
  if (!creds || !creds.accessToken) return { ok: false, mensagem: 'Salve o Access Token antes de testar.' };
  const r = await requisitar(ctx, 'mercadopago', 'GET', `${baseUrl(ctx)}/users/me`, { headers: auth(creds), timeoutMs: 20000 });
  if (!r.ok) return { ok: false, mensagem: traduzirErro(r, 'Falha ao falar com o Mercado Pago.') };
  return { ok: true, mensagem: 'Token aceito pelo Mercado Pago. (A chave Pix da conta só é conferida ao gerar o primeiro Pix.)' };
}

/** Normaliza a resposta de /v1/payments. */
function interpretarPagamento(corpo) {
  if (!corpo || typeof corpo !== 'object' || corpo.id === undefined || corpo.id === null) return null;
  const id = String(corpo.id);
  if (!/^\d{1,20}$/.test(id)) return null;

  const statusBruto = typeof corpo.status === 'string' ? corpo.status.toLowerCase() : '';
  const detalhe = typeof corpo.status_detail === 'string' ? corpo.status_detail.toLowerCase() : '';
  const valor = paraCentavos(corpo.transaction_amount ?? null);
  const dados = (corpo.point_of_interaction && corpo.point_of_interaction.transaction_data) || {};
  const expira = typeof corpo.date_of_expiration === 'string' ? Date.parse(corpo.date_of_expiration) : NaN;
  const ticket = typeof dados.ticket_url === 'string' && dados.ticket_url.startsWith('https://') ? dados.ticket_url : '';

  return {
    id,
    status: mapearStatus(statusBruto, detalhe),
    statusBruto,
    valorCentavos: valor === null ? -1 : valor,
    referencia: typeof corpo.external_reference === 'string' ? corpo.external_reference : '',
    expiraEmMs: Number.isFinite(expira) ? expira : 0,
    qrCode: typeof dados.qr_code === 'string' ? dados.qr_code.trim() : '',
    qrImagem: sanitizarImagemQr(typeof dados.qr_code_base64 === 'string' ? dados.qr_code_base64 : ''),
    ticketUrl: ticket,
  };
}

/** Status do Mercado Pago -> interno: pending | approved | rejected | cancelled | expired | refunded. */
function mapearStatus(status, detalhe = '') {
  switch (status) {
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'cancelled':
      return detalhe.endsWith('expired') ? 'expired' : 'cancelled';
    case 'refunded':
    case 'charged_back':
      return 'refunded';
    default:
      return 'pending'; // pending, in_process, in_mediation, authorized...
  }
}

/** Aceita só base64 de PNG/JPEG de tamanho razoável; devolve o base64 limpo ou ''. */
function sanitizarImagemQr(b64) {
  const limpo = String(b64 || '').replace(/\s+/g, '');
  if (!limpo || limpo.length > 200000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(limpo)) return '';
  const cabeca = deBase64(limpo.slice(0, 24));
  const png = cabeca.length >= 4 && cabeca[0] === 0x89 && cabeca[1] === 0x50 && cabeca[2] === 0x4e && cabeca[3] === 0x47;
  const jpg = cabeca.length >= 3 && cabeca[0] === 0xff && cabeca[1] === 0xd8 && cabeca[2] === 0xff;
  return png || jpg ? limpo : '';
}

function mimeDaImagem(b64) {
  const cabeca = deBase64(String(b64).slice(0, 8));
  return cabeca[0] === 0x89 ? 'image/png' : 'image/jpeg';
}

/**
 * Verifica o cabeçalho x-signature de um webhook.
 * @param {string} xSignature  ex.: "ts=1704908010,v1=618c..."
 * @param {string} xRequestId  cabeçalho x-request-id ('' se ausente)
 * @param {string} dataId      valor de data.id na URL ('' se ausente)
 */
/** Separa "ts=...,v1=..." em partes; devolve null se o formato não for o do Mercado Pago. */
function lerAssinatura(xSignature) {
  if (!xSignature || xSignature.length > 512) return null;
  let ts = '';
  let v1 = '';
  for (const parte of String(xSignature).split(',')) {
    const i = parte.indexOf('=');
    if (i < 0) continue;
    const k = parte.slice(0, i).trim();
    const v = parte.slice(i + 1).trim();
    if (k === 'ts') ts = v;
    else if (k === 'v1') v1 = v.toLowerCase();
  }
  return /^\d{6,16}$/.test(ts) && /^[0-9a-f]{64}$/.test(v1) ? { ts, v1 } : null;
}

const temFormatoDeAssinatura = (xSignature) => lerAssinatura(xSignature) !== null;

/**
 * Verifica o cabeçalho x-signature de um webhook.
 * @param {string} xSignature  ex.: "ts=1704908010,v1=618c..."
 * @param {string} xRequestId  cabeçalho x-request-id ('' se ausente)
 * @param {string} dataId      valor de data.id na URL ('' se ausente)
 */
async function verificarAssinatura(xSignature, xRequestId, dataId, segredo) {
  const assinatura = segredo ? lerAssinatura(xSignature) : null;
  if (!assinatura) return false;

  // Partes ausentes (data.id / x-request-id) saem do manifesto, como manda a documentação.
  let manifesto = '';
  if (dataId) manifesto += `id:${String(dataId).toLowerCase()};`;
  if (xRequestId) manifesto += `request-id:${xRequestId};`;
  manifesto += `ts:${assinatura.ts};`;

  return hmacSha256Confere(segredo, manifesto, assinatura.v1);
}

return { baseUrl, traduzirErro, formatarExpiracao, criarPix, consultarPagamento, cancelarPagamento, testar, interpretarPagamento, mapearStatus, sanitizarImagemQr, mimeDaImagem, verificarAssinatura, temFormatoDeAssinatura };
})();

/* ────────────────────────────────────────────────────────────────────────────────────────────────────
 * credenciais_js  —  o arquivo src/credenciais.js (o código abaixo é o do arquivo, sem alteração)
 * ──────────────────────────────────────────────────────────────────────────────────────────────────── */
export const credenciais_js = (() => {
/**
 * Tokens do Melhor Envio e do Mercado Pago.
 *
 * Ficam em `privado/credenciais`, uma coleção que nenhuma rota entrega ao navegador e que é gravada cifrada no banco:
 * só o servidor (estas funções) lê e escreve. A tela nunca recebe o valor de volta — só "configurado",
 * os últimos caracteres e o que falta.
 */
const ME = melhor_envio_js;
const MP = mercado_pago_js;
const U = util_js;
const { deBase64 } = cripto_js;
const { ErroNegocio, lerConfig, lerCredenciais } = dados_js;

/** Permissões que o token do Melhor Envio precisa ter para o fluxo completo. */
const ESCOPOS_NECESSARIOS = [
  'shipping-calculate',
  'cart-read',
  'cart-write',
  'shipping-checkout',
  'shipping-generate',
  'shipping-print',
  'shipping-tracking',
  'orders-read',
];

function finalDe(s) {
  return s ? `…${String(s).slice(-4)}` : '';
}

/** Lê exp/scopes do JWT do Melhor Envio sem validar assinatura (só para avisar a administradora). */
function lerJwt(token) {
  try {
    const partes = String(token).split('.');
    if (partes.length !== 3) return null;
    const p = JSON.parse(new TextDecoder().decode(deBase64(partes[1])));
    let escopos = null;
    if (Array.isArray(p.scopes)) escopos = p.scopes.map(String);
    else if (typeof p.scope === 'string') escopos = p.scope.split(/\s+/).filter(Boolean);
    return { expiraEm: Number.isFinite(p.exp) ? p.exp * 1000 : null, escopos };
  } catch {
    return null;
  }
}

async function status(ctx) {
  const c = await lerCredenciais(ctx);
  const cfg = await lerConfig(ctx);
  const jwt = c.me.token ? lerJwt(c.me.token) : null;
  const faltando = jwt && jwt.escopos ? ESCOPOS_NECESSARIOS.filter((e) => !jwt.escopos.includes(e)) : null;
  return {
    melhorEnvio: {
      configurado: !!c.me.token,
      final: finalDe(c.me.token),
      ambiente: c.me.ambiente,
      emailContato: c.me.emailContato,
      expiraEm: jwt ? jwt.expiraEm : null,
      escopos: jwt ? jwt.escopos : null,
      escoposFaltando: faltando,
    },
    mercadoPago: {
      configurado: !!c.mp.accessToken,
      final: finalDe(c.mp.accessToken),
      producao: c.mp.accessToken ? c.mp.accessToken.startsWith('APP_USR-') : null,
      webhookConfigurado: !!c.mp.webhookSecret,
    },
    remetenteDocumentoConfigurado: !!c.remetenteDocumento,
    origemCepConfigurado: !!cfg.origemCep,
    escoposNecessarios: ESCOPOS_NECESSARIOS,
  };
}

/** Aceita o token colado com "Bearer ", quebras de linha ou aspas e devolve só o token. */
function limparToken(bruto, max) {
  let t = String(bruto === undefined || bruto === null ? '' : bruto).trim();
  t = t.replace(/^bearer\s+/i, '').replace(/^["']|["']$/g, '');
  if (/\s/.test(t)) throw new ErroNegocio('token_invalido', 'O token tem espaços ou quebras de linha no meio. Copie de novo, inteiro e de uma vez só.');
  if (t.length > max) throw new ErroNegocio('token_invalido', 'O token é longo demais para ser válido. Confira o que foi colado.');
  return t;
}

/**
 * Campos em branco mantêm o valor atual; para remover um segredo use `remover: ['melhorEnvioToken', ...]`.
 */
async function salvar(ctx, entrada) {
  const ref = ctx.db.doc('privado/credenciais');
  const atual = (await ref.get()).data() || {};
  const me = { ...(atual.melhorEnvio || {}) };
  const mp = { ...(atual.mercadoPago || {}) };
  let doc = atual.remetenteDocumento || '';
  const e = entrada || {};
  const agora = ctx.now();

  if (e.melhorEnvio) {
    const x = e.melhorEnvio;
    if (x.token !== undefined && String(x.token).trim() !== '') {
      const t = limparToken(x.token, 4096);
      if (t.length < 20) throw new ErroNegocio('token_invalido', 'Esse token do Melhor Envio parece curto demais. Copie de novo, inteiro.');
      me.token = t;
      me.salvoEm = agora;
    }
    if (x.ambiente !== undefined) {
      if (!['sandbox', 'producao'].includes(x.ambiente)) throw new ErroNegocio('ambiente_invalido', 'Escolha sandbox (teste) ou produção.');
      me.ambiente = x.ambiente;
    }
    if (x.emailContato !== undefined && String(x.emailContato).trim() !== '') {
      if (!U.emailValido(x.emailContato)) throw new ErroNegocio('email_invalido', 'E-mail de contato inválido.');
      me.emailContato = String(x.emailContato).trim();
    }
  }
  if (e.mercadoPago) {
    const x = e.mercadoPago;
    if (x.accessToken !== undefined && String(x.accessToken).trim() !== '') {
      const t = limparToken(x.accessToken, 400);
      if (!/^(APP_USR|TEST)-[A-Za-z0-9-]{20,}$/.test(t)) {
        throw new ErroNegocio('token_invalido', 'O Access Token do Mercado Pago deve começar com APP_USR- (produção) ou TEST- (teste).');
      }
      mp.accessToken = t;
      mp.salvoEm = agora;
    }
    if (x.webhookSecret !== undefined && String(x.webhookSecret).trim() !== '') {
      const t = limparToken(x.webhookSecret, 200);
      if (t.length < 16) throw new ErroNegocio('segredo_invalido', 'A assinatura secreta do webhook parece curta demais. Copie de novo.');
      mp.webhookSecret = t;
    }
  }
  if (e.remetenteDocumento !== undefined && String(e.remetenteDocumento).trim() !== '') {
    const d = U.digitos(e.remetenteDocumento);
    if (!(U.cpfValido(d) || U.cnpjValido(d))) throw new ErroNegocio('documento_invalido', 'CPF ou CNPJ de quem envia está inválido.');
    doc = d;
  }

  for (const chave of Array.isArray(e.remover) ? e.remover : []) {
    if (chave === 'melhorEnvioToken') delete me.token;
    else if (chave === 'mercadoPagoToken') delete mp.accessToken;
    else if (chave === 'mercadoPagoWebhook') delete mp.webhookSecret;
  }

  await ref.set({ melhorEnvio: me, mercadoPago: mp, remetenteDocumento: doc, atualizadoEm: agora });
  return status(ctx);
}

async function testar(ctx) {
  const c = await lerCredenciais(ctx);
  const cfg = await lerConfig(ctx);
  const [me, mp] = await Promise.all([ME.testar(ctx, c.me, cfg.origemCep), MP.testar(ctx, c.mp)]);
  return { melhorEnvio: me, mercadoPago: mp };
}

return { status, salvar, testar, lerJwt, limparToken };
})();
