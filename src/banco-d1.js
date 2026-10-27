/**
 * Banco de dados: o D1 da Cloudflare (SQLite), usado como um "caderno de fichas".
 *
 * Cada ficha é um documento (JSON) guardado pelo par coleção + id, por exemplo "fretes/Ab12…". O resto do servidor
 * conversa com este arquivo pelo mesmo jeito de falar que já usava (doc, collection, where, limit, runTransaction),
 * então a lógica dos fretes não precisou mudar.
 *
 *   db.doc('fretes/abc').get() / .set(dados, { merge }) / .update(dados) / .delete()
 *   db.collection('fretes').doc().id                 id novo
 *   db.collection('fretes').where('status', '==', 'pago').limit(10).get()
 *   db.runTransaction(async (tx) => { const s = await tx.get(ref); tx.update(ref, {...}); })
 *
 * Como as transações funcionam: o D1 não tem transação "aberta" onde se lê, pensa e grava. Então cada documento tem um
 * número de VERSÃO. A transação lê, guarda as versões que viu e, na hora de gravar, manda tudo num lote único que só passa
 * se ninguém tiver mexido nesses documentos no meio do caminho (senão refaz do começo). O lote do D1 é tudo-ou-nada.
 *
 * Coleções "privadas" (tokens, endereço completo, CPF) são gravadas CIFRADAS (AES-GCM) com uma chave derivada do SEGREDO
 * do Worker: quem só enxergar o banco não lê esses dados.
 *
 * Cada gravação também recebe um número de SEQUÊNCIA crescente (seq). É assim que o app pergunta "o que mudou desde o
 * número tal?" sem baixar tudo de novo.
 */
import { bytesAleatorios, paraBase64Url, deBase64UrlEstrito } from './cripto.js';

const ESQUEMA_VERSAO = '1';

/** Tudo é "CREATE ... IF NOT EXISTS": rodar de novo não faz mal nem apaga nada. */
const ESQUEMA = [
  `CREATE TABLE IF NOT EXISTS documentos (
     colecao TEXT NOT NULL,
     id      TEXT NOT NULL,
     dados   TEXT NOT NULL,
     versao  INTEGER NOT NULL DEFAULT 1,
     seq     INTEGER NOT NULL,
     apagado INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (colecao, id)
   ) WITHOUT ROWID`,
  'CREATE INDEX IF NOT EXISTS documentos_seq ON documentos (seq)',
  "CREATE INDEX IF NOT EXISTS fretes_token ON documentos (json_extract(dados, '$.token')) WHERE colecao = 'fretes'",
  "CREATE INDEX IF NOT EXISTS fretes_status ON documentos (json_extract(dados, '$.status')) WHERE colecao = 'fretes'",
  "CREATE INDEX IF NOT EXISTS vendas_cliente ON documentos (json_extract(dados, '$.clienteId')) WHERE colecao = 'vendas'",
  // Trava das transações: inserir NULL aqui derruba o lote inteiro (ver gravarComTrava).
  'CREATE TABLE IF NOT EXISTS guarda (ok INTEGER NOT NULL CHECK (ok = 1))',
  `CREATE TABLE IF NOT EXISTS usuarios (
     email  TEXT PRIMARY KEY,
     papel  TEXT NOT NULL,
     sal    TEXT NOT NULL,
     hash   TEXT NOT NULL,
     sv     INTEGER NOT NULL DEFAULT 1,
     criado INTEGER NOT NULL
   ) WITHOUT ROWID`,
  'CREATE TABLE IF NOT EXISTS limites (chave TEXT PRIMARY KEY, n INTEGER NOT NULL, ate INTEGER NOT NULL) WITHOUT ROWID',
  'CREATE TABLE IF NOT EXISTS meta (chave TEXT PRIMARY KEY, valor TEXT NOT NULL) WITHOUT ROWID',
];

const SQL_PROXIMA_SEQ = '(SELECT COALESCE(MAX(seq), 0) + 1 FROM documentos)';

const preparados = new WeakMap(); // banco -> promessa da preparação (pedidos simultâneos esperam a mesma)

/** Cria as tabelas na primeira vez que o Worker acorda (uma vez por instância). */
function prepararEsquema(d1) {
  if (!preparados.has(d1)) {
    const comandos = [...ESQUEMA.map((s) => d1.prepare(s)), d1.prepare("INSERT OR IGNORE INTO meta (chave, valor) VALUES ('esquema', ?)").bind(ESQUEMA_VERSAO)];
    preparados.set(
      d1,
      d1.batch(comandos).catch((e) => {
        preparados.delete(d1); // falhou: o próximo pedido tenta de novo
        throw e;
      }),
    );
  }
  return preparados.get(d1);
}

class ErroDeConflito extends Error {}

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function idAutomatico() {
  const b = bytesAleatorios(20);
  let s = '';
  for (let i = 0; i < 20; i += 1) s += ALFABETO[b[i] % ALFABETO.length];
  return s;
}

/** Recusa o que o banco real também recusaria (valor undefined, função) — pega erro de programação cedo. */
function validar(v, caminho) {
  if (v === undefined) throw new Error(`Banco: valor undefined em "${caminho}"`);
  if (typeof v === 'function') throw new Error(`Banco: função em "${caminho}"`);
  if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`Banco: número inválido em "${caminho}"`);
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const [k, x] of Object.entries(v)) validar(x, `${caminho}.${k}`);
  } else if (Array.isArray(v)) {
    v.forEach((x, i) => validar(x, `${caminho}[${i}]`));
  }
}

const clonar = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

function mesclar(base, novo) {
  const saida = { ...base };
  for (const [k, v] of Object.entries(novo)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && saida[k] && typeof saida[k] === 'object' && !Array.isArray(saida[k])) {
      saida[k] = mesclar(saida[k], v);
    } else {
      saida[k] = clonar(v);
    }
  }
  return saida;
}

const COLECAO_OK = /^[a-z][a-z_]{0,30}$/;
const CAMPO_OK = /^[A-Za-z_][A-Za-z0-9_]{0,40}(\.[A-Za-z_][A-Za-z0-9_]{0,40}){0,3}$/;
const ID_OK = /^[A-Za-z0-9_-]{1,64}$/;

function separar(caminho) {
  const p = String(caminho).split('/');
  if (p.length !== 2 || !COLECAO_OK.test(p[0]) || !ID_OK.test(p[1])) throw new Error(`Banco: caminho inválido "${caminho}"`);
  return { colecao: p[0], id: p[1] };
}

/* ── cifra das coleções privadas ─────────────────────────── */
const codificador = new TextEncoder();
const decodificador = new TextDecoder();

class Cofre {
  constructor(segredo) {
    this.segredo = segredo;
    this.chave = null;
  }

  async obterChave() {
    if (!this.segredo) throw new Error('Banco: falta o SEGREDO para ler/gravar dados privados.');
    if (!this.chave) {
      this.chave = (async () => {
        const base = await globalThis.crypto.subtle.importKey('raw', codificador.encode(this.segredo), 'HKDF', false, ['deriveKey']);
        return globalThis.crypto.subtle.deriveKey(
          { name: 'HKDF', hash: 'SHA-256', salt: codificador.encode('delas-pra-elas'), info: codificador.encode('documentos-privados-v1') },
          base,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt'],
        );
      })();
    }
    return this.chave;
  }

  async cifrar(texto, aad) {
    const iv = bytesAleatorios(12);
    const ct = await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: codificador.encode(aad) }, await this.obterChave(), codificador.encode(texto));
    return `v1.${paraBase64Url(iv)}.${paraBase64Url(new Uint8Array(ct))}`;
  }

  async decifrar(valor, aad) {
    const m = /^v1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(valor);
    if (!m) throw new Error('Banco: dado privado em formato desconhecido.');
    const claro = await globalThis.crypto.subtle.decrypt({ name: 'AES-GCM', iv: deBase64UrlEstrito(m[1]), additionalData: codificador.encode(aad) }, await this.obterChave(), deBase64UrlEstrito(m[2]));
    return decodificador.decode(claro);
  }
}

/* ── documentos ──────────────────────────────────────────── */
class Snap {
  constructor(ref, dados, versao) {
    this.ref = ref;
    this.id = ref.id;
    this._d = dados;
    this._versao = versao;
    this.exists = dados !== undefined;
  }

  data() {
    return this._d === undefined ? undefined : clonar(this._d);
  }
}

class DocRef {
  constructor(banco, caminho) {
    const { colecao, id } = separar(caminho);
    this.banco = banco;
    this.path = caminho;
    this.colecao = colecao;
    this.id = id;
  }

  async get() {
    return (await this.banco._lerVarios([this]))[0];
  }

  async set(dados, opcoes = {}) {
    validar(dados, this.path);
    if (opcoes.merge) {
      await this.banco.runTransaction(async (tx) => {
        await tx.get(this);
        tx.set(this, dados, { merge: true });
      });
      return;
    }
    await this.banco._d1.batch([await this.banco._sqlGravar(this, dados)]);
  }

  async update(dados) {
    validar(dados, this.path);
    await this.banco.runTransaction(async (tx) => {
      await tx.get(this);
      tx.update(this, dados);
    });
  }

  async delete() {
    await this.banco._d1.batch([this.banco._sqlApagar(this)]);
  }
}

class CollRef {
  constructor(banco, nome, filtros = [], limite = null) {
    if (!COLECAO_OK.test(nome)) throw new Error(`Banco: coleção inválida "${nome}"`);
    this.banco = banco;
    this.nome = nome;
    this.filtros = filtros;
    this.limite = limite;
  }

  doc(id) {
    return new DocRef(this.banco, `${this.nome}/${id || idAutomatico()}`);
  }

  where(campo, op, valor) {
    if (op !== '==') throw new Error('Banco: só "==" é suportado');
    if (valor === undefined) throw new Error('Banco: where com undefined');
    if (!CAMPO_OK.test(campo)) throw new Error(`Banco: campo inválido "${campo}"`);
    return new CollRef(this.banco, this.nome, [...this.filtros, { campo, valor }], this.limite);
  }

  limit(n) {
    return new CollRef(this.banco, this.nome, this.filtros, n);
  }

  async get() {
    // O nome da coleção e os campos foram conferidos acima (só letras, números e _): entram direto no texto do SQL para o
    // índice parcial ser usado. Os VALORES sempre vão como parâmetros.
    const filtros = this.filtros.map((f) => `AND json_extract(dados, '$.${f.campo}') = ?`).join(' ');
    const valores = this.filtros.map((f) => (typeof f.valor === 'boolean' ? Number(f.valor) : f.valor));
    const limite = this.limite === null ? '' : `LIMIT ${Math.max(0, Math.min(Number(this.limite) || 0, 5000))}`;
    const sql = `SELECT id, dados, versao FROM documentos WHERE colecao = '${this.nome}' AND apagado = 0 ${filtros} ${limite}`;
    const r = await this.banco._d1.prepare(sql).bind(...valores).all();
    const docs = [];
    for (const linha of r.results || []) {
      const ref = new DocRef(this.banco, `${this.nome}/${linha.id}`);
      docs.push(new Snap(ref, await this.banco._lerDados(ref, linha.dados), linha.versao));
    }
    return { empty: docs.length === 0, size: docs.length, docs };
  }
}

class Tx {
  constructor(banco) {
    this.banco = banco;
    this.lidos = new Map(); // caminho -> { versao, dados }
    this.escritas = [];
  }

  async get(ref) {
    if (this.escritas.length) throw new Error('Banco: leituras devem vir antes das escritas na transação');
    const [s] = await this.getAll([ref]);
    return s;
  }

  async getAll(refs) {
    if (this.escritas.length) throw new Error('Banco: leituras devem vir antes das escritas na transação');
    const snaps = await this.banco._lerVarios(refs);
    snaps.forEach((s, i) => this.lidos.set(refs[i].path, { versao: s.exists ? s._versao : 0, dados: s._d }));
    return snaps;
  }

  set(ref, dados, opcoes = {}) {
    validar(dados, ref.path);
    this.escritas.push({ tipo: 'set', ref, dados: clonar(dados), merge: !!opcoes.merge });
    return this;
  }

  update(ref, dados) {
    validar(dados, ref.path);
    this.escritas.push({ tipo: 'update', ref, dados: clonar(dados) });
    return this;
  }

  delete(ref) {
    this.escritas.push({ tipo: 'delete', ref });
    return this;
  }

  /** Grava tudo de uma vez, se nenhum documento lido mudou. Lança ErroDeConflito se mudou. */
  async commit() {
    if (!this.escritas.length) return;
    // Escritas que dependem do conteúdo atual (mesclar, atualizar) em documentos que a transação ainda não leu: lê agora.
    const faltam = [];
    for (const e of this.escritas) {
      if ((e.tipo === 'update' || (e.tipo === 'set' && e.merge)) && !this.lidos.has(e.ref.path) && !faltam.some((r) => r.path === e.ref.path)) faltam.push(e.ref);
    }
    if (faltam.length) await this.getAllSemTrava(faltam);

    // Estado final de cada documento, aplicando as escritas na ordem.
    const estado = new Map();
    const atual = (ref) => (estado.has(ref.path) ? estado.get(ref.path) : this.lidos.has(ref.path) ? this.lidos.get(ref.path).dados : undefined);
    for (const e of this.escritas) {
      const antes = atual(e.ref);
      if (e.tipo === 'delete') {
        estado.set(e.ref.path, undefined);
      } else if (e.tipo === 'update') {
        if (antes === undefined) throw new Error(`5 NOT_FOUND: ${e.ref.path}`);
        estado.set(e.ref.path, { ...antes, ...clonar(e.dados) });
      } else {
        estado.set(e.ref.path, e.merge && antes !== undefined ? mesclar(antes, e.dados) : clonar(e.dados));
      }
    }

    const sql = [];
    for (const [caminho, { versao }] of this.lidos) {
      const { colecao, id } = separar(caminho);
      sql.push(this.banco._d1.prepare('INSERT INTO guarda (ok) SELECT CASE WHEN COALESCE((SELECT versao FROM documentos WHERE colecao = ? AND id = ? AND apagado = 0), 0) = ? THEN 1 END').bind(colecao, id, versao));
    }
    for (const [caminho, dados] of estado) {
      const ref = new DocRef(this.banco, caminho);
      sql.push(dados === undefined ? this.banco._sqlApagar(ref) : await this.banco._sqlGravar(ref, dados));
    }
    sql.push(this.banco._d1.prepare('DELETE FROM guarda'));
    try {
      await this.banco._d1.batch(sql);
    } catch (e) {
      if (/guarda\.ok/.test(String((e && e.message) || e) + String((e && e.cause && e.cause.message) || ''))) throw new ErroDeConflito('conflito');
      throw e;
    }
  }

  async getAllSemTrava(refs) {
    const snaps = await this.banco._lerVarios(refs);
    snaps.forEach((s, i) => this.lidos.set(refs[i].path, { versao: s.exists ? s._versao : 0, dados: s._d }));
  }
}

class BancoD1 {
  /**
   * @param {object} d1        o banco ligado ao Worker (env.DB)
   * @param {object} [opcoes]
   * @param {string} [opcoes.segredo]   chave-mestra (env.SEGREDO), usada para cifrar as coleções privadas
   * @param {string[]} [opcoes.privadas] coleções gravadas cifradas
   */
  constructor(d1, { segredo = '', privadas = ['privado', 'fretes_privado'] } = {}) {
    this._d1 = d1;
    this._cofre = new Cofre(segredo);
    this._privadas = new Set(privadas);
  }

  doc(caminho) {
    return new DocRef(this, caminho);
  }

  collection(nome) {
    return new CollRef(this, nome);
  }

  async runTransaction(fn, tentativas = 8) {
    for (let i = 1; ; i += 1) {
      const tx = new Tx(this);
      const r = await fn(tx);
      try {
        await tx.commit();
        return r;
      } catch (e) {
        if (!(e instanceof ErroDeConflito) || i >= tentativas) throw e;
        await new Promise((ok) => setTimeout(ok, 5 + Math.floor(Math.random() * 25 * i)));
      }
    }
  }

  async _lerDados(ref, texto) {
    if (this._privadas.has(ref.colecao)) return JSON.parse(await this._cofre.decifrar(texto, ref.path));
    return JSON.parse(texto);
  }

  async _lerVarios(refs) {
    if (!refs.length) return [];
    const stmts = refs.map((r) => this._d1.prepare('SELECT dados, versao FROM documentos WHERE colecao = ? AND id = ? AND apagado = 0').bind(r.colecao, r.id));
    const respostas = refs.length === 1 ? [await stmts[0].all()] : await this._d1.batch(stmts);
    const saida = [];
    for (let i = 0; i < refs.length; i += 1) {
      const linha = (respostas[i].results || [])[0];
      saida.push(linha ? new Snap(refs[i], await this._lerDados(refs[i], linha.dados), linha.versao) : new Snap(refs[i], undefined, 0));
    }
    return saida;
  }

  async _sqlGravar(ref, dados) {
    const json = JSON.stringify(dados);
    if (json.length > 1_500_000) throw new Error(`Banco: documento grande demais em ${ref.path}`);
    const guardado = this._privadas.has(ref.colecao) ? await this._cofre.cifrar(json, ref.path) : json;
    return this._d1
      .prepare(
        `INSERT INTO documentos (colecao, id, dados, versao, seq, apagado) VALUES (?, ?, ?, 1, ${SQL_PROXIMA_SEQ}, 0)
         ON CONFLICT (colecao, id) DO UPDATE SET dados = excluded.dados, versao = documentos.versao + 1, seq = excluded.seq, apagado = 0`,
      )
      .bind(ref.colecao, ref.id, guardado);
  }

  _sqlApagar(ref) {
    return this._d1
      .prepare(`UPDATE documentos SET dados = '{}', apagado = 1, versao = versao + 1, seq = ${SQL_PROXIMA_SEQ} WHERE colecao = ? AND id = ? AND apagado = 0`)
      .bind(ref.colecao, ref.id);
  }
}

/**
 * O que mudou nas coleções pedidas desde a sequência `desde`. Devolve JÁ PRONTO como texto JSON (o SQLite monta; o
 * Worker não precisa abrir e refazer milhares de registros — o plano grátis limita o tempo de processamento):
 *   { "de": <desde>, "ate": <nova sequência>, "completo": true|false, "reiniciar": true (só quando for o caso),
 *     "mudancas": [ { "c": coleção, "i": id, "s": seq, "a": 1 se apagado, "d": documento } ] }
 * Se "completo" for false, ainda há mais: pergunte de novo a partir de "ate".
 * Se "reiniciar" vier, o número informado estava À FRENTE do banco (por exemplo, o banco foi restaurado de um backup):
 * a resposta é a lista inteira, e quem pergunta deve descartar o que tinha guardado.
 */
async function mudancasEmJson(banco, colecoes, desde, { limite = 1500, recentes = null } = {}) {
  const lista = colecoes.map((c) => {
    if (!COLECAO_OK.test(c)) throw new Error('Banco: coleção inválida');
    return `'${c}'`;
  });
  if (!lista.length) throw new Error('Banco: nenhuma coleção pedida');
  const pedido = Math.floor(Number(desde));
  let de = Number.isSafeInteger(pedido) && pedido > 0 ? pedido : 0; // lixo, negativo ou gigante vira "do começo"
  const topo = Math.max(1, Math.min(Math.floor(Number(limite) || 1500), 5000));

  // Primeira vez (desde = 0) de uma coleção só: em vez de começar pelos mais antigos, traz os `n` mais novos pelo campo dado.
  if (recentes && de === 0 && colecoes.length === 1) {
    if (!CAMPO_OK.test(recentes.campo)) throw new Error('Banco: campo inválido');
    const n = Math.max(1, Math.min(Math.floor(Number(recentes.n) || 100), 1000));
    const novos = await banco._d1
      .prepare(
        `SELECT COUNT(*) AS n, (SELECT COALESCE(MAX(seq), 0) FROM documentos) AS ate,
                COALESCE(json_group_array(json_object('c', c, 'i', i, 's', s, 'a', 0, 'd', json(d))), '[]') AS j
         FROM (SELECT colecao AS c, id AS i, seq AS s, dados AS d FROM documentos
               WHERE colecao = ${lista[0]} AND apagado = 0 ORDER BY json_extract(dados, '$.${recentes.campo}') DESC LIMIT ${n})`,
      )
      .first();
    return `{"de":0,"ate":${Number(novos.ate) || 0},"completo":true,"mudancas":${Number(novos.n) ? novos.j : '[]'}}`;
  }

  const consultar = (a) =>
    banco._d1
      .prepare(
        `SELECT COUNT(*) AS n, COALESCE(MAX(s), ?1) AS ate, (SELECT COALESCE(MAX(seq), 0) FROM documentos) AS banco,
                COALESCE(json_group_array(json_object('c', c, 'i', i, 's', s, 'a', a, 'd', CASE WHEN a = 1 THEN NULL ELSE json(d) END)), '[]') AS j
         FROM (SELECT colecao AS c, id AS i, seq AS s, apagado AS a, dados AS d FROM documentos
               WHERE colecao IN (${lista.join(',')}) AND seq > ?1 ORDER BY seq LIMIT ${topo})`,
      )
      .bind(a)
      .first();

  let r = await consultar(de);
  let reiniciar = false;
  if (de > Number(r.banco)) {
    reiniciar = true;
    de = 0;
    r = await consultar(0);
  }
  const n = Number(r.n) || 0;
  return `{"de":${de},"ate":${Number(r.ate) || de},"completo":${n < topo}${reiniciar ? ',"reiniciar":true' : ''},"mudancas":${n ? r.j : '[]'}}`;
}

export { BancoD1, DocRef, CollRef, ErroDeConflito, prepararEsquema, mudancasEmJson, idAutomatico, ESQUEMA, validar, mesclar, clonar, separar };
