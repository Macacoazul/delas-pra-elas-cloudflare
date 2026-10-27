/**
 * Quem pode entrar: contas (e-mail + senha), sessão por cookie e proteção contra tentativa de adivinhar senha.
 *
 *  - Senhas NUNCA são guardadas: o banco guarda uma assinatura HMAC-SHA256 da senha, feita com uma chave que só existe no
 *    SEGREDO do Worker (fora do banco) e com um "sal" próprio de cada conta. Quem copiar o banco não consegue testar senhas.
 *  - A sessão é um cookie assinado com outra chave do mesmo SEGREDO: HttpOnly (o JavaScript da página não lê),
 *    Secure (só por https) e SameSite=Strict (outros sites não conseguem usá-lo).
 *  - Trocar a senha ou remover a pessoa invalida na hora todas as sessões dela (campo `sv` da conta).
 *  - Errou a senha demais? Fica bloqueado por 15 minutos (por e-mail e por endereço de internet).
 *
 * Papéis: "dono" (tudo, inclusive Fretes e cadastro da equipe) e "equipe" (o app da live).
 */
import { assinar, assinaturaConfere, bytesAleatorios, chaveDerivada, paraBase64Url, deBase64UrlEstrito, sha256Hex, textosIguais } from './cripto.js';
import { ErroNegocio } from './dados.js';
import { emailValido } from './util.js';

export const COOKIE_DA_SESSAO = 'dpe_sessao';
export const DURACAO_DA_SESSAO_S = 14 * 24 * 3600;
const JANELA_MS = 15 * 60 * 1000;
const MAX_FALHAS_POR_EMAIL = 6;
const MAX_FALHAS_POR_IP = 40;
const SENHA_MIN = 8;
const SENHA_MAX = 200;
const MAX_PESSOAS = 20;
const SAL_FALSO = 'AAAAAAAAAAAAAAAAAAAAAA';

/** Versão inicial de uma conta nova: sorteada, para que uma sessão antiga nunca "volte a valer" se alguém for removida e recriada. */
const novaVersao = () => 1 + (bytesAleatorios(4).reduce((total, byte) => total * 256 + byte, 0) % 1_000_000_000);

const SEM_ACESSO = () => new ErroNegocio('credenciais_invalidas', 'E-mail ou senha não confere.', 401);

/** E-mail limpo e em minúsculas. Só aceita texto: lista, objeto ou número viram '' (e-mail inválido). */
export const normalizarEmail = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');

function exigirSenhaBoa(senha, email) {
  if (typeof senha !== 'string' || senha.length < SENHA_MIN) throw new ErroNegocio('senha_curta', `A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`, 400);
  if (senha.length > SENHA_MAX) throw new ErroNegocio('senha_longa', 'A senha é grande demais.', 400);
  if (email && senha.toLowerCase() === email) throw new ErroNegocio('senha_fraca', 'A senha não pode ser igual ao e-mail.', 400);
}

function exigirEmail(v) {
  const e = normalizarEmail(v);
  if (!emailValido(e)) throw new ErroNegocio('email_invalido', 'Esse e-mail não parece válido.', 400);
  return e;
}

async function assinaturaDaSenha(ctx, sal, senha) {
  return assinar(await chaveDerivada(ctx.segredo, 'senha-v1'), `${sal}\u0000${senha}`);
}

/* ── limite de tentativas ─────────────────────────────────── */
async function estaBloqueado(ctx, chave, maximo) {
  const l = await ctx.d1.prepare('SELECT n, ate FROM limites WHERE chave = ?').bind(chave).first();
  return Boolean(l && l.ate > ctx.now() && l.n >= maximo);
}

async function registrarFalha(ctx, chave) {
  const agora = ctx.now();
  await ctx.d1
    .prepare(
      `INSERT INTO limites (chave, n, ate) VALUES (?1, 1, ?2 + ?3)
       ON CONFLICT (chave) DO UPDATE SET
         n = CASE WHEN limites.ate <= ?2 THEN 1 ELSE limites.n + 1 END,
         ate = CASE WHEN limites.ate <= ?2 THEN ?2 + ?3 ELSE limites.ate END`,
    )
    .bind(chave, agora, JANELA_MS)
    .run();
}

async function zerarFalhas(ctx, chave) {
  await ctx.d1.prepare('DELETE FROM limites WHERE chave = ?').bind(chave).run();
}

async function chavesDeLimite(email, ip) {
  return { porEmail: `login:e:${(await sha256Hex(email)).slice(0, 32)}`, porIp: `login:i:${String(ip || 'sem-ip').slice(0, 64)}` };
}

async function exigirSemBloqueio(ctx, chaves) {
  if ((await estaBloqueado(ctx, chaves.porEmail, MAX_FALHAS_POR_EMAIL)) || (await estaBloqueado(ctx, chaves.porIp, MAX_FALHAS_POR_IP))) {
    throw new ErroNegocio('muitas_tentativas', 'Muitas tentativas. Espere uns 15 minutos e tente de novo.', 429);
  }
}

/* ── sessão ───────────────────────────────────────────────── */
async function criarSessao(ctx, usuario) {
  const corpo = paraBase64Url(new TextEncoder().encode(JSON.stringify({ e: usuario.email, x: Math.floor(ctx.now() / 1000) + DURACAO_DA_SESSAO_S, v: usuario.sv })));
  const sessao = `v1.${corpo}`;
  return `${sessao}.${await assinar(await chaveDerivada(ctx.segredo, 'sessao-v1'), sessao)}`;
}

function valorDoCookie(cabecalho, nome) {
  for (const parte of String(cabecalho || '').split(';')) {
    const i = parte.indexOf('=');
    if (i > 0 && parte.slice(0, i).trim() === nome) return parte.slice(i + 1).trim();
  }
  return '';
}

/** Quem está logado neste pedido (ou null). Confere assinatura, validade e se a conta ainda existe com a mesma versão.
 *  Devolve também `sv` (versão da conta) e `expira` (segundos desde 1970), usados para renovar a sessão. */
async function usuarioDaSessao(ctx, cabecalhoCookie) {
  const m = /^(v1\.[A-Za-z0-9_-]{10,400})\.([A-Za-z0-9_-]{40,50})$/.exec(valorDoCookie(cabecalhoCookie, COOKIE_DA_SESSAO));
  if (!m) return null;
  if (!(await assinaturaConfere(await chaveDerivada(ctx.segredo, 'sessao-v1'), m[1], m[2]))) return null;
  let p;
  try {
    p = JSON.parse(new TextDecoder().decode(deBase64UrlEstrito(m[1].slice(3))));
  } catch {
    return null;
  }
  if (!p || typeof p.e !== 'string' || !Number.isFinite(p.x) || p.x * 1000 < ctx.now()) return null;
  const u = await ctx.d1.prepare('SELECT email, papel, sv FROM usuarios WHERE email = ?').bind(p.e).first();
  if (!u || u.sv !== p.v) return null;
  return { email: u.email, papel: u.papel, sv: u.sv, expira: p.x };
}

/** Cabeçalho Set-Cookie. `seguro`: só false em teste local (http). */
function cookieDeSessao(token, seguro) {
  return `${COOKIE_DA_SESSAO}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${DURACAO_DA_SESSAO_S}${seguro ? '; Secure' : ''}`;
}
function cookieDeSaida(seguro) {
  return `${COOKIE_DA_SESSAO}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${seguro ? '; Secure' : ''}`;
}

/* ── entrar / primeiro acesso ─────────────────────────────── */
async function quantasPessoas(ctx) {
  const r = await ctx.d1.prepare('SELECT COUNT(*) AS n FROM usuarios').first();
  return Number(r && r.n) || 0;
}

async function entrar(ctx, { email, senha, ip }) {
  const e = normalizarEmail(email);
  if (!emailValido(e) || typeof senha !== 'string' || !senha || senha.length > SENHA_MAX) throw SEM_ACESSO();
  const chaves = await chavesDeLimite(e, ip);
  await exigirSemBloqueio(ctx, chaves);

  const u = await ctx.d1.prepare('SELECT email, papel, sal, hash, sv FROM usuarios WHERE email = ?').bind(e).first();
  const calculada = await assinaturaDaSenha(ctx, u ? u.sal : SAL_FALSO, senha);
  // Conta que não existe leva o mesmo trabalho que conta que existe (não dá para descobrir quem tem cadastro pelo tempo de resposta).
  const confere = await textosIguais(calculada, u ? u.hash : `${calculada}x`);
  if (!u || !confere) {
    await registrarFalha(ctx, chaves.porEmail);
    await registrarFalha(ctx, chaves.porIp);
    throw SEM_ACESSO();
  }
  await zerarFalhas(ctx, chaves.porEmail);
  return { usuario: { email: u.email, papel: u.papel }, token: await criarSessao(ctx, u) };
}

async function primeiroAcesso(ctx, { email, senha, chave, ip }) {
  if (!ctx.senhaDeInstalacao) throw new ErroNegocio('sem_senha_de_instalacao', 'O servidor ainda não tem a senha de instalação. Siga o passo do guia sobre os segredos.', 503);
  const chaves = await chavesDeLimite('primeiro-acesso', ip);
  await exigirSemBloqueio(ctx, chaves);
  if ((await quantasPessoas(ctx)) > 0) throw new ErroNegocio('ja_configurado', 'Este app já tem uma conta. Entre com o seu e-mail e senha.', 409);
  if (typeof chave !== 'string' || !(await textosIguais(chave, ctx.senhaDeInstalacao))) {
    await registrarFalha(ctx, chaves.porEmail);
    await registrarFalha(ctx, chaves.porIp);
    throw new ErroNegocio('chave_errada', 'A senha de instalação não confere.', 403);
  }
  const e = exigirEmail(email);
  exigirSenhaBoa(senha, e);
  const sal = paraBase64Url(bytesAleatorios(16));
  const sv = novaVersao();
  const r = await ctx.d1
    .prepare("INSERT INTO usuarios (email, papel, sal, hash, sv, criado) SELECT ?, 'dono', ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM usuarios)")
    .bind(e, sal, await assinaturaDaSenha(ctx, sal, senha), sv, ctx.now())
    .run();
  if (!r.meta || r.meta.changes !== 1) throw new ErroNegocio('ja_configurado', 'Este app já tem uma conta. Entre com o seu e-mail e senha.', 409);
  await zerarFalhas(ctx, chaves.porEmail);
  return { usuario: { email: e, papel: 'dono' }, token: await criarSessao(ctx, { email: e, sv }) };
}

/* ── conta própria e equipe ───────────────────────────────── */
async function trocarSenha(ctx, eu, { atual, nova, ip }) {
  const chaves = await chavesDeLimite(eu.email, ip);
  await exigirSemBloqueio(ctx, chaves);
  const u = await ctx.d1.prepare('SELECT email, sal, hash FROM usuarios WHERE email = ?').bind(eu.email).first();
  if (!u || typeof atual !== 'string' || !(await textosIguais(await assinaturaDaSenha(ctx, u.sal, atual), u.hash))) {
    await registrarFalha(ctx, chaves.porEmail);
    throw new ErroNegocio('senha_atual_errada', 'A senha atual não confere.', 403);
  }
  exigirSenhaBoa(nova, eu.email);
  const sal = paraBase64Url(bytesAleatorios(16));
  await ctx.d1.prepare('UPDATE usuarios SET sal = ?, hash = ?, sv = sv + 1 WHERE email = ?').bind(sal, await assinaturaDaSenha(ctx, sal, nova), eu.email).run();
  const novo = await ctx.d1.prepare('SELECT email, sv FROM usuarios WHERE email = ?').bind(eu.email).first();
  await zerarFalhas(ctx, chaves.porEmail);
  return { token: await criarSessao(ctx, novo) };
}

async function listarEquipe(ctx) {
  const r = await ctx.d1.prepare("SELECT email, papel, criado FROM usuarios ORDER BY papel = 'dono' DESC, criado, email").all();
  return (r.results || []).map((u) => ({ email: u.email, papel: u.papel, criado: u.criado }));
}

async function adicionarPessoa(ctx, { email, senha }) {
  const e = exigirEmail(email);
  exigirSenhaBoa(senha, e);
  if ((await quantasPessoas(ctx)) >= MAX_PESSOAS) throw new ErroNegocio('equipe_cheia', `A equipe pode ter até ${MAX_PESSOAS} pessoas.`, 400);
  const sal = paraBase64Url(bytesAleatorios(16));
  const r = await ctx.d1
    .prepare("INSERT INTO usuarios (email, papel, sal, hash, sv, criado) VALUES (?, 'equipe', ?, ?, ?, ?) ON CONFLICT (email) DO NOTHING")
    .bind(e, sal, await assinaturaDaSenha(ctx, sal, senha), novaVersao(), ctx.now())
    .run();
  if (!r.meta || r.meta.changes !== 1) throw new ErroNegocio('ja_existe', 'Já existe uma conta com esse e-mail.', 409);
  return { email: e, papel: 'equipe' };
}

async function removerPessoa(ctx, eu, { email }) {
  const e = normalizarEmail(email);
  if (e === eu.email) throw new ErroNegocio('nao_remover_a_si', 'Você não pode remover a própria conta.', 400);
  const alvo = await ctx.d1.prepare('SELECT papel FROM usuarios WHERE email = ?').bind(e).first();
  if (!alvo) throw new ErroNegocio('nao_encontrada', 'Essa conta não existe.', 404);
  if (alvo.papel === 'dono') throw new ErroNegocio('nao_remover_dono', 'A conta da dona não pode ser removida.', 400);
  await ctx.d1.prepare('DELETE FROM usuarios WHERE email = ?').bind(e).run();
  return { email: e };
}

async function redefinirSenha(ctx, { email, senha }) {
  const e = normalizarEmail(email);
  exigirSenhaBoa(senha, e);
  const sal = paraBase64Url(bytesAleatorios(16));
  const r = await ctx.d1.prepare('UPDATE usuarios SET sal = ?, hash = ?, sv = sv + 1 WHERE email = ?').bind(sal, await assinaturaDaSenha(ctx, sal, senha), e).run();
  if (!r.meta || r.meta.changes !== 1) throw new ErroNegocio('nao_encontrada', 'Essa conta não existe.', 404);
  return { email: e };
}

/** Limpeza barata, chamada pela rotina agendada: esquece bloqueios que já venceram. */
async function limparLimites(ctx) {
  await ctx.d1.prepare('DELETE FROM limites WHERE ate < ?').bind(ctx.now() - JANELA_MS).run();
}

export { entrar, primeiroAcesso, usuarioDaSessao, cookieDeSessao, cookieDeSaida, trocarSenha, listarEquipe, adicionarPessoa, removerPessoa, redefinirSenha, limparLimites, quantasPessoas, criarSessao, valorDoCookie };
