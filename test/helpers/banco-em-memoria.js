/**
 * Banco em memória que imita o jeito de falar do banco do servidor (src/banco-d1.js), só que sem SQL nem rede —
 * deixa os testes da lógica dos fretes rápidos. Os mesmos testes também rodam contra o banco de verdade
 * (SQLite imitando o D1): `TESTE_DB=d1 npm test`.
 *
 *   db.doc(path) / db.collection(nome).doc(id?) / .where(campo,'==',valor).limit(n).get()
 *   ref.get() / set(dados,{merge}) / update(dados) / delete()
 *   db.runTransaction(fn) com tx.get / tx.set / tx.update / tx.delete
 *
 * Imita também as regras que mais pegam gente de surpresa:
 *  - valor `undefined` é rejeitado;
 *  - update() em documento que não existe falha;
 *  - em transação, toda leitura vem antes de qualquer escrita;
 *  - chaves com ponto em update() NÃO são usadas aqui (o código não depende disso).
 */
import crypto from 'node:crypto';

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function idAutomatico() {
  const b = crypto.randomBytes(20);
  let s = '';
  for (let i = 0; i < 20; i += 1) s += ALFABETO[b[i] % ALFABETO.length];
  return s;
}

function validar(v, caminho) {
  if (v === undefined) throw new Error(`Banco: valor undefined em "${caminho}"`);
  if (typeof v === 'function') throw new Error(`Banco: função em "${caminho}"`);
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

function lerCampo(obj, caminho) {
  return caminho.split('.').reduce((acc, k) => (acc && typeof acc === 'object' ? acc[k] : undefined), obj);
}

class BancoEmMemoria {
  constructor() {
    this.dados = new Map(); // caminho -> objeto
    this.fila = Promise.resolve();
    this.leituras = 0;
    this.escritas = 0;
  }

  doc(caminho) {
    return new DocRef(this, caminho);
  }

  collection(nome) {
    return new CollRef(this, nome);
  }

  /** Transações executadas uma de cada vez (como se nunca houvesse conflito). */
  runTransaction(fn) {
    const rodar = async () => {
      const tx = new Tx(this);
      const r = await fn(tx);
      tx.commit();
      return r;
    };
    const p = this.fila.then(rodar, rodar);
    this.fila = p.then(() => undefined, () => undefined);
    return p;
  }

  /** Atalhos para os testes. */
  ler(caminho) {
    const v = this.dados.get(caminho);
    return v === undefined ? undefined : clonar(v);
  }

  gravar(caminho, dados) {
    this.dados.set(caminho, clonar(dados));
  }

  listar(colecao) {
    const prefixo = `${colecao}/`;
    return [...this.dados.entries()].filter(([c]) => c.startsWith(prefixo) && !c.slice(prefixo.length).includes('/')).map(([c, v]) => ({ id: c.slice(prefixo.length), data: clonar(v) }));
  }
}

class Snap {
  constructor(ref, dados) {
    this.ref = ref;
    this.id = ref.id;
    this._d = dados;
    this.exists = dados !== undefined;
  }

  data() {
    return this._d === undefined ? undefined : clonar(this._d);
  }
}

class DocRef {
  constructor(db, caminho) {
    this.db = db;
    this.path = caminho;
    this.id = caminho.split('/').pop();
  }

  async get() {
    this.db.leituras += 1;
    return new Snap(this, this.db.dados.get(this.path));
  }

  _set(dados, opcoes = {}) {
    validar(dados, this.path);
    this.db.escritas += 1;
    const atual = this.db.dados.get(this.path);
    this.db.dados.set(this.path, opcoes.merge && atual ? mesclar(atual, dados) : clonar(dados));
  }

  _update(dados) {
    validar(dados, this.path);
    for (const k of Object.keys(dados)) if (k.includes('.')) throw new Error('fake: chaves com ponto não suportadas em update()');
    const atual = this.db.dados.get(this.path);
    if (atual === undefined) throw new Error(`5 NOT_FOUND: ${this.path}`);
    this.db.escritas += 1;
    const novo = { ...atual };
    for (const [k, v] of Object.entries(dados)) novo[k] = clonar(v);
    this.db.dados.set(this.path, novo);
  }

  async set(dados, opcoes = {}) {
    this._set(dados, opcoes);
  }

  async update(dados) {
    this._update(dados);
  }

  async delete() {
    this.db.dados.delete(this.path);
  }
}

class CollRef {
  constructor(db, nome, filtros = [], limite = null) {
    this.db = db;
    this.nome = nome;
    this.filtros = filtros;
    this.limite = limite;
  }

  doc(id) {
    return new DocRef(this.db, `${this.nome}/${id || idAutomatico()}`);
  }

  where(campo, op, valor) {
    if (op !== '==') throw new Error('fake: só "==" é suportado');
    if (valor === undefined) throw new Error('Banco: where com undefined');
    return new CollRef(this.db, this.nome, [...this.filtros, { campo, valor }], this.limite);
  }

  limit(n) {
    return new CollRef(this.db, this.nome, this.filtros, n);
  }

  async get() {
    this.db.leituras += 1;
    const prefixo = `${this.nome}/`;
    let docs = [...this.db.dados.entries()]
      .filter(([c]) => c.startsWith(prefixo) && !c.slice(prefixo.length).includes('/'))
      .filter(([, v]) => this.filtros.every((f) => lerCampo(v, f.campo) === f.valor))
      .map(([c]) => new Snap(new DocRef(this.db, c), this.db.dados.get(c)));
    if (this.limite !== null) docs = docs.slice(0, this.limite);
    return { empty: docs.length === 0, size: docs.length, docs };
  }
}

class Tx {
  constructor(db) {
    this.db = db;
    this.escritas = [];
  }

  async get(ref) {
    if (this.escritas.length) throw new Error('Banco: leituras devem vir antes das escritas na transação');
    return ref.get();
  }

  set(ref, dados, opcoes = {}) {
    validar(dados, ref.path);
    this.escritas.push(() => ref._set(dados, opcoes));
    return this;
  }

  update(ref, dados) {
    validar(dados, ref.path);
    this.escritas.push(() => ref._update(dados));
    return this;
  }

  delete(ref) {
    this.escritas.push(() => ref.db.dados.delete(ref.path));
    return this;
  }

  commit() {
    // Todas as escritas entram "ao mesmo tempo": se alguma falhar, nada é aplicado.
    const copia = new Map([...this.db.dados.entries()].map(([k, v]) => [k, clonar(v)]));
    try {
      for (const aplicar of this.escritas) aplicar();
    } catch (err) {
      this.db.dados = copia;
      throw err;
    }
  }
}

export { BancoEmMemoria, idAutomatico };
