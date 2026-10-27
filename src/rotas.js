/**
 * TABELA DAS ROTAS DA API — o único lugar que diz quem pode chamar o quê.
 *
 *   acesso   'publica'   qualquer pessoa (a cliente com o link, o Mercado Pago, a tela de entrada)
 *            'opcional'  qualquer pessoa; se houver sessão, o servidor a lê (a pergunta "quem sou eu?")
 *            'sessao'    precisa estar logada (equipe ou dona)
 *            'dono'      precisa estar logada como dona
 *
 *   Por padrão, todo pedido que muda algo e usa o cookie de login só vale se vier do próprio site (conferência de
 *   Origin/Sec-Fetch-Site) e com corpo JSON. As rotas da cliente e do Mercado Pago (`externa`) não usam cookie.
 *   O corpo é limitado a 64 KB, salvo onde a rota diz outro tamanho.
 *
 * O servidor aplica as regras; as funções de cada rota só cuidam do assunto delas.
 */
import * as Conta from './rotas-conta.js';
import * as App from './rotas-app.js';
import { tratarAdmin } from './rotas-admin.js';
import { tratar as tratarPublica } from './rotas-publicas.js';

const CORPO_PADRAO = 64 * 1024;

/** Cliente e Mercado Pago: sem cookie, sem conferência de origem. */
const publicaDaCliente = (ctx, p) => tratarPublica(ctx, { method: p.metodo, path: p.caminho, query: p.consulta, headers: p.cabecalhos, body: p.corpo });
const admin = (ctx, p) => tratarAdmin(ctx, { method: p.metodo, path: p.caminho, body: p.corpo }, p.eu);

const ACESSOS = ['publica', 'opcional', 'sessao', 'dono'];

function rota(metodo, caminho, acesso, fazer, { corpoMax = CORPO_PADRAO, externa = false } = {}) {
  // Um erro de digitação aqui (por exemplo 'sesao') deixaria a rota aberta sem ninguém perceber: por isso trava na partida.
  if (!ACESSOS.includes(acesso)) throw new Error(`Rota ${metodo} ${caminho}: acesso "${acesso}" não existe.`);
  return {
    metodo,
    caminho,
    acesso,
    fazer,
    corpoMax,
    externa,
    padrao: new RegExp(`^${caminho.replace(/:[a-z]+/g, '([^/]+)')}$`),
    nomes: [...caminho.matchAll(/:([a-z]+)/g)].map((m) => m[1]),
  };
}

const ROTAS = [
  rota('GET', '/api/auth/eu', 'opcional', Conta.eu),
  rota('POST', '/api/auth/entrar', 'publica', Conta.entrar),
  rota('POST', '/api/auth/primeiro-acesso', 'publica', Conta.primeiroAcesso),
  rota('POST', '/api/auth/sair', 'publica', Conta.sair),
  rota('POST', '/api/auth/trocar-senha', 'sessao', Conta.trocarSenha),

  rota('GET', '/api/equipe', 'dono', Conta.listarEquipe),
  rota('POST', '/api/equipe/adicionar', 'dono', Conta.adicionarPessoa),
  rota('POST', '/api/equipe/remover', 'dono', Conta.removerPessoa),
  rota('POST', '/api/equipe/redefinir-senha', 'dono', Conta.redefinirSenha),

  rota('GET', '/api/app/estado', 'sessao', App.estado),
  rota('POST', '/api/app/gravar', 'sessao', App.gravar, { corpoMax: 1_000_000 }),
  rota('GET', '/api/app/foto/:id', 'sessao', App.foto),

  rota('POST', '/api/admin/:comando', 'dono', admin),

  rota('GET', '/api/frete/:token', 'publica', publicaDaCliente, { externa: true }),
  rota('GET', '/api/frete/:token/status', 'publica', publicaDaCliente, { externa: true }),
  rota('POST', '/api/frete/:token/cotar', 'publica', publicaDaCliente, { externa: true }),
  rota('POST', '/api/frete/:token/pagar', 'publica', publicaDaCliente, { externa: true }),
  rota('POST', '/api/mp/webhook', 'publica', publicaDaCliente, { externa: true }),
];

/**
 * Acha a rota do pedido.
 * @returns {{rota:object, params:Record<string,string>} | {permitidos:string[]} | null}
 *   null = esse endereço não existe; { permitidos } = existe, mas não com esse método (405).
 */
function achar(metodo, caminho) {
  const permitidos = [];
  for (const r of ROTAS) {
    const m = r.padrao.exec(caminho);
    if (!m) continue;
    if (r.metodo !== metodo) {
      permitidos.push(r.metodo);
      continue;
    }
    const params = {};
    r.nomes.forEach((nome, i) => {
      params[nome] = m[i + 1];
    });
    return { rota: r, params };
  }
  return permitidos.length ? { permitidos: [...new Set(permitidos)] } : null;
}

export { ROTAS, ACESSOS, achar, CORPO_PADRAO };
