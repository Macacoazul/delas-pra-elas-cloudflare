/**
 * Conta e equipe (login, primeiro acesso, troca de senha, cadastro de pessoas).
 * Cada função recebe (ctx, pedido) e devolve { http, corpo } — e, quando muda a sessão, também `sessao`:
 *   { token }  grava o cookie de sessão       { sair: true }  apaga o cookie
 * Quem pode chamar cada uma é decidido na tabela de rotas (rotas.js), nunca aqui dentro.
 */
import * as Acesso from './acesso.js';

const RENOVAR_QUANDO_FALTAR_S = 7 * 24 * 3600;

const objeto = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const ok = (corpo, extra = {}) => ({ http: 200, corpo, ...extra });

/** Quem está logado. Se faltar pouco para a sessão vencer, já renova (quem usa o app toda semana nunca é deslogado). */
async function eu(ctx, p) {
  if (!p.eu) return ok({ usuario: null, primeiroAcesso: (await Acesso.quantasPessoas(ctx)) === 0 });
  const restante = p.eu.expira - Math.floor(ctx.now() / 1000);
  const sessao = restante < RENOVAR_QUANDO_FALTAR_S ? { token: await Acesso.criarSessao(ctx, p.eu) } : undefined;
  return ok({ usuario: { email: p.eu.email, papel: p.eu.papel } }, { sessao });
}

async function entrar(ctx, p) {
  const c = objeto(p.corpo);
  const r = await Acesso.entrar(ctx, { email: c.email, senha: c.senha, ip: p.ip });
  return ok({ usuario: r.usuario }, { sessao: { token: r.token } });
}

async function primeiroAcesso(ctx, p) {
  const c = objeto(p.corpo);
  const r = await Acesso.primeiroAcesso(ctx, { email: c.email, senha: c.senha, chave: c.chave, ip: p.ip });
  return ok({ usuario: r.usuario }, { sessao: { token: r.token } });
}

async function sair() {
  return ok({ ok: true }, { sessao: { sair: true } });
}

async function trocarSenha(ctx, p) {
  const c = objeto(p.corpo);
  const r = await Acesso.trocarSenha(ctx, p.eu, { atual: c.atual, nova: c.nova, ip: p.ip });
  return ok({ ok: true }, { sessao: { token: r.token } });
}

async function listarEquipe(ctx) {
  return ok({ pessoas: await Acesso.listarEquipe(ctx) });
}

async function adicionarPessoa(ctx, p) {
  const c = objeto(p.corpo);
  return ok({ pessoa: await Acesso.adicionarPessoa(ctx, { email: c.email, senha: c.senha }) });
}

async function removerPessoa(ctx, p) {
  return ok(await Acesso.removerPessoa(ctx, p.eu, { email: objeto(p.corpo).email }));
}

async function redefinirSenha(ctx, p) {
  const c = objeto(p.corpo);
  return ok(await Acesso.redefinirSenha(ctx, { email: c.email, senha: c.senha }));
}

export { eu, entrar, primeiroAcesso, sair, trocarSenha, listarEquipe, adicionarPessoa, removerPessoa, redefinirSenha };
