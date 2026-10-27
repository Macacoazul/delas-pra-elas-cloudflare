/**
 * Tokens do Melhor Envio e do Mercado Pago.
 *
 * Ficam em `privado/credenciais`, uma coleção que nenhuma rota entrega ao navegador e que é gravada cifrada no banco:
 * só o servidor (estas funções) lê e escreve. A tela nunca recebe o valor de volta — só "configurado",
 * os últimos caracteres e o que falta.
 */
import * as ME from './melhor-envio.js';
import * as MP from './mercado-pago.js';
import * as U from './util.js';
import { deBase64 } from './cripto.js';
import { ErroNegocio, lerConfig, lerCredenciais } from './dados.js';

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

export { status, salvar, testar, lerJwt, limparToken };
