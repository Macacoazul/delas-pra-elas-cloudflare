/* app.js — o app da live
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
        const faixa = IDBKeyRange.bound(prefixo, `${prefixo}\uFFFF`);
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
  var DIA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  var ehObjeto = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  var texto = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  function lerBackup(conteudo, hoje) {
    let dados;
    try {
      dados = JSON.parse(String(conteudo || "").replace(/^\uFEFF/, ""));
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
            : Date.parse(`${v.data}T12:00:00`) || Date.now(),
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
    const chaveDoLote = (id) => `lote:${id}`;
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
      `${String(agora()).padStart(15, "0")}-${String((contadorDeLotes += 1)).padStart(4, "0")}-${novoId(aleatorios).slice(0, 4)}`;
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
            avisar(`Uma alteração não foi aceita pelo servidor: ${e.message}`);
            notificar();
            continue;
          }
          if (!passaSozinho(e)) avisar(`Não consegui enviar uma alteração (${e.message}). Vou tentar de novo.`);
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
          r = await pedir("GET", `/api/app/estado?desde=${cursor}&c=${COLECOES.join(",")}`);
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
        const r = await pedirLogada("GET", `/api/app/foto/${encodeURIComponent(idDaVenda)}`);
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
    tabs: { display: "flex", gap: 22, marginTop: 14, borderBottom: `1px solid ${t.line}` },
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
    calDetalhe: { padding: "18px 20px 0", borderTop: `1px solid ${t.line}`, marginTop: 14 },
    calDataSel: { fontSize: 14, color: t.inkSoft },
    resumo: { padding: "10px 20px 20px", borderBottom: `1px solid ${t.line}` },
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
      border: `1px solid ${t.line}`,
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
    row: { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderTop: `1px solid ${t.line}` },
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
      background: `linear-gradient(to top, ${t.bg} 62%, rgba(250,245,243,0))`,
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
      border: `1px solid ${t.line}`,
      borderRadius: 10,
      padding: "13px 16px",
      fontSize: 15,
      marginTop: 10,
    },
    label: { display: "block", fontSize: 13, color: t.inkSoft, marginBottom: 6 },
    input: {
      width: "100%",
      background: t.surface,
      border: `1px solid ${t.line}`,
      borderRadius: 9,
      padding: "13px 13px",
      fontSize: 16,
      color: t.ink,
    },
    okMark: { position: "absolute", right: 13, top: 14, color: t.green, fontSize: 16 },
    sugBox: { background: t.surface, border: `1px solid ${t.line}`, borderRadius: 9, marginTop: 6, overflow: "hidden" },
    sugItem: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      background: "none",
      border: "none",
      borderBottom: `1px solid ${t.line}`,
      padding: "12px 13px",
      fontSize: 15,
      color: t.ink,
      textAlign: "left",
    },
    hintNova: { fontSize: 13, color: t.rose, margin: "8px 2px 0" },
    erro: { fontSize: 14, color: t.rose, margin: "14px 0 0", lineHeight: 1.4 },
    filaBox: { background: t.surface, border: `1px solid ${t.line}`, borderRadius: 9, overflow: "hidden" },
    filaItem: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      fontSize: 15,
      color: t.ink,
      borderBottom: `1px solid ${t.line}`,
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
      border: `1px solid ${t.line}`,
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
      borderTop: `1px solid ${t.line}`,
      padding: "11px",
      fontSize: 14,
      color: t.rose,
    },
    exportTxt: {
      width: "100%",
      height: 200,
      background: t.surface,
      color: t.ink,
      border: `1px solid ${t.line}`,
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
      border: `1px solid ${t.line}`,
      display: "block",
    },
    fotoAdd: {
      display: "block",
      width: "100%",
      textAlign: "center",
      background: t.surface,
      border: `1px dashed ${t.line}`,
      borderRadius: 9,
      padding: "20px 12px",
      fontSize: 15,
      color: t.inkSoft,
      cursor: "pointer",
    },
    fotoVazia: {
      background: t.surface,
      border: `1px solid ${t.line}`,
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
      border: `1px solid ${t.line}`,
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
      border: `1px solid ${t.line}`,
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
      border: `1.5px solid ${t.line}`,
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
    pessoa: { display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: `1px solid ${t.line}` },
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
      border: `1px solid ${t.line}`,
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
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  var brl = (n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  var todayKey = () => {
    const d = /* @__PURE__ */ new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  var shiftKey = (key, days) => {
    const [y, m, d] = key.split("-").map(Number);
    const dt = new Date(y, m - 1, d + days);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  };
  var dateLabel = (key) => {
    const [y, m, d] = key.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const s = dt.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  var parseMoney = (s) => {
    const clean = String(s)
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  };
  var ABERTURA_PADRAO = `Bom dia gata🌸
Tudo bem ?
Gratidão pela compra 🙏🏼
Que Deus em sua infinita bondade, te abençoe sempre .
A live foi incrível e você arrasou nas escolhas , gratidão por sua presença.
Arrase muito com suas peças ✨
Segue abaixo peças e valores referente a compra na live {data} ♻️`;
  var FECHAMENTO_PADRAO = `PIX BRECHÓ
Tipo de Chave: Telefone
➡️ Chave: 47 99791-9934
➡️ Banco: Stone
➡️ Simone Dutra dos Reis

*Lembrete*
Você tem a opção de pagar em cartão de crédito à vista ou parcelado , em até *3*x sem acréscimo , compras acima de $120,00 .
Acima de 3 parcelas - acréscimo da operadora ( varia pela quantidade de parcela ) .

Beijo 🍀♥️😘`;
  var CONFIG_PADRAO = { abertura: ABERTURA_PADRAO, fechamento: FECHAMENTO_PADRAO };
  var preencher = (txt, vals) => String(txt || "").replace(/\{(\w+)\}/g, (m, k) => (vals[k] !== void 0 ? vals[k] : m));
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
    return `${d}/${m}/${y}`;
  };
  var arquivoNome = (s) =>
    norm(s)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "exportacao";
  var itemLinha = (v, comCodigo) => `• ${v.peca}${comCodigo && v.codigo ? ` (${v.codigo})` : ""} — ${brl(v.valor)}`;
  function csvVendas(vendas, clientes) {
    const mapa = {};
    clientes.forEach((c) => (mapa[c.id] = c));
    const esc = (x) => `"${String(x === void 0 || x === null ? "" : x).replace(/"/g, '""')}"`;
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
    return linhas.join("\r\n");
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
    const saida = new Uint8Array(tamanho);
    let p = 0;
    total.forEach((x) => {
      saida.set(x, p);
      p += x.length;
    });
    return saida;
  }
  var escapar = (s) =>
    String(s === null || s === void 0 ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  var letraColuna = (n) => {
    let s = "";
    n += 1;
    while (n > 0) {
      const r = (n - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  };
  function criarEstilos() {
    const bordas = ["<border><left/><right/><top/><bottom/><diagonal/></border>"];
    const chavesBorda = { "": 0 };
    const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
    const chavesXf = { "0|0|0|0": 0 };
    const borda = (l, r, t2, b) => {
      const chave = `${l ? 1 : 0}${r ? 1 : 0}${t2 ? 1 : 0}${b ? 1 : 0}`;
      if (chave === "0000") return 0;
      if (chavesBorda[chave] !== void 0) return chavesBorda[chave];
      const lado = (nome, tem) => (tem ? `<${nome} style="medium"><color rgb="FF000000"/></${nome}>` : `<${nome}/>`);
      bordas.push(
        `<border>${lado("left", l)}${lado("right", r)}${lado("top", t2)}${lado("bottom", b)}<diagonal/></border>`,
      );
      chavesBorda[chave] = bordas.length - 1;
      return bordas.length - 1;
    };
    const xf = (fonte, formato, idBorda, centro) => {
      const chave = `${fonte}|${formato}|${idBorda}|${centro}`;
      if (chavesXf[chave] !== void 0) return chavesXf[chave];
      const alinha = centro ? '<alignment horizontal="center" vertical="center"/>' : "";
      xfs.push(
        `<xf numFmtId="${formato}" fontId="${fonte}" fillId="0" borderId="${idBorda}" xfId="0" applyFont="1" applyBorder="1" applyNumberFormat="1"${centro ? ' applyAlignment="1"' : ""}>${alinha}</xf>`,
      );
      chavesXf[chave] = xfs.length - 1;
      return xfs.length - 1;
    };
    const xml = () =>
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="_-&quot;R$&quot;\\ * #,##0.00_-;\\-&quot;R$&quot;\\ * #,##0.00_-;_-&quot;R$&quot;\\ * &quot;-&quot;??_-;_-@_-"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="${bordas.length}">${bordas.join("")}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    return { borda, xf, xml };
  }
  var COLUNAS_BLOCO = [0, 3, 6, 9, 12, 15, 18, 21];
  var LINHAS_ENTRE_FAIXAS = 3;
  function planilhaDoDia(grupos, nomeAba) {
    const est = criarEstilos();
    const celulas = {};
    let ultimaLinha = 0;
    let ultimaColuna = 0;
    const por = (r, c, conteudo) => {
      celulas[`${r},${c}`] = conteudo;
      if (r > ultimaLinha) ultimaLinha = r;
      if (c > ultimaColuna) ultimaColuna = c;
    };
    const texto2 = (r, c, valor, estilo) =>
      por(
        r,
        c,
        `<c r="${letraColuna(c)}${r + 1}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${escapar(valor)}</t></is></c>`,
      );
    const numero = (r, c, valor, estilo) =>
      por(r, c, `<c r="${letraColuna(c)}${r + 1}" s="${estilo}"><v>${valor}</v></c>`);
    const formula = (r, c, f, valor, estilo) =>
      por(r, c, `<c r="${letraColuna(c)}${r + 1}" s="${estilo}"><f>${escapar(f)}</f><v>${valor}</v></c>`);
    const vazia = (r, c, estilo) => por(r, c, `<c r="${letraColuna(c)}${r + 1}" s="${estilo}"/>`);
    const emOrdem = [...grupos].reverse();
    let linhaBase = 0;
    for (let i = 0; i < emOrdem.length; i += COLUNAS_BLOCO.length) {
      const faixa = emOrdem.slice(i, i + COLUNAS_BLOCO.length);
      let altura = 0;
      faixa.forEach((g, j) => {
        const c = COLUNAS_BLOCO[j];
        const itens = [...g.vendas].reverse();
        const linhaNome = linhaBase;
        const temPago = itens.some((v) => v.pago);
        const tudoPago = itens.length > 0 && itens.every((v) => v.pago);
        const colFim = temPago ? c + 2 : c + 1;
        const linhaFim = tudoPago ? linhaNome + itens.length : linhaNome + itens.length + 1;
        texto2(linhaNome, c, (g.cliente.nome || "").toUpperCase(), est.xf(1, 0, est.borda(1, colFim === c, 1, 0), 1));
        for (let col = c + 1; col <= colFim; col++) {
          vazia(linhaNome, col, est.xf(1, 0, est.borda(0, col === colFim, 1, 0), 0));
        }
        itens.forEach((v, k) => {
          const r = linhaNome + 1 + k;
          const base = tudoPago && k === itens.length - 1 ? 1 : 0;
          texto2(r, c, (v.peca || "").toUpperCase(), est.xf(0, 0, est.borda(1, 0, 0, base), 1));
          numero(r, c + 1, v.valor, est.xf(0, 164, est.borda(0, colFim === c + 1, 0, base), 0));
          if (colFim === c + 2) {
            const estilo = est.xf(1, 0, est.borda(0, 1, 0, base), 1);
            if (v.pago) texto2(r, c + 2, "PG", estilo);
            else vazia(r, c + 2, estilo);
          }
        });
        if (!tudoPago) {
          const colValor = letraColuna(c + 1);
          const colPago = letraColuna(c + 2);
          const primeira = linhaNome + 2;
          const ultima = linhaFim;
          const soma = itens.reduce((s, v) => s + v.valor, 0);
          const aPagar = itens.filter((v) => !v.pago).reduce((s, v) => s + v.valor, 0);
          let rotulo = "";
          let f = `SUM(${colValor}${primeira}:${colValor}${ultima})`;
          let valor = soma;
          if (temPago) {
            rotulo = "A PAGAR";
            f = `SUMIF(${colPago}${primeira}:${colPago}${ultima},"",${colValor}${primeira}:${colValor}${ultima})`;
            valor = aPagar;
          }
          texto2(linhaFim, c, rotulo, est.xf(1, 0, est.borda(1, colFim === c, 0, 1), 1));
          formula(
            linhaFim,
            c + 1,
            f,
            Math.round(valor * 100) / 100,
            est.xf(1, 164, est.borda(0, colFim === c + 1, 0, 1), 0),
          );
          if (colFim === c + 2) vazia(linhaFim, c + 2, est.xf(1, 0, est.borda(0, 1, 0, 1), 0));
        }
        altura = Math.max(altura, linhaFim - linhaBase + 1);
      });
      linhaBase += altura + LINHAS_ENTRE_FAIXAS;
    }
    const porLinha = {};
    Object.keys(celulas).forEach((k) => {
      const [r, c] = k.split(",").map(Number);
      if (!porLinha[r]) porLinha[r] = [];
      porLinha[r].push([c, celulas[k]]);
    });
    const linhasXml = Object.keys(porLinha)
      .map(Number)
      .sort((a, b) => a - b)
      .map((r) => {
        const cs = porLinha[r]
          .sort((a, b) => a[0] - b[0])
          .map((x) => x[1])
          .join("");
        return `<row r="${r + 1}">${cs}</row>`;
      })
      .join("");
    const colunasXml = Array.from({ length: 24 }, (_, n) => {
      const dentro = n % 3;
      const largura = dentro === 0 ? 32 : dentro === 1 ? 13 : 4;
      return `<col min="${n + 1}" max="${n + 1}" width="${largura}" customWidth="1"/>`;
    }).join("");
    const ref = `A1:${letraColuna(Math.max(ultimaColuna, 23))}${Math.max(ultimaLinha, 0) + 1}`;
    const folha = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="${ref}"/><sheetFormatPr defaultRowHeight="15"/><cols>${colunasXml}</cols><sheetData>${linhasXml}</sheetData><pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
    const arquivos = [
      {
        nome: "[Content_Types].xml",
        dados: bytesDe(
          `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
        ),
      },
      {
        nome: "_rels/.rels",
        dados: bytesDe(
          `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
        ),
      },
      {
        nome: "xl/workbook.xml",
        dados: bytesDe(
          `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapar(nomeAba)}" sheetId="1" r:id="rId1"/></sheets><calcPr fullCalcOnLoad="1"/></workbook>`,
        ),
      },
      {
        nome: "xl/_rels/workbook.xml.rels",
        dados: bytesDe(
          `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
        ),
      },
      { nome: "xl/styles.xml", dados: bytesDe(est.xml()) },
      { nome: "xl/worksheets/sheet1.xml", dados: bytesDe(folha) },
    ];
    return zipar(arquivos);
  }

  // app/telas/erro.jsx
  var Barreira = class extends react_global_default.Component {
    constructor(p) {
      super(p);
      this.state = { erro: null };
    }
    static getDerivedStateFromError(e) {
      return { erro: e };
    }
    render() {
      if (this.state.erro) {
        return h(
          "div",
          { style: { ...S.screen, padding: 28 } },
          h(
            "div",
            { style: { maxWidth: 380, margin: "60px auto" } },
            h(
              "div",
              { style: { fontFamily: display, fontSize: 24, color: t.ink, marginBottom: 10 } },
              "Algo travou nesta tela",
            ),
            h(
              "p",
              { style: { fontSize: 15, color: t.inkSoft, lineHeight: 1.5 } },
              "Nada do que você registrou foi perdido. Toque abaixo para voltar.",
            ),
            h("button", { style: { ...S.cta, marginTop: 20 }, onClick: () => this.setState({ erro: null }) }, "Voltar"),
            h(
              "p",
              { style: { fontSize: 12, color: t.inkFaint, marginTop: 20, wordBreak: "break-word" } },
              String(this.state.erro && this.state.erro.message),
            ),
          ),
        );
      }
      return this.props.children;
    }
  };

  // app/telas/entrada.jsx
  var MOLDURA = { ...S.screen, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 };
  var textoDoErro = (e) =>
    e instanceof SemRede
      ? "Sem internet. Confira a conexão."
      : e && e.message
        ? e.message
        : "Não deu certo. Tente de novo.";
  function Titulo({ children }) {
    return h(
      Fragment,
      null,
      h(
        "div",
        { style: { fontFamily: display, fontSize: 34, lineHeight: 1.1, color: t.ink, marginBottom: 6 } },
        "Delas pra Elas",
      ),
      h(
        "p",
        { style: { fontFamily: sans, fontSize: 15, color: t.inkSoft, margin: "0 0 28px", lineHeight: 1.5 } },
        children,
      ),
    );
  }
  function Login({ sessaoPerdida, aoEntrar }) {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [erro, setErro] = useState("");
    const [entrando, setEntrando] = useState(false);
    const entrar = async () => {
      if (!email.trim() || !senha) return setErro("Preencha o e-mail e a senha.");
      setEntrando(true);
      setErro("");
      try {
        await aoEntrar(email.trim(), senha);
      } catch (e) {
        setErro(textoDoErro(e));
        setEntrando(false);
      }
    };
    return h(
      "div",
      { style: MOLDURA },
      h(
        "div",
        { style: { width: "100%", maxWidth: 340 } },
        h(
          Titulo,
          null,
          sessaoPerdida
            ? "Sua sessão acabou. Entre de novo: o que você lançou ficou guardado e sobe sozinho."
            : "Controle de vendas da live.",
        ),
        h("label", { style: S.label }, "E-mail"),
        h("input", {
          style: S.input,
          type: "email",
          value: email,
          autoCapitalize: "none",
          autoCorrect: "off",
          autoComplete: "username",
          inputMode: "email",
          onChange: (e) => {
            setEmail(e.target.value);
            setErro("");
          },
        }),
        h("label", { style: { ...S.label, marginTop: 14 } }, "Senha"),
        h("input", {
          style: S.input,
          type: "password",
          value: senha,
          autoComplete: "current-password",
          onChange: (e) => {
            setSenha(e.target.value);
            setErro("");
          },
          onKeyDown: (e) => e.key === "Enter" && entrar(),
        }),
        erro && h("p", { style: { fontFamily: sans, fontSize: 14, color: t.rose, marginTop: 12 } }, erro),
        h(
          "button",
          { style: { ...S.cta, marginTop: 22, opacity: entrando ? 0.6 : 1 }, disabled: entrando, onClick: entrar },
          entrando ? "Entrando…" : "Entrar",
        ),
      ),
    );
  }
  function PrimeiroAcesso({ aoCriar }) {
    const [chave, setChave] = useState("");
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [repetida, setRepetida] = useState("");
    const [erro, setErro] = useState("");
    const [criando, setCriando] = useState(false);
    const criar = async () => {
      if (!chave || !email.trim() || !senha) return setErro("Preencha todos os campos.");
      if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
      if (senha !== repetida) return setErro("As duas senhas não são iguais.");
      setCriando(true);
      setErro("");
      try {
        await aoCriar({ chave, email: email.trim(), senha });
      } catch (e) {
        setErro(textoDoErro(e));
        setCriando(false);
      }
    };
    const campo = (rotulo, valor, mudar, extra = {}) =>
      h(
        Fragment,
        null,
        h("label", { style: { ...S.label, marginTop: 14 } }, rotulo),
        h("input", {
          style: S.input,
          value: valor,
          autoCapitalize: "none",
          autoCorrect: "off",
          onChange: (e) => {
            mudar(e.target.value);
            setErro("");
          },
          ...extra,
        }),
      );
    return h(
      "div",
      { style: MOLDURA },
      h(
        "div",
        { style: { width: "100%", maxWidth: 340 } },
        h(Titulo, null, "Primeiro acesso. Crie a conta da dona do brechó; depois ela cadastra a equipe."),
        campo("Senha de instalação", chave, setChave, { type: "password", autoComplete: "off" }),
        h("p", { style: S.notaPequena }, "É a senha que você guardou no painel da Cloudflare, no segredo ADMIN_SENHA."),
        campo("Seu e-mail", email, setEmail, { type: "email", inputMode: "email", autoComplete: "username" }),
        campo("Senha nova (mínimo 8 caracteres)", senha, setSenha, { type: "password", autoComplete: "new-password" }),
        campo("Repita a senha nova", repetida, setRepetida, {
          type: "password",
          autoComplete: "new-password",
          onKeyDown: (e) => e.key === "Enter" && criar(),
        }),
        erro && h("p", { style: { fontFamily: sans, fontSize: 14, color: t.rose, marginTop: 12 } }, erro),
        h(
          "button",
          { style: { ...S.cta, marginTop: 22, opacity: criando ? 0.6 : 1 }, disabled: criando, onClick: criar },
          criando ? "Criando…" : "Criar a conta e entrar",
        ),
      ),
    );
  }
  function Entrada({ primeiroAcesso, sessaoPerdida, aoEntrar, aoCriar }) {
    return primeiroAcesso ? h(PrimeiroAcesso, { aoCriar }) : h(Login, { sessaoPerdida, aoEntrar });
  }

  // app/telas/resumo.jsx
  function Resumo({ r }) {
    return h(
      "section",
      { style: S.resumo },
      h("div", { style: S.totalNum }, brl(r.total)),
      h(
        "div",
        { style: S.metaRow },
        h(Meta, { n: r.pecas, l: r.pecas === 1 ? "peça" : "peças" }),
        h(Meta, { n: r.clientes, l: r.clientes === 1 ? "cliente" : "clientes" }),
        h(Meta, { n: r.novas, l: r.novas === 1 ? "nova" : "novas", destaque: true }),
      ),
      r.pendente > 0 &&
        h("div", { style: S.pendBar }, h("span", { style: { fontWeight: 500 } }, brl(r.pendente)), " ainda a receber"),
    );
  }
  function Meta({ n, l, destaque }) {
    return h(
      "div",
      { style: { display: "flex", alignItems: "baseline", gap: 5 } },
      h(
        "span",
        {
          style: {
            fontFamily: display,
            fontSize: 22,
            color: destaque && n > 0 ? t.rose : t.ink,
          },
        },
        n,
      ),
      h("span", { style: { fontFamily: sans, fontSize: 14, color: t.inkSoft } }, l),
    );
  }
  function GrupoCliente({ g, dia, onToggle, onEdit, onExportar }) {
    const c = g.cliente;
    if (!c) return null;
    const nova = !c.preExistente && c.primeiraCompra === dia;
    return h(
      "article",
      { style: S.card },
      h(
        "div",
        { style: S.cardHead },
        h(
          "div",
          { style: { minWidth: 0 } },
          h("div", { style: S.cliNome }, c.nome),
          h("div", { style: S.cliSub }, g.vendas.length, " ", g.vendas.length === 1 ? "peça" : "peças"),
        ),
        h(
          "div",
          { style: { textAlign: "right", flexShrink: 0 } },
          h("div", { style: S.cliTotal }, brl(g.total)),
          h("span", { style: nova ? S.badgeNova : S.badgeAntiga }, nova ? "nova" : "antiga"),
        ),
      ),
      h(
        "div",
        null,
        g.vendas.map((v) =>
          h(
            "div",
            { key: v.id, style: S.row },
            h(
              "button",
              { style: S.rowMain, onClick: () => onEdit(v) },
              h("span", { style: S.codigo }, v.codigo || "—"),
              h("span", { style: S.peca }, v.peca),
              v.temFoto && h("span", { style: S.fotoTag }, "foto"),
              (v.fila || []).length > 0 && h("span", { style: S.filaTag }, "fila ", v.fila.length),
            ),
            h("span", { style: S.rowValor }, brl(v.valor)),
            h(
              "button",
              {
                style: v.pago ? S.chipPago : S.chipPend,
                onClick: () => onToggle(v.id, v.pago),
                "aria-label": v.pago ? "Marcar como pendente" : "Marcar como pago",
              },
              v.pago ? "pago" : "pendente",
            ),
          ),
        ),
      ),
      h("button", { style: S.cardExport, onClick: onExportar }, "Exportar lista dela"),
    );
  }

  // app/foto.js
  var LIMITE_DE_CARACTERES = 5e5;
  var TENTATIVAS = [
    { lado: 720, qualidade: 0.62 },
    { lado: 560, qualidade: 0.5 },
    { lado: 420, qualidade: 0.45 },
  ];
  function lerArquivo(arquivo) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onerror = () => reject(new Error("Não deu para ler a imagem"));
      leitor.onload = () => resolve(leitor.result);
      leitor.readAsDataURL(arquivo);
    });
  }
  function abrirImagem(endereco) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Arquivo não é uma imagem"));
      img.onload = () => resolve(img);
      img.src = endereco;
    });
  }
  function desenhar(img, lado, qualidade) {
    const escala = Math.min(1, lado / Math.max(img.width, img.height));
    const largura = Math.max(1, Math.round(img.width * escala));
    const altura = Math.max(1, Math.round(img.height * escala));
    const tela = document.createElement("canvas");
    tela.width = largura;
    tela.height = altura;
    tela.getContext("2d").drawImage(img, 0, 0, largura, altura);
    return tela.toDataURL("image/jpeg", qualidade);
  }
  async function comprimirImagem(arquivo) {
    const img = await abrirImagem(await lerArquivo(arquivo));
    let resultado = "";
    for (const { lado, qualidade } of TENTATIVAS) {
      resultado = desenhar(img, lado, qualidade);
      if (resultado.length <= LIMITE_DE_CARACTERES) return resultado;
    }
    throw new Error("A foto ficou grande demais");
  }

  // app/telas/venda.jsx
  function SheetVenda({
    mode,
    venda,
    clientes,
    vendasDoDia,
    onClose,
    onSave,
    onDelete,
    onPassar,
    onFlash,
    carregarFoto,
  }) {
    const editando = mode === "edit";
    const [clienteNome, setClienteNome] = useState("");
    const [clienteId, setClienteId] = useState(null);
    const [codigo, setCodigo] = useState("");
    const [peca, setPeca] = useState("");
    const [valor, setValor] = useState("");
    const [pago, setPago] = useState(false);
    const [fila, setFila] = useState([]);
    const [foto, setFoto] = useState(null);
    const [fotoMudou, setFotoMudou] = useState(false);
    const [fotoStatus, setFotoStatus] = useState("");
    const [filaNome, setFilaNome] = useState("");
    const [filaId, setFilaId] = useState(null);
    const [erro, setErro] = useState("");
    const [aberto, setAberto] = useState(false);
    const nomeRef = useRef(null);
    useEffect(() => {
      if (editando && venda) {
        const c = clientes.find((x) => x.id === venda.clienteId);
        setClienteNome(c ? c.nome : "");
        setClienteId(venda.clienteId);
        setCodigo(venda.codigo);
        setPeca(venda.peca);
        setValor(String(venda.valor).replace(".", ","));
        setPago(venda.pago);
        setFila(venda.fila || []);
        if (venda.temFoto && carregarFoto) {
          setFotoStatus("carregando");
          carregarFoto(venda.id)
            .then((img) => {
              setFoto(img || null);
              setFotoStatus("");
            })
            .catch(() => setFotoStatus(""));
        }
      } else {
        setTimeout(() => nomeRef.current && nomeRef.current.focus(), 120);
      }
    }, []);
    const filaSugestoes = useMemo(() => {
      const q = norm(filaNome);
      if (!q || filaId) return [];
      return clientes.filter((c) => norm(c.nome).includes(q) && c.id !== clienteId).slice(0, 4);
    }, [filaNome, filaId, clientes, clienteId]);
    const addFila = () => {
      const nome = filaNome.trim();
      if (!nome) return;
      if (norm(nome) === norm(clienteNome)) {
        setErro("Essa já é a cliente principal da peça.");
        return;
      }
      if (fila.some((f) => norm(f.nome) === norm(nome))) {
        setErro(`${nome} já está na fila.`);
        return;
      }
      setFila([...fila, { nome, clienteId: filaId }]);
      setFilaNome("");
      setFilaId(null);
      setErro("");
    };
    const sugestoes = useMemo(() => {
      const q = norm(clienteNome);
      if (!q || clienteId) return [];
      return clientes
        .filter((c) => norm(c.nome).includes(q))
        .slice(0, 5)
        .map((c) => ({
          ...c,
          compras: 0,
        }));
    }, [clienteNome, clienteId, clientes]);
    const exataExiste = clientes.some((c) => norm(c.nome) === norm(clienteNome));
    const salvar = async () => {
      if (!clienteNome.trim()) return setErro("Falta o nome da cliente.");
      if (!peca.trim()) return setErro("Falta o nome da peça.");
      if (parseMoney(valor) <= 0) return setErro("Falta o valor da peça.");
      const cod = codigo.trim();
      if (cod) {
        const conflito = vendasDoDia.find((v) => norm(v.codigo) === norm(cod) && (!editando || v.id !== venda.id));
        if (conflito) {
          return setErro(`O código ${cod} já foi usado hoje em "${conflito.peca}".`);
        }
      }
      await onSave(
        { clienteId, clienteNome, codigo, peca, valor, pago, fila, foto, fotoMudou },
        editando ? venda : null,
      );
      onFlash(editando ? "Peça atualizada" : "Peça lançada");
      onClose();
    };
    return h(
      "div",
      { style: S.overlay, onClick: onClose },
      h(
        "div",
        { style: S.sheet, onClick: (e) => e.stopPropagation() },
        h(
          "div",
          { style: S.sheetHead },
          h("span", { style: S.sheetTitle }, editando ? "Editar peça" : "Lançar peça"),
          h("button", { style: S.linkBtn, onClick: onClose }, "Fechar"),
        ),
        h(
          "div",
          { style: { padding: "4px 20px 20px", overflowY: "auto" } },
          editando &&
            (venda.fila || []).length > 0 &&
            h(
              "div",
              { style: S.passaBox },
              h(
                "div",
                { style: S.passaTxt },
                venda.fila.length === 1
                  ? `${venda.fila[0].nome} está esperando essa peça.`
                  : `${venda.fila.length} clientes esperando. A primeira é ${venda.fila[0].nome}.`,
              ),
              h(
                "button",
                {
                  style: S.passaBtn,
                  onClick: () => {
                    onPassar(venda);
                    onClose();
                  },
                },
                "Passar para ",
                venda.fila[0].nome,
              ),
            ),
          h("label", { style: S.label }, "Cliente"),
          h(
            "div",
            { style: { position: "relative" } },
            h("input", {
              ref: nomeRef,
              style: S.input,
              value: clienteNome,
              placeholder: "Comece a digitar o nome",
              onChange: (e) => {
                setClienteNome(e.target.value);
                setClienteId(null);
                setErro("");
                setAberto(true);
              },
              onFocus: () => setAberto(true),
            }),
            clienteId && h("span", { style: S.okMark }, "✓"),
          ),
          aberto &&
            sugestoes.length > 0 &&
            h(
              "div",
              { style: S.sugBox },
              sugestoes.map((c) =>
                h(
                  "button",
                  {
                    key: c.id,
                    style: S.sugItem,
                    onClick: () => {
                      setClienteNome(c.nome);
                      setClienteId(c.id);
                      setAberto(false);
                    },
                  },
                  h("span", null, c.nome),
                  h("span", { style: { color: t.inkFaint, fontSize: 13 } }, "já cadastrada"),
                ),
              ),
            ),
          clienteNome.trim() &&
            !clienteId &&
            !exataExiste &&
            h("p", { style: S.hintNova }, "Ninguém com esse nome no cadastro. Vai entrar como cliente nova."),
          h(
            "div",
            { style: { display: "flex", gap: 12, marginTop: 16 } },
            h(
              "div",
              { style: { width: 96, flexShrink: 0 } },
              h("label", { style: S.label }, "Código"),
              h("input", {
                style: S.input,
                value: codigo,
                inputMode: "numeric",
                placeholder: "12",
                onChange: (e) => {
                  setCodigo(e.target.value);
                  setErro("");
                },
              }),
            ),
            h(
              "div",
              { style: { flex: 1, minWidth: 0 } },
              h("label", { style: S.label }, "Peça"),
              h("input", {
                style: S.input,
                value: peca,
                placeholder: "Blusa jeans",
                onChange: (e) => {
                  setPeca(e.target.value);
                  setErro("");
                },
              }),
            ),
          ),
          h("label", { style: { ...S.label, marginTop: 16 } }, "Valor"),
          h("input", {
            style: { ...S.input, fontFamily: display, fontSize: 20 },
            value: valor,
            inputMode: "decimal",
            placeholder: "0,00",
            onChange: (e) => {
              setValor(e.target.value);
              setErro("");
            },
          }),
          h("label", { style: { ...S.label, marginTop: 16 } }, "Pagamento"),
          h(
            "div",
            { style: S.segmento },
            h(
              "button",
              {
                style: { ...S.segBtn, ...(!pago ? S.segOnPend : {}) },
                onClick: () => setPago(false),
              },
              "Pendente",
            ),
            h(
              "button",
              {
                style: { ...S.segBtn, ...(pago ? S.segOnPago : {}) },
                onClick: () => setPago(true),
              },
              "Pago",
            ),
          ),
          h(
            "label",
            { style: { ...S.label, marginTop: 18 } },
            "Foto da peça ",
            h("span", { style: { color: t.inkFaint } }, "· opcional"),
          ),
          fotoStatus === "carregando"
            ? h("div", { style: S.fotoVazia }, "Abrindo a foto…")
            : foto
              ? h(
                  "div",
                  null,
                  h("img", { src: foto, alt: peca || "Peça", style: S.fotoImg }),
                  h(
                    "button",
                    {
                      style: { ...S.ctaGhost, marginTop: 8 },
                      onClick: () => {
                        setFoto(null);
                        setFotoMudou(true);
                      },
                    },
                    "Remover foto",
                  ),
                )
              : h(
                  "label",
                  { style: S.fotoAdd },
                  fotoStatus === "comprimindo" ? "Preparando a foto…" : "Tirar ou escolher foto",
                  h("input", {
                    type: "file",
                    accept: "image/*",
                    style: { display: "none" },
                    onChange: async (e) => {
                      const arq = e.target.files && e.target.files[0];
                      if (!arq) return;
                      setFotoStatus("comprimindo");
                      try {
                        const menor = await comprimirImagem(arq);
                        setFoto(menor);
                        setFotoMudou(true);
                        setFotoStatus("");
                      } catch (err) {
                        setFotoStatus("");
                        setErro("Não deu para usar essa imagem. Tente outra.");
                      }
                      e.target.value = "";
                    },
                  }),
                ),
          h(
            "label",
            { style: { ...S.label, marginTop: 18 } },
            "Fila de espera ",
            h("span", { style: { color: t.inkFaint } }, "· opcional"),
          ),
          fila.length > 0 &&
            h(
              "div",
              { style: S.filaBox },
              fila.map((f, i) =>
                h(
                  "div",
                  { key: i, style: S.filaItem },
                  h("span", { style: S.filaPos }, i + 1),
                  h(
                    "span",
                    {
                      style: {
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      },
                    },
                    f.nome,
                  ),
                  h(
                    "button",
                    {
                      style: S.linkBtn,
                      onClick: () => setFila(fila.filter((_, j) => j !== i)),
                    },
                    "Tirar",
                  ),
                ),
              ),
            ),
          h(
            "div",
            { style: { display: "flex", gap: 8, marginTop: fila.length ? 8 : 0 } },
            h("input", {
              style: { ...S.input, flex: 1, minWidth: 0 },
              value: filaNome,
              placeholder: "Quem fica esperando",
              onChange: (e) => {
                setFilaNome(e.target.value);
                setFilaId(null);
                setErro("");
              },
              onKeyDown: (e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addFila();
                }
              },
            }),
            h(
              "button",
              {
                style: { ...S.addFila, opacity: filaNome.trim() ? 1 : 0.4 },
                disabled: !filaNome.trim(),
                onClick: addFila,
              },
              "Entrar na fila",
            ),
          ),
          filaSugestoes.length > 0 &&
            h(
              "div",
              { style: S.sugBox },
              filaSugestoes.map((c) =>
                h(
                  "button",
                  {
                    key: c.id,
                    style: S.sugItem,
                    onClick: () => {
                      setFilaNome(c.nome);
                      setFilaId(c.id);
                    },
                  },
                  h("span", null, c.nome),
                  h("span", { style: { color: t.inkFaint, fontSize: 13 } }, "já cadastrada"),
                ),
              ),
            ),
          erro && h("p", { style: S.erro }, erro),
          h(
            "button",
            { style: { ...S.cta, marginTop: 20 }, onClick: salvar },
            editando ? "Salvar alterações" : "Salvar",
          ),
          editando &&
            h(
              "button",
              {
                style: { ...S.ctaGhost, color: t.rose, borderColor: t.roseSoft },
                onClick: () => {
                  onDelete(venda.id);
                  onClose();
                },
              },
              "Excluir peça",
            ),
        ),
      ),
    );
  }

  // app/telas/clientes.jsx
  function Clientes({ data, dia, onSave, onFlash, onExport, onExportTudo, onMesclar, onEditarMensagem }) {
    const [busca, setBusca] = useState("");
    const [escopo, setEscopo] = useState("dia");
    const [form, setForm] = useState(null);
    const vazio = { total: 0, pecas: 0, totalDia: 0, pecasDia: 0, pendenteDia: 0, ultima: "", fila: 0 };
    const enriquecidas = useMemo(() => {
      const st = {};
      const pega = (id) => {
        if (!st[id]) st[id] = { ...vazio };
        return st[id];
      };
      data.vendas.forEach((v) => {
        const s = pega(v.clienteId);
        s.total += v.valor;
        s.pecas += 1;
        if (v.data > s.ultima) s.ultima = v.data;
        if (v.data === dia) {
          s.totalDia += v.valor;
          s.pecasDia += 1;
          if (!v.pago) s.pendenteDia += v.valor;
        }
        (v.fila || []).forEach((f) => {
          if (f.clienteId) pega(f.clienteId).fila += 1;
        });
      });
      const q = norm(busca);
      return data.clientes
        .map((c) => ({ ...c, ...(st[c.id] || vazio) }))
        .filter((c) => !q || norm(c.nome).includes(q))
        .filter((c) => (escopo === "dia" ? c.pecasDia > 0 : true))
        .sort((a, b) => (escopo === "dia" ? b.totalDia - a.totalDia : b.total - a.total || b.fila - a.fila));
    }, [data, busca, escopo, dia]);
    const ehNova = (c) => !c.preExistente && c.primeiraCompra === dia;
    const legenda = (c) => {
      if (escopo === "dia") return `${c.pecasDia} ${c.pecasDia === 1 ? "peça" : "peças"} nesse dia`;
      if (c.pecas > 0) return `${c.pecas} ${c.pecas === 1 ? "peça" : "peças"} no total`;
      if (c.fila > 0) return `esperando ${c.fila} ${c.fila === 1 ? "peça" : "peças"} na fila`;
      if (c.preExistente) return "cliente antiga, sem compras no app";
      return "sem compras ainda";
    };
    const somaDia = enriquecidas.reduce((s, c) => s + c.totalDia, 0);
    return h(
      Fragment,
      null,
      h(
        "div",
        { style: { padding: "14px 20px 0" } },
        h(
          "div",
          { style: S.segmento },
          h(
            "button",
            {
              style: { ...S.segBtn, ...(escopo === "dia" ? S.segOnEscopo : {}) },
              onClick: () => setEscopo("dia"),
            },
            "Do dia",
          ),
          h(
            "button",
            {
              style: { ...S.segBtn, ...(escopo === "sempre" ? S.segOnEscopo : {}) },
              onClick: () => setEscopo("sempre"),
            },
            "Todas",
          ),
        ),
        h(
          "div",
          { style: S.escopoInfo },
          escopo === "dia"
            ? `${dateLabel(dia)} · ${brl(somaDia)}`
            : `${data.clientes.length} ${data.clientes.length === 1 ? "cliente cadastrada" : "clientes cadastradas"}`,
        ),
        h("input", {
          style: S.input,
          value: busca,
          placeholder: "Buscar cliente",
          onChange: (e) => setBusca(e.target.value),
        }),
      ),
      h(
        "main",
        { style: { ...S.list, paddingTop: 14 } },
        enriquecidas.length === 0
          ? h(
              "div",
              { style: S.empty },
              h(
                "p",
                { style: S.emptyTitle },
                busca
                  ? "Nenhuma cliente com esse nome."
                  : escopo === "dia"
                    ? "Ninguém comprou nesse dia."
                    : "Nenhuma cliente cadastrada ainda.",
              ),
              h(
                "p",
                { style: S.emptyTxt },
                escopo === "dia"
                  ? "Troque o dia pelo calendário ou veja todas as clientes."
                  : "Cadastre aqui quem já comprava com você antes do app, para ela não entrar como nova.",
              ),
            )
          : enriquecidas.map((c) =>
              h(
                "button",
                { key: c.id, style: S.cliRow, onClick: () => setForm(c) },
                h(
                  "div",
                  { style: { minWidth: 0, textAlign: "left" } },
                  h(
                    "div",
                    { style: { display: "flex", alignItems: "center", gap: 7, minWidth: 0 } },
                    h("span", { style: S.cliNome }, c.nome),
                    escopo === "dia" &&
                      h(
                        "span",
                        { style: { ...(ehNova(c) ? S.badgeNova : S.badgeAntiga), marginTop: 0 } },
                        ehNova(c) ? "nova" : "antiga",
                      ),
                  ),
                  h("div", { style: S.cliSub }, legenda(c)),
                ),
                h(
                  "div",
                  { style: { textAlign: "right", flexShrink: 0 } },
                  h("div", { style: S.cliTotal }, brl(escopo === "dia" ? c.totalDia : c.total)),
                  escopo === "dia"
                    ? h("div", { style: S.cliSub }, brl(c.total), " no total")
                    : c.whatsapp
                      ? h("div", { style: S.cliSub }, c.whatsapp)
                      : null,
                ),
              ),
            ),
        escopo === "sempre" &&
          h(
            "button",
            { style: { ...S.ctaGhost, marginTop: 18 }, onClick: onExportTudo },
            "Exportar histórico completo",
          ),
        h(
          "button",
          {
            style: { ...S.ctaGhost, marginTop: escopo === "sempre" ? 10 : 18 },
            onClick: onEditarMensagem,
          },
          "Mensagem do WhatsApp",
        ),
        h("button", { style: { ...S.ctaGhost, marginTop: 10 }, onClick: onExport }, "Baixar backup dos dados"),
        h("div", { style: { height: 96 } }),
      ),
      h(
        "div",
        { style: S.dock },
        h(
          "button",
          {
            style: S.cta,
            onClick: () => setForm({ nome: "", whatsapp: "", preExistente: true }),
          },
          "Cadastrar cliente",
        ),
      ),
      form &&
        h(FormCliente, {
          c: form,
          clientes: data.clientes,
          onMesclar,
          onClose: () => setForm(null),
          onSave: async (x) => {
            await onSave(x);
            onFlash(x.id ? "Cliente atualizada" : "Cliente cadastrada");
            setForm(null);
          },
        }),
    );
  }
  function FormCliente({ c, clientes, onClose, onSave, onMesclar }) {
    const [nome, setNome] = useState(c.nome || "");
    const [wpp, setWpp] = useState(c.whatsapp || "");
    const [pre, setPre] = useState(c.preExistente !== false);
    const [mesclando, setMesclando] = useState(false);
    const [buscaM, setBuscaM] = useState("");
    const [alvo, setAlvo] = useState(null);
    const editando = !!c.id;
    const candidatas = useMemo(() => {
      if (!clientes) return [];
      const q = norm(buscaM);
      return clientes.filter((x) => x.id !== c.id && (!q || norm(x.nome).includes(q))).slice(0, 6);
    }, [clientes, buscaM, c.id]);
    if (mesclando) {
      return h(
        "div",
        { style: S.overlay, onClick: onClose },
        h(
          "div",
          { style: S.sheet, onClick: (e) => e.stopPropagation() },
          h(
            "div",
            { style: S.sheetHead },
            h("span", { style: S.sheetTitle }, "Juntar cadastros"),
            h("button", { style: S.linkBtn, onClick: () => setMesclando(false) }, "Voltar"),
          ),
          h(
            "div",
            { style: { padding: "4px 20px 20px", overflowY: "auto" } },
            alvo
              ? h(
                  Fragment,
                  null,
                  h(
                    "p",
                    { style: { fontSize: 15, color: t.ink, lineHeight: 1.55, margin: "4px 0 0" } },
                    "Tudo que está em ",
                    h("strong", null, c.nome),
                    " passa para",
                    " ",
                    h("strong", null, alvo.nome),
                    ": as compras, o histórico e as filas.",
                  ),
                  h(
                    "p",
                    { style: { fontSize: 14, color: t.inkSoft, lineHeight: 1.5, marginTop: 12 } },
                    "O cadastro ",
                    h("strong", null, c.nome),
                    " deixa de existir. O nome que fica é",
                    " ",
                    h("strong", null, alvo.nome),
                    ". Nenhuma venda é perdida, e isso não tem como desfazer.",
                  ),
                  h(
                    "button",
                    {
                      style: { ...S.cta, marginTop: 20 },
                      onClick: () => {
                        onMesclar(c.id, alvo.id);
                        onClose();
                      },
                    },
                    "Juntar em ",
                    alvo.nome,
                  ),
                  h("button", { style: S.ctaGhost, onClick: () => setAlvo(null) }, "Escolher outra"),
                )
              : h(
                  Fragment,
                  null,
                  h(
                    "p",
                    { style: { fontSize: 14, color: t.inkSoft, lineHeight: 1.5, margin: "4px 0 12px" } },
                    "Qual cadastro é a mesma pessoa que ",
                    c.nome,
                    "?",
                  ),
                  h("input", {
                    style: S.input,
                    value: buscaM,
                    placeholder: "Buscar cliente",
                    onChange: (e) => setBuscaM(e.target.value),
                  }),
                  h(
                    "div",
                    { style: { marginTop: 10 } },
                    candidatas.map((x) =>
                      h(
                        "button",
                        { key: x.id, style: S.cliRow, onClick: () => setAlvo(x) },
                        h("span", { style: S.cliNome }, x.nome),
                        h("span", { style: S.cliSub }, x.whatsapp || ""),
                      ),
                    ),
                    candidatas.length === 0 &&
                      h(
                        "p",
                        { style: { fontSize: 14, color: t.inkSoft, padding: "10px 2px" } },
                        "Nenhuma outra cliente com esse nome.",
                      ),
                  ),
                ),
          ),
        ),
      );
    }
    return h(
      "div",
      { style: S.overlay, onClick: onClose },
      h(
        "div",
        { style: S.sheet, onClick: (e) => e.stopPropagation() },
        h(
          "div",
          { style: S.sheetHead },
          h("span", { style: S.sheetTitle }, editando ? "Editar cliente" : "Cadastrar cliente"),
          h("button", { style: S.linkBtn, onClick: onClose }, "Fechar"),
        ),
        h(
          "div",
          { style: { padding: "4px 20px 20px", overflowY: "auto" } },
          editando &&
            (c.pecas > 0 || c.fila > 0) &&
            h(
              "div",
              { style: S.histBox },
              h("div", { style: { fontFamily: display, fontSize: 26, color: t.ink } }, brl(c.total)),
              h(
                "div",
                { style: { fontSize: 13, color: t.inkSoft, marginTop: 4, lineHeight: 1.5 } },
                c.pecas,
                " ",
                c.pecas === 1 ? "peça" : "peças",
                " desde sempre",
                c.ultima ? ` · última em ${dataCurta(c.ultima)}` : "",
                c.fila > 0 ? ` · ${c.fila} na fila` : "",
              ),
            ),
          h("label", { style: S.label }, "Nome"),
          h("input", { style: S.input, value: nome, onChange: (e) => setNome(e.target.value) }),
          h("label", { style: { ...S.label, marginTop: 16 } }, "WhatsApp"),
          h("input", {
            style: S.input,
            value: wpp,
            inputMode: "tel",
            placeholder: "(55) 99999-9999",
            onChange: (e) => setWpp(e.target.value),
          }),
          h(
            "p",
            { style: { fontSize: 13, color: t.inkSoft, margin: "7px 2px 0", lineHeight: 1.45 } },
            "Com o número salvo, a lista dela vai direto pra conversa dela.",
          ),
          h(
            "button",
            { style: S.checkRow, onClick: () => setPre(!pre) },
            h("span", { style: { ...S.checkBox, ...(pre ? S.checkOn : {}) } }, pre ? "✓" : ""),
            h(
              "span",
              { style: { textAlign: "left" } },
              "Já era minha cliente antes do app",
              h("span", { style: S.checkHelp }, "Marcada assim, ela nunca entra na contagem de novas."),
            ),
          ),
          h(
            "button",
            {
              style: { ...S.cta, marginTop: 20 },
              onClick: () =>
                nome.trim() && onSave({ ...c, nome: nome.trim(), whatsapp: wpp.trim(), preExistente: pre }),
            },
            editando ? "Salvar alterações" : "Cadastrar",
          ),
          editando &&
            onMesclar &&
            h("button", { style: S.ctaGhost, onClick: () => setMesclando(true) }, "Essa cliente está duplicada"),
        ),
      ),
    );
  }

  // app/telas/calendario.jsx
  var SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  function Calendario({ data, dia, onEscolher }) {
    const [ano, setAno] = useState(() => Number(dia.split("-")[0]));
    const [mes, setMes] = useState(() => Number(dia.split("-")[1]) - 1);
    const [sel, setSel] = useState(dia);
    const hoje = todayKey();
    const porDia = useMemo(() => {
      const m = {};
      data.vendas.forEach((v) => {
        if (!m[v.data]) m[v.data] = { total: 0, pecas: 0 };
        m[v.data].total += v.valor;
        m[v.data].pecas += 1;
      });
      return m;
    }, [data.vendas]);
    const chave = (d) => `${ano}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const celulas = useMemo(() => {
      const inicio = new Date(ano, mes, 1).getDay();
      const qtd = new Date(ano, mes + 1, 0).getDate();
      const arr = [];
      for (let i = 0; i < inicio; i++) arr.push(null);
      for (let d = 1; d <= qtd; d++) arr.push(d);
      return arr;
    }, [ano, mes]);
    const doMes = useMemo(() => {
      let total = 0;
      let lives = 0;
      Object.keys(porDia).forEach((k) => {
        const [y, m] = k.split("-").map(Number);
        if (y === ano && m === mes + 1) {
          total += porDia[k].total;
          lives += 1;
        }
      });
      return { total, lives };
    }, [porDia, ano, mes]);
    const resumoSel = useMemo(() => calcResumo(data.vendas, data.clientes, sel), [data.vendas, data.clientes, sel]);
    const andar = (n) => {
      const d = new Date(ano, mes + n, 1);
      setAno(d.getFullYear());
      setMes(d.getMonth());
    };
    const nomeMes = new Date(ano, mes, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
    return h(
      Fragment,
      null,
      h(
        "div",
        { style: S.mesRow },
        h("button", { style: S.arrow, onClick: () => andar(-1), "aria-label": "Mês anterior" }, "‹"),
        h(
          "div",
          { style: { textAlign: "center" } },
          h("div", { style: S.mesNome }, nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)),
          h(
            "div",
            { style: S.mesSub },
            doMes.lives === 0
              ? "nenhuma live"
              : `${doMes.lives} ${doMes.lives === 1 ? "live" : "lives"} · ${brl(doMes.total)}`,
          ),
        ),
        h("button", { style: S.arrow, onClick: () => andar(1), "aria-label": "Próximo mês" }, "›"),
      ),
      h(
        "div",
        { style: S.calGrid },
        SEMANA.map((s) => h("div", { key: s, style: S.calSemana }, s)),
        celulas.map((d, i) => {
          if (!d) return h("div", { key: `v${i}` });
          const k = chave(d);
          const teve = !!porDia[k];
          const futuro = k > hoje;
          const escolhido = k === sel;
          return h(
            "button",
            {
              key: k,
              disabled: futuro,
              onClick: () => setSel(k),
              style: {
                ...S.calDia,
                ...(teve ? S.calDiaLive : {}),
                ...(escolhido ? S.calDiaSel : {}),
                ...(futuro ? S.calDiaFuturo : {}),
                ...(k === hoje && !escolhido ? S.calDiaHoje : {}),
              },
            },
            d,
            teve && h("span", { style: { ...S.calPonto, background: escolhido ? "#fff" : t.rose } }),
          );
        }),
      ),
      h(
        "div",
        { style: S.calDetalhe },
        h("div", { style: S.calDataSel }, dateLabel(sel)),
        resumoSel.pecas > 0
          ? h(
              Fragment,
              null,
              h("div", { style: { ...S.totalNum, fontSize: 34, marginTop: 4 } }, brl(resumoSel.total)),
              h(
                "div",
                { style: S.metaRow },
                h(Meta, { n: resumoSel.pecas, l: resumoSel.pecas === 1 ? "peça" : "peças" }),
                h(Meta, { n: resumoSel.clientes, l: resumoSel.clientes === 1 ? "cliente" : "clientes" }),
                h(Meta, { n: resumoSel.novas, l: resumoSel.novas === 1 ? "nova" : "novas", destaque: true }),
              ),
              resumoSel.pendente > 0 &&
                h(
                  "div",
                  { style: S.pendBar },
                  h("span", { style: { fontWeight: 500 } }, brl(resumoSel.pendente)),
                  " ainda a receber",
                ),
              h("button", { style: { ...S.cta, marginTop: 16 }, onClick: () => onEscolher(sel) }, "Abrir esse dia"),
            )
          : h(
              Fragment,
              null,
              h(
                "p",
                { style: { fontSize: 15, color: t.inkSoft, margin: "8px 0 0", lineHeight: 1.5 } },
                "Nenhuma peça registrada nesse dia.",
              ),
              h(
                "button",
                { style: { ...S.ctaGhost, marginTop: 14 }, onClick: () => onEscolher(sel) },
                "Lançar peça nesse dia",
              ),
            ),
        h("div", { style: { height: 40 } }),
      ),
    );
  }

  // app/telas/exportar.jsx
  function SheetMensagem({ config, onClose, onSave, onFlash }) {
    const [abertura, setAbertura] = useState(config.abertura || "");
    const [fechamento, setFechamento] = useState(config.fechamento || "");
    return h(
      "div",
      { style: S.overlay, onClick: onClose },
      h(
        "div",
        { style: S.sheet, onClick: (e) => e.stopPropagation() },
        h(
          "div",
          { style: S.sheetHead },
          h("span", { style: S.sheetTitle }, "Mensagem do WhatsApp"),
          h("button", { style: S.linkBtn, onClick: onClose }, "Fechar"),
        ),
        h(
          "div",
          { style: { padding: "4px 20px 20px", overflowY: "auto" } },
          h(
            "p",
            { style: { fontSize: 14, color: t.inkSoft, lineHeight: 1.55, margin: "0 0 16px" } },
            "É o texto que acompanha a lista de peças de cada cliente. Escreva",
            " ",
            h("strong", null, "{nome}"),
            " para o nome dela, ",
            h("strong", null, "{data}"),
            " para a data da live, ",
            h("strong", null, "{total}"),
            " e ",
            h("strong", null, "{apagar}"),
            " para os valores.",
          ),
          h("label", { style: S.label }, "Antes da lista"),
          h("textarea", {
            value: abertura,
            onChange: (e) => setAbertura(e.target.value),
            style: { ...S.exportTxt, height: 170 },
          }),
          h("label", { style: { ...S.label, marginTop: 16 } }, "Depois da lista"),
          h("textarea", {
            value: fechamento,
            onChange: (e) => setFechamento(e.target.value),
            style: { ...S.exportTxt, height: 170 },
          }),
          h(
            "button",
            {
              style: { ...S.cta, marginTop: 18 },
              onClick: () => {
                onSave({ abertura, fechamento });
                onFlash("Mensagem salva");
                onClose();
              },
            },
            "Salvar mensagem",
          ),
          h(
            "button",
            {
              style: S.ctaGhost,
              onClick: () => {
                setAbertura(ABERTURA_PADRAO);
                setFechamento(FECHAMENTO_PADRAO);
              },
            },
            "Voltar ao texto original",
          ),
        ),
      ),
    );
  }
  function SheetExport({ dados, onClose, onFlash }) {
    const [i, setI] = useState(0);
    const [baixou, setBaixou] = useState("");
    const op = dados.opcoes[i];
    const copiar2 = async () => {
      try {
        await navigator.clipboard.writeText(op.texto);
        onFlash("Copiado, é só colar no WhatsApp");
      } catch (e) {
        onFlash("Selecione o texto e copie na mão");
      }
    };
    const baixar = () => {
      try {
        const blob = op.gerarArquivo
          ? op.gerarArquivo()
          : new Blob(["\uFEFF" + op.csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = op.arquivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1e3);
        setBaixou("ok");
      } catch (e) {
        setBaixou("erro");
      }
    };
    const numeroLimpo = String(dados.whatsapp || "").replace(/\D/g, "");
    const temNumero = numeroLimpo.length >= 10;
    const enviar = () => {
      const completo = numeroLimpo.length <= 11 ? `55${numeroLimpo}` : numeroLimpo;
      const url = `https://wa.me/${completo}?text=${encodeURIComponent(op.texto)}`;
      try {
        const aba = window.open(url, "_blank");
        if (aba) aba.opener = null;
        else setBaixou("bloqueado");
      } catch (e) {
        setBaixou("bloqueado");
      }
    };
    return h(
      "div",
      { style: S.overlay, onClick: onClose },
      h(
        "div",
        { style: S.sheet, onClick: (e) => e.stopPropagation() },
        h(
          "div",
          { style: S.sheetHead },
          h("span", { style: S.sheetTitle }, dados.titulo),
          h("button", { style: S.linkBtn, onClick: onClose }, "Fechar"),
        ),
        h(
          "div",
          { style: { padding: "4px 20px 20px", overflowY: "auto" } },
          dados.opcoes.length > 1 &&
            h(
              "div",
              { style: { ...S.segmento, marginBottom: 12 } },
              dados.opcoes.map((o, n) =>
                h(
                  "button",
                  {
                    key: o.rotulo,
                    style: { ...S.segBtn, ...(n === i ? S.segOnEscopo : {}) },
                    onClick: () => {
                      setI(n);
                      setBaixou("");
                    },
                  },
                  o.rotulo,
                ),
              ),
            ),
          h("textarea", {
            readOnly: true,
            value: op.texto,
            onFocus: (e) => e.target.select(),
            style: S.exportTxt,
          }),
          temNumero
            ? h(
                Fragment,
                null,
                h(
                  "button",
                  { style: { ...S.cta, marginTop: 14 }, onClick: enviar },
                  "Enviar para ",
                  dados.titulo.split(" ")[0],
                  " no WhatsApp",
                ),
                h("button", { style: S.ctaGhost, onClick: copiar2 }, "Só copiar o texto"),
              )
            : h("button", { style: { ...S.cta, marginTop: 14 }, onClick: copiar2 }, "Copiar para o WhatsApp"),
          h("button", { style: S.ctaGhost, onClick: baixar }, op.rotuloArquivo || "Baixar planilha (.csv)"),
          dados.whatsapp !== void 0 &&
            !temNumero &&
            h(
              "p",
              { style: { fontSize: 13, color: t.inkSoft, marginTop: 12, lineHeight: 1.5 } },
              "Salve o WhatsApp dela no cadastro e o envio passa a ser direto, sem copiar e colar.",
            ),
          baixou === "bloqueado" &&
            h(
              "p",
              { style: S.erro },
              'O navegador bloqueou a abertura do WhatsApp aqui dentro. Use "Só copiar o texto" — o envio direto funciona quando a ferramenta estiver publicada num link próprio.',
            ),
          baixou === "erro" &&
            h(
              "p",
              { style: S.erro },
              "O download foi bloqueado aqui. Use o botão de copiar — a planilha vai funcionar quando a ferramenta estiver publicada num link próprio.",
            ),
          baixou === "ok" &&
            h(
              "p",
              { style: { fontSize: 13, color: t.inkSoft, marginTop: 12, lineHeight: 1.5 } },
              "Se o arquivo não aparecer nos downloads, use o botão de copiar.",
            ),
        ),
      ),
    );
  }
  function SheetBackup({ texto: texto2, onClose, onFlash }) {
    const copiar2 = async () => {
      try {
        await navigator.clipboard.writeText(texto2);
        onFlash("Backup copiado");
      } catch (e) {
        onFlash("Selecione o texto e copie na mão");
      }
    };
    const baixar = () => {
      try {
        const url = URL.createObjectURL(new Blob([texto2], { type: "application/json;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `backup-delas-pra-elas-${todayKey()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1e3);
      } catch (e) {
        onFlash("Não deu para baixar o arquivo. Use o botão de copiar.");
      }
    };
    return h(
      "div",
      { style: S.overlay, onClick: onClose },
      h(
        "div",
        { style: S.sheet, onClick: (e) => e.stopPropagation() },
        h(
          "div",
          { style: S.sheetHead },
          h("span", { style: S.sheetTitle }, "Backup dos dados"),
          h("button", { style: S.linkBtn, onClick: onClose }, "Fechar"),
        ),
        h(
          "div",
          { style: { padding: "4px 20px 20px" } },
          h(
            "p",
            { style: { fontSize: 14, color: t.inkSoft, lineHeight: 1.5, margin: "0 0 14px" } },
            "Baixe o arquivo (ou copie o texto e cole num bloco de notas). É a cópia de segurança de tudo que está registrado, menos as fotos das peças.",
          ),
          h("textarea", {
            readOnly: true,
            value: texto2,
            onFocus: (e) => e.target.select(),
            style: {
              width: "100%",
              height: 180,
              background: t.surface,
              color: t.inkSoft,
              border: `1px solid ${t.line}`,
              borderRadius: 9,
              padding: 12,
              fontSize: 12,
              fontFamily: "monospace",
              resize: "none",
            },
          }),
          h("button", { style: { ...S.cta, marginTop: 14 }, onClick: baixar }, "Baixar arquivo do backup"),
          h("button", { style: S.ctaGhost, onClick: copiar2 }, "Copiar o texto"),
        ),
      ),
    );
  }

  // app/telas/folha.jsx
  function Folha({ titulo, aoFechar, rotuloFechar = "Fechar", children }) {
    return h(
      "div",
      { style: S.overlay, onClick: aoFechar },
      h(
        "div",
        {
          style: S.sheet,
          onClick: (e) => e.stopPropagation(),
          role: "dialog",
          "aria-modal": "true",
          "aria-label": titulo,
        },
        h(
          "div",
          { style: S.sheetHead },
          h("span", { style: S.sheetTitle }, titulo),
          h("button", { style: S.linkBtn, onClick: aoFechar }, rotuloFechar),
        ),
        h("div", { style: { padding: "4px 20px 20px", overflowY: "auto" } }, children),
      ),
    );
  }

  // app/telas/conta.jsx
  var SENHA_MIN = 8;
  var plural = (n, um, varios) => `${n.toLocaleString("pt-BR")} ${n === 1 ? um : varios}`;
  function SheetConta({ usuario, pendentes, aoFechar, aoAbrir, aoSair }) {
    const [confirmando, setConfirmando] = useState(false);
    const [saindo, setSaindo] = useState(false);
    const [erro, setErro] = useState("");
    const dona = usuario.papel === "dono";
    const sair = async () => {
      setSaindo(true);
      setErro("");
      try {
        await aoSair();
      } catch (e) {
        setErro(
          e instanceof SemRede
            ? "Sem internet: não dá para sair agora. Tente de novo quando a conexão voltar."
            : textoDoErro(e),
        );
        setSaindo(false);
        setConfirmando(false);
      }
    };
    return h(
      Folha,
      { titulo: "Minha conta", aoFechar },
      h(
        "p",
        { style: S.nota },
        "Você entrou como ",
        h("strong", null, usuario.email),
        dona ? " (dona do brechó)." : ".",
      ),
      h("button", { style: S.ctaGhost, onClick: () => aoAbrir("senha") }, "Trocar minha senha"),
      dona &&
        h(
          Fragment,
          null,
          h("button", { style: S.ctaGhost, onClick: () => aoAbrir("equipe") }, "Equipe do app"),
          h("a", { style: S.botaoLink, href: "/fretes.html" }, "Abrir Fretes"),
          h("button", { style: S.ctaGhost, onClick: () => aoAbrir("restaurar") }, "Restaurar backup antigo"),
        ),
      confirmando
        ? h(
            "div",
            { style: { ...S.histBox, marginTop: 18 } },
            h(
              "div",
              { style: { fontSize: 14, color: t.ink, lineHeight: 1.5 } },
              plural(pendentes, "alteração ainda não foi enviada", "alterações ainda não foram enviadas"),
              ". Se você sair agora, elas serão perdidas.",
            ),
            h(
              "button",
              { style: { ...S.cta, marginTop: 12 }, disabled: saindo, onClick: sair },
              saindo ? "Saindo…" : "Sair mesmo assim",
            ),
            h("button", { style: S.ctaGhost, onClick: () => setConfirmando(false) }, "Voltar"),
          )
        : h(
            "button",
            {
              style: {
                ...S.ctaGhost,
                marginTop: 18,
                color: t.rose,
                borderColor: t.roseSoft,
                opacity: saindo ? 0.6 : 1,
              },
              disabled: saindo,
              onClick: () => (pendentes > 0 ? setConfirmando(true) : sair()),
            },
            saindo ? "Saindo…" : "Sair",
          ),
      erro && h("p", { style: S.erro }, erro),
    );
  }
  function SheetTrocarSenha({ aoFechar, aoTrocar, aoAvisar }) {
    const [atual, setAtual] = useState("");
    const [nova, setNova] = useState("");
    const [repetida, setRepetida] = useState("");
    const [erro, setErro] = useState("");
    const [salvando, setSalvando] = useState(false);
    const salvar = async () => {
      if (!atual || !nova) return setErro("Preencha a senha atual e a nova.");
      if (nova.length < SENHA_MIN) return setErro(`A senha nova precisa ter pelo menos ${SENHA_MIN} caracteres.`);
      if (nova !== repetida) return setErro("As duas senhas novas não são iguais.");
      setSalvando(true);
      setErro("");
      try {
        await aoTrocar(atual, nova);
        aoAvisar("Senha trocada");
        aoFechar();
      } catch (e) {
        setErro(textoDoErro(e));
        setSalvando(false);
      }
    };
    const campo = (rotulo, valor, mudar, completar, extra = {}) =>
      h(
        Fragment,
        null,
        h("label", { style: { ...S.label, marginTop: 14 } }, rotulo),
        h("input", {
          style: S.input,
          type: "password",
          value: valor,
          autoComplete: completar,
          onChange: (e) => {
            mudar(e.target.value);
            setErro("");
          },
          ...extra,
        }),
      );
    return h(
      Folha,
      { titulo: "Trocar minha senha", aoFechar },
      campo("Senha atual", atual, setAtual, "current-password"),
      campo(`Senha nova (mínimo ${SENHA_MIN} caracteres)`, nova, setNova, "new-password"),
      campo("Repita a senha nova", repetida, setRepetida, "new-password", {
        onKeyDown: (e) => e.key === "Enter" && salvar(),
      }),
      erro && h("p", { style: S.erro }, erro),
      h(
        "button",
        { style: { ...S.cta, marginTop: 20, opacity: salvando ? 0.6 : 1 }, disabled: salvando, onClick: salvar },
        salvando ? "Salvando…" : "Trocar a senha",
      ),
    );
  }
  function SheetEquipe({ aoFechar, equipe, meuEmail, aoAvisar }) {
    const [pessoas, setPessoas] = useState(null);
    const [erro, setErro] = useState("");
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [trabalhando, setTrabalhando] = useState(false);
    const [mexendo, setMexendo] = useState(null);
    const [novaSenha, setNovaSenha] = useState("");
    const carregar = async () => {
      try {
        setPessoas(await equipe.listar());
      } catch (e) {
        setErro(textoDoErro(e));
      }
    };
    useEffect(() => {
      carregar();
    }, []);
    const fazer = async (acao, aviso) => {
      setTrabalhando(true);
      setErro("");
      try {
        await acao();
        aoAvisar(aviso);
        await carregar();
        return true;
      } catch (e) {
        setErro(textoDoErro(e));
        return false;
      } finally {
        setTrabalhando(false);
      }
    };
    const adicionar = async () => {
      if (!email.trim() || !senha) return setErro("Preencha o e-mail e a senha da pessoa.");
      if (senha.length < SENHA_MIN) return setErro(`A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`);
      if (await fazer(() => equipe.adicionar(email.trim(), senha), "Pessoa adicionada")) {
        setEmail("");
        setSenha("");
      }
    };
    const trocarSenha = async (pessoa) => {
      if (novaSenha.length < SENHA_MIN) return setErro(`A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`);
      if (await fazer(() => equipe.redefinirSenha(pessoa, novaSenha), "Senha trocada. Ela precisa entrar de novo.")) {
        setMexendo(null);
        setNovaSenha("");
      }
    };
    const remover = async (pessoa) => {
      if (await fazer(() => equipe.remover(pessoa), "Pessoa removida")) setMexendo(null);
    };
    return h(
      Folha,
      { titulo: "Equipe do app", aoFechar },
      h(
        "p",
        { style: S.nota },
        "Quem está aqui entra no app da live com o próprio e-mail e senha. Só a dona cadastra e remove pessoas.",
      ),
      pessoas === null && !erro && h("p", { style: S.nota }, "Abrindo a lista…"),
      (pessoas || []).map((p) => {
        const eu = p.email === meuEmail;
        const aberta = mexendo && mexendo.email === p.email;
        return h(
          "div",
          { key: p.email, style: { borderBottom: `1px solid ${t.line}` } },
          h(
            "div",
            { style: { ...S.pessoa, borderBottom: "none" } },
            h("span", { style: S.pessoaEmail }, p.email, eu ? " (você)" : ""),
            h("span", { style: S.pessoaPapel }, p.papel === "dono" ? "dona" : "equipe"),
            p.papel !== "dono" &&
              !aberta &&
              h(
                Fragment,
                null,
                h(
                  "button",
                  {
                    style: S.linkAcao,
                    onClick: () => {
                      setMexendo({ email: p.email, acao: "senha" });
                      setNovaSenha("");
                      setErro("");
                    },
                  },
                  "Nova senha",
                ),
                h(
                  "button",
                  {
                    style: S.linkAcao,
                    onClick: () => {
                      setMexendo({ email: p.email, acao: "remover" });
                      setErro("");
                    },
                  },
                  "Remover",
                ),
              ),
          ),
          aberta &&
            mexendo.acao === "senha" &&
            h(
              "div",
              { style: { paddingBottom: 14 } },
              h("input", {
                style: S.input,
                type: "password",
                autoComplete: "new-password",
                value: novaSenha,
                placeholder: `Senha nova (mínimo ${SENHA_MIN} caracteres)`,
                onChange: (e) => {
                  setNovaSenha(e.target.value);
                  setErro("");
                },
              }),
              h(
                "button",
                { style: { ...S.cta, marginTop: 10 }, disabled: trabalhando, onClick: () => trocarSenha(p.email) },
                "Salvar a senha nova",
              ),
              h("button", { style: S.ctaGhost, onClick: () => setMexendo(null) }, "Cancelar"),
            ),
          aberta &&
            mexendo.acao === "remover" &&
            h(
              "div",
              { style: { paddingBottom: 14 } },
              h(
                "p",
                { style: { ...S.nota, margin: "0 0 10px" } },
                "Remover ",
                p.email,
                "? A pessoa perde o acesso na hora.",
              ),
              h(
                "button",
                { style: { ...S.cta, background: t.rose }, disabled: trabalhando, onClick: () => remover(p.email) },
                "Remover",
              ),
              h("button", { style: S.ctaGhost, onClick: () => setMexendo(null) }, "Cancelar"),
            ),
        );
      }),
      h("label", { style: { ...S.label, marginTop: 22 } }, "Adicionar uma pessoa"),
      h("input", {
        style: S.input,
        type: "email",
        inputMode: "email",
        autoCapitalize: "none",
        autoCorrect: "off",
        autoComplete: "off",
        value: email,
        placeholder: "E-mail dela",
        onChange: (e) => {
          setEmail(e.target.value);
          setErro("");
        },
      }),
      h("input", {
        style: { ...S.input, marginTop: 10 },
        type: "password",
        autoComplete: "new-password",
        value: senha,
        placeholder: `Senha para ela (mínimo ${SENHA_MIN} caracteres)`,
        onChange: (e) => {
          setSenha(e.target.value);
          setErro("");
        },
        onKeyDown: (e) => e.key === "Enter" && adicionar(),
      }),
      h(
        "p",
        { style: S.notaPequena },
        "Combine a senha com ela pessoalmente. Depois ela pode trocar em “Minha conta”.",
      ),
      erro && h("p", { style: S.erro }, erro),
      h(
        "button",
        {
          style: { ...S.cta, marginTop: 16, opacity: trabalhando ? 0.6 : 1 },
          disabled: trabalhando,
          onClick: adicionar,
        },
        "Adicionar",
      ),
    );
  }
  function SheetRestaurar({ aoFechar, aoImportar, aoAvisar }) {
    const area = useRef(null);
    const [arquivo, setArquivo] = useState(null);
    const [conferido, setConferido] = useState(null);
    const [erro, setErro] = useState("");
    const [progresso, setProgresso] = useState(null);
    const [pronto, setPronto] = useState("");
    const escolher = async (e) => {
      const arq = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!arq) return;
      setErro("");
      setConferido(null);
      if (arq.size > 20 * 1024 * 1024) return setErro("Esse arquivo é grande demais para ser um backup do app.");
      try {
        setArquivo({ nome: arq.name, texto: await arq.text() });
      } catch {
        setErro("Não consegui ler esse arquivo.");
      }
    };
    const conferir = () => {
      setErro("");
      setPronto("");
      try {
        setConferido(lerBackup(arquivo ? arquivo.texto : area.current.value, todayKey()));
      } catch (e) {
        setConferido(null);
        setErro(e.message);
      }
    };
    const restaurar = async () => {
      setErro("");
      setProgresso({ feito: 0, total: 1 });
      try {
        await aoImportar(conferido, (feito, total) => setProgresso({ feito, total }));
        setPronto(
          `Pronto: ${plural(conferido.clientes.length, "cliente", "clientes")} e ${plural(conferido.vendas.length, "venda", "vendas")} restauradas.`,
        );
        aoAvisar("Backup restaurado");
        setConferido(null);
        setArquivo(null);
        if (area.current) area.current.value = "";
      } catch (e) {
        setErro(
          `O envio parou: ${textoDoErro(e)} O que já foi enviado fica; você pode restaurar de novo sem duplicar nada.`,
        );
      }
      setProgresso(null);
    };
    return h(
      Folha,
      { titulo: "Restaurar backup antigo", aoFechar },
      h(
        "p",
        { style: S.nota },
        "Use o arquivo (ou o texto) que o app antigo gerou em “Baixar backup dos dados”. As fotos das peças não vêm no backup antigo. Se uma cliente ou venda do backup já existir aqui, a do backup substitui a que está aqui.",
      ),
      h(
        "label",
        { style: S.fotoAdd },
        arquivo ? `Arquivo: ${arquivo.nome}` : "Escolher o arquivo do backup",
        h("input", {
          type: "file",
          accept: ".json,.txt,application/json,text/plain",
          style: { display: "none" },
          onChange: escolher,
        }),
      ),
      !arquivo &&
        h(
          Fragment,
          null,
          h("label", { style: { ...S.label, marginTop: 16 } }, "Ou cole o texto do backup aqui"),
          h("textarea", {
            ref: area,
            style: { ...S.exportTxt, height: 120, fontFamily: "monospace", fontSize: 12 },
            placeholder: "{ ... }",
            onInput: () => setConferido(null),
          }),
        ),
      conferido &&
        h(
          "div",
          { style: { ...S.histBox, marginTop: 16 } },
          h(
            "div",
            { style: { fontSize: 15, color: t.ink, lineHeight: 1.5 } },
            "Encontrei ",
            plural(conferido.clientes.length, "cliente", "clientes"),
            " e ",
            plural(conferido.vendas.length, "venda", "vendas"),
            ".",
            conferido.ignorados > 0 &&
              ` ${plural(conferido.ignorados, "item foi ignorado", "itens foram ignorados")} por estar incompleto.`,
          ),
          conferido.avisos.length > 0 &&
            h(
              "div",
              { style: { fontSize: 13, color: t.inkSoft, marginTop: 6 } },
              "Ex.: ",
              conferido.avisos.join("; "),
              ".",
            ),
        ),
      erro && h("p", { style: S.erro }, erro),
      pronto && h("p", { style: S.ok }, pronto),
      progresso &&
        h(
          "p",
          { style: S.notaPequena },
          "Enviando ",
          progresso.feito.toLocaleString("pt-BR"),
          " de ",
          progresso.total.toLocaleString("pt-BR"),
          "…",
        ),
      conferido
        ? h(
            "button",
            {
              style: { ...S.cta, marginTop: 18, opacity: progresso ? 0.6 : 1 },
              disabled: Boolean(progresso),
              onClick: restaurar,
            },
            progresso ? "Restaurando…" : "Restaurar agora",
          )
        : h("button", { style: { ...S.cta, marginTop: 18 }, onClick: conferir }, "Conferir o backup"),
    );
  }

  // app/app.jsx
  var alteracoes = (n) => `${n} ${n === 1 ? "alteração guardada" : "alterações guardadas"}`;
  function FaixaDeConexao({ conexao, pendentes }) {
    if (conexao === "ok" && !pendentes) return null;
    let texto2;
    if (conexao === "sem-rede") {
      texto2 = pendentes
        ? `Sem internet. ${alteracoes(pendentes)} no celular; ${pendentes === 1 ? "sobe sozinha" : "sobem sozinhas"} quando a conexão voltar.`
        : "Sem internet. O que você lançar fica guardado no celular e sobe sozinho quando a conexão voltar.";
    } else if (conexao === "erro") {
      texto2 = `O servidor não respondeu agora. Tentando de novo. ${pendentes ? `${alteracoes(pendentes)} no celular.` : ""}`;
    } else {
      texto2 = `Enviando ${pendentes} ${pendentes === 1 ? "alteração" : "alterações"}…`;
    }
    return h("div", { style: { ...S.faixa, ...(conexao === "erro" ? S.faixaErro : {}) }, role: "status" }, texto2);
  }
  function TelaSimples({ children }) {
    return h(
      "div",
      { style: { ...S.screen, alignItems: "center", justifyContent: "center", display: "flex", padding: 24 } },
      h(
        "div",
        { style: { textAlign: "center", fontFamily: sans, color: t.inkSoft, maxWidth: 340, lineHeight: 1.5 } },
        children,
      ),
    );
  }
  function resolverCliente(clientes, clienteId, nome) {
    if (clienteId) return { id: clienteId, nova: null };
    const existente = clientes.find((c) => norm(c.nome) === norm(nome));
    if (existente) return { id: existente.id, nova: null };
    const id = novoId();
    return { id, nova: { id, nome: (nome || "").trim(), whatsapp: "", preExistente: false, criadaEm: todayKey() } };
  }
  var gravarNova = ({ id, ...dados }) => ({ col: "clientes", id, op: "set", dados });
  var DIA_VALIDO = /^\d{4}-\d{2}-\d{2}$/;
  function useEstado(cliente) {
    const [estado, setEstado] = useState(cliente.estado());
    useEffect(() => {
      setEstado(cliente.estado());
      return cliente.assinar(setEstado);
    }, [cliente]);
    return estado;
  }
  function App({ cliente }) {
    const estado = useEstado(cliente);
    const [tab, setTab] = useState("hoje");
    const [dia, setDia] = useState(todayKey());
    const [sheet, setSheet] = useState(null);
    const [backup, setBackup] = useState(null);
    const [exportar, setExportar] = useState(null);
    const [msg, setMsg] = useState(false);
    const [conta, setConta] = useState(null);
    const [toast, setToast] = useState("");
    const relogioDoAviso = useRef(null);
    const flash = (texto2) => {
      setToast(texto2);
      clearTimeout(relogioDoAviso.current);
      relogioDoAviso.current = setTimeout(() => setToast(""), Math.max(2200, Math.min(7e3, texto2.length * 70)));
    };
    const numeroDoAviso = estado.aviso ? estado.aviso.n : 0;
    useEffect(() => {
      if (estado.aviso) flash(estado.aviso.texto);
    }, [numeroDoAviso]);
    useEffect(() => {
      const marcar = () => cliente.marcarAtividade();
      window.addEventListener("pointerdown", marcar, { passive: true });
      window.addEventListener("keydown", marcar);
      return () => {
        window.removeEventListener("pointerdown", marcar);
        window.removeEventListener("keydown", marcar);
      };
    }, [cliente]);
    const config = useMemo(() => ({ ...CONFIG_PADRAO, ...estado.config }), [estado.config]);
    const data = useMemo(() => {
      const primeira = {};
      estado.vendas.forEach((v) => {
        if (!primeira[v.clienteId] || v.data < primeira[v.clienteId]) primeira[v.clienteId] = v.data;
      });
      return {
        clientes: estado.clientes.map((c) => ({ ...c, primeiraCompra: primeira[c.id] || null })),
        vendas: estado.vendas,
        config,
      };
    }, [estado.clientes, estado.vendas, config]);
    const avisarErro = (e) => {
      console.error(e);
      flash("Não deu para salvar. Tente de novo.");
    };
    const gravar = async (ops) => {
      try {
        await cliente.gravar(ops);
        return true;
      } catch (e) {
        avisarErro(e);
        return false;
      }
    };
    const vendasDoDia = useMemo(() => data.vendas.filter((v) => v.data === dia), [data.vendas, dia]);
    const clientePorId = useMemo(() => {
      const m = {};
      data.clientes.forEach((c) => (m[c.id] = c));
      return m;
    }, [data.clientes]);
    const resumo = useMemo(() => calcResumo(data.vendas, data.clientes, dia), [data.vendas, data.clientes, dia]);
    const grupos = useMemo(() => {
      const map = /* @__PURE__ */ new Map();
      vendasDoDia.forEach((v) => {
        if (!map.has(v.clienteId)) map.set(v.clienteId, []);
        map.get(v.clienteId).push(v);
      });
      return [...map.entries()]
        .map(([id, vs]) => ({
          cliente: clientePorId[id],
          vendas: [...vs].sort((a, b) => b.criadaEm - a.criadaEm),
          total: vs.reduce((s, v) => s + v.valor, 0),
          ultima: Math.max(...vs.map((v) => v.criadaEm)),
        }))
        .sort((a, b) => b.ultima - a.ultima);
    }, [vendasDoDia, clientePorId]);
    const salvarVenda = async (form, vendaEditada) => {
      const novas = [];
      const lista = [...data.clientes];
      const r = resolverCliente(lista, form.clienteId, form.clienteNome);
      if (r.nova) {
        novas.push(r.nova);
        lista.push(r.nova);
      }
      const fila = (form.fila || []).map((f) => {
        const rf = resolverCliente(lista, f.clienteId, f.nome);
        if (rf.nova) {
          novas.push(rf.nova);
          lista.push(rf.nova);
        }
        const c = lista.find((x) => x.id === rf.id);
        return { nome: c ? c.nome : f.nome, clienteId: rf.id };
      });
      const id = vendaEditada ? vendaEditada.id : novoId();
      let temFoto = vendaEditada ? !!vendaEditada.temFoto : false;
      const ops = [];
      if (form.fotoMudou) {
        if (form.foto) {
          ops.push({ col: "fotos", id, op: "set", dados: { imagem: form.foto } });
          temFoto = true;
        } else {
          ops.push({ col: "fotos", id, op: "apagar" });
          temFoto = false;
        }
      }
      novas.forEach((c) => ops.push(gravarNova(c)));
      ops.push({
        col: "vendas",
        id,
        op: "set",
        dados: {
          data: vendaEditada ? vendaEditada.data : dia,
          criadaEm: vendaEditada ? vendaEditada.criadaEm : Date.now(),
          clienteId: r.id,
          codigo: form.codigo.trim(),
          peca: form.peca.trim(),
          valor: parseMoney(form.valor),
          pago: form.pago,
          fila,
          temFoto,
        },
      });
      await gravar(ops);
      return r.id;
    };
    const passarFila = async (venda) => {
      const fila = venda.fila || [];
      if (fila.length === 0) return;
      const [proxima, ...resto] = fila;
      const r = resolverCliente(data.clientes, proxima.clienteId, proxima.nome);
      const ops = [];
      if (r.nova) ops.push(gravarNova(r.nova));
      ops.push({ col: "vendas", id: venda.id, op: "mesclar", dados: { clienteId: r.id, fila: resto, pago: false } });
      if (await gravar(ops)) flash(`Peça passou para ${proxima.nome}`);
    };
    const excluirVenda = async (id) => {
      if (
        await gravar([
          { col: "vendas", id, op: "apagar" },
          { col: "fotos", id, op: "apagar" },
        ])
      )
        flash("Peça excluída");
    };
    const mesclarClientes = async (deId, paraId) => {
      const de = data.clientes.find((c) => c.id === deId);
      const para = data.clientes.find((c) => c.id === paraId);
      if (!de || !para) return;
      const ops = [];
      data.vendas.forEach((v) => {
        const naFila = (v.fila || []).some((f) => f.clienteId === deId);
        if (v.clienteId !== deId && !naFila) return;
        const fila = [];
        (v.fila || []).forEach((f) => {
          const id = f.clienteId === deId ? paraId : f.clienteId;
          if (fila.some((x) => x.clienteId === id)) return;
          fila.push({ nome: id === paraId ? para.nome : f.nome, clienteId: id });
        });
        ops.push({
          col: "vendas",
          id: v.id,
          op: "mesclar",
          dados: { clienteId: v.clienteId === deId ? paraId : v.clienteId, fila },
        });
      });
      ops.push({
        col: "clientes",
        id: paraId,
        op: "mesclar",
        dados: { whatsapp: para.whatsapp || de.whatsapp || "", preExistente: !!(para.preExistente || de.preExistente) },
      });
      ops.push({ col: "clientes", id: deId, op: "apagar" });
      if (await gravar(ops)) flash(`${de.nome} foi juntada em ${para.nome}`);
    };
    const togglePago = (id, pago) => gravar([{ col: "vendas", id, op: "mesclar", dados: { pago: !pago } }]);
    const carregarFoto = (idVenda) => cliente.foto(idVenda);
    const exportarCliente = (g) => {
      const c = g.cliente;
      const cfg = data.config || CONFIG_PADRAO;
      const ordem = [...g.vendas].reverse();
      const pagoDia = ordem.filter((v) => v.pago).reduce((s, v) => s + v.valor, 0);
      const vals = {
        nome: c.nome,
        data: dataCurta(dia),
        total: brl(g.total),
        apagar: brl(g.total - pagoDia),
      };
      const corpo =
        ordem.map((v) => itemLinha(v, false)).join("\n") +
        `

*Valor total: ${brl(g.total)}*
*Valor a pagar: ${brl(g.total - pagoDia)}*`;
      const abertura = preencher(cfg.abertura, vals).trim();
      const fechamento = preencher(cfg.fechamento, vals).trim();
      const txtDia = [abertura, corpo, fechamento].filter(Boolean).join("\n\n");
      const todas = data.vendas
        .filter((v) => v.clienteId === c.id)
        .sort((a, b) => a.data.localeCompare(b.data) || a.criadaEm - b.criadaEm);
      const totalGeral = todas.reduce((s, v) => s + v.valor, 0);
      const pagoGeral = todas.filter((v) => v.pago).reduce((s, v) => s + v.valor, 0);
      const porData = [];
      todas.forEach((v) => {
        const bloco = porData.find((b) => b.data === v.data);
        if (bloco) bloco.itens.push(v);
        else porData.push({ data: v.data, itens: [v] });
      });
      let txtTudo = `*Delas pra Elas*
*${c.nome}* — histórico

`;
      txtTudo += porData
        .map(
          (b) => `${dataCurta(b.data)}
${b.itens.map((v) => itemLinha(v, false)).join("\n")}`,
        )
        .join("\n\n");
      txtTudo += `

*Valor total: ${brl(totalGeral)}*`;
      txtTudo += `
*Valor a pagar: ${brl(totalGeral - pagoGeral)}*`;
      setExportar({
        titulo: c.nome,
        whatsapp: c.whatsapp,
        opcoes: [
          {
            rotulo: "Desta live",
            texto: txtDia,
            csv: csvVendas(g.vendas, data.clientes),
            arquivo: `${arquivoNome(c.nome)}-${dia}.csv`,
          },
          {
            rotulo: "Histórico dela",
            texto: txtTudo,
            csv: csvVendas(todas, data.clientes),
            arquivo: `${arquivoNome(c.nome)}-historico.csv`,
          },
        ],
      });
    };
    const exportarDia = () => {
      const blocos = [...grupos].reverse().map((g) => {
        const itens = [...g.vendas]
          .reverse()
          .map((v) => `   ${itemLinha(v, true)}`)
          .join("\n");
        const qtd = `${g.vendas.length} ${g.vendas.length === 1 ? "peça" : "peças"}`;
        const pago = g.vendas.filter((v) => v.pago).reduce((s, v) => s + v.valor, 0);
        let bloco = `*${g.cliente.nome}* — ${brl(g.total)} (${qtd})
${itens}`;
        if (g.total - pago > 0)
          bloco += `
   A pagar: ${brl(g.total - pago)}`;
        return bloco;
      });
      let txt = `*Delas pra Elas*
Live de ${dataCurta(dia)}

${blocos.join("\n\n")}`;
      txt += `

──────────
*Valor total: ${brl(resumo.total)}*`;
      txt += `
*Valor a pagar: ${brl(resumo.pendente)}*`;
      txt += `
Peças: ${resumo.pecas}`;
      txt += `
Clientes: ${resumo.clientes}`;
      if (resumo.novas > 0) txt += ` (${resumo.novas} ${resumo.novas === 1 ? "nova" : "novas"})`;
      setExportar({
        titulo: `Live de ${dataCurta(dia)}`,
        opcoes: [
          {
            rotulo: "Live do dia",
            texto: txt,
            arquivo: `live-${dia}.xlsx`,
            rotuloArquivo: "Baixar planilha da live (.xlsx)",
            gerarArquivo: () =>
              new Blob([planilhaDoDia(grupos, dataCurta(dia).replace(/\//g, "-"))], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              }),
          },
        ],
      });
    };
    const exportarTudo = () => {
      const dias = [...new Set(data.vendas.map((v) => v.data))].sort();
      const linhas = dias.map((d) => {
        const r = calcResumo(data.vendas, data.clientes, d);
        let l = `${dataCurta(d)} — ${brl(r.total)} · ${r.pecas} ${r.pecas === 1 ? "peça" : "peças"} · ${r.clientes} ${r.clientes === 1 ? "cliente" : "clientes"}`;
        if (r.novas > 0) l += ` (${r.novas} ${r.novas === 1 ? "nova" : "novas"})`;
        return l;
      });
      const total = data.vendas.reduce((s, v) => s + v.valor, 0);
      const pago = data.vendas.filter((v) => v.pago).reduce((s, v) => s + v.valor, 0);
      let txt = `*Delas pra Elas* — histórico completo

${linhas.join("\n")}`;
      txt += `

──────────
*Valor total: ${brl(total)}*`;
      txt += `
*Valor a pagar: ${brl(total - pago)}*`;
      txt += `
Lives: ${dias.length}
Peças: ${data.vendas.length}`;
      setExportar({
        titulo: "Histórico completo",
        opcoes: [
          {
            rotulo: "Tudo",
            texto: txt,
            csv: csvVendas(data.vendas, data.clientes),
            arquivo: "historico-delas-pra-elas.csv",
          },
        ],
      });
    };
    const salvarCliente = async (c) => {
      const dados = { nome: c.nome, whatsapp: c.whatsapp || "", preExistente: !!c.preExistente };
      if (DIA_VALIDO.test(c.criadaEm || "")) dados.criadaEm = c.criadaEm;
      else if (!c.id) dados.criadaEm = todayKey();
      await gravar([{ col: "clientes", id: c.id || novoId(), op: "mesclar", dados }]);
    };
    const salvarConfig = (cfg) => gravar([{ col: "config", id: "geral", op: "mesclar", dados: cfg }]);
    if (estado.tela === "abrindo") return h(TelaSimples, null, "Abrindo…");
    if (estado.tela === "falha") {
      return h(
        TelaSimples,
        null,
        h("p", { style: { margin: "0 0 16px" } }, estado.falhaInicial),
        h("button", { style: S.cta, onClick: () => cliente.tentarDeNovo() }, "Tentar de novo"),
      );
    }
    if (estado.tela === "entrada") {
      return h(Entrada, {
        primeiroAcesso: estado.primeiroAcesso,
        sessaoPerdida: estado.sessaoPerdida,
        aoEntrar: cliente.entrar,
        aoCriar: cliente.criarPrimeiraConta,
      });
    }
    if (estado.tela === "carregando") {
      return h(
        TelaSimples,
        null,
        h(
          "p",
          { style: { margin: 0 } },
          estado.conexao === "ok" ? "Carregando os dados…" : "Sem conexão com o servidor. Tentando de novo…",
        ),
      );
    }
    return h(
      "div",
      { style: S.screen },
      h(
        "div",
        { style: S.frame },
        h(
          "header",
          { style: S.header },
          h(
            "div",
            { style: S.brandRow },
            h("span", { style: S.brand }, "Delas pra Elas"),
            h("button", { style: S.linkBtn, onClick: () => setConta("menu") }, "Conta"),
          ),
          h(
            "div",
            { style: S.tabs },
            h(
              "button",
              {
                style: { ...S.tab, ...(tab === "hoje" ? S.tabOn : {}) },
                onClick: () => setTab("hoje"),
              },
              "Live",
            ),
            h(
              "button",
              {
                style: { ...S.tab, ...(tab === "calendario" ? S.tabOn : {}) },
                onClick: () => setTab("calendario"),
              },
              "Calendário",
            ),
            h(
              "button",
              {
                style: { ...S.tab, ...(tab === "clientes" ? S.tabOn : {}) },
                onClick: () => setTab("clientes"),
              },
              "Clientes",
            ),
          ),
        ),
        h(FaixaDeConexao, { conexao: estado.conexao, pendentes: estado.pendentes }),
        tab === "hoje"
          ? h(
              Fragment,
              null,
              h(
                "div",
                { style: S.dateRow },
                h(
                  "button",
                  { style: S.arrow, onClick: () => setDia(shiftKey(dia, -1)), "aria-label": "Dia anterior" },
                  "‹",
                ),
                h(
                  "div",
                  { style: { textAlign: "center" } },
                  h("button", { style: S.dateTxt, onClick: () => setTab("calendario") }, dateLabel(dia)),
                  dia !== todayKey() &&
                    h("button", { style: S.todayBtn, onClick: () => setDia(todayKey()) }, "voltar para hoje"),
                ),
                h(
                  "button",
                  {
                    style: { ...S.arrow, opacity: dia >= todayKey() ? 0.25 : 1 },
                    disabled: dia >= todayKey(),
                    onClick: () => setDia(shiftKey(dia, 1)),
                    "aria-label": "Próximo dia",
                  },
                  "›",
                ),
              ),
              h(Resumo, { r: resumo }),
              h(
                "main",
                { style: S.list },
                grupos.length === 0
                  ? h(
                      "div",
                      { style: S.empty },
                      h("p", { style: S.emptyTitle }, "Nenhuma peça lançada neste dia."),
                      h(
                        "p",
                        { style: S.emptyTxt },
                        "Toque em ",
                        h("strong", null, "Lançar peça"),
                        " assim que a primeira venda sair.",
                      ),
                    )
                  : grupos.map((g) =>
                      h(GrupoCliente, {
                        key: g.cliente?.id || "x",
                        g,
                        dia,
                        onToggle: togglePago,
                        onEdit: (v) => setSheet({ mode: "edit", venda: v }),
                        onExportar: () => exportarCliente(g),
                      }),
                    ),
                grupos.length > 0 &&
                  h(
                    "button",
                    { style: { ...S.ctaGhost, marginTop: 8 }, onClick: exportarDia },
                    "Exportar relatório do dia",
                  ),
                h("div", { style: { height: 96 } }),
              ),
              h(
                "div",
                { style: S.dock },
                h("button", { style: S.cta, onClick: () => setSheet({ mode: "new" }) }, "Lançar peça"),
              ),
            )
          : tab === "calendario"
            ? h(Calendario, {
                data,
                dia,
                onEscolher: (d) => {
                  setDia(d);
                  setTab("hoje");
                },
              })
            : h(Clientes, {
                data,
                dia,
                onSave: salvarCliente,
                onFlash: flash,
                onExport: () => setBackup(JSON.stringify(data, null, 2)),
                onExportTudo: exportarTudo,
                onMesclar: mesclarClientes,
                onEditarMensagem: () => setMsg(true),
              }),
      ),
      sheet &&
        h(SheetVenda, {
          mode: sheet.mode,
          venda: sheet.venda,
          clientes: data.clientes,
          vendasDoDia,
          onClose: () => setSheet(null),
          onSave: salvarVenda,
          onDelete: excluirVenda,
          onPassar: passarFila,
          onFlash: flash,
          carregarFoto,
        }),
      exportar && h(SheetExport, { dados: exportar, onClose: () => setExportar(null), onFlash: flash }),
      msg &&
        h(SheetMensagem, {
          config: data.config || CONFIG_PADRAO,
          onClose: () => setMsg(false),
          onFlash: flash,
          onSave: salvarConfig,
        }),
      backup && h(SheetBackup, { texto: backup, onClose: () => setBackup(null), onFlash: flash }),
      conta === "menu" &&
        h(SheetConta, {
          usuario: estado.usuario,
          pendentes: estado.pendentes,
          aoFechar: () => setConta(null),
          aoAbrir: setConta,
          aoSair: cliente.sair,
        }),
      conta === "senha" &&
        h(SheetTrocarSenha, { aoFechar: () => setConta(null), aoTrocar: cliente.trocarSenha, aoAvisar: flash }),
      conta === "equipe" &&
        h(SheetEquipe, {
          aoFechar: () => setConta(null),
          equipe: cliente.equipe,
          meuEmail: estado.usuario.email,
          aoAvisar: flash,
        }),
      conta === "restaurar" &&
        h(SheetRestaurar, { aoFechar: () => setConta(null), aoImportar: cliente.importarBackup, aoAvisar: flash }),
      toast && h("div", { style: S.toast }, toast),
    );
  }
  async function abrir() {
    carregarFontes();
    const cliente = criarCliente({ armazem: await criarArmazem() });
    createRoot(document.getElementById("app")).render(h(Barreira, null, h(App, { cliente })));
    cliente.iniciar();
  }
  abrir();
})();
