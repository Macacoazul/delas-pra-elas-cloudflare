/**
 * O servidor não pode depender de recursos só do Node (node:crypto, Buffer): no Cloudflare ele roda sem eles.
 * Aqui as funções de criptografia do servidor (WebCrypto) são conferidas contra o node:crypto e o Buffer.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import * as Cripto from '../src/cripto.js';

const texto = (n, sementeBase) => {
  // texto determinístico com acentos e emoji (bytes UTF-8 de 1 a 4)
  const pecas = ['a', 'Z', '0', ' ', 'ç', 'ã', 'é', '€', '漢', '😀', '|', ';', ':'];
  let s = '';
  let x = sementeBase;
  while (s.length < n) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    s += pecas[x % pecas.length];
  }
  return s.slice(0, n);
};

test('criptografia: SHA-256 confere com o node:crypto e com os exemplos do NIST', async () => {
  const tamanhos = [...Array.from({ length: 140 }, (_, i) => i), 191, 192, 255, 256, 1000, 5000];
  for (const n of tamanhos) {
    const s = texto(n, n + 7);
    assert.equal(await Cripto.sha256Hex(s), crypto.createHash('sha256').update(s).digest('hex'), `tamanho ${n}`);
  }
  assert.equal(await Cripto.sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(await Cripto.sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(await Cripto.sha256Hex(12345), crypto.createHash('sha256').update('12345').digest('hex'));
});

test('criptografia: HMAC-SHA256 confere com o node:crypto e com a RFC 4231', async () => {
  for (const tc of [1, 20, 63, 64, 65, 128, 300]) {
    for (const tm of [0, 1, 55, 56, 63, 64, 65, 119, 120, 500]) {
      const chave = texto(tc, tc * 31 + tm);
      const mensagem = texto(tm, tm * 17 + tc);
      assert.equal(await Cripto.hmacSha256Hex(chave, mensagem), crypto.createHmac('sha256', chave).update(mensagem).digest('hex'), `chave ${tc}, mensagem ${tm}`);
    }
  }
  assert.equal(await Cripto.hmacSha256Hex('Jefe', 'what do ya want for nothing?'), '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');
});

test('criptografia: conferir assinatura aceita só a certa, em hexadecimal de 64 caracteres', async () => {
  const certa = await Cripto.hmacSha256Hex('segredo', 'mensagem');
  assert.equal(await Cripto.hmacSha256Confere('segredo', 'mensagem', certa), true);
  assert.equal(await Cripto.hmacSha256Confere('segredo', 'mensagem', certa.toUpperCase()), true, 'maiúsculas também valem');
  assert.equal(await Cripto.hmacSha256Confere('segredo', 'mensagem!', certa), false, 'mensagem diferente');
  assert.equal(await Cripto.hmacSha256Confere('outro', 'mensagem', certa), false, 'segredo diferente');
  const trocada = `${certa.slice(0, 63)}${certa[63] === '0' ? '1' : '0'}`;
  assert.equal(await Cripto.hmacSha256Confere('segredo', 'mensagem', trocada), false, 'um dígito diferente');
  for (const ruim of ['', 'zzzz', certa.slice(0, 62), `${certa}00`, null, undefined, 12, `${certa.slice(0, 63)}g`]) {
    assert.equal(await Cripto.hmacSha256Confere('segredo', 'mensagem', ruim), false, `formato ${String(ruim)}`);
  }
});

test('criptografia: base64 e base64url lidos como o Buffer lia (com e sem =, com sobras)', () => {
  for (let n = 0; n < 70; n += 1) {
    const bytes = crypto.randomBytes(n);
    for (const t of [bytes.toString('base64'), bytes.toString('base64url'), bytes.toString('base64').replace(/=+$/, '')]) {
      assert.deepEqual(Buffer.from(Cripto.deBase64(t)), Buffer.from(t, 'base64'), `n=${n} ${t}`);
    }
    assert.equal(Cripto.paraBase64Url(bytes), bytes.toString('base64url'));
    assert.equal(Cripto.paraHex(bytes), bytes.toString('hex'));
    assert.deepEqual(Buffer.from(Cripto.deBase64UrlEstrito(bytes.toString('base64url'))), bytes);
  }
  assert.deepEqual(Buffer.from(Cripto.deBase64('iVBO Rw0K\n==')), Buffer.from('iVBO Rw0K\n==', 'base64'));
  assert.equal(Cripto.deBase64('').length, 0);
  assert.equal(Cripto.deBase64(null).length, 0);
});

test('criptografia: base64url estrito recusa o que não é base64url', () => {
  for (const ruim of ['a+b', 'a/b', 'a=b=', 'a b', 'a\nb', 'abcde', 'é', '%41%41']) {
    assert.throws(() => Cripto.deBase64UrlEstrito(ruim), /base64url/, JSON.stringify(ruim));
  }
  assert.equal(Cripto.deBase64UrlEstrito('').length, 0);
});

test('criptografia: tokens aleatórios no formato certo e sem repetição', () => {
  const tokens = new Set();
  for (let i = 0; i < 2000; i += 1) {
    const t = Cripto.novoToken();
    assert.match(t, /^[A-Za-z0-9_-]{32}$/);
    assert.ok(Cripto.tokenValido(t));
    tokens.add(t);
  }
  assert.equal(tokens.size, 2000);
  assert.equal(Cripto.bytesAleatorios(16).length, 16);
  assert.equal(Cripto.tokenValido(123), false);
  assert.equal(Cripto.tokenValido(null), false);
});

test('criptografia: UUID de semente continua igual ao de antes (chave de idempotência estável)', async () => {
  const antigo = (semente) => {
    const h = crypto.createHash('sha256').update(String(semente)).digest('hex').slice(0, 32).split('');
    h[12] = '4';
    h[16] = '89ab'[parseInt(h[16], 16) % 4];
    const s = h.join('');
    return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
  };
  for (const semente of ['', 'a', 'dpe-pix|x|y|5000|abc|123|1', texto(200, 3)]) {
    assert.equal(await Cripto.uuidDeSemente(semente), antigo(semente));
  }
});

test('portabilidade: o código do servidor não usa node:*, Buffer nem process', () => {
  const pasta = path.join(import.meta.dirname, '..', 'src');
  const achados = [];
  for (const arq of fs.readdirSync(pasta).filter((a) => a.endsWith('.js'))) {
    const conteudo = fs.readFileSync(path.join(pasta, arq), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    if (/require\(['"]node:/.test(conteudo) || /\bBuffer\b/.test(conteudo) || /\bprocess\./.test(conteudo)) achados.push(arq);
  }
  assert.deepEqual(achados, [], 'estes arquivos dependem de recursos só do Node');
});
