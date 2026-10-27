/**
 * Onde o app guarda coisas no próprio celular (cópia dos dados e fila de reenvio).
 * Usa o IndexedDB do navegador; se ele não estiver disponível (aba anônima de alguns navegadores), usa a memória:
 * o app continua funcionando, só não lembra de nada depois de fechado.
 *
 * Interface: ler(chave), gravar(chave, valor), apagar(chave), listar(prefixo) -> [[chave, valor], ...] em ordem de chave.
 */

const copiar = (valor) => (valor === undefined ? undefined : JSON.parse(JSON.stringify(valor)));

export function criarArmazemEmMemoria() {
  const mapa = new Map();
  return {
    memoria: true,
    async ler(chave) {
      return copiar(mapa.get(chave));
    },
    async gravar(chave, valor) {
      mapa.set(chave, copiar(valor));
    },
    async apagar(chave) {
      mapa.delete(chave);
    },
    async listar(prefixo) {
      return [...mapa].filter(([k]) => k.startsWith(prefixo)).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => [k, copiar(v)]);
    },
  };
}

export function criarArmazemIndexedDB(nome = 'delas-pra-elas') {
  let abrindo = null;
  const abrir = () => {
    if (!abrindo) {
      abrindo = new Promise((resolver, falhar) => {
        if (typeof indexedDB === 'undefined') return falhar(new Error('Este navegador não tem IndexedDB.'));
        const pedido = indexedDB.open(nome, 1);
        pedido.onupgradeneeded = () => pedido.result.createObjectStore('kv');
        pedido.onsuccess = () => resolver(pedido.result);
        pedido.onerror = () => falhar(pedido.error);
        pedido.onblocked = () => falhar(new Error('O banco local está bloqueado por outra aba.'));
      });
    }
    return abrindo;
  };

  /** Roda uma operação numa transação e espera ela terminar de verdade (oncomplete), não só o pedido. */
  const transacao = async (modo, operacao) => {
    const banco = await abrir();
    return new Promise((resolver, falhar) => {
      const t = banco.transaction('kv', modo);
      const pedido = operacao(t.objectStore('kv'));
      t.oncomplete = () => resolver(pedido && pedido.result);
      t.onerror = () => falhar(t.error);
      t.onabort = () => falhar(t.error || new Error('Transação cancelada.'));
    });
  };

  return {
    memoria: false,
    ler: (chave) => transacao('readonly', (s) => s.get(chave)),
    gravar: (chave, valor) => transacao('readwrite', (s) => s.put(valor, chave)),
    apagar: (chave) => transacao('readwrite', (s) => s.delete(chave)),
    async listar(prefixo) {
      const faixa = IDBKeyRange.bound(prefixo, `${prefixo}￿`);
      const chaves = await transacao('readonly', (s) => s.getAllKeys(faixa));
      const valores = await transacao('readonly', (s) => s.getAll(faixa));
      return chaves.map((k, i) => [k, valores[i]]);
    },
  };
}

/**
 * IndexedDB quando funciona; senão memória. Testa de verdade (grava e lê de volta) antes de confiar,
 * porque alguns navegadores deixam abrir o banco mas recusam gravar.
 */
export async function criarArmazem() {
  try {
    const idb = criarArmazemIndexedDB();
    await idb.gravar('teste', { ok: true });
    const lido = await idb.ler('teste');
    await idb.apagar('teste');
    if (lido && lido.ok === true) return idb;
  } catch {
    /* cai na memória */
  }
  return criarArmazemEmMemoria();
}
