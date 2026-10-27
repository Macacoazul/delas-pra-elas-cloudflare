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
import { requisitar } from './http.js';
import { paraCentavos, deCentavos, texto, digitos, limparCep, limparTelefone, ufValida } from './util.js';

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

export {
  baseUrl,
  userAgent,
  prontas,
  traduzirErro,
  cotar,
  interpretarCotacao,
  filtrarTransportadoras,
  montarCarrinho,
  inserirNoCarrinho,
  comprar,
  gerar,
  imprimir,
  rastrear,
  consultarEtiqueta,
  testar,
};
