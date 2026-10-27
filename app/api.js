/**
 * Tudo que o app conversa com o servidor passa por aqui; nenhuma tela chama a rede direto.
 *
 *   ENTRADA   login, primeiro acesso, sair, trocar senha e a equipe (só a dona).
 *   DADOS     o app mantém uma cópia local de clientes, vendas e mensagem. A cada poucos segundos pergunta ao servidor
 *             "o que mudou desde o número N?" e atualiza a cópia: o que outra pessoa lançar em outro celular aparece sozinho.
 *   FILA      tudo que você lança vale na hora na tela e entra numa fila guardada no próprio celular. A fila sobe para o
 *             servidor em ordem. Sem internet, espera e tenta de novo; se fechar o navegador, a fila continua lá.
 *
 * `criarCliente()` recebe de fora o fetch, o armazenamento e o relógio, para os testes usarem versões de mentira.
 */
import { criarArmazemEmMemoria } from './armazem.js';
import { operacoesDoBackup } from './backup.js';

const COLECOES = ['clientes', 'vendas', 'config'];
/** Os mesmos valores de partida que o servidor aplica (src/app-api.js). */
const PADROES = {
  clientes: { whatsapp: '', preExistente: false },
  vendas: { codigo: '', fila: [], temFoto: false },
  config: {},
};
const OPERACOES_POR_LOTE = 100;
const INTERVALO_MS = 4000;
const INTERVALO_PARADO_MS = 20_000;
const PARADO_DEPOIS_DE_MS = 5 * 60_000;
const ESPERA_MAXIMA_MS = 30_000;
const FOTOS_NA_MEMORIA = 40;
const SALVAR_COPIA_EM_MS = 1500;
const VERSAO_DA_COPIA = 1;
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export class ErroDoServidor extends Error {
  constructor(status, mensagem, codigo = '') {
    super(mensagem);
    this.name = 'ErroDoServidor';
    this.status = status;
    this.codigo = codigo;
  }
}

export class SemRede extends Error {
  constructor() {
    super('Sem conexão com a internet.');
    this.name = 'SemRede';
  }
}

const bytesDoNavegador = (n) => crypto.getRandomValues(new Uint8Array(n));

/** Identificador novo (20 letras e números) para cliente ou venda. */
export function novoId(aleatorios = bytesDoNavegador) {
  return Array.from(aleatorios(20), (b) => ALFABETO[b % ALFABETO.length]).join('');
}

/**
 * Aplica uma alteração a um conjunto de documentos { clientes: Map, vendas: Map, config: Map }.
 * Faz o mesmo que o servidor faz ao gravar (por isso a tela mostra na hora o que o servidor vai guardar).
 * Fotos não entram aqui: elas ficam fora da cópia e são buscadas só quando alguém abre a peça.
 */
export function aplicarOperacao(docs, op) {
  const mapa = docs[op.col];
  if (!mapa) return;
  if (op.op === 'apagar') {
    mapa.delete(op.id);
    return;
  }
  const { id: _id, primeiraCompra: _primeira, ...dados } = op.dados || {};
  const anterior = op.op === 'mesclar' ? mapa.get(op.id) : undefined;
  mapa.set(op.id, { ...PADROES[op.col], ...(anterior || {}), ...dados });
}

const mensagemPadrao = (status) =>
  status === 401 ? 'Sua sessão acabou. Entre de novo.'
  : status === 403 ? 'O servidor recusou o pedido.'
  : status === 413 ? 'O pedido ficou grande demais.'
  : status === 429 ? 'Muitas tentativas. Espere um pouco.'
  : status >= 500 ? 'O servidor não conseguiu responder agora.'
  : 'Não deu certo. Tente de novo.';

/** Erros que passam sozinhos: vale tentar de novo mais tarde, sem perder a alteração. */
const passaSozinho = (e) => e instanceof SemRede || (e instanceof ErroDoServidor && (e.status === 408 || e.status === 425 || e.status === 429 || e.status >= 500));
/** O servidor leu e recusou os dados: repetir não adianta. */
const recusadoDeVez = (e) => e instanceof ErroDoServidor && [400, 413, 422].includes(e.status);
const eSessao = (e) => e instanceof ErroDoServidor && e.status === 401;

export function criarCliente({
  fetch: buscar = (...args) => globalThis.fetch(...args),
  armazem = criarArmazemEmMemoria(),
  agora = () => Date.now(),
  agendar = (fn, ms) => setTimeout(fn, ms),
  cancelar = (id) => clearTimeout(id),
  aleatorios = bytesDoNavegador,
  pagina = typeof window !== 'undefined' ? window : null,
} = {}) {
  /* ── o que o app sabe ── */
  let conferido = false; // já perguntamos ao servidor quem está logado
  let falhaInicial = '';
  let usuario = null;
  let primeiroAcesso = false;
  let sessaoPerdida = false;

  const base = { clientes: new Map(), vendas: new Map(), config: new Map() }; // o que o servidor tem
  let cursor = 0; // até onde já recebemos
  let carregado = false; // já há dados para mostrar (da cópia local ou do servidor)
  let fila = []; // alterações ainda não enviadas: { id, ops }
  let rede = 'ok'; // 'ok' | 'sem-rede' | 'erro'
  let falhasSeguidas = 0;
  let aviso = null; // { n, texto }
  let contadorDeAvisos = 0;
  let contadorDeLotes = 0;
  let ultimaAtividade = agora();
  const fotos = new Map(); // id -> imagem ou null (poucas, em memória)

  const ouvintes = new Set();
  let visaoPronta = null;
  let instantaneo = null;

  /* ── guardar no celular (nunca derruba o app se falhar) ── */
  const guardar = async (chave, valor) => {
    try {
      await armazem.gravar(chave, valor);
    } catch {
      /* sem espaço ou bloqueado: segue sem guardar */
    }
  };
  const esquecer = async (chave) => {
    try {
      await armazem.apagar(chave);
    } catch {
      /* nada a fazer */
    }
  };
  const chaveDoLote = (id) => `lote:${id}`;

  /* ── a visão que as telas leem: o que o servidor tem + o que está na fila ── */
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
      config: docs.config.get('geral') || {},
    };
    return visaoPronta;
  }

  function estado() {
    if (instantaneo) return instantaneo;
    let tela = 'app';
    if (!conferido) tela = 'abrindo';
    else if (falhaInicial && !usuario) tela = 'falha';
    else if (!usuario || sessaoPerdida) tela = 'entrada';
    else if (!carregado) tela = 'carregando';
    instantaneo = {
      tela,
      falhaInicial,
      usuario,
      primeiroAcesso,
      sessaoPerdida,
      conexao: sessaoPerdida ? 'sessao' : rede,
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

  function avisar(texto) {
    contadorDeAvisos += 1;
    aviso = { n: contadorDeAvisos, texto };
  }

  /* ── conversa com o servidor ── */
  async function pedir(metodo, caminho, corpo) {
    let resposta;
    let texto;
    try {
      resposta = await buscar(caminho, {
        method: metodo,
        credentials: 'same-origin',
        cache: 'no-store',
        headers: corpo === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
      });
      texto = await resposta.text();
    } catch {
      throw new SemRede();
    }
    let json = null;
    try {
      json = texto ? JSON.parse(texto) : null;
    } catch {
      json = null;
    }
    if (!resposta.ok) throw new ErroDoServidor(resposta.status, (json && json.erro) || mensagemPadrao(resposta.status), (json && json.codigo) || '');
    // 200 sem JSON é página de wifi de hotel, proxy ou algo do tipo: não é resposta do nosso servidor
    if (json === null) throw new ErroDoServidor(502, mensagemPadrao(502));
    return json;
  }

  /** Para tudo que exige estar logada: se o servidor disser que a sessão acabou, o app volta para a tela de entrada. */
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
    rede = e instanceof SemRede ? 'sem-rede' : 'erro';
    notificar();
  }

  /** Deu certo falar com o servidor. Devolve true se o estado da conexão mudou (quem chamou decide se avisa as telas). */
  function deuCerto() {
    const mudou = rede !== 'ok';
    rede = 'ok';
    falhasSeguidas = 0;
    return mudou;
  }

  /* ── cópia no celular ── */
  let temporizadorDaCopia = null;

  function agendarCopia() {
    if (temporizadorDaCopia || !usuario) return;
    temporizadorDaCopia = agendar(async () => {
      temporizadorDaCopia = null;
      if (!usuario) return;
      await guardar('copia', { v: VERSAO_DA_COPIA, cursor, clientes: [...base.clientes], vendas: [...base.vendas], config: [...base.config] });
    }, SALVAR_COPIA_EM_MS);
  }

  const copiaValida = (c) =>
    c && c.v === VERSAO_DA_COPIA && Number.isSafeInteger(c.cursor) && c.cursor >= 0 &&
    COLECOES.every((nome) => Array.isArray(c[nome]) && c[nome].every((par) => Array.isArray(par) && typeof par[0] === 'string' && par[1] && typeof par[1] === 'object'));

  async function carregarCopia() {
    try {
      const copia = await armazem.ler('copia');
      if (copiaValida(copia)) {
        for (const nome of COLECOES) base[nome] = new Map(copia[nome]);
        cursor = copia.cursor;
        carregado = true;
      }
      const lotes = await armazem.listar('lote:');
      fila = lotes
        .map(([, lote]) => lote)
        .filter((lote) => lote && typeof lote.id === 'string' && Array.isArray(lote.ops) && lote.ops.length);
      mudouAVisao();
    } catch {
      /* cópia ilegível: começa do zero, o servidor devolve tudo */
    }
  }

  async function apagarCopiaLocal() {
    if (temporizadorDaCopia) cancelar(temporizadorDaCopia);
    temporizadorDaCopia = null;
    await esquecer('copia');
    for (const [chave] of await armazem.listar('lote:').catch(() => [])) await esquecer(chave);
  }

  function limparBase() {
    for (const nome of COLECOES) base[nome] = new Map();
    cursor = 0;
    mudouAVisao();
  }

  /* ── fila de reenvio ── */
  const idDeLote = () => `${String(agora()).padStart(15, '0')}-${String((contadorDeLotes += 1)).padStart(4, '0')}-${novoId(aleatorios).slice(0, 4)}`;

  /**
   * Registra alterações: aparecem na tela agora e sobem para o servidor assim que der.
   * Cada chamada vira um ou mais lotes (no máximo 100 alterações cada), enviados em ordem.
   * @param {{col:'clientes'|'vendas'|'fotos'|'config', id:string, op:'set'|'mesclar'|'apagar', dados?:object}[]} ops
   */
  async function gravar(ops) {
    if (!Array.isArray(ops) || !ops.length) return;
    ultimaAtividade = agora();
    const lotes = [];
    for (let i = 0; i < ops.length; i += OPERACOES_POR_LOTE) lotes.push({ id: idDeLote(), ops: ops.slice(i, i + OPERACOES_POR_LOTE) });
    fila.push(...lotes);
    mudouAVisao();
    notificar();
    await Promise.all(lotes.map((lote) => guardar(chaveDoLote(lote.id), lote)));
    sincronizarSemEsperar();
  }

  function lembrarFoto(op) {
    if (op.col !== 'fotos') return;
    fotos.delete(op.id);
    fotos.set(op.id, op.op === 'apagar' ? null : op.dados.imagem);
    while (fotos.size > FOTOS_NA_MEMORIA) fotos.delete(fotos.keys().next().value);
  }

  /** Envia a fila, um lote de cada vez. Devolve false se parou antes de acabar (sem internet, servidor fora, sessão). */
  async function enviarFila() {
    while (fila.length && usuario && !sessaoPerdida) {
      const lote = fila[0];
      try {
        await pedir('POST', '/api/app/gravar', { ops: lote.ops });
      } catch (e) {
        if (fila[0] !== lote) continue; // a fila mudou enquanto esperávamos (saiu da conta, por exemplo)
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
      // O servidor guardou. O mesmo efeito entra na cópia local, para a tela não piscar até a próxima conferência.
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

  /* ── conferir o que mudou no servidor ── */
  function receber(m) {
    const mapa = base[m.c];
    if (!mapa || typeof m.i !== 'string') return;
    if (m.a) mapa.delete(m.i);
    else if (m.d && typeof m.d === 'object') mapa.set(m.i, m.d);
  }

  async function buscarMudancas() {
    while (usuario && !sessaoPerdida) {
      let r;
      try {
        r = await pedir('GET', `/api/app/estado?desde=${cursor}&c=${COLECOES.join(',')}`);
      } catch (e) {
        if (eSessao(e)) perderSessao();
        else falhou(e);
        return;
      }
      if (!Array.isArray(r.mudancas) || !Number.isSafeInteger(r.ate)) {
        falhou(new ErroDoServidor(502, mensagemPadrao(502)));
        return;
      }
      if (r.reiniciar) limparBase(); // o servidor foi restaurado de um backup mais antigo: recomeça do zero
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

  /* ── sincronia: envia a fila, depois confere o que mudou; nunca duas ao mesmo tempo ── */
  let andamento = null;
  let repetir = false;

  const visivel = () => !pagina || !pagina.document || pagina.document.visibilityState !== 'hidden';

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
    // sem conexão: espera 2 s, 4 s, 8 s, 16 s e depois 30 s entre as tentativas
    if (rede !== 'ok') return Math.min(ESPERA_MAXIMA_MS, 2000 * 2 ** Math.max(0, Math.min(falhasSeguidas, 5) - 1));
    return agora() - ultimaAtividade > PARADO_DEPOIS_DE_MS ? INTERVALO_PARADO_MS : INTERVALO_MS;
  }

  async function ciclo() {
    if (!rodando) return;
    try {
      if (usuario && !sessaoPerdida) await sincronizar();
    } catch {
      /* sincronizar já trata os erros; isto é só para o relógio nunca parar */
    }
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
      pagina.addEventListener('online', aoVoltar);
      pagina.addEventListener('focus', aoVoltar);
      if (pagina.document) pagina.document.addEventListener('visibilitychange', aoVoltar);
    }
    temporizador = agendar(ciclo, 0);
  }

  function pararSincronia() {
    rodando = false;
    if (temporizador) cancelar(temporizador);
    temporizador = null;
    if (pagina) {
      pagina.removeEventListener('online', aoVoltar);
      pagina.removeEventListener('focus', aoVoltar);
      if (pagina.document) pagina.document.removeEventListener('visibilitychange', aoVoltar);
    }
  }

  /* ── entrada ── */
  async function conferirSessao() {
    falhaInicial = '';
    try {
      const r = await pedir('GET', '/api/auth/eu');
      usuario = r.usuario || null;
      primeiroAcesso = Boolean(r.primeiroAcesso);
      sessaoPerdida = false;
      deuCerto();
      if (usuario) {
        iniciarSincronia();
        sincronizarSemEsperar();
      }
    } catch (e) {
      falhaInicial = e instanceof SemRede ? 'Sem conexão com a internet. Confira o sinal e tente de novo.' : e.message;
    }
    conferido = true;
    notificar();
  }

  /** Abre o app: lê a cópia guardada no celular e pergunta ao servidor se ainda há alguém logada. */
  async function iniciar() {
    await carregarCopia();
    await conferirSessao();
  }

  function depoisDeEntrar(u) {
    usuario = u;
    primeiroAcesso = false;
    sessaoPerdida = false;
    falhaInicial = '';
    conferido = true;
    deuCerto();
    iniciarSincronia();
    sincronizarSemEsperar();
    notificar();
  }

  async function entrar(email, senha) {
    const r = await pedir('POST', '/api/auth/entrar', { email, senha });
    depoisDeEntrar(r.usuario);
    return r.usuario;
  }

  async function criarPrimeiraConta({ chave, email, senha }) {
    const r = await pedir('POST', '/api/auth/primeiro-acesso', { chave, email, senha });
    depoisDeEntrar(r.usuario);
    return r.usuario;
  }

  /** Sai da conta e apaga a cópia guardada no celular. Sem internet não dá para sair (o cookie fica no navegador). */
  async function sair() {
    await pedir('POST', '/api/auth/sair', {});
    pararSincronia();
    usuario = null;
    sessaoPerdida = false;
    carregado = false;
    fila = [];
    fotos.clear();
    limparBase();
    await apagarCopiaLocal();
    const r = await pedir('GET', '/api/auth/eu').catch(() => null);
    primeiroAcesso = Boolean(r && r.primeiroAcesso);
    notificar();
  }

  const trocarSenha = (atual, nova) => pedirLogada('POST', '/api/auth/trocar-senha', { atual, nova });

  const equipe = {
    listar: async () => (await pedirLogada('GET', '/api/equipe')).pessoas,
    adicionar: (email, senha) => pedirLogada('POST', '/api/equipe/adicionar', { email, senha }),
    remover: (email) => pedirLogada('POST', '/api/equipe/remover', { email }),
    redefinirSenha: (email, senha) => pedirLogada('POST', '/api/equipe/redefinir-senha', { email, senha }),
  };

  /* ── fotos ── */
  /** A foto de uma venda: primeiro a que ainda está na fila, depois a que já foi vista, por fim a do servidor. */
  async function foto(idDaVenda) {
    for (let i = fila.length - 1; i >= 0; i -= 1) {
      for (let j = fila[i].ops.length - 1; j >= 0; j -= 1) {
        const op = fila[i].ops[j];
        if (op.col === 'fotos' && op.id === idDaVenda) return op.op === 'apagar' ? null : op.dados.imagem;
      }
    }
    if (fotos.has(idDaVenda)) return fotos.get(idDaVenda);
    try {
      const r = await pedirLogada('GET', `/api/app/foto/${encodeURIComponent(idDaVenda)}`);
      lembrarFoto({ col: 'fotos', id: idDaVenda, op: 'set', dados: { imagem: r.imagem } });
      return r.imagem;
    } catch (e) {
      if (e instanceof ErroDoServidor && e.status === 404) return null;
      throw e;
    }
  }

  /* ── restaurar o backup antigo ── */
  /** Grava o backup (já conferido por lerBackup) direto no servidor, em pedaços de 100, e depois confere o que mudou. */
  async function importarBackup(backup, aoProgredir = () => {}) {
    const ops = operacoesDoBackup(backup);
    for (let i = 0; i < ops.length; i += OPERACOES_POR_LOTE) {
      await pedirLogada('POST', '/api/app/gravar', { ops: ops.slice(i, i + OPERACOES_POR_LOTE) });
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
