/**
 * Códigos, tokens e assinaturas. Tudo usa só o que o Cloudflare Workers já traz (WebCrypto, atob/btoa):
 * nenhuma criptografia escrita à mão.
 */
const codificador = new TextEncoder();

export function bytesAleatorios(n) {
  const b = new Uint8Array(n);
  globalThis.crypto.getRandomValues(b);
  return b;
}

export function paraHex(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 1) s += bytes[i].toString(16).padStart(2, '0');
  return s;
}

/** Base64 "seguro para endereço" (- e _ no lugar de + e /, sem =). */
export function paraBase64Url(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < arr.length; i += 1) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Lê base64 ou base64url; ignora o que não é do alfabeto e sobras no fim (nunca lança erro). */
export function deBase64(texto) {
  let b64 = String(texto || '').replace(/-/g, '+').replace(/_/g, '/').replace(/[^A-Za-z0-9+/]/g, '');
  if (b64.length % 4 === 1) b64 = b64.slice(0, -1);
  b64 += '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(b64);
  const saida = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) saida[i] = bin.charCodeAt(i);
  return saida;
}

/** Lê base64url exigindo o formato certo (usado ao conferir logins e assinaturas): lança erro se vier algo estranho. */
export function deBase64UrlEstrito(texto) {
  const t = String(texto);
  if (!/^[A-Za-z0-9_-]*$/.test(t) || t.length % 4 === 1) throw new Error('base64url inválido');
  const b64 = t.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const saida = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) saida[i] = bin.charCodeAt(i);
  return saida;
}

/** Token do link: 24 bytes aleatórios em base64url (32 caracteres, impossível de adivinhar). */
export function novoToken() {
  return paraBase64Url(bytesAleatorios(24));
}

export function tokenValido(t) {
  return typeof t === 'string' && /^[A-Za-z0-9_-]{32}$/.test(t);
}

export async function sha256Hex(texto) {
  return paraHex(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', codificador.encode(String(texto)))));
}

function chaveHmac(chave, usos) {
  return globalThis.crypto.subtle.importKey('raw', codificador.encode(String(chave)), { name: 'HMAC', hash: 'SHA-256' }, false, usos);
}

/** HMAC-SHA256 em hexadecimal (chave e mensagem em texto UTF-8). */
export async function hmacSha256Hex(chave, mensagem) {
  const k = await chaveHmac(chave, ['sign']);
  return paraHex(new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', k, codificador.encode(String(mensagem)))));
}

/** Confere uma assinatura HMAC-SHA256 (hex) em tempo constante (a comparação é feita pelo próprio WebCrypto). */
export async function hmacSha256Confere(chave, mensagem, assinaturaHex) {
  if (!/^[0-9a-f]{64}$/i.test(String(assinaturaHex))) return false;
  const assinatura = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) assinatura[i] = parseInt(String(assinaturaHex).slice(i * 2, i * 2 + 2), 16);
  const k = await chaveHmac(chave, ['verify']);
  return globalThis.crypto.subtle.verify('HMAC', k, assinatura, codificador.encode(String(mensagem)));
}

/* ── chaves derivadas do SEGREDO do Worker ───────────────────
   Um segredo só (env.SEGREDO) gera chaves separadas para cada uso (sessão, senhas), de modo que uma nunca serve no lugar da outra. */
export async function chaveDerivada(segredo, uso) {
  if (!segredo) throw new Error('Falta o SEGREDO do Worker.');
  const base = await globalThis.crypto.subtle.importKey('raw', codificador.encode(String(segredo)), 'HKDF', false, ['deriveKey']);
  return globalThis.crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: codificador.encode('delas-pra-elas'), info: codificador.encode(String(uso)) },
    base,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    false,
    ['sign', 'verify'],
  );
}

/** Assinatura HMAC-SHA256 em base64url (a chave vem de chaveDerivada). */
export async function assinar(chave, texto) {
  return paraBase64Url(new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', chave, codificador.encode(String(texto)))));
}

/** Confere a assinatura em tempo constante (quem compara é o próprio WebCrypto). */
export async function assinaturaConfere(chave, texto, assinatura) {
  try {
    return await globalThis.crypto.subtle.verify('HMAC', chave, deBase64UrlEstrito(String(assinatura)), codificador.encode(String(texto)));
  } catch {
    return false;
  }
}

/** Compara dois textos sem pressa diferente para iguais e diferentes. */
export async function textosIguais(a, b) {
  const chave = await globalThis.crypto.subtle.importKey('raw', bytesAleatorios(32), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  const sig = await globalThis.crypto.subtle.sign('HMAC', chave, codificador.encode(String(a)));
  return globalThis.crypto.subtle.verify('HMAC', chave, sig, codificador.encode(String(b)));
}

/** UUID v4 determinístico a partir de uma semente (chave de idempotência do Mercado Pago). */
export async function uuidDeSemente(semente) {
  const h = (await sha256Hex(semente)).slice(0, 32).split('');
  h[12] = '4';
  h[16] = '89ab'[parseInt(h[16], 16) % 4];
  const s = h.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}
