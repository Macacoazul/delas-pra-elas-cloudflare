/**
 * Os arquivos para colar no Cloudflare (pasta para-colar/), gerados por "npm run colar":
 *   - são legíveis (nada de base64 nem de texto comprimido), pequenos e com nomes simples;
 *   - têm EXATAMENTE o mesmo código que os arquivos de src/ (o teste compara função por função);
 *   - guardam o site letra por letra (e o Worker percebe quando um arquivo é colado cortado ou alterado);
 *   - a pasta para-colar/ do projeto está em dia com o que o gerador produz hoje.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';

import { montarKit, paraTemplate, dividirEmPartes, CAMADAS, GRUPOS_DO_SITE, LIMITE_DO_ARQUIVO, LIMITE_DE_LINHAS, PARTE_MAXIMA, PARTE_MAXIMA_EM_LINHAS } from '../scripts/colar.mjs';
import { construirSite } from '../scripts/construir-site.mjs';
import { PROIBIDOS } from '../scripts/proibidos.mjs';
import { criarEcossistema, criarNavegador, EMAIL_DA_DONA, SENHA_DA_DONA, ADMIN_SENHA_DE_TESTE } from './helpers/ecossistema.js';

const raiz = path.join(import.meta.dirname, '..');
let kit;
let pasta;
let eco;

const importar = (arquivo, nome = arquivo) => import(`${pathToFileURL(path.join(pasta, arquivo)).href}?v=${Date.now()}-${nome}`);

function copiarKit(destino) {
  fs.mkdirSync(destino, { recursive: true });
  fs.writeFileSync(path.join(destino, 'package.json'), '{"type":"module"}\n');
  for (const [nome, texto] of kit.arquivos) fs.writeFileSync(path.join(destino, nome), texto);
}

before(async () => {
  kit = await montarKit(); // já confere sintaxe, importações, tamanhos e roda o Worker montado com todas as páginas
  pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-teste-'));
  copiarKit(pasta);
  eco = await criarEcossistema();
});

after(async () => {
  if (eco) await eco.parar();
  if (pasta) fs.rmSync(pasta, { recursive: true, force: true });
});

/* ── forma dos arquivos ──────────────────────────────────────────────────────────────────────────────────────────── */

test('colagem: arquivos esperados, nomes simples na raiz, tamanhos e linhas confortáveis para colar', () => {
  const nomes = [...kit.arquivos.keys()];
  assert.equal(nomes[0], 'worker.js', 'o principal vem primeiro');
  assert.deepEqual(nomes.slice(1, 1 + CAMADAS.length), CAMADAS.map((c) => c.arquivo));
  for (const nome of nomes) {
    assert.match(nome, /^[a-z0-9-]+\.js$/, nome);
    const texto = kit.arquivos.get(nome);
    assert.ok(Buffer.byteLength(texto) <= LIMITE_DO_ARQUIVO, `${nome}: ${Buffer.byteLength(texto)} bytes`);
    if (nome !== 'site-biblioteca.js') assert.ok(texto.split('\n').length <= LIMITE_DE_LINHAS, `${nome}: linhas demais`);
    assert.ok(!texto.includes('\r'), `${nome}: quebra de linha do Windows dentro do arquivo`);
    assert.ok(texto.endsWith('\n'), nome);
  }
  assert.ok(nomes.length <= 14, `${nomes.length} arquivos para colar é demais`);
  for (const g of GRUPOS_DO_SITE) assert.ok(nomes.some((n) => n.startsWith(`site-${g.nome}`)), g.nome);
  assert.ok(!nomes.includes('loja.js'), 'não existe mais arquivo de configuração para editar: tudo vai por segredos do painel');
});

test('colagem: tudo é código legível — sem base64, sem compressão, sem linhas gigantes (só a biblioteca Preact vem minificada)', () => {
  for (const [nome, texto] of kit.arquivos) {
    assert.doesNotMatch(texto, /[A-Za-z0-9+/]{200,}/, `${nome}: bloco longo parecido com base64`);
    assert.doesNotMatch(texto, /DecompressionStream|CompressionStream|\bgunzip\b|\binflate\b|\bpako\b|\batob\s*\(.{80,}/, `${nome}: descompressão`);
    if (nome !== 'site-biblioteca.js') {
      const maior = Math.max(...texto.split('\n').map((l) => l.length));
      assert.ok(maior <= 1000, `${nome}: linha de ${maior} caracteres`);
    }
  }
  // O código do servidor tem comentários explicando (não é só código seco).
  for (const nome of ['base.js', 'servicos.js', 'negocio.js', 'servidor.js']) {
    const texto = kit.arquivos.get(nome);
    const comentarios = texto.split('\n').filter((l) => /^\s*(\/\/|\/?\*)/.test(l)).length;
    assert.ok(comentarios > texto.split('\n').length * 0.05, `${nome}: poucos comentários (${comentarios})`);
  }
});

test('colagem: cada arquivo só importa irmãos da pasta; só worker.js e site-*.js têm "export default"; nada do Node', () => {
  const nomes = new Set(kit.arquivos.keys());
  for (const [nome, texto] of kit.arquivos) {
    for (const [, alvo] of texto.matchAll(/^\s*import\b[^'"\n]*?from\s*(['"])(.+?)\1/gm).toArray().map((m) => [m[0], m[2]])) {
      assert.match(alvo, /^\.\/[a-z0-9-]+\.js$/, `${nome} importa ${alvo}`);
      assert.ok(nomes.has(alvo.slice(2)), `${nome} importa ${alvo}, que não existe`);
    }
    const temPadrao = /^export\s+default\b/m.test(texto);
    assert.equal(temPadrao, nome === 'worker.js' || nome.startsWith('site-'), `${nome}: export default`);
    if (!nome.startsWith('site-')) {
      assert.doesNotMatch(texto, /\brequire\s*\(|\bBuffer\b|\bprocess\.|node:|\beval\s*\(|new\s+Function|\bimport\s*\(/, `${nome}: usa algo que não existe (ou não é permitido) no Workers`);
    }
  }
  const camadas = CAMADAS.map((c) => c.arquivo);
  camadas.forEach((arquivo, i) => {
    for (const [, de] of kit.arquivos.get(arquivo).matchAll(/from '\.\/([a-z0-9-]+\.js)'/g)) {
      assert.ok(camadas.indexOf(de) >= 0 && camadas.indexOf(de) < i, `${arquivo} só pode usar arquivos mais abaixo na lista (${de})`);
    }
  });
});

test('colagem: nada do sistema antigo, nenhum segredo escrito e nenhum endereço de teste dentro dos arquivos', () => {
  for (const [nome, texto] of kit.arquivos) {
    for (const [padrao, motivo] of PROIBIDOS) assert.doesNotMatch(texto, padrao, `${nome}: ${motivo}`);
    assert.doesNotMatch(texto, /APP_USR-[A-Za-z0-9-]{20,}|TEST-[A-Za-z0-9-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|Bearer [A-Za-z0-9._-]{20,}/, nome);
    assert.doesNotMatch(texto, /\b(SEGREDO|ADMIN_SENHA)\s*[:=]\s*['"`][^'"`]{4,}/, `${nome}: segredo escrito no código`);
  }
});

test('colagem: o worker.js é pequeno e só liga o servidor às páginas', () => {
  const w = kit.arquivos.get('worker.js');
  assert.ok(w.split('\n').length < 40);
  assert.match(w, /^export default servidor_js\.criarServidor\(\{ arquivos: site_js\.juntarSite\(\[/m);
  for (const n of kit.arquivos.keys()) if (n.startsWith('site-')) assert.ok(w.includes(`'./${n}'`), `${n} precisa ser ligado no worker.js`);
});

/* ── mesmo código que src/ ───────────────────────────────────────────────────────────────────────────────────────── */

function mesmoValor(a, b, onde, vistos = new WeakSet()) {
  assert.equal(typeof a, typeof b, `${onde}: tipo`);
  if (typeof b === 'function') {
    assert.equal(String(a), String(b), `${onde}: o código da função é diferente`);
    assert.equal(a.name, b.name, `${onde}: nome`);
    return;
  }
  if (b === null || typeof b !== 'object') return assert.deepStrictEqual(a, b, onde);
  if (vistos.has(b)) return;
  vistos.add(b);
  if (b instanceof RegExp) return assert.equal(String(a), String(b), onde);
  if (b instanceof Map || b instanceof Set) return assert.deepStrictEqual([...a], [...b], onde);
  assert.equal(Object.getPrototypeOf(a)?.constructor?.name, Object.getPrototypeOf(b)?.constructor?.name, `${onde}: tipo do objeto`);
  assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort(), `${onde}: chaves`);
  for (const k of Object.keys(b)) mesmoValor(a[k], b[k], `${onde}.${k}`, vistos);
}

test('colagem: cada bloco dos arquivos de código tem as mesmas peças, com o mesmo código, que o arquivo original de src/', async () => {
  let conferidos = 0;
  for (const camada of CAMADAS) {
    const doKit = await importar(camada.arquivo);
    for (const modulo of camada.modulos) {
      const original = await import(`../src/${modulo}.js`);
      const bloco = doKit[`${modulo.replace(/-/g, '_')}_js`];
      assert.ok(bloco, `${camada.arquivo}: falta o bloco de ${modulo}.js`);
      assert.deepEqual(Object.keys(bloco).sort(), Object.keys(original).sort(), `${modulo}: o que o bloco entrega`);
      for (const nome of Object.keys(original)) {
        mesmoValor(bloco[nome], original[nome], `${modulo}.${nome}`);
        conferidos += 1;
      }
    }
  }
  assert.ok(conferidos > 120, `só ${conferidos} peças conferidas`);
});

test('colagem: todos os arquivos de src/ estão em algum arquivo do kit (nenhum ficou de fora)', () => {
  const emSrc = fs.readdirSync(path.join(raiz, 'src')).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)).sort();
  assert.deepEqual(CAMADAS.flatMap((c) => c.modulos).sort(), emSrc);
});

/* ── o site dentro dos arquivos ──────────────────────────────────────────────────────────────────────────────────── */

test('colagem: o site guardado nos arquivos sai letra por letra igual ao da pasta site/ (inclusive os arquivos divididos em partes)', async () => {
  const worker = (await importar('worker.js')).default;
  for (const [caminho, a] of Object.entries(kit.site)) {
    const r = await worker.fetch(new Request(`https://loja.exemplo${caminho}`), {});
    assert.equal(r.status, 200, caminho);
    assert.equal(await r.text(), a.corpo, caminho);
    assert.equal(r.headers.get('etag'), `"${a.etag}"`, caminho);
  }
  const divididos = [...kit.arquivos.keys()].filter((n) => /^site-.*-\d+\.js$/.test(n));
  assert.ok(divididos.length >= 4, 'o app e a tela de Fretes são divididos em partes');
});

test('colagem: o site da pasta site/ está em dia com o código das telas em app/ (rode "npm run site" se falhar)', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'site-novo-'));
  try {
    const novos = await construirSite({ saida: temp });
    for (const [arquivo, texto] of Object.entries(novos)) {
      assert.equal(fs.readFileSync(path.join(raiz, 'site', arquivo), 'utf8').replace(/\r\n/g, '\n'), texto, `site/${arquivo} está desatualizado`);
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('colagem: a pasta para-colar/ do projeto está em dia com o que o gerador produz hoje (rode "npm run colar" se falhar)', (t) => {
  const pastaDoProjeto = path.join(raiz, 'para-colar');
  if (!fs.existsSync(pastaDoProjeto)) return t.skip('a pasta para-colar/ ainda não foi gerada');
  const nomesNoDisco = fs.readdirSync(pastaDoProjeto).filter((f) => f.endsWith('.js')).sort();
  assert.deepEqual(nomesNoDisco, [...kit.arquivos.keys()].sort(), 'lista de arquivos diferente');
  for (const [nome, texto] of kit.arquivos) assert.equal(fs.readFileSync(path.join(pastaDoProjeto, nome), 'utf8'), texto, `${nome} está desatualizado`);
});

test('colagem: o mesmo projeto gera sempre os mesmos arquivos', async () => {
  const outra = await montarKit({ conferir: false });
  assert.deepEqual([...outra.arquivos.keys()], [...kit.arquivos.keys()]);
  for (const [nome, texto] of outra.arquivos) assert.equal(texto, kit.arquivos.get(nome), nome);
});

/* ── peças do gerador ────────────────────────────────────────────────────────────────────────────────────────────── */

test('paraTemplate: qualquer texto vira um modelo (`...`) que, ao ser lido, devolve exatamente o mesmo texto', () => {
  const alfabeto = ['\\', '`', '$', '{', '}', '\n', 'a', 'é', '😀', "'", '"', '/', '*', '<', '>', ' ', '\t', '${', '\\`', '\\\\', '$$', '`${', '\\${', '</script>'];
  let semente = 12345;
  const sorteio = (n) => {
    semente = (semente * 1103515245 + 12345) & 0x7fffffff;
    return semente % n;
  };
  for (let i = 0; i < 3000; i += 1) {
    let texto = '';
    for (let j = sorteio(30); j > 0; j -= 1) texto += alfabeto[sorteio(alfabeto.length)];
    const lido = vm.runInNewContext(`\`${paraTemplate(texto)}\``);
    assert.equal(lido, texto, JSON.stringify(texto));
  }
  const codigo = 'const a = `x ${y}`; const re = /\\d+\\/\\*/; const s = "a\\nb"; // ``` ${ \\u0041';
  assert.equal(vm.runInNewContext(`\`${paraTemplate(codigo)}\``), codigo);
});

test('dividirEmPartes: corta só em fim de linha, junta de volta igual e respeita os limites de bytes e de linhas', () => {
  assert.deepEqual(dividirEmPartes('curto\ntexto\n'), ['curto\ntexto\n']);
  const linhas = Array.from({ length: 5000 }, (_, i) => `linha ${i} com um texto qualquer \${x} \`y\` ${'z'.repeat(i % 40)}`);
  const corpo = `${linhas.join('\n')}\n`;
  const partes = dividirEmPartes(corpo);
  assert.ok(partes.length >= 4);
  assert.equal(partes.join(''), corpo);
  partes.forEach((p, i) => {
    if (i < partes.length - 1) assert.ok(p.endsWith('\n'));
    assert.ok(Buffer.byteLength(paraTemplate(p)) <= PARTE_MAXIMA);
    assert.ok(p.split('\n').length - 1 <= PARTE_MAXIMA_EM_LINHAS + 1);
  });
  assert.equal(dividirEmPartes('a'.repeat(10) + '\n' + 'b'.repeat(10), 12, 100).join(''), 'a'.repeat(10) + '\n' + 'b'.repeat(10));
  const semFimDeLinha = dividirEmPartes(`${linhas.join('\n')}`);
  assert.equal(semFimDeLinha.join(''), linhas.join('\n'));
});

/* ── o que acontece quando a colagem sai errada ──────────────────────────────────────────────────────────────────── */

test('colagem errada: arquivo de página colado cortado ou alterado → /api/saude diz site:false (sem dizer qual)', async () => {
  const copia = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-cortado-'));
  try {
    copiarKit(copia);
    const alvo = path.join(copia, 'site-live-2.js');
    const texto = fs.readFileSync(alvo, 'utf8');
    fs.writeFileSync(alvo, texto.replace('const ', 'let ')); // uma letra trocada
    const worker = (await import(`${pathToFileURL(path.join(copia, 'worker.js')).href}?v=${Date.now()}`)).default;
    const r = await criarNavegador(worker, eco.env).pedir('GET', '/api/saude');
    assert.equal(r.status, 503);
    assert.equal(r.json.site, false);
    assert.doesNotMatch(r.texto, /site-live|app\.js/);
  } finally {
    fs.rmSync(copia, { recursive: true, force: true });
  }
});

test('colagem errada: arquivo do site que falta → o Worker nem sobe e diz qual parte está faltando', async () => {
  const copia = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-faltando-'));
  try {
    copiarKit(copia);
    const alvo = path.join(copia, 'worker.js');
    const w = fs.readFileSync(alvo, 'utf8');
    fs.writeFileSync(alvo, w.replace(', siteFretes2]', ']').replace("import siteFretes2 from './site-fretes-2.js';\n", ''));
    await assert.rejects(import(`${pathToFileURL(alvo).href}?v=${Date.now()}`), /faltam as partes 2 de "\/fretes\.js"/);
  } finally {
    fs.rmSync(copia, { recursive: true, force: true });
  }
});

/* ── o kit funcionando de ponta a ponta (no Node; o motor do Cloudflare é testado em test/workerd) ─────────────── */

test('kit montado: primeiro acesso, login, app da live e comandos da dona, tudo pelos arquivos gerados', async () => {
  const worker = (await importar('worker.js')).default;
  const dona = criarNavegador(worker, eco.env);

  const saude = await dona.pedir('GET', '/api/saude');
  assert.equal(saude.status, 200);
  assert.deepEqual(saude.json, { ok: true, banco: true, segredo: true, site: true });

  assert.equal((await dona.pedir('GET', '/api/auth/eu')).json.primeiroAcesso, true);
  const criada = await dona.pedir('POST', '/api/auth/primeiro-acesso', { corpo: { email: EMAIL_DA_DONA, senha: SENHA_DA_DONA, chave: ADMIN_SENHA_DE_TESTE } });
  assert.equal(criada.status, 200, criada.texto);
  assert.ok(dona.temSessao());
  assert.equal((await dona.pedir('GET', '/api/auth/eu')).json.usuario.email, EMAIL_DA_DONA);

  const gravou = await dona.pedir('POST', '/api/app/gravar', { corpo: { ops: [{ op: 'set', col: 'clientes', id: 'c1', dados: { nome: 'Maria da Silva', whatsapp: '47999998888' } }] } });
  assert.equal(gravou.status, 200, gravou.texto);
  const estado = await dona.pedir('GET', '/api/app/estado?desde=0&c=clientes');
  assert.equal(estado.status, 200);
  assert.ok(estado.json.mudancas.some((m) => m.i === 'c1' && m.d.nome === 'Maria da Silva'));

  const status = await dona.admin('statusCredenciais');
  assert.equal(status.status, 200, status.texto);
  const visitante = criarNavegador(worker, eco.env);
  assert.equal((await visitante.admin('statusCredenciais')).status, 401);
  assert.equal((await visitante.pedir('GET', '/api/app/estado?desde=0')).status, 401);
});
