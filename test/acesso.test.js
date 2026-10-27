import test from 'node:test';
import assert from 'node:assert/strict';
import { criarBancoDeTeste } from './helpers/d1-sqlite.js';
import * as Acesso from '../src/acesso.js';
import { ErroNegocio } from '../src/dados.js';

const SEGREDO = 'segredo-de-teste-com-mais-de-vinte-caracteres';
const INSTALACAO = 'senha-de-instalacao-de-teste';
const SENHA = 'uma senha boa 123';
const DIA_MS = 24 * 3600 * 1000;

async function preparar({ instalacao = INSTALACAO, segredo = SEGREDO } = {}) {
  const t = await criarBancoDeTeste({ segredo: SEGREDO });
  const relogio = { t: Date.UTC(2026, 9, 25, 12, 0, 0) };
  const ctx = { d1: t.d1, db: t.banco, segredo, senhaDeInstalacao: instalacao, now: () => relogio.t };
  return { t, ctx, relogio };
}

const cookie = (token) => `dpe_sessao=${token}`;
const falhaCom = (codigo, http) => (e) => e instanceof ErroNegocio && e.codigo === codigo && (http === undefined || e.http === http);

async function criarDona(ctx, email = 'dona@exemplo.com') {
  return Acesso.primeiroAcesso(ctx, { email, senha: SENHA, chave: INSTALACAO, ip: '1.1.1.1' });
}

test('primeiro acesso: com a senha de instalação certa cria a conta da dona; depois nunca mais', async () => {
  const { ctx } = await preparar();
  const r = await criarDona(ctx, '  Dona@Exemplo.com ');
  assert.deepEqual(r.usuario, { email: 'dona@exemplo.com', papel: 'dono' }, 'o e-mail é guardado limpo e em minúsculas');
  assert.ok(await Acesso.usuarioDaSessao(ctx, cookie(r.token)));

  await assert.rejects(() => Acesso.primeiroAcesso(ctx, { email: 'outra@exemplo.com', senha: SENHA, chave: INSTALACAO, ip: '2.2.2.2' }), falhaCom('ja_configurado', 409));
  assert.equal(await Acesso.quantasPessoas(ctx), 1);
});

test('primeiro acesso: chave errada, sem chave no servidor, e-mail ruim e senha fraca são recusados', async () => {
  const { ctx } = await preparar();
  await assert.rejects(() => Acesso.primeiroAcesso(ctx, { email: 'dona@exemplo.com', senha: SENHA, chave: 'errada', ip: '1.1.1.1' }), falhaCom('chave_errada', 403));
  await assert.rejects(() => Acesso.primeiroAcesso(ctx, { email: 'dona@exemplo.com', senha: SENHA, chave: undefined, ip: '1.1.1.1' }), falhaCom('chave_errada', 403));
  await assert.rejects(() => Acesso.primeiroAcesso(ctx, { email: 'isso-nao-e-email', senha: SENHA, chave: INSTALACAO, ip: '1.1.1.1' }), falhaCom('email_invalido', 400));
  await assert.rejects(() => Acesso.primeiroAcesso(ctx, { email: 'dona@exemplo.com', senha: '1234567', chave: INSTALACAO, ip: '1.1.1.1' }), falhaCom('senha_curta', 400));
  await assert.rejects(() => Acesso.primeiroAcesso(ctx, { email: 'dona@exemplo.com', senha: 'x'.repeat(201), chave: INSTALACAO, ip: '1.1.1.1' }), falhaCom('senha_longa', 400));
  await assert.rejects(() => Acesso.primeiroAcesso(ctx, { email: 'dona@exemplo.com', senha: 'dona@exemplo.com', chave: INSTALACAO, ip: '1.1.1.1' }), falhaCom('senha_fraca', 400));
  assert.equal(await Acesso.quantasPessoas(ctx), 0, 'nenhuma tentativa ruim criou conta');

  const sem = await preparar({ instalacao: '' });
  await assert.rejects(() => Acesso.primeiroAcesso(sem.ctx, { email: 'dona@exemplo.com', senha: SENHA, chave: '', ip: '1.1.1.1' }), falhaCom('sem_senha_de_instalacao', 503));
  await assert.rejects(() => Acesso.primeiroAcesso(sem.ctx, { email: 'dona@exemplo.com', senha: SENHA, chave: undefined, ip: '1.1.1.1' }), falhaCom('sem_senha_de_instalacao', 503));
});

test('primeiro acesso: tentar adivinhar a chave trava depois de poucas tentativas', async () => {
  const { ctx, relogio } = await preparar();
  const tentar = (chave, ip = '9.9.9.9') => Acesso.primeiroAcesso(ctx, { email: 'dona@exemplo.com', senha: SENHA, chave, ip });
  for (let i = 0; i < 6; i += 1) await assert.rejects(() => tentar(`chute${i}`), falhaCom('chave_errada'));
  await assert.rejects(() => tentar(INSTALACAO), falhaCom('muitas_tentativas', 429));
  relogio.t += 16 * 60 * 1000;
  assert.ok(await tentar(INSTALACAO), 'passados 15 minutos, volta a valer');
});

test('primeiro acesso: dois pedidos ao mesmo tempo criam uma conta só', async () => {
  const { ctx } = await preparar();
  const resultados = await Promise.allSettled([
    Acesso.primeiroAcesso(ctx, { email: 'a@exemplo.com', senha: SENHA, chave: INSTALACAO, ip: '1.1.1.1' }),
    Acesso.primeiroAcesso(ctx, { email: 'b@exemplo.com', senha: SENHA, chave: INSTALACAO, ip: '1.1.1.2' }),
    Acesso.primeiroAcesso(ctx, { email: 'c@exemplo.com', senha: SENHA, chave: INSTALACAO, ip: '1.1.1.3' }),
  ]);
  assert.equal(resultados.filter((r) => r.status === 'fulfilled').length, 1);
  for (const r of resultados.filter((x) => x.status === 'rejected')) assert.equal(r.reason.codigo, 'ja_configurado');
  assert.equal(await Acesso.quantasPessoas(ctx), 1);
});

test('entrar: senha certa abre a sessão; senha errada e conta inexistente dão a MESMA resposta', async () => {
  const { ctx } = await preparar();
  await criarDona(ctx);
  const ok = await Acesso.entrar(ctx, { email: 'DONA@exemplo.com', senha: SENHA, ip: '3.3.3.3' });
  assert.deepEqual(ok.usuario, { email: 'dona@exemplo.com', papel: 'dono' });
  const sessao = await Acesso.usuarioDaSessao(ctx, cookie(ok.token));
  assert.deepEqual({ ...sessao, sv: 'qualquer' }, { email: 'dona@exemplo.com', papel: 'dono', sv: 'qualquer', expira: Math.floor(ctx.now() / 1000) + Acesso.DURACAO_DA_SESSAO_S });
  assert.ok(Number.isInteger(sessao.sv) && sessao.sv > 0);

  const erros = [];
  for (const tentativa of [
    { email: 'dona@exemplo.com', senha: 'senha errada 999' },
    { email: 'ninguem@exemplo.com', senha: SENHA },
    { email: 'isso-nao-e-email', senha: SENHA },
    { email: 'dona@exemplo.com', senha: '' },
    { email: 'dona@exemplo.com', senha: { $ne: 1 } },
    { email: ['dona@exemplo.com'], senha: SENHA },
    { email: undefined, senha: undefined },
  ]) {
    erros.push(await Acesso.entrar(ctx, { ...tentativa, ip: '4.4.4.4' }).then(() => null, (e) => e));
  }
  for (const e of erros) {
    assert.ok(e instanceof ErroNegocio);
    assert.equal(e.codigo, 'credenciais_invalidas');
    assert.equal(e.http, 401);
    assert.equal(e.message, erros[0].message, 'a mensagem não revela se o e-mail existe');
  }
});

test('entrar: depois de 6 erros no mesmo e-mail, bloqueia por 15 minutos — até para a senha certa', async () => {
  const { ctx, relogio } = await preparar();
  await criarDona(ctx);
  const errar = (ip) => Acesso.entrar(ctx, { email: 'dona@exemplo.com', senha: 'errada errada', ip });
  for (let i = 0; i < 6; i += 1) await assert.rejects(() => errar(`5.5.5.${i}`), falhaCom('credenciais_invalidas'));
  await assert.rejects(() => Acesso.entrar(ctx, { email: 'dona@exemplo.com', senha: SENHA, ip: '5.5.5.99' }), falhaCom('muitas_tentativas', 429));

  relogio.t += 14 * 60 * 1000;
  await assert.rejects(() => Acesso.entrar(ctx, { email: 'dona@exemplo.com', senha: SENHA, ip: '5.5.5.99' }), falhaCom('muitas_tentativas', 429));
  relogio.t += 2 * 60 * 1000;
  assert.ok(await Acesso.entrar(ctx, { email: 'dona@exemplo.com', senha: SENHA, ip: '5.5.5.99' }));
});

test('entrar: um endereço que erra com muitos e-mails diferentes também é bloqueado', async () => {
  const { ctx } = await preparar();
  await criarDona(ctx);
  for (let i = 0; i < 40; i += 1) await assert.rejects(() => Acesso.entrar(ctx, { email: `x${i}@exemplo.com`, senha: 'qualquer coisa', ip: '6.6.6.6' }), falhaCom('credenciais_invalidas'));
  await assert.rejects(() => Acesso.entrar(ctx, { email: 'dona@exemplo.com', senha: SENHA, ip: '6.6.6.6' }), falhaCom('muitas_tentativas', 429));
  assert.ok(await Acesso.entrar(ctx, { email: 'dona@exemplo.com', senha: SENHA, ip: '7.7.7.7' }), 'outro endereço continua entrando');
});

test('entrar: acertar zera o contador do e-mail', async () => {
  const { ctx } = await preparar();
  await criarDona(ctx);
  const errar = () => Acesso.entrar(ctx, { email: 'dona@exemplo.com', senha: 'errada errada', ip: '8.8.8.8' });
  for (let rodada = 0; rodada < 3; rodada += 1) {
    for (let i = 0; i < 5; i += 1) await assert.rejects(errar, falhaCom('credenciais_invalidas'));
    assert.ok(await Acesso.entrar(ctx, { email: 'dona@exemplo.com', senha: SENHA, ip: '8.8.8.8' }));
  }
});

test('sessão: adulterar, expirar, assinar com outro segredo ou apresentar lixo não passa', async () => {
  const { ctx, relogio } = await preparar();
  const { token } = await criarDona(ctx);
  const [versao, corpo, assinatura] = token.split('.');
  assert.ok(await Acesso.usuarioDaSessao(ctx, cookie(token)));

  // adulteração do corpo (trocando o e-mail para o de outra pessoa) e da assinatura
  const falso = Buffer.from(JSON.stringify({ e: 'outra@exemplo.com', x: 9_999_999_999, v: 1 })).toString('base64url');
  const casos = [
    `${versao}.${falso}.${assinatura}`,
    `${versao}.${corpo}.${assinatura.slice(0, -2)}AA`,
    `${versao}.${corpo}`,
    `${versao}.${corpo}.${assinatura}.extra`,
    `v2.${corpo}.${assinatura}`,
    '',
    'lixo',
    `${versao}.${'A'.repeat(500)}.${assinatura}`,
  ];
  for (const c of casos) assert.equal(await Acesso.usuarioDaSessao(ctx, cookie(c)), null, c.slice(0, 40));
  assert.equal(await Acesso.usuarioDaSessao(ctx, undefined), null);
  assert.equal(await Acesso.usuarioDaSessao(ctx, 'outro=1; dpe_sessao_falso=2'), null);

  const outroSegredo = { ...ctx, segredo: 'outro-segredo-diferente-bem-longo' };
  assert.equal(await Acesso.usuarioDaSessao(outroSegredo, cookie(token)), null, 'trocar o SEGREDO do Worker desloga todo mundo');

  assert.ok(await Acesso.usuarioDaSessao(ctx, `a=1; dpe_sessao=${token}; b=2`), 'acha o cookie no meio de outros');
  relogio.t += 14 * DIA_MS + 1000;
  assert.equal(await Acesso.usuarioDaSessao(ctx, cookie(token)), null, 'depois de 14 dias a sessão vence');
});

test('sessão: trocar a senha, redefinir ou remover a pessoa derruba as sessões antigas', async () => {
  const { ctx } = await preparar();
  const dona = await criarDona(ctx);
  await Acesso.adicionarPessoa(ctx, { email: 'ana@exemplo.com', senha: SENHA });
  const ana = await Acesso.entrar(ctx, { email: 'ana@exemplo.com', senha: SENHA, ip: '1.1.1.1' });
  const anaOutroCelular = await Acesso.entrar(ctx, { email: 'ana@exemplo.com', senha: SENHA, ip: '1.1.1.2' });

  const nova = await Acesso.trocarSenha(ctx, { email: 'ana@exemplo.com' }, { atual: SENHA, nova: 'senha nova 4567', ip: '1.1.1.1' });
  assert.equal(await Acesso.usuarioDaSessao(ctx, cookie(ana.token)), null);
  assert.equal(await Acesso.usuarioDaSessao(ctx, cookie(anaOutroCelular.token)), null, 'o outro aparelho também sai');
  assert.ok(await Acesso.usuarioDaSessao(ctx, cookie(nova.token)), 'quem trocou continua logada');
  await assert.rejects(() => Acesso.entrar(ctx, { email: 'ana@exemplo.com', senha: SENHA, ip: '1.1.1.1' }), falhaCom('credenciais_invalidas'));
  assert.ok(await Acesso.entrar(ctx, { email: 'ana@exemplo.com', senha: 'senha nova 4567', ip: '1.1.1.1' }));

  const antes = await Acesso.entrar(ctx, { email: 'ana@exemplo.com', senha: 'senha nova 4567', ip: '1.1.1.1' });
  await Acesso.redefinirSenha(ctx, { email: 'ana@exemplo.com', senha: 'redefinida 8910' });
  assert.equal(await Acesso.usuarioDaSessao(ctx, cookie(antes.token)), null);

  const logada = await Acesso.entrar(ctx, { email: 'ana@exemplo.com', senha: 'redefinida 8910', ip: '1.1.1.1' });
  await Acesso.removerPessoa(ctx, { email: 'dona@exemplo.com' }, { email: 'ana@exemplo.com' });
  assert.equal(await Acesso.usuarioDaSessao(ctx, cookie(logada.token)), null, 'removida, não entra mais nem com a sessão que tinha');
  await assert.rejects(() => Acesso.entrar(ctx, { email: 'ana@exemplo.com', senha: 'redefinida 8910', ip: '1.1.1.1' }), falhaCom('credenciais_invalidas'));
  assert.ok(await Acesso.usuarioDaSessao(ctx, cookie(dona.token)), 'a dona não foi afetada');

});

test('sessão: remover e recriar a mesma pessoa não ressuscita a sessão antiga', async () => {
  const { ctx } = await preparar();
  await criarDona(ctx);
  for (let rodada = 0; rodada < 5; rodada += 1) {
    await Acesso.adicionarPessoa(ctx, { email: 'ana@exemplo.com', senha: SENHA });
    const antiga = await Acesso.entrar(ctx, { email: 'ana@exemplo.com', senha: SENHA, ip: '1.1.1.1' });
    assert.ok(await Acesso.usuarioDaSessao(ctx, cookie(antiga.token)));
    await Acesso.removerPessoa(ctx, { email: 'dona@exemplo.com' }, { email: 'ana@exemplo.com' });
    await Acesso.adicionarPessoa(ctx, { email: 'ana@exemplo.com', senha: SENHA });
    assert.equal(await Acesso.usuarioDaSessao(ctx, cookie(antiga.token)), null, `rodada ${rodada}`);
    await Acesso.removerPessoa(ctx, { email: 'dona@exemplo.com' }, { email: 'ana@exemplo.com' });
  }
});

test('trocar a senha exige a atual, conta como tentativa e confere a nova', async () => {
  const { ctx } = await preparar();
  await criarDona(ctx);
  const eu = { email: 'dona@exemplo.com' };
  await assert.rejects(() => Acesso.trocarSenha(ctx, eu, { atual: 'errada errada', nova: 'senha nova 4567', ip: '1.1.1.1' }), falhaCom('senha_atual_errada', 403));
  await assert.rejects(() => Acesso.trocarSenha(ctx, eu, { atual: undefined, nova: 'senha nova 4567', ip: '1.1.1.1' }), falhaCom('senha_atual_errada', 403));
  await assert.rejects(() => Acesso.trocarSenha(ctx, eu, { atual: SENHA, nova: 'curta', ip: '1.1.1.1' }), falhaCom('senha_curta', 400));
  await assert.rejects(() => Acesso.trocarSenha(ctx, eu, { atual: SENHA, nova: 123456789, ip: '1.1.1.1' }), falhaCom('senha_curta', 400));
  assert.ok(await Acesso.entrar(ctx, { email: 'dona@exemplo.com', senha: SENHA, ip: '1.1.1.1' }), 'a senha antiga segue valendo depois dos erros');

  for (let i = 0; i < 6; i += 1) await assert.rejects(() => Acesso.trocarSenha(ctx, eu, { atual: 'errada errada', nova: 'senha nova 4567', ip: '2.2.2.2' }));
  await assert.rejects(() => Acesso.trocarSenha(ctx, eu, { atual: SENHA, nova: 'senha nova 4567', ip: '2.2.2.2' }), falhaCom('muitas_tentativas', 429), 'não dá para adivinhar a senha atual por aqui');
});

test('equipe: dona adiciona, lista e remove; regras de duplicidade, limite e proteção da dona', async () => {
  const { ctx } = await preparar();
  await criarDona(ctx);
  const dona = { email: 'dona@exemplo.com' };

  assert.deepEqual(await Acesso.adicionarPessoa(ctx, { email: 'Ana@Exemplo.com', senha: SENHA }), { email: 'ana@exemplo.com', papel: 'equipe' });
  await assert.rejects(() => Acesso.adicionarPessoa(ctx, { email: 'ana@exemplo.com', senha: SENHA }), falhaCom('ja_existe', 409));
  await assert.rejects(() => Acesso.adicionarPessoa(ctx, { email: 'DONA@exemplo.com', senha: SENHA }), falhaCom('ja_existe', 409), 'não dá para sobrescrever a dona');
  await assert.rejects(() => Acesso.adicionarPessoa(ctx, { email: 'bia@exemplo.com', senha: 'curta' }), falhaCom('senha_curta', 400));
  await assert.rejects(() => Acesso.adicionarPessoa(ctx, { email: 'bia', senha: SENHA }), falhaCom('email_invalido', 400));

  const lista = await Acesso.listarEquipe(ctx);
  assert.deepEqual(lista.map((p) => [p.email, p.papel]), [['dona@exemplo.com', 'dono'], ['ana@exemplo.com', 'equipe']]);
  assert.deepEqual(Object.keys(lista[0]).sort(), ['criado', 'email', 'papel'], 'a lista nunca traz hash nem sal');

  await assert.rejects(() => Acesso.removerPessoa(ctx, dona, { email: 'dona@exemplo.com' }), falhaCom('nao_remover_a_si', 400));
  await assert.rejects(() => Acesso.removerPessoa(ctx, { email: 'ana@exemplo.com' }, { email: 'dona@exemplo.com' }), falhaCom('nao_remover_dono', 400));
  await assert.rejects(() => Acesso.removerPessoa(ctx, dona, { email: 'ninguem@exemplo.com' }), falhaCom('nao_encontrada', 404));
  await assert.rejects(() => Acesso.redefinirSenha(ctx, { email: 'ninguem@exemplo.com', senha: SENHA }), falhaCom('nao_encontrada', 404));
  await assert.rejects(() => Acesso.redefinirSenha(ctx, { email: 'ana@exemplo.com', senha: 'curta' }), falhaCom('senha_curta', 400));
  assert.deepEqual(await Acesso.removerPessoa(ctx, dona, { email: 'ANA@exemplo.com' }), { email: 'ana@exemplo.com' });

  for (let i = 1; i < 20; i += 1) await Acesso.adicionarPessoa(ctx, { email: `p${i}@exemplo.com`, senha: SENHA });
  await assert.rejects(() => Acesso.adicionarPessoa(ctx, { email: 'p20@exemplo.com', senha: SENHA }), falhaCom('equipe_cheia', 400));
});

test('as senhas não ficam guardadas: só uma assinatura com sal próprio, que depende do SEGREDO', async () => {
  const { t, ctx } = await preparar();
  await criarDona(ctx);
  await Acesso.adicionarPessoa(ctx, { email: 'ana@exemplo.com', senha: SENHA });
  const linhas = t.d1.sqlite.prepare('SELECT * FROM usuarios ORDER BY email').all();
  assert.equal(linhas.length, 2);
  for (const l of linhas) {
    assert.ok(!JSON.stringify(l).includes(SENHA), 'a senha não aparece em nenhum campo');
    assert.match(l.hash, /^[A-Za-z0-9_-]{43}$/);
    assert.match(l.sal, /^[A-Za-z0-9_-]{20,}$/);
  }
  assert.notEqual(linhas[0].hash, linhas[1].hash, 'mesma senha, sal diferente, assinatura diferente');

  // Quem copiar o banco, mas não tiver o SEGREDO, não confirma senhas: com outro SEGREDO a mesma conta não aceita a senha certa.
  const copia = { ...ctx, segredo: 'outro-segredo-diferente-bem-longo' };
  await assert.rejects(() => Acesso.entrar(copia, { email: 'ana@exemplo.com', senha: SENHA, ip: '1.1.1.1' }), falhaCom('credenciais_invalidas'));
});

test('cookies: HttpOnly, SameSite=Strict e Secure (só em https); saída apaga', async () => {
  const dentro = Acesso.cookieDeSessao('abc.def.ghi', true);
  assert.match(dentro, /^dpe_sessao=abc\.def\.ghi; Path=\/; HttpOnly; SameSite=Strict; Max-Age=1209600; Secure$/);
  assert.doesNotMatch(Acesso.cookieDeSessao('x', false), /Secure/);
  assert.match(Acesso.cookieDeSaida(true), /^dpe_sessao=; Path=\/; HttpOnly; SameSite=Strict; Max-Age=0; Secure$/);
  assert.equal(Acesso.valorDoCookie('a=1; dpe_sessao=zzz; b=2', 'dpe_sessao'), 'zzz');
  assert.equal(Acesso.valorDoCookie('xdpe_sessao=zzz', 'dpe_sessao'), '');
});

test('limparLimites esquece só bloqueios vencidos há mais de uma janela', async () => {
  const { t, ctx, relogio } = await preparar();
  await criarDona(ctx);
  await assert.rejects(() => Acesso.entrar(ctx, { email: 'dona@exemplo.com', senha: 'errada errada', ip: '1.1.1.1' }));
  assert.equal(t.d1.sqlite.prepare('SELECT COUNT(*) AS n FROM limites').get().n, 2);
  await Acesso.limparLimites(ctx);
  assert.equal(t.d1.sqlite.prepare('SELECT COUNT(*) AS n FROM limites').get().n, 2, 'ainda vale: fica');
  relogio.t += 31 * 60 * 1000;
  await Acesso.limparLimites(ctx);
  assert.equal(t.d1.sqlite.prepare('SELECT COUNT(*) AS n FROM limites').get().n, 0);
});
