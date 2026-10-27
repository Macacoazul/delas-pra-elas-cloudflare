/**
 * Mundo de mentira para testar o servidor DE VERDADE (pelo caminho HTTP, como no Cloudflare):
 *   - o banco D1 (um SQLite em memória com a mesma interface);
 *   - Melhor Envio, Mercado Pago e ViaCEP (os simuladores de helpers/mocks.js), em endereços da própria máquina;
 *   - um "navegador" que guarda cookies e manda Origin / Content-Type como um navegador de verdade.
 * Nada aqui fala com um serviço real.
 */
import { Mocks } from './mocks.js';
import { criarBancoDeTeste } from './d1-sqlite.js';
import { CONFIG_BASE, CPF_LOJA, SEGREDO_DE_TESTE } from './ambiente.js';

export const ADMIN_SENHA_DE_TESTE = 'senha-de-instalacao-de-teste';
export const EMAIL_DA_DONA = 'dona@exemplo.com';
export const SENHA_DA_DONA = 'senha da dona 12345';
export const ORIGEM = 'https://loja.exemplo';

export async function criarEcossistema({ semDados = false } = {}) {
  const mocks = await new Mocks().iniciar();
  const banco = await criarBancoDeTeste({ segredo: SEGREDO_DE_TESTE });
  if (!semDados) {
    banco.gravar('ajustes/frete', { ...CONFIG_BASE });
    banco.gravar('privado/credenciais', {
      melhorEnvio: { token: mocks.meToken, ambiente: 'sandbox', emailContato: 'contato@exemplo.com' },
      mercadoPago: { accessToken: mocks.mpToken, webhookSecret: mocks.mpSecret },
      remetenteDocumento: CPF_LOJA,
    });
  }
  return {
    banco,
    mocks,
    /** O que o Cloudflare entrega ao Worker (o objeto `env`). */
    env: { DB: banco.d1, SEGREDO: SEGREDO_DE_TESTE, ADMIN_SENHA: ADMIN_SENHA_DE_TESTE, ENDERECOS_DE_TESTE: JSON.stringify(mocks.urls) },
    /** Chamadas externas feitas até agora (Melhor Envio, Mercado Pago, ViaCEP). O banco não entra: ele tem limite à parte. */
    totalDeChamadas: () => mocks.chamadas.length,
    idasAoBanco: () => banco.d1.idas,
    async parar() {
      await mocks.parar();
      banco.fechar();
    },
  };
}

/**
 * Um navegador mínimo: guarda os cookies que o servidor manda e, nos pedidos que mudam algo, manda Origin,
 * Sec-Fetch-Site e Content-Type como o navegador de verdade faz.
 */
export function criarNavegador(servidor, ambiente, { origem = ORIGEM, cookies: iniciais } = {}) {
  const cookies = new Map(iniciais || []);
  const guardar = (resposta) => {
    for (const linha of resposta.headers.getSetCookie()) {
      const [par, ...atributos] = linha.split(';').map((p) => p.trim());
      const i = par.indexOf('=');
      const nome = par.slice(0, i);
      const valor = par.slice(i + 1);
      if (!valor || atributos.some((a) => /^max-age=0$/i.test(a))) cookies.delete(nome);
      else cookies.set(nome, valor);
    }
  };

  /**
   * @param {string} metodo
   * @param {string} caminho
   * @param {{corpo?:any, bruto?:any, headers?:object, ambiente?:object, comoNavegador?:boolean}} [opcoes]
   *   comoNavegador=false: pedido "de programa" (sem Origin nem Sec-Fetch-Site), como um curl.
   */
  async function pedir(metodo, caminho, { corpo, bruto, headers = {}, ambiente: amb = ambiente, comoNavegador = true } = {}) {
    const h = new Headers(headers);
    if (comoNavegador && metodo !== 'GET' && metodo !== 'HEAD') {
      if (!h.has('Origin')) h.set('Origin', origem);
      if (!h.has('Sec-Fetch-Site')) h.set('Sec-Fetch-Site', 'same-origin');
    }
    if (cookies.size && !h.has('Cookie')) h.set('Cookie', [...cookies].map(([k, v]) => `${k}=${v}`).join('; '));
    let body;
    if (bruto !== undefined) body = bruto;
    else if (corpo !== undefined) {
      if (!h.has('Content-Type')) h.set('Content-Type', 'application/json');
      body = JSON.stringify(corpo);
    }
    const resposta = await servidor.fetch(new Request(origem + caminho, { method: metodo, headers: h, body }), amb);
    guardar(resposta);
    const texto = await resposta.text();
    let json = null;
    try {
      json = JSON.parse(texto);
    } catch {
      json = null;
    }
    return { status: resposta.status, headers: resposta.headers, texto, json };
  }

  return {
    pedir,
    cookies,
    /** Outro navegador com os mesmos cookies (para testar uma rota sem estragar a sessão do original, por exemplo "sair"). */
    clone: () => criarNavegador(servidor, ambiente, { origem, cookies }),
    temSessao: () => cookies.has('dpe_sessao'),
    async entrar(email, senha) {
      const r = await pedir('POST', '/api/auth/entrar', { corpo: { email, senha } });
      if (r.status !== 200) throw new Error(`entrar falhou: ${r.status} ${r.texto}`);
      return r;
    },
    async criarDona() {
      const r = await pedir('POST', '/api/auth/primeiro-acesso', { corpo: { email: EMAIL_DA_DONA, senha: SENHA_DA_DONA, chave: ADMIN_SENHA_DE_TESTE } });
      if (r.status !== 200) throw new Error(`primeiro acesso falhou: ${r.status} ${r.texto}`);
      return r;
    },
    /** Comando da dona: POST /api/admin/<nome>. */
    admin: (nome, dados) => pedir('POST', `/api/admin/${nome}`, { corpo: dados || {} }),
  };
}
