/**
 * Delas pra Elas — site-live-1.js
 * Parte do site, guardada como texto: o código do app da live — parte 1 de 3 do arquivo /app.js.
 *
 * Arquivo gerado por "npm run colar" (o texto de verdade fica nas pastas src/, app/ e site/ do projeto).
 * Cole o arquivo INTEIRO, num arquivo com o nome site-live-1.js no editor do Cloudflare. Não precisa mudar nada nele.
 *
 * O texto de cada página fica entre crases. As barras invertidas que aparecem antes de crases e de ${ são só o jeito
 * de escrever esse texto aqui dentro: o Worker entrega a página sem elas, igual ao arquivo da pasta site/.
 * "etag" é o código de verificação da página inteira (/api/saude confere se o texto colado bate com ele).
 */
export default {
  "/app.js": {
    tipo: "text/javascript; charset=utf-8",
    etag: "016cefdaa9efa744",
    parte: 1,
    de: 3,
    corpo: `/* app.js — o app da live
   ARQUIVO GERADO por "npm run site" a partir da pasta app/. Não edite aqui: o código-fonte comentado fica lá. */
(() => {
  // app/react-global.js
  var R = window.React;
  var react_global_default = R;
  var h = R.createElement;
  var {
    useState,
    useEffect,
    useMemo,
    useRef,
    useCallback,
    useReducer,
    useLayoutEffect,
    useContext,
    Fragment,
    Component,
  } = R;

  // app/react-dom-global.js
  var { createRoot } = window.ReactDOM;

  // app/armazem.js
  var copiar = (valor) => (valor === void 0 ? void 0 : JSON.parse(JSON.stringify(valor)));
  function criarArmazemEmMemoria() {
    const mapa = /* @__PURE__ */ new Map();
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
        return [...mapa]
          .filter(([k]) => k.startsWith(prefixo))
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([k, v]) => [k, copiar(v)]);
      },
    };
  }
  function criarArmazemIndexedDB(nome = "delas-pra-elas") {
    let abrindo = null;
    const abrir2 = () => {
      if (!abrindo) {
        abrindo = new Promise((resolver, falhar) => {
          if (typeof indexedDB === "undefined") return falhar(new Error("Este navegador não tem IndexedDB."));
          const pedido = indexedDB.open(nome, 1);
          pedido.onupgradeneeded = () => pedido.result.createObjectStore("kv");
          pedido.onsuccess = () => resolver(pedido.result);
          pedido.onerror = () => falhar(pedido.error);
          pedido.onblocked = () => falhar(new Error("O banco local está bloqueado por outra aba."));
        });
      }
      return abrindo;
    };
    const transacao = async (modo, operacao) => {
      const banco = await abrir2();
      return new Promise((resolver, falhar) => {
        const t2 = banco.transaction("kv", modo);
        const pedido = operacao(t2.objectStore("kv"));
        t2.oncomplete = () => resolver(pedido && pedido.result);
        t2.onerror = () => falhar(t2.error);
        t2.onabort = () => falhar(t2.error || new Error("Transação cancelada."));
      });
    };
    return {
      memoria: false,
      ler: (chave) => transacao("readonly", (s) => s.get(chave)),
      gravar: (chave, valor) => transacao("readwrite", (s) => s.put(valor, chave)),
      apagar: (chave) => transacao("readwrite", (s) => s.delete(chave)),
      async listar(prefixo) {
        const faixa = IDBKeyRange.bound(prefixo, \`\${prefixo}\\uFFFF\`);
        const chaves = await transacao("readonly", (s) => s.getAllKeys(faixa));
        const valores = await transacao("readonly", (s) => s.getAll(faixa));
        return chaves.map((k, i) => [k, valores[i]]);
      },
    };
  }
  async function criarArmazem() {
    try {
      const idb = criarArmazemIndexedDB();
      await idb.gravar("teste", { ok: true });
      const lido = await idb.ler("teste");
      await idb.apagar("teste");
      if (lido && lido.ok === true) return idb;
    } catch {}
    return criarArmazemEmMemoria();
  }

  // app/backup.js
  var ID = /^[A-Za-z0-9_-]{1,64}$/;
  var DIA = /^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$/;
  var ehObjeto = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  var texto = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  function lerBackup(conteudo, hoje) {
    let dados;
    try {
      dados = JSON.parse(String(conteudo || "").replace(/^\\uFEFF/, ""));
    } catch {
      throw new Error(
        "Esse texto não é um backup do app (não consegui ler). Copie o backup inteiro, do primeiro { ao último }.",
      );
    }
    if (!ehObjeto(dados) || !Array.isArray(dados.clientes) || !Array.isArray(dados.vendas)) {
      throw new Error("Esse texto não parece um backup do app: faltam as listas de clientes e de vendas.");
    }
    const avisos = [];
    let ignorados = 0;
    const ignorar = (motivo) => {
      ignorados += 1;
      if (avisos.length < 5) avisos.push(motivo);
    };
    const clientes = [];
    const idsDeClientes = /* @__PURE__ */ new Set();
    for (const c of dados.clientes) {
      const nome = ehObjeto(c) ? texto(c.nome, 80) : "";
      if (!ehObjeto(c) || typeof c.id !== "string" || !ID.test(c.id) || !nome) {
        ignorar("uma cliente sem nome ou sem identificação");
        continue;
      }
      if (idsDeClientes.has(c.id)) continue;
      idsDeClientes.add(c.id);
      clientes.push({
        id: c.id,
        nome,
        whatsapp: texto(c.whatsapp, 30),
        preExistente: c.preExistente === true,
        criadaEm: typeof c.criadaEm === "string" && DIA.test(c.criadaEm) ? c.criadaEm : hoje,
      });
    }
    const vendas = [];
    const idsDeVendas = /* @__PURE__ */ new Set();
    for (const v of dados.vendas) {
      const peca = ehObjeto(v) ? texto(v.peca, 160) : "";
      const valorOk =
        ehObjeto(v) && typeof v.valor === "number" && Number.isFinite(v.valor) && v.valor >= 0 && v.valor <= 1e7;
      if (
        !ehObjeto(v) ||
        typeof v.id !== "string" ||
        !ID.test(v.id) ||
        !peca ||
        !valorOk ||
        typeof v.clienteId !== "string" ||
        !ID.test(v.clienteId) ||
        typeof v.data !== "string" ||
        !DIA.test(v.data)
      ) {
        ignorar("uma venda com dados que faltam ou estão fora do padrão");
        continue;
      }
      if (idsDeVendas.has(v.id)) continue;
      idsDeVendas.add(v.id);
      const fila = (Array.isArray(v.fila) ? v.fila : [])
        .filter((f) => ehObjeto(f) && typeof f.clienteId === "string" && ID.test(f.clienteId))
        .slice(0, 30)
        .map((f) => ({ nome: texto(f.nome, 80), clienteId: f.clienteId }));
      vendas.push({
        id: v.id,
        data: v.data,
        criadaEm:
          Number.isFinite(v.criadaEm) && v.criadaEm > 0 && v.criadaEm < 4e12
            ? Math.round(v.criadaEm)
            : Date.parse(\`\${v.data}T12:00:00\`) || Date.now(),
        clienteId: v.clienteId,
        codigo: texto(v.codigo, 40),
        peca,
        valor: Math.round(v.valor * 100) / 100,
        pago: v.pago === true,
        fila,
        temFoto: false,
      });
    }
    let config = null;
    if (ehObjeto(dados.config)) {
      const c = {};
      if (typeof dados.config.abertura === "string") c.abertura = dados.config.abertura.slice(0, 4e3);
      if (typeof dados.config.fechamento === "string") c.fechamento = dados.config.fechamento.slice(0, 4e3);
      if (Object.keys(c).length) config = c;
    }
    if (!clientes.length && !vendas.length)
      throw new Error("O backup não tem nenhuma cliente nem venda que eu consiga aproveitar.");
    return { clientes, vendas, config, ignorados, avisos };
  }
  function operacoesDoBackup(backup) {
    const ops = [];
    for (const { id, ...dados } of backup.clientes) ops.push({ col: "clientes", id, op: "set", dados });
    for (const { id, ...dados } of backup.vendas) ops.push({ col: "vendas", id, op: "set", dados });
    if (backup.config) ops.push({ col: "config", id: "geral", op: "mesclar", dados: backup.config });
    return ops;
  }

  // app/api.js
  var COLECOES = ["clientes", "vendas", "config"];
  var PADROES = {
    clientes: { whatsapp: "", preExistente: false },
    vendas: { codigo: "", fila: [], temFoto: false },
    config: {},
  };
  var OPERACOES_POR_LOTE = 100;
  var INTERVALO_MS = 4e3;
  var INTERVALO_PARADO_MS = 2e4;
  var PARADO_DEPOIS_DE_MS = 5 * 6e4;
  var ESPERA_MAXIMA_MS = 3e4;
  var FOTOS_NA_MEMORIA = 40;
  var SALVAR_COPIA_EM_MS = 1500;
  var VERSAO_DA_COPIA = 1;
  var ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var ErroDoServidor = class extends Error {
    constructor(status, mensagem, codigo = "") {
      super(mensagem);
      this.name = "ErroDoServidor";
      this.status = status;
      this.codigo = codigo;
    }
  };
  var SemRede = class extends Error {
    constructor() {
      super("Sem conexão com a internet.");
      this.name = "SemRede";
    }
  };
  var bytesDoNavegador = (n) => crypto.getRandomValues(new Uint8Array(n));
  function novoId(aleatorios = bytesDoNavegador) {
    return Array.from(aleatorios(20), (b) => ALFABETO[b % ALFABETO.length]).join("");
  }
  function aplicarOperacao(docs, op) {
    const mapa = docs[op.col];
    if (!mapa) return;
    if (op.op === "apagar") {
      mapa.delete(op.id);
      return;
    }
    const { id: _id, primeiraCompra: _primeira, ...dados } = op.dados || {};
    const anterior = op.op === "mesclar" ? mapa.get(op.id) : void 0;
    mapa.set(op.id, { ...PADROES[op.col], ...(anterior || {}), ...dados });
  }
  var mensagemPadrao = (status) =>
    status === 401
      ? "Sua sessão acabou. Entre de novo."
      : status === 403
        ? "O servidor recusou o pedido."
        : status === 413
          ? "O pedido ficou grande demais."
          : status === 429
            ? "Muitas tentativas. Espere um pouco."
            : status >= 500
              ? "O servidor não conseguiu responder agora."
              : "Não deu certo. Tente de novo.";
  var passaSozinho = (e) =>
    e instanceof SemRede ||
    (e instanceof ErroDoServidor && (e.status === 408 || e.status === 425 || e.status === 429 || e.status >= 500));
  var recusadoDeVez = (e) => e instanceof ErroDoServidor && [400, 413, 422].includes(e.status);
  var eSessao = (e) => e instanceof ErroDoServidor && e.status === 401;
  function criarCliente({
    fetch: buscar = (...args) => globalThis.fetch(...args),
    armazem = criarArmazemEmMemoria(),
    agora = () => Date.now(),
    agendar = (fn, ms) => setTimeout(fn, ms),
    cancelar = (id) => clearTimeout(id),
    aleatorios = bytesDoNavegador,
    pagina = typeof window !== "undefined" ? window : null,
  } = {}) {
    let conferido = false;
    let falhaInicial = "";
    let usuario = null;
    let primeiroAcesso = false;
    let sessaoPerdida = false;
    const base = {
      clientes: /* @__PURE__ */ new Map(),
      vendas: /* @__PURE__ */ new Map(),
      config: /* @__PURE__ */ new Map(),
    };
    let cursor = 0;
    let carregado = false;
    let fila = [];
    let rede = "ok";
    let falhasSeguidas = 0;
    let aviso = null;
    let contadorDeAvisos = 0;
    let contadorDeLotes = 0;
    let ultimaAtividade = agora();
    const fotos = /* @__PURE__ */ new Map();
    const ouvintes = /* @__PURE__ */ new Set();
    let visaoPronta = null;
    let instantaneo = null;
    const guardar = async (chave, valor) => {
      try {
        await armazem.gravar(chave, valor);
      } catch {}
    };
    const esquecer = async (chave) => {
      try {
        await armazem.apagar(chave);
      } catch {}
    };
    const chaveDoLote = (id) => \`lote:\${id}\`;
    function visao() {
      if (visaoPronta) return visaoPronta;
      let docs = base;
      if (fila.length) {
        docs = { clientes: new Map(base.clientes), vendas: new Map(base.vendas), config: new Map(base.config) };
        for (const lote of fila) for (const op of lote.ops) aplicarOperacao(docs, op);
      }
      visaoPronta = {
        clientes: [...docs.clientes].map(([id, d]) => ({ ...d, id })),
        vendas: [...docs.vendas].map(([id, d]) => ({ ...d, id })),
        config: docs.config.get("geral") || {},
      };
      return visaoPronta;
    }
    function estado() {
      if (instantaneo) return instantaneo;
      let tela = "app";
      if (!conferido) tela = "abrindo";
      else if (falhaInicial && !usuario) tela = "falha";
      else if (!usuario || sessaoPerdida) tela = "entrada";
      else if (!carregado) tela = "carregando";
      instantaneo = {
        tela,
        falhaInicial,
        usuario,
        primeiroAcesso,
        sessaoPerdida,
        conexao: sessaoPerdida ? "sessao" : rede,
        pendentes: fila.length,
        aviso,
        ...visao(),
      };
      return instantaneo;
    }
    function mudouAVisao() {
      visaoPronta = null;
    }
    function notificar() {
      instantaneo = null;
      const atual = estado();
      for (const ouvinte of ouvintes) ouvinte(atual);
    }
    function avisar(texto2) {
      contadorDeAvisos += 1;
      aviso = { n: contadorDeAvisos, texto: texto2 };
    }
    async function pedir(metodo, caminho, corpo) {
      let resposta;
      let texto2;
      try {
        resposta = await buscar(caminho, {
          method: metodo,
          credentials: "same-origin",
          cache: "no-store",
          headers: corpo === void 0 ? void 0 : { "Content-Type": "application/json" },
          body: corpo === void 0 ? void 0 : JSON.stringify(corpo),
        });
        texto2 = await resposta.text();
      } catch {
        throw new SemRede();
      }
      let json = null;
      try {
        json = texto2 ? JSON.parse(texto2) : null;
      } catch {
        json = null;
      }
      if (!resposta.ok)
        throw new ErroDoServidor(
          resposta.status,
          (json && json.erro) || mensagemPadrao(resposta.status),
          (json && json.codigo) || "",
        );
      if (json === null) throw new ErroDoServidor(502, mensagemPadrao(502));
      return json;
    }
    async function pedirLogada(metodo, caminho, corpo) {
      try {
        return await pedir(metodo, caminho, corpo);
      } catch (e) {
        if (eSessao(e)) perderSessao();
        throw e;
      }
    }
    function perderSessao() {
      if (sessaoPerdida) return;
      sessaoPerdida = true;
      notificar();
    }
    function falhou(e) {
      falhasSeguidas += 1;
      rede = e instanceof SemRede ? "sem-rede" : "erro";
      notificar();
    }
    function deuCerto() {
      const mudou = rede !== "ok";
      rede = "ok";
      falhasSeguidas = 0;
      return mudou;
    }
    let temporizadorDaCopia = null;
    function agendarCopia() {
      if (temporizadorDaCopia || !usuario) return;
      temporizadorDaCopia = agendar(async () => {
        temporizadorDaCopia = null;
        if (!usuario) return;
        await guardar("copia", {
          v: VERSAO_DA_COPIA,
          cursor,
          clientes: [...base.clientes],
          vendas: [...base.vendas],
          config: [...base.config],
        });
      }, SALVAR_COPIA_EM_MS);
    }
    const copiaValida = (c) =>
      c &&
      c.v === VERSAO_DA_COPIA &&
      Number.isSafeInteger(c.cursor) &&
      c.cursor >= 0 &&
      COLECOES.every(
        (nome) =>
          Array.isArray(c[nome]) &&
          c[nome].every(
            (par) => Array.isArray(par) && typeof par[0] === "string" && par[1] && typeof par[1] === "object",
          ),
      );
    async function carregarCopia() {
      try {
        const copia = await armazem.ler("copia");
        if (copiaValida(copia)) {
          for (const nome of COLECOES) base[nome] = new Map(copia[nome]);
          cursor = copia.cursor;
          carregado = true;
        }
        const lotes = await armazem.listar("lote:");
        fila = lotes
          .map(([, lote]) => lote)
          .filter((lote) => lote && typeof lote.id === "string" && Array.isArray(lote.ops) && lote.ops.length);
        mudouAVisao();
      } catch {}
    }
    async function apagarCopiaLocal() {
      if (temporizadorDaCopia) cancelar(temporizadorDaCopia);
      temporizadorDaCopia = null;
      await esquecer("copia");
      for (const [chave] of await armazem.listar("lote:").catch(() => [])) await esquecer(chave);
    }
    function limparBase() {
      for (const nome of COLECOES) base[nome] = /* @__PURE__ */ new Map();
      cursor = 0;
      mudouAVisao();
    }
    const idDeLote = () =>
      \`\${String(agora()).padStart(15, "0")}-\${String((contadorDeLotes += 1)).padStart(4, "0")}-\${novoId(aleatorios).slice(0, 4)}\`;
    async function gravar(ops) {
      if (!Array.isArray(ops) || !ops.length) return;
      ultimaAtividade = agora();
      const lotes = [];
      for (let i = 0; i < ops.length; i += OPERACOES_POR_LOTE)
        lotes.push({ id: idDeLote(), ops: ops.slice(i, i + OPERACOES_POR_LOTE) });
      fila.push(...lotes);
      mudouAVisao();
      notificar();
      await Promise.all(lotes.map((lote) => guardar(chaveDoLote(lote.id), lote)));
      sincronizarSemEsperar();
    }
    function lembrarFoto(op) {
      if (op.col !== "fotos") return;
      fotos.delete(op.id);
      fotos.set(op.id, op.op === "apagar" ? null : op.dados.imagem);
      while (fotos.size > FOTOS_NA_MEMORIA) fotos.delete(fotos.keys().next().value);
    }
    async function enviarFila() {
      while (fila.length && usuario && !sessaoPerdida) {
        const lote = fila[0];
        try {
          await pedir("POST", "/api/app/gravar", { ops: lote.ops });
        } catch (e) {
          if (fila[0] !== lote) continue;
          if (eSessao(e)) {
            perderSessao();
            return false;
          }
          if (recusadoDeVez(e)) {
            fila.shift();
            mudouAVisao();
            await esquecer(chaveDoLote(lote.id));
            avisar(\`Uma alteração não foi aceita pelo servidor: \${e.message}\`);
            notificar();
            continue;
          }
          if (!passaSozinho(e)) avisar(\`Não consegui enviar uma alteração (\${e.message}). Vou tentar de novo.\`);
          falhou(e);
          return false;
        }
        if (fila[0] !== lote) continue;
        for (const op of lote.ops) {
          aplicarOperacao(base, op);
          lembrarFoto(op);
        }
        fila.shift();
        mudouAVisao();
        await esquecer(chaveDoLote(lote.id));
        deuCerto();
        agendarCopia();
        notificar();
      }
      return !fila.length;
    }
    function receber(m) {
      const mapa = base[m.c];
      if (!mapa || typeof m.i !== "string") return;
      if (m.a) mapa.delete(m.i);
      else if (m.d && typeof m.d === "object") mapa.set(m.i, m.d);
    }
    async function buscarMudancas() {
      while (usuario && !sessaoPerdida) {
        let r;
        try {
          r = await pedir("GET", \`/api/app/estado?desde=\${cursor}&c=\${COLECOES.join(",")}\`);
        } catch (e) {
          if (eSessao(e)) perderSessao();
          else falhou(e);
          return;
        }
        if (!Array.isArray(r.mudancas) || !Number.isSafeInteger(r.ate)) {
          falhou(new ErroDoServidor(502, mensagemPadrao(502)));
          return;
        }
        if (r.reiniciar) limparBase();
        for (const m of r.mudancas) receber(m);
        cursor = r.ate;
        const primeira = !carregado;
        carregado = true;
        const mudouRede = deuCerto();
        if (r.mudancas.length || r.reiniciar) {
          mudouAVisao();
          agendarCopia();
        } else if (primeira) {
          agendarCopia();
        }
        if (r.mudancas.length || r.reiniciar || primeira || mudouRede) notificar();
        if (r.completo !== false) return;
      }
    }
    let andamento = null;
    let repetir = false;
    const visivel = () => !pagina || !pagina.document || pagina.document.visibilityState !== "hidden";
    function sincronizar() {
      if (andamento) {
        repetir = true;
        return andamento;
      }
      andamento = (async () => {
        try {
          do {
            repetir = false;
            const enviou = await enviarFila();
            if (enviou && (visivel() || !carregado)) await buscarMudancas();
          } while (repetir && usuario && !sessaoPerdida);
        } finally {
          andamento = null;
        }
      })();
      return andamento;
    }
    function sincronizarSemEsperar() {
      sincronizar().catch(() => {});
    }
    let rodando = false;
    let temporizador = null;
    function intervalo() {
      if (rede !== "ok") return Math.min(ESPERA_MAXIMA_MS, 2e3 * 2 ** Math.max(0, Math.min(falhasSeguidas, 5) - 1));
      return agora() - ultimaAtividade > PARADO_DEPOIS_DE_MS ? INTERVALO_PARADO_MS : INTERVALO_MS;
    }
    async function ciclo() {
      if (!rodando) return;
      try {
        if (usuario && !sessaoPerdida) await sincronizar();
      } catch {}
      if (rodando) temporizador = agendar(ciclo, intervalo());
    }
    function aoVoltar() {
      ultimaAtividade = agora();
      falhasSeguidas = 0;
      if (visivel() && usuario && !sessaoPerdida) sincronizarSemEsperar();
    }
    function iniciarSincronia() {
      if (rodando) return;
      rodando = true;
      if (pagina) {
        pagina.addEventListener("online", aoVoltar);
        pagina.addEventListener("focus", aoVoltar);
        if (pagina.document) pagina.document.addEventListener("visibilitychange", aoVoltar);
      }
      temporizador = agendar(ciclo, 0);
    }
    function pararSincronia() {
      rodando = false;
      if (temporizador) cancelar(temporizador);
      temporizador = null;
      if (pagina) {
        pagina.removeEventListener("online", aoVoltar);
        pagina.removeEventListener("focus", aoVoltar);
        if (pagina.document) pagina.document.removeEventListener("visibilitychange", aoVoltar);
      }
    }
    async function conferirSessao() {
      falhaInicial = "";
      try {
        const r = await pedir("GET", "/api/auth/eu");
        usuario = r.usuario || null;
        primeiroAcesso = Boolean(r.primeiroAcesso);
        sessaoPerdida = false;
        deuCerto();
        if (usuario) {
          iniciarSincronia();
          sincronizarSemEsperar();
        }
      } catch (e) {
        falhaInicial =
          e instanceof SemRede ? "Sem conexão com a internet. Confira o sinal e tente de novo." : e.message;
      }
      conferido = true;
      notificar();
    }
    async function iniciar() {
      await carregarCopia();
      await conferirSessao();
    }
    function depoisDeEntrar(u) {
      usuario = u;
      primeiroAcesso = false;
      sessaoPerdida = false;
      falhaInicial = "";
      conferido = true;
      deuCerto();
      iniciarSincronia();
      sincronizarSemEsperar();
      notificar();
    }
    async function entrar(email, senha) {
      const r = await pedir("POST", "/api/auth/entrar", { email, senha });
      depoisDeEntrar(r.usuario);
      return r.usuario;
    }
    async function criarPrimeiraConta({ chave, email, senha }) {
      const r = await pedir("POST", "/api/auth/primeiro-acesso", { chave, email, senha });
      depoisDeEntrar(r.usuario);
      return r.usuario;
    }
    async function sair() {
      await pedir("POST", "/api/auth/sair", {});
      pararSincronia();
      usuario = null;
      sessaoPerdida = false;
      carregado = false;
      fila = [];
      fotos.clear();
      limparBase();
      await apagarCopiaLocal();
      const r = await pedir("GET", "/api/auth/eu").catch(() => null);
      primeiroAcesso = Boolean(r && r.primeiroAcesso);
      notificar();
    }
    const trocarSenha = (atual, nova) => pedirLogada("POST", "/api/auth/trocar-senha", { atual, nova });
    const equipe = {
      listar: async () => (await pedirLogada("GET", "/api/equipe")).pessoas,
      adicionar: (email, senha) => pedirLogada("POST", "/api/equipe/adicionar", { email, senha }),
      remover: (email) => pedirLogada("POST", "/api/equipe/remover", { email }),
      redefinirSenha: (email, senha) => pedirLogada("POST", "/api/equipe/redefinir-senha", { email, senha }),
    };
    async function foto(idDaVenda) {
      for (let i = fila.length - 1; i >= 0; i -= 1) {
        for (let j = fila[i].ops.length - 1; j >= 0; j -= 1) {
          const op = fila[i].ops[j];
          if (op.col === "fotos" && op.id === idDaVenda) return op.op === "apagar" ? null : op.dados.imagem;
        }
      }
      if (fotos.has(idDaVenda)) return fotos.get(idDaVenda);
      try {
        const r = await pedirLogada("GET", \`/api/app/foto/\${encodeURIComponent(idDaVenda)}\`);
        lembrarFoto({ col: "fotos", id: idDaVenda, op: "set", dados: { imagem: r.imagem } });
        return r.imagem;
      } catch (e) {
        if (e instanceof ErroDoServidor && e.status === 404) return null;
        throw e;
      }
    }
    async function importarBackup(backup, aoProgredir = () => {}) {
      const ops = operacoesDoBackup(backup);
      for (let i = 0; i < ops.length; i += OPERACOES_POR_LOTE) {
        await pedirLogada("POST", "/api/app/gravar", { ops: ops.slice(i, i + OPERACOES_POR_LOTE) });
        aoProgredir(Math.min(i + OPERACOES_POR_LOTE, ops.length), ops.length);
      }
      await sincronizar();
      return ops.length;
    }
    return {
      estado,
      assinar(fn) {
        ouvintes.add(fn);
        return () => ouvintes.delete(fn);
      },
      iniciar,
      entrar,
      criarPrimeiraConta,
      sair,
      trocarSenha,
      equipe,
      gravar,
      foto,
      importarBackup,
      sincronizar,
      marcarAtividade() {
        ultimaAtividade = agora();
      },
      /** Para a tela tentar de novo depois de "Sem conexão" na abertura. */
      tentarDeNovo: conferirSessao,
      parar: pararSincronia,
      /** Espera terminar o que estiver sendo enviado ou conferido agora (usado nos testes, ao encerrar). */
      async aguardar() {
        while (andamento) await andamento.catch(() => {});
      },
    };
  }

  // app/estilos.js
  var t = {
    bg: "#FAF5F3",
    surface: "#FFFFFF",
    ink: "#2B1C28",
    inkSoft: "#7A6874",
    inkFaint: "#A89AA3",
    line: "#EBDFDA",
    rose: "#BE1450",
    roseSoft: "#FBE8EF",
    green: "#12695A",
    greenSoft: "#E2F0EC",
    amber: "#9C5B08",
    amberSoft: "#FAEEDB",
  };
  var sans = '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  var display = '"Fraunces", Georgia, serif';
  function carregarFontes() {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=Fraunces:opsz,wght@9..144,400;9..144,600&display=swap";
    document.head.appendChild(link);
  }
  var S = {
    screen: { minHeight: "100vh", background: t.bg, fontFamily: sans, color: t.ink },
    frame: { maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: t.bg, position: "relative" },
    header: { padding: "16px 20px 0" },
    brandRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
    brand: { fontFamily: display, fontSize: 21, color: t.ink },
    linkBtn: { background: "none", border: "none", color: t.inkSoft, fontSize: 14, padding: 6 },
    tabs: { display: "flex", gap: 22, marginTop: 14, borderBottom: \`1px solid \${t.line}\` },
    tab: {
      background: "none",
      border: "none",
      padding: "8px 0 10px",
      fontSize: 15,
      color: t.inkSoft,
      borderBottom: "2px solid transparent",
      marginBottom: -1,
    },
    tabOn: { color: t.ink, borderBottomColor: t.rose, fontWeight: 500 },
    dateRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 12px 0" },
    arrow: { background: "none", border: "none", fontSize: 26, color: t.inkSoft, width: 44, height: 44, lineHeight: 1 },
    dateTxt: {
      fontSize: 14,
      color: t.inkSoft,
      background: "none",
      border: "none",
      padding: 4,
      textDecoration: "underline",
      textDecorationColor: t.line,
      textUnderlineOffset: 4,
    },
    todayBtn: { background: "none", border: "none", color: t.rose, fontSize: 13, padding: "2px 0" },
    mesRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 12px 4px" },
    mesNome: { fontFamily: display, fontSize: 20, color: t.ink },
    mesSub: { fontSize: 13, color: t.inkSoft, marginTop: 2 },
    calGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(7, 1fr)",
      gap: 4,
      padding: "10px 14px 4px",
    },
    calSemana: { fontSize: 11, color: t.inkFaint, textAlign: "center", paddingBottom: 4 },
    calDia: {
      position: "relative",
      aspectRatio: "1 / 1",
      width: "100%",
      background: "none",
      border: "1px solid transparent",
      borderRadius: 10,
      fontSize: 15,
      color: t.inkSoft,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 0,
    },
    calDiaLive: { background: t.surface, borderColor: t.line, color: t.ink, fontWeight: 500 },
    calDiaHoje: { borderColor: t.inkFaint },
    calDiaSel: { background: t.rose, borderColor: t.rose, color: "#fff", fontWeight: 500 },
    calDiaFuturo: { color: "#D9CDD4" },
    calPonto: {
      position: "absolute",
      bottom: 6,
      left: "50%",
      transform: "translateX(-50%)",
      width: 4,
      height: 4,
      borderRadius: 4,
    },
    calDetalhe: { padding: "18px 20px 0", borderTop: \`1px solid \${t.line}\`, marginTop: 14 },
    calDataSel: { fontSize: 14, color: t.inkSoft },
    resumo: { padding: "10px 20px 20px", borderBottom: \`1px solid \${t.line}\` },
    totalNum: { fontFamily: display, fontSize: 42, lineHeight: 1.05, letterSpacing: "-0.5px", color: t.ink },
    metaRow: { display: "flex", gap: 18, marginTop: 10, flexWrap: "wrap" },
    pendBar: {
      marginTop: 14,
      background: t.amberSoft,
      color: t.amber,
      padding: "9px 12px",
      borderRadius: 8,
      fontSize: 14,
    },
    list: { padding: "16px 20px 0" },
    empty: { padding: "48px 8px", textAlign: "center" },
    emptyTitle: { fontFamily: display, fontSize: 19, color: t.ink, margin: "0 0 8px" },
    emptyTxt: { fontSize: 15, color: t.inkSoft, margin: 0, lineHeight: 1.5 },
    card: {
      background: t.surface,
      borderRadius: 12,
      border: \`1px solid \${t.line}\`,
      marginBottom: 12,
      overflow: "hidden",
    },
    cardHead: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
      padding: "14px 14px 10px",
    },
    cliNome: {
      fontSize: 16,
      fontWeight: 500,
      color: t.ink,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    cliSub: { fontSize: 13, color: t.inkSoft, marginTop: 2 },
    cliTotal: { fontFamily: display, fontSize: 19, color: t.ink },
    badgeNova: {
      display: "inline-block",
      marginTop: 4,
      background: t.roseSoft,
      color: t.rose,
      fontSize: 12,
      padding: "2px 8px",
      borderRadius: 20,
    },
    badgeAntiga: {
      display: "inline-block",
      marginTop: 4,
      background: "#F2EDEF",
      color: t.inkSoft,
      fontSize: 12,
      padding: "2px 8px",
      borderRadius: 20,
    },
    row: { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderTop: \`1px solid \${t.line}\` },
    rowMain: {
      flex: 1,
      minWidth: 0,
      display: "flex",
      alignItems: "baseline",
      gap: 8,
      background: "none",
      border: "none",
      padding: 0,
      textAlign: "left",
    },
    codigo: { fontSize: 13, color: t.inkFaint, minWidth: 22 },
    peca: { fontSize: 15, color: t.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    rowValor: { fontSize: 15, color: t.ink, flexShrink: 0 },
    chipPago: {
      background: t.greenSoft,
      color: t.green,
      border: "none",
      fontSize: 12,
      padding: "4px 9px",
      borderRadius: 20,
      flexShrink: 0,
    },
    chipPend: {
      background: t.amberSoft,
      color: t.amber,
      border: "none",
      fontSize: 12,
      padding: "4px 9px",
      borderRadius: 20,
      flexShrink: 0,
    },
    dock: {
      position: "fixed",
      bottom: 0,
      left: "50%",
      transform: "translateX(-50%)",
      width: "100%",
      maxWidth: 480,
      padding: "12px 20px 20px",
      background: \`linear-gradient(to top, \${t.bg} 62%, rgba(250,245,243,0))\`,
    },
    cta: {
      width: "100%",
      background: t.rose,
      color: "#fff",
      border: "none",
      borderRadius: 10,
      padding: "15px 16px",
      fontSize: 16,
      fontWeight: 500,
    },
    ctaGhost: {
      width: "100%",
      background: "none",
      color: t.inkSoft,
      border: \`1px solid \${t.line}\`,
      borderRadius: 10,
      padding: "13px 16px",
      fontSize: 15,
      marginTop: 10,
    },
    label: { display: "block", fontSize: 13, color: t.inkSoft, marginBottom: 6 },
    input: {
      width: "100%",
      background: t.surface,
      border: \`1px solid \${t.line}\`,
      borderRadius: 9,
      padding: "13px 13px",
      fontSize: 16,
      color: t.ink,
    },
    okMark: { position: "absolute", right: 13, top: 14, color: t.green, fontSize: 16 },
    sugBox: { background: t.surface, border: \`1px solid \${t.line}\`, borderRadius: 9, marginTop: 6, overflow: "hidden" },
    sugItem: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      background: "none",
      border: "none",
      borderBottom: \`1px solid \${t.line}\`,
      padding: "12px 13px",
      fontSize: 15,
      color: t.ink,
      textAlign: "left",
    },
    hintNova: { fontSize: 13, color: t.rose, margin: "8px 2px 0" },
    erro: { fontSize: 14, color: t.rose, margin: "14px 0 0", lineHeight: 1.4 },
    filaBox: { background: t.surface, border: \`1px solid \${t.line}\`, borderRadius: 9, overflow: "hidden" },
    filaItem: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      fontSize: 15,
      color: t.ink,
      borderBottom: \`1px solid \${t.line}\`,
    },
    filaPos: {
      width: 20,
      height: 20,
      borderRadius: 20,
      background: t.roseSoft,
      color: t.rose,
      fontSize: 12,
      lineHeight: "20px",
      textAlign: "center",
      flexShrink: 0,
    },
    addFila: {
      background: t.surface,
      border: \`1px solid \${t.line}\`,
      borderRadius: 9,
      padding: "0 14px",
      fontSize: 14,
      color: t.ink,
      flexShrink: 0,
    },
    filaTag: {
      background: t.roseSoft,
      color: t.rose,
      fontSize: 11,
      padding: "2px 6px",
      borderRadius: 4,
      flexShrink: 0,
    },
    passaBox: {
      background: t.roseSoft,
      borderRadius: 10,
      padding: 14,
      marginBottom: 18,
    },
    passaTxt: { fontSize: 14, color: t.ink, lineHeight: 1.45, marginBottom: 11 },
    passaBtn: {
      width: "100%",
      background: t.rose,
      color: "#fff",
      border: "none",
      borderRadius: 8,
      padding: "12px",
      fontSize: 15,
      fontWeight: 500,
    },
    segOnEscopo: { background: t.roseSoft, borderColor: t.roseSoft, color: t.rose, fontWeight: 500 },
    escopoInfo: { fontSize: 13, color: t.inkSoft, margin: "12px 2px 10px" },
    cardExport: {
      width: "100%",
      background: "none",
      border: "none",
      borderTop: \`1px solid \${t.line}\`,
      padding: "11px",
      fontSize: 14,
      color: t.rose,
    },
    exportTxt: {
      width: "100%",
      height: 200,
      background: t.surface,
      color: t.ink,
      border: \`1px solid \${t.line}\`,
      borderRadius: 9,
      padding: 12,
      fontSize: 13,
      lineHeight: 1.6,
      resize: "none",
      fontFamily: sans,
    },
    fotoImg: {
      width: "100%",
      maxHeight: 260,
      objectFit: "cover",
      borderRadius: 9,
      border: \`1px solid \${t.line}\`,
      display: "block",
    },
    fotoAdd: {
      display: "block",
      width: "100%",
      textAlign: "center",
      background: t.surface,
      border: \`1px dashed \${t.line}\`,
      borderRadius: 9,
      padding: "20px 12px",
      fontSize: 15,
      color: t.inkSoft,
      cursor: "pointer",
    },
    fotoVazia: {
      background: t.surface,
      border: \`1px solid \${t.line}\`,
      borderRadius: 9,
      padding: "20px 12px",
      fontSize: 15,
      color: t.inkSoft,
      textAlign: "center",
    },
    fotoTag: {
      background: "#F2EDEF",
      color: t.inkSoft,
      fontSize: 11,
      padding: "2px 6px",
      borderRadius: 4,
      flexShrink: 0,
    },
    histBox: {
      background: t.roseSoft,
      borderRadius: 10,
      padding: 14,
      marginBottom: 18,
    },
    segmento: { display: "flex", gap: 8 },
    segBtn: {
      flex: 1,
      background: t.surface,
      border: \`1px solid \${t.line}\`,
      borderRadius: 9,
      padding: "12px",
      fontSize: 15,
      color: t.inkSoft,
    },
    segOnPend: { background: t.amberSoft, borderColor: t.amberSoft, color: t.amber, fontWeight: 500 },
    segOnPago: { background: t.greenSoft, borderColor: t.greenSoft, color: t.green, fontWeight: 500 },
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(43,28,40,0.42)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      zIndex: 50,
    },
    sheet: {
      width: "100%",
      maxWidth: 480,
      background: t.bg,
      borderRadius: "16px 16px 0 0",
      maxHeight: "92vh",
      display: "flex",
      flexDirection: "column",
    },
    sheetHead: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px 10px" },
    sheetTitle: { fontFamily: display, fontSize: 20, color: t.ink },
    cliRow: {
      width: "100%",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      background: t.surface,
      border: \`1px solid \${t.line}\`,
      borderRadius: 12,
      padding: "14px",
      marginBottom: 10,
    },
    checkRow: {
      display: "flex",
      gap: 11,
      alignItems: "flex-start",
      width: "100%",
      background: "none",
      border: "none",
      padding: "16px 0 0",
      fontSize: 15,
      color: t.ink,
    },
    checkBox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      border: \`1.5px solid \${t.line}\`,
      background: t.surface,
      color: "#fff",
      fontSize: 13,
      lineHeight: "20px",
      textAlign: "center",
      flexShrink: 0,
    },
    checkOn: { background: t.rose, borderColor: t.rose },
    checkHelp: { display: "block", fontSize: 13, color: t.inkSoft, marginTop: 3, lineHeight: 1.4 },
    toast: {
      position: "fixed",
      bottom: 92,
      left: "50%",
      transform: "translateX(-50%)",
      background: t.ink,
      color: "#fff",
      fontSize: 14,
      padding: "10px 16px",
      borderRadius: 8,
      zIndex: 60,
    },
    /* conexão, conta e equipe */
    faixa: {
      margin: "12px 20px 0",
      background: t.amberSoft,
      color: t.amber,
      padding: "9px 12px",
      borderRadius: 8,
      fontSize: 13,
      lineHeight: 1.45,
    },
    faixaErro: { background: t.roseSoft, color: t.rose },
    nota: { fontSize: 14, color: t.inkSoft, lineHeight: 1.55, margin: "0 0 14px" },
    notaPequena: { fontSize: 13, color: t.inkSoft, lineHeight: 1.5, margin: "8px 2px 0" },
    ok: { fontSize: 14, color: t.green, margin: "14px 0 0", lineHeight: 1.45 },
    pessoa: { display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: \`1px solid \${t.line}\` },
    pessoaEmail: {
      flex: 1,
      minWidth: 0,
      fontSize: 15,
      color: t.ink,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    pessoaPapel: {
      fontSize: 12,
      color: t.inkSoft,
      background: "#F2EDEF",
      padding: "2px 8px",
      borderRadius: 20,
      flexShrink: 0,
    },
    linkAcao: { background: "none", border: "none", color: t.rose, fontSize: 14, padding: 6, flexShrink: 0 },
    botaoLink: {
      display: "block",
      width: "100%",
      textAlign: "center",
      textDecoration: "none",
      background: "none",
      color: t.inkSoft,
      border: \`1px solid \${t.line}\`,
      borderRadius: 10,
      padding: "13px 16px",
      fontSize: 15,
      marginTop: 10,
    },
  };

  // app/util.js
  var norm = (s) =>
    (s || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\\u0300-\\u036f]/g, "")
      .replace(/\\s+/g, " ");
  var brl = (n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  var todayKey = () => {
    const d = /* @__PURE__ */ new Date();
    return \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, "0")}-\${String(d.getDate()).padStart(2, "0")}\`;
  };
  var shiftKey = (key, days) => {
    const [y, m, d] = key.split("-").map(Number);
    const dt = new Date(y, m - 1, d + days);
    return \`\${dt.getFullYear()}-\${String(dt.getMonth() + 1).padStart(2, "0")}-\${String(dt.getDate()).padStart(2, "0")}\`;
  };
  var dateLabel = (key) => {
    const [y, m, d] = key.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const s = dt.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  var parseMoney = (s) => {
    const clean = String(s)
      .replace(/[^\\d,.-]/g, "")
      .replace(/\\./g, "")
      .replace(",", ".");
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  };
  var ABERTURA_PADRAO = \`Bom dia gata🌸
Tudo bem ?
Gratidão pela compra 🙏🏼
Que Deus em sua infinita bondade, te abençoe sempre .
A live foi incrível e você arrasou nas escolhas , gratidão por sua presença.
Arrase muito com suas peças ✨
Segue abaixo peças e valores referente a compra na live {data} ♻️\`;
  var FECHAMENTO_PADRAO = \`PIX BRECHÓ
Tipo de Chave: Telefone
➡️ Chave: 47 99791-9934
➡️ Banco: Stone
➡️ Simone Dutra dos Reis

*Lembrete*
Você tem a opção de pagar em cartão de crédito à vista ou parcelado , em até *3*x sem acréscimo , compras acima de $120,00 .
Acima de 3 parcelas - acréscimo da operadora ( varia pela quantidade de parcela ) .

Beijo 🍀♥️😘\`;
  var CONFIG_PADRAO = { abertura: ABERTURA_PADRAO, fechamento: FECHAMENTO_PADRAO };
  var preencher = (txt, vals) => String(txt || "").replace(/\\{(\\w+)\\}/g, (m, k) => (vals[k] !== void 0 ? vals[k] : m));
  function calcResumo(vendas, clientes, dia) {
    const doDia = vendas.filter((v) => v.data === dia);
    const mapa = {};
    clientes.forEach((c) => (mapa[c.id] = c));
    const ids = [...new Set(doDia.map((v) => v.clienteId))];
    return {
      total: doDia.reduce((s, v) => s + v.valor, 0),
      pendente: doDia.filter((v) => !v.pago).reduce((s, v) => s + v.valor, 0),
      pecas: doDia.length,
      clientes: ids.length,
      novas: ids.filter((id) => {
        const c = mapa[id];
        return c && !c.preExistente && c.primeiraCompra === dia;
      }).length,
    };
  }
  var dataCurta = (k) => {
    const [y, m, d] = k.split("-");
    return \`\${d}/\${m}/\${y}\`;
  };
  var arquivoNome = (s) =>
    norm(s)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "exportacao";
  var itemLinha = (v, comCodigo) => \`• \${v.peca}\${comCodigo && v.codigo ? \` (\${v.codigo})\` : ""} — \${brl(v.valor)}\`;
  function csvVendas(vendas, clientes) {
    const mapa = {};
    clientes.forEach((c) => (mapa[c.id] = c));
    const esc = (x) => \`"\${String(x === void 0 || x === null ? "" : x).replace(/"/g, '""')}"\`;
    const linhas = [["Data", "Cliente", "Codigo", "Peca", "Valor", "Situacao"].join(";")];
    [...vendas]
      .sort((a, b) => a.data.localeCompare(b.data) || a.criadaEm - b.criadaEm)
      .forEach((v) => {
        const c = mapa[v.clienteId] || {};
        linhas.push(
          [
            esc(dataCurta(v.data)),
            esc(c.nome || ""),
            esc(v.codigo),
            esc(v.peca),
            esc(v.valor.toFixed(2).replace(".", ",")),
            esc(v.pago ? "Pago" : "Pendente"),
          ].join(";"),
        );
      });
    return linhas.join("\\r\\n");
  }

  // app/planilha.js
  var TABELA_CRC = (() => {
    const t2 = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ (c >>> 1) : c >>> 1;
      t2[n] = c >>> 0;
    }
    return t2;
  })();
  function crc32(bytes) {
    let c = 4294967295;
    for (let i = 0; i < bytes.length; i++) c = TABELA_CRC[(c ^ bytes[i]) & 255] ^ (c >>> 8);
    return (c ^ 4294967295) >>> 0;
  }
  var bytesDe = (txt) => new TextEncoder().encode(txt);
  function zipar(arquivos) {
    const partes = [];
    const central = [];
    let deslocamento = 0;
    arquivos.forEach((a) => {
      const nome = bytesDe(a.nome);
      const crc = crc32(a.dados);
      const local = new Uint8Array(30 + nome.length);
      const dv = new DataView(local.buffer);
      dv.setUint32(0, 67324752, true);
      dv.setUint16(4, 20, true);
      dv.setUint16(8, 0, true);
      dv.setUint16(12, 33, true);
      dv.setUint32(14, crc, true);
      dv.setUint32(18, a.dados.length, true);
      dv.setUint32(22, a.dados.length, true);
      dv.setUint16(26, nome.length, true);
      local.set(nome, 30);
      partes.push(local, a.dados);
      const c = new Uint8Array(46 + nome.length);
      const cv = new DataView(c.buffer);
      cv.setUint32(0, 33639248, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(14, 33, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, a.dados.length, true);
      cv.setUint32(24, a.dados.length, true);
      cv.setUint16(28, nome.length, true);
      cv.setUint32(42, deslocamento, true);
      c.set(nome, 46);
      central.push(c);
      deslocamento += local.length + a.dados.length;
    });
    const tamCentral = central.reduce((s, x) => s + x.length, 0);
    const fim = new Uint8Array(22);
    const fv = new DataView(fim.buffer);
    fv.setUint32(0, 101010256, true);
    fv.setUint16(8, arquivos.length, true);
    fv.setUint16(10, arquivos.length, true);
    fv.setUint32(12, tamCentral, true);
    fv.setUint32(16, deslocamento, true);
    const total = [...partes, ...central, fim];
    const tamanho = total.reduce((s, x) => s + x.length, 0);
`,
  },
};
