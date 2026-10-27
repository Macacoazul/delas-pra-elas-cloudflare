/**
 * Um "D1 de mentira" para os testes: a mesma interface do D1 da Cloudflare (prepare / bind / run / all / first / batch),
 * guardando num SQLite em memória (o `node:sqlite` que já vem no Node 22). Assim o código de src/banco-d1.js roda de
 * verdade, com SQL de verdade — só que na máquina de quem testa, sem internet.
 *
 * Imita também o que o D1 real faz de importante:
 *   - batch() é uma transação: se uma instrução falhar, nenhuma vale;
 *   - valores `undefined` são recusados; booleanos viram 1/0;
 *   - cada chamada "respira" (cede a vez) como uma ida e volta de rede, então pedidos simultâneos se intercalam.
 *
 * Além do D1, `criarBancoDeTeste` entrega atalhos SÍNCRONOS (ler / gravar / listar) para os testes preparem e conferirem
 * dados direto no banco, inclusive nas coleções cifradas (a cifra aqui é feita com o `node:crypto`, de forma independente do
 * código do servidor: se os dois não combinassem, a leitura falharia).
 */
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { BancoD1, prepararEsquema } from '../../src/banco-d1.js';

const respirar = () => new Promise((ok) => setImmediate(ok));

function converter(v) {
  if (v === undefined) throw new Error("D1_TYPE_ERROR: Type 'undefined' not supported for value 'undefined'");
  return typeof v === 'boolean' ? Number(v) : v;
}

const ehLeitura = (sql) => /^\s*(SELECT|WITH|PRAGMA)\b/i.test(sql);

class Declaracao {
  constructor(d1, sql, valores = []) {
    this.d1 = d1;
    this.sql = sql;
    this.valores = valores;
  }

  bind(...valores) {
    return new Declaracao(this.d1, this.sql, valores.map(converter));
  }

  async run() {
    await respirar();
    this.d1.idas += 1;
    return this.d1._executar(this);
  }

  async all() {
    await respirar();
    this.d1.idas += 1;
    return this.d1._executar(this);
  }

  async first(coluna) {
    await respirar();
    this.d1.idas += 1;
    const linha = this.d1._executar(this).results[0];
    if (linha === undefined) return null;
    return coluna === undefined ? linha : linha[coluna];
  }
}

class D1Falso {
  constructor() {
    this.sqlite = new DatabaseSync(':memory:');
    this.idas = 0; // quantas vezes o servidor "foi ao banco" (cada run/all/first/batch conta 1, como no D1)
  }

  prepare(sql) {
    return new Declaracao(this, sql);
  }

  async batch(declaracoes) {
    await respirar();
    this.idas += 1;
    this.sqlite.exec('BEGIN');
    try {
      const respostas = declaracoes.map((d) => this._executar(d));
      this.sqlite.exec('COMMIT');
      return respostas;
    } catch (e) {
      this.sqlite.exec('ROLLBACK');
      throw e;
    }
  }

  _executar(decl) {
    try {
      const stmt = this.sqlite.prepare(decl.sql);
      if (ehLeitura(decl.sql)) {
        const results = stmt.all(...decl.valores).map((l) => ({ ...l }));
        return { success: true, results, meta: { changes: 0, rows_read: results.length } };
      }
      const info = stmt.run(...decl.valores);
      return { success: true, results: [], meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) } };
    } catch (e) {
      throw new Error(`D1_ERROR: ${e.message}: SQLITE_ERROR`, { cause: e });
    }
  }

  fechar() {
    this.sqlite.close();
  }
}

/* ── atalhos síncronos para os testes ── */
const PRIVADAS = new Set(['privado', 'fretes_privado']);
const separar = (caminho) => {
  const [colecao, id] = caminho.split('/');
  return { colecao, id };
};

/**
 * @returns {Promise<{d1:D1Falso, banco:BancoD1, ler:Function, gravar:Function, listar:Function, fechar:Function}>}
 */
async function criarBancoDeTeste({ segredo = 'segredo-de-teste-com-mais-de-vinte-caracteres' } = {}) {
  const d1 = new D1Falso();
  await prepararEsquema(d1);
  const banco = new BancoD1(d1, { segredo });
  const chave = Buffer.from(crypto.hkdfSync('sha256', segredo, 'delas-pra-elas', 'documentos-privados-v1', 32));

  const cifrar = (texto, aad) => {
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv('aes-256-gcm', chave, iv);
    c.setAAD(Buffer.from(aad));
    const ct = Buffer.concat([c.update(texto, 'utf8'), c.final(), c.getAuthTag()]);
    return `v1.${iv.toString('base64url')}.${ct.toString('base64url')}`;
  };
  const decifrar = (valor, aad) => {
    const m = /^v1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(valor);
    if (!m) throw new Error('dado privado em formato desconhecido');
    const tudo = Buffer.from(m[2], 'base64url');
    const d = crypto.createDecipheriv('aes-256-gcm', chave, Buffer.from(m[1], 'base64url'));
    d.setAAD(Buffer.from(aad));
    d.setAuthTag(tudo.subarray(tudo.length - 16));
    return Buffer.concat([d.update(tudo.subarray(0, tudo.length - 16)), d.final()]).toString('utf8');
  };
  const abrir = (colecao, caminho, texto) => JSON.parse(PRIVADAS.has(colecao) ? decifrar(texto, caminho) : texto);

  return {
    d1,
    banco,
    /** O documento (ou undefined). */
    ler(caminho) {
      const { colecao, id } = separar(caminho);
      const linha = d1.sqlite.prepare('SELECT dados FROM documentos WHERE colecao = ? AND id = ? AND apagado = 0').get(colecao, id);
      return linha ? abrir(colecao, caminho, linha.dados) : undefined;
    },
    /** Grava (ou troca) o documento inteiro, como o servidor faria. */
    gravar(caminho, dados) {
      const { colecao, id } = separar(caminho);
      const json = JSON.stringify(dados);
      d1.sqlite
        .prepare(
          `INSERT INTO documentos (colecao, id, dados, versao, seq, apagado) VALUES (?, ?, ?, 1, (SELECT COALESCE(MAX(seq), 0) + 1 FROM documentos), 0)
           ON CONFLICT (colecao, id) DO UPDATE SET dados = excluded.dados, versao = documentos.versao + 1, seq = excluded.seq, apagado = 0`,
        )
        .run(colecao, id, PRIVADAS.has(colecao) ? cifrar(json, caminho) : json);
    },
    /** Todos os documentos de uma coleção: [{ id, data }]. */
    listar(colecao) {
      return d1.sqlite
        .prepare('SELECT id, dados FROM documentos WHERE colecao = ? AND apagado = 0 ORDER BY id')
        .all(colecao)
        .map((l) => ({ id: l.id, data: abrir(colecao, `${colecao}/${l.id}`, l.dados) }));
    },
    /** O texto bruto como está guardado (para provar que os dados privados estão cifrados). */
    bruto(caminho) {
      const { colecao, id } = separar(caminho);
      const linha = d1.sqlite.prepare('SELECT dados FROM documentos WHERE colecao = ? AND id = ?').get(colecao, id);
      return linha ? linha.dados : undefined;
    },
    fechar: () => d1.fechar(),
  };
}

export { D1Falso, criarBancoDeTeste };
