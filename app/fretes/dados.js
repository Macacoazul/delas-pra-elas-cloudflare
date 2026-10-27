/**
 * A conversa da tela de Fretes com o servidor do próprio site (mesmo endereço, login por cookie).
 *
 *   chamar(comando, dados)        POST /api/admin/<comando>  ->  o que o servidor devolve em "data"
 *   quemSou()                     GET  /api/auth/eu           ->  { usuario, primeiroAcesso }
 *   listarClientes()              as clientes do app da live (para sugerir o nome ao criar o frete)
 *   acompanharFretes({...})       mantém a lista de fretes em dia: pergunta ao servidor só o que mudou
 *
 * Erros viram `ErroDaApi` com uma mensagem em português que já pode ser mostrada para a dona.
 */

export class ErroDaApi extends Error {
  constructor(mensagem, { status = 0, codigo = '' } = {}) {
    super(mensagem);
    this.name = 'ErroDaApi';
    this.status = status;
    this.codigo = codigo;
  }

  /** O login não vale mais (nunca entrou ou a sessão acabou). */
  get semLogin() {
    return this.status === 401;
  }
}

/* Gerar uma etiqueta fala com a Melhor Envio e pode demorar: esperamos bastante antes de desistir. */
const PRAZO_PADRAO_MS = 130_000;

/** Faz o pedido e devolve o JSON da resposta (ou lança ErroDaApi). */
async function pedir(metodo, caminho, corpo, prazoMs = PRAZO_PADRAO_MS) {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), prazoMs);
  let resposta;
  let texto;
  try {
    resposta = await fetch(caminho, {
      method: metodo,
      headers: corpo === undefined ? {} : { 'Content-Type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      credentials: 'same-origin',
      signal: controle.signal,
    });
    texto = await resposta.text();
  } catch (e) {
    const demorou = e && e.name === 'AbortError';
    throw new ErroDaApi(
      demorou
        ? 'O servidor demorou demais para responder. Confira na lista se deu certo antes de tentar de novo.'
        : 'Sem conexão com o servidor. Confira a internet e tente de novo.',
      { codigo: demorou ? 'demorou' : 'sem_rede' },
    );
  } finally {
    clearTimeout(relogio);
  }

  let json = null;
  try {
    json = JSON.parse(texto);
  } catch {
    json = null; // página de erro de outro lugar, não uma resposta do nosso servidor
  }
  if (resposta.ok && json) return json;

  const doServidor = json && typeof json.erro === 'string' ? json.erro : '';
  const codigo = (json && typeof json.codigo === 'string' && json.codigo) || '';
  if (resposta.status === 401) throw new ErroDaApi('Sua sessão acabou. Entre de novo no app da live.', { status: 401, codigo: 'nao_autenticado' });
  if (resposta.status === 429) throw new ErroDaApi(doServidor || 'Muitos pedidos seguidos. Espere um pouco e tente de novo.', { status: 429, codigo });
  if (resposta.status >= 500) throw new ErroDaApi(doServidor || 'O servidor teve um problema agora. Tente de novo em instantes.', { status: resposta.status, codigo });
  throw new ErroDaApi(doServidor || 'Não deu certo. Tente de novo.', { status: resposta.status, codigo });
}

/** Roda um comando da dona. Só a conta "dona" consegue; o servidor confere a cada chamada. */
export async function chamar(comando, dados) {
  const r = await pedir('POST', `/api/admin/${encodeURIComponent(comando)}`, dados || {});
  return Object.prototype.hasOwnProperty.call(r, 'data') ? r.data : null;
}

/** Quem está logada neste navegador: `usuario` é null quando ninguém entrou. */
export const quemSou = () => pedir('GET', '/api/auth/eu', undefined, 20_000);

/** Aplica ao mapa (id → documento) o que o servidor contou que mudou, e devolve a nova posição. */
function aplicar(mapa, resposta, colecao) {
  if (resposta.reiniciar) mapa.clear();
  for (const m of resposta.mudancas || []) {
    if (m.c !== colecao) continue;
    if (m.a) mapa.delete(m.i);
    else mapa.set(m.i, { ...m.d, id: m.i });
  }
  return resposta.ate;
}

/** Todas as clientes cadastradas no app da live. */
export async function listarClientes() {
  const mapa = new Map();
  let desde = 0;
  for (let volta = 0; volta < 40; volta += 1) {
    const r = await pedir('GET', `/api/app/estado?desde=${desde}&c=clientes`, undefined, 30_000);
    desde = aplicar(mapa, r, 'clientes');
    if (r.completo) break;
  }
  return [...mapa.values()];
}

/* Com a tela aberta e à vista a dona espera o Pix cair: confere a cada poucos segundos. Escondida, bem mais devagar. */
const INTERVALO_VISIVEL_MS = 6_000;
const INTERVALO_ESCONDIDA_MS = 60_000;
const INTERVALO_MAXIMO_MS = 60_000;

/**
 * Mantém a lista de fretes em dia. Na primeira vez traz os 200 mais novos; depois só o que mudou.
 *
 * @param {{
 *   aoAtualizar: (fretes: object[]) => void,   // lista inteira, do mais novo para o mais antigo (chamada a cada mudança)
 *   aoFalhar: (erro: ErroDaApi) => void,       // a conferência falhou (continua tentando)
 *   aoPerderLogin: () => void,                 // a sessão acabou (para de conferir)
 *   documento?: Document, janela?: Window,     // para testes
 * }} ouvintes
 * @returns {{ parar: () => void, conferirAgora: () => void }}
 */
export function acompanharFretes({ aoAtualizar, aoFalhar, aoPerderLogin, documento = globalThis.document, janela = globalThis.window }) {
  const mapa = new Map();
  let posicao = 0;
  let primeira = true;
  let rodando = true;
  let falhasSeguidas = 0;
  let relogio = null;
  let andamento = null;

  const ordenada = () => [...mapa.values()].sort((a, b) => (Number(b.criadoEm) || 0) - (Number(a.criadoEm) || 0));

  async function conferir() {
    let mudou = primeira || falhasSeguidas > 0; // voltou de uma falha: avisa a tela, mesmo sem novidade, para sair do "sem conexão"
    try {
      for (let volta = 0; volta < 20; volta += 1) {
        const r = await chamar('listarFretes', { desde: posicao });
        const antes = mapa.size;
        posicao = aplicar(mapa, r, 'fretes');
        if (r.reiniciar || (r.mudancas || []).some((m) => m.c === 'fretes') || mapa.size !== antes) mudou = true;
        if (r.completo) break;
      }
      falhasSeguidas = 0;
      primeira = false;
      if (mudou && rodando) aoAtualizar(ordenada());
    } catch (e) {
      if (!rodando) return;
      if (e instanceof ErroDaApi && e.semLogin) {
        parar();
        aoPerderLogin();
        return;
      }
      falhasSeguidas += 1;
      aoFalhar(e instanceof ErroDaApi ? e : new ErroDaApi('Não consegui atualizar a lista agora.'));
    }
  }

  const intervalo = () => {
    if (falhasSeguidas > 0) return Math.min(INTERVALO_MAXIMO_MS, INTERVALO_VISIVEL_MS * 2 ** (falhasSeguidas - 1));
    return documento && documento.visibilityState === 'hidden' ? INTERVALO_ESCONDIDA_MS : INTERVALO_VISIVEL_MS;
  };

  function agendar(ms) {
    clearTimeout(relogio);
    if (rodando) relogio = setTimeout(ciclo, ms);
  }

  async function ciclo() {
    if (!andamento) {
      andamento = conferir().finally(() => {
        andamento = null;
      });
    }
    await andamento;
    agendar(intervalo());
  }

  function conferirAgora() {
    if (rodando) {
      clearTimeout(relogio);
      ciclo();
    }
  }

  const aoVoltar = () => {
    if (!documento || documento.visibilityState !== 'hidden') {
      falhasSeguidas = 0;
      conferirAgora();
    }
  };

  function parar() {
    rodando = false;
    clearTimeout(relogio);
    if (janela) {
      janela.removeEventListener('online', aoVoltar);
      janela.removeEventListener('focus', aoVoltar);
    }
    if (documento) documento.removeEventListener('visibilitychange', aoVoltar);
  }

  if (janela) {
    janela.addEventListener('online', aoVoltar);
    janela.addEventListener('focus', aoVoltar);
  }
  if (documento) documento.addEventListener('visibilitychange', aoVoltar);
  ciclo();

  return { parar, conferirAgora };
}
