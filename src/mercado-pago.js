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
import { requisitar } from './http.js';
import { paraCentavos, deCentavos, texto } from './util.js';
import { deBase64, hmacSha256Confere } from './cripto.js';

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

export {
  baseUrl,
  traduzirErro,
  formatarExpiracao,
  criarPix,
  consultarPagamento,
  cancelarPagamento,
  testar,
  interpretarPagamento,
  mapearStatus,
  sanitizarImagemQr,
  mimeDaImagem,
  verificarAssinatura,
  temFormatoDeAssinatura,
};
