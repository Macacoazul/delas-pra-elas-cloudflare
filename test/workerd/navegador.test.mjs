/**
 * O Delas pra Elas aberto num navegador de verdade (Chromium), servido pelos arquivos GERADOS (para-colar/) rodando no
 * motor do Cloudflare (workerd), com o banco D1 de brinquedo do wrangler. É o teste mais parecido com o uso real:
 *
 *   primeiro acesso pela tela → lançar uma peça → entrar em outro celular e ver a peça (veio do banco, não do aparelho) →
 *   Fretes: a dona cria o link → a cliente escolhe o frete e gera o Pix → o Mercado Pago avisa → a dona gera a etiqueta.
 *
 * Melhor Envio, Mercado Pago e ViaCEP são simuladores na própria máquina. Se o Playwright não estiver instalado, o teste é
 * pulado. Antes de rodar: npm run colar
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';

import { Mocks } from '../helpers/mocks.js';
import { CONFIG_BASE, CPF_CLIENTE, CPF_LOJA } from '../helpers/ambiente.js';
import { abrirPagina, carregarPlaywright, iniciarNavegador } from '../e2e/navegador.js';
import { iniciarWorkerLocal } from './worker-local.mjs';

const SEGREDO = 'segredo-do-navegador-no-workerd-com-mais-de-vinte-letras';
const SENHA_DE_INSTALACAO = 'senha-de-instalacao-do-navegador';
const DONA = { email: 'dona@exemplo.com', senha: 'uma senha bem longa 123' };

let temPlaywright = true;
try {
  carregarPlaywright();
} catch {
  temPlaywright = false;
}
const PULAR = temPlaywright ? false : 'Playwright não está instalado (npm install --no-save playwright && npx playwright install chromium)';

let mocks;
let worker;
let navegador;
const celulares = []; // todos os "celulares" abertos, para conferir no fim que nenhum teve erro
const estado = {}; // o que um passo entrega ao próximo

before(async () => {
  if (!temPlaywright) return;
  mocks = await new Mocks().iniciar();
  mocks.baseImpressao = 'https://sandbox.melhorenvio.com.br'; // a Melhor Envio de verdade entrega links https
  worker = await iniciarWorkerLocal({ segredo: SEGREDO, senhaDeInstalacao: SENHA_DE_INSTALACAO, enderecos: mocks.urls });
  navegador = await iniciarNavegador();
});

after(async () => {
  if (navegador) await navegador.close();
  if (worker) await worker.parar();
  if (mocks) await mocks.parar();
  setTimeout(() => process.exit(0), 300).unref();
});

/** Abre um celular (perfil novo) que vigia erros de JavaScript, violações de segurança e pedidos que falharam sem querer. */
async function novoCelular(nome) {
  const celular = await abrirPagina(navegador);
  celular.problemas.permitir(/status of 40[0-9]/); // recusas esperadas do servidor (senha errada, sem permissão…)
  celular.nome = nome;
  celulares.push(celular);
  return celular;
}

const ver = (pagina, alvo, ms = 10_000) => pagina.getByText(alvo).first().waitFor({ state: 'visible', timeout: ms });

async function esperarPor(condicao, descricao, ms = 10_000) {
  const limite = Date.now() + ms;
  for (;;) {
    const r = await condicao();
    if (r) return r;
    if (Date.now() > limite) throw new Error(`Esperei ${ms / 1000} s por: ${descricao}`);
    await new Promise((ok) => setTimeout(ok, 100));
  }
}

async function lancarPeca(pagina, { cliente, codigo, peca, valor }) {
  await pagina.getByRole('button', { name: 'Lançar peça' }).click();
  await pagina.getByPlaceholder('Comece a digitar o nome').fill(cliente);
  await pagina.getByPlaceholder('12').fill(codigo);
  await pagina.getByPlaceholder('Blusa jeans').fill(peca);
  await pagina.getByPlaceholder('0,00').fill(valor);
  await pagina.getByRole('button', { name: 'Salvar', exact: true }).click();
  await pagina.getByRole('button', { name: 'Salvar', exact: true }).waitFor({ state: 'detached' });
}

/** Um comando da dona, pelo mesmo caminho que a tela usa (a sessão vem do cookie do celular dela). */
async function comandoDaDona(celular, nome, dados) {
  const r = await celular.contexto.request.post(`${worker.base}/api/admin/${nome}`, { data: dados });
  assert.equal(r.status(), 200, `${nome}: ${await r.text()}`);
  return (await r.json()).data;
}

test('navegador no Workers: primeiro acesso pela tela e a primeira peça', { skip: PULAR }, async () => {
  const dona = await novoCelular('dona');
  estado.dona = dona;
  const p = dona.pagina;
  const resposta = await p.request.get(`${worker.base}/`);
  const csp = resposta.headers()['content-security-policy'] || '';
  assert.match(csp, /script-src 'self'(;|$)/);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);

  await p.goto(`${worker.base}/`);
  await p.getByText('Primeiro acesso').waitFor();
  const campos = p.locator('input');
  await campos.nth(0).fill('senha errada');
  await campos.nth(1).fill(DONA.email);
  await campos.nth(2).fill(DONA.senha);
  await campos.nth(3).fill(DONA.senha);
  await p.getByRole('button', { name: 'Criar a conta e entrar' }).click();
  await p.getByText('A senha de instalação não confere.').waitFor();

  await campos.nth(0).fill(SENHA_DE_INSTALACAO);
  await p.getByRole('button', { name: 'Criar a conta e entrar' }).click();
  await p.getByText('Nenhuma peça lançada neste dia.').waitFor();

  await lancarPeca(p, { cliente: 'Maria da Silva', codigo: '12', peca: 'Blusa jeans', valor: '45,90' });
  await p.getByText('Blusa jeans').first().waitFor();
  assert.match(await p.innerText('body'), /R\$\s45,90/);
});

test('navegador no Workers: a peça foi para o banco — outro celular entra e vê', { skip: PULAR }, async () => {
  const { dona } = estado;
  await esperarPor(async () => {
    const r = await dona.contexto.request.get(`${worker.base}/api/app/estado?desde=0`);
    return (await r.text()).includes('Blusa jeans');
  }, 'a peça chegar ao banco do servidor');

  const outro = await novoCelular('outro-celular');
  const p = outro.pagina;
  await p.goto(`${worker.base}/`);
  await p.locator('input[type=email]').fill(DONA.email);
  await p.locator('input[type=password]').fill(DONA.senha);
  await p.getByRole('button', { name: 'Entrar', exact: true }).click();
  await p.getByRole('button', { name: 'Lançar peça' }).waitFor();
  await ver(p, 'Blusa jeans');

  await dona.pagina.reload();
  await dona.pagina.getByRole('button', { name: 'Lançar peça' }).waitFor();
  await ver(dona.pagina, 'Blusa jeans');
  await outro.contexto.close();
});

test('navegador no Workers: a tela de Fretes abre e a dona cria o link', { skip: PULAR }, async () => {
  const { dona } = estado;
  const adm = dona.pagina;

  // Chaves e ajustes: como se ela tivesse preenchido as telas Conexões e Ajustes.
  await comandoDaDona(dona, 'salvarCredenciais', {
    melhorEnvio: { token: mocks.meToken, ambiente: 'sandbox', emailContato: 'contato@exemplo.com' },
    mercadoPago: { accessToken: mocks.mpToken, webhookSecret: mocks.mpSecret },
    remetenteDocumento: CPF_LOJA,
  });
  await comandoDaDona(dona, 'salvarAjustes', { ...CONFIG_BASE });

  await adm.goto(`${worker.base}/fretes.html`);
  await ver(adm, 'Nenhum frete ainda');
  await adm.waitForTimeout(800); // os avisos de configuração aparecem logo depois de a tela conferir as conexões
  assert.equal(await adm.getByText(/Falta (conectar|informar)/).count(), 0, 'sem avisos de configuração');

  await adm.getByRole('button', { name: 'Novo frete' }).click();
  await adm.getByPlaceholder('Nome da cliente').fill('mar');
  await adm.getByRole('button', { name: /^Maria da Silva/ }).click();
  await adm.getByPlaceholder('(47) 99999-9999').fill('47999998888');
  await adm.getByRole('button', { name: /Média/ }).click();
  await adm.getByRole('button', { name: '1 kg', exact: true }).click();
  await adm.getByRole('button', { name: 'Gerar link' }).click();
  await ver(adm, 'Link pronto');
  const texto = await adm.locator('span', { hasText: /\/f\// }).first().textContent();
  const m = texto.match(/^https:\/\/loja-teste\.workers\.dev\/f\/([A-Za-z0-9_-]{32})$/);
  assert.ok(m, `link inesperado: ${texto}`);
  estado.token = m[1];
  await adm.getByRole('button', { name: 'Concluir' }).click();
  await ver(adm, 'Aguardando a cliente abrir o link', 8000);
});

test('navegador no Workers: a cliente abre o link, escolhe o frete e gera o Pix', { skip: PULAR }, async () => {
  const cliente = await novoCelular('cliente');
  estado.cliente = cliente;
  const cli = cliente.pagina;
  await cli.goto(`${worker.base}/f/${estado.token}`);
  await ver(cli, 'Oi, Maria!');
  await ver(cli, 'Seu pacote: 32 × 25 × 10 cm · 1 kg');

  await cli.locator('#cep').fill('01310100');
  assert.equal(await cli.locator('#cep').inputValue(), '01310-100');
  await cli.getByRole('button', { name: 'Ver opções de frete' }).click();
  await ver(cli, 'Escolha o envio');
  await ver(cli, /São Paulo \/ SP/);
  assert.equal(await cli.locator('button.opcao').count(), 4);

  await cli.locator('button.opcao').first().click();
  await cli.getByRole('button', { name: 'Continuar' }).click();
  await ver(cli, 'Seus dados');
  await cli.locator('#nome').fill('Maria da Silva');
  await cli.locator('#telefone').fill('47999998888');
  await cli.locator('#email').fill('maria@exemplo.com');
  await cli.locator('#cpf').fill(CPF_CLIENTE);
  await cli.locator('#numero').fill('250');
  await cli.getByRole('button', { name: /Gerar Pix de/ }).click();
  await ver(cli, 'Pague o frete com Pix', 15_000);
  const codigo = await cli.locator('textarea.codigo').inputValue();
  assert.ok(codigo.startsWith('000201'), codigo.slice(0, 20));
  assert.ok((await cli.locator('.pix img').getAttribute('src')).startsWith('data:image/png;base64,'), 'QR Code como imagem embutida');
});

test('navegador no Workers: o Mercado Pago avisa — a dona é avisada, a cliente vê "pago" e a dona gera a etiqueta', { skip: PULAR }, async () => {
  const { dona, cliente } = estado;
  const adm = dona.pagina;
  const idPix = mocks.ultimoPagamento().id;
  await ver(adm, 'Aguardando o Pix', 15_000);

  mocks.aprovar(idPix);
  const aviso = await fetch(`${worker.base}/api/mp/webhook?data.id=${idPix}&type=payment`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...mocks.assinar(idPix) },
    body: JSON.stringify({ type: 'payment', data: { id: idPix } }),
  });
  assert.equal(aviso.status, 200);
  await ver(adm, /Maria pagou o frete!/, 12_000);
  await ver(cliente.pagina, 'Frete pago, obrigada!', 20_000);

  await adm.locator('button', { hasText: 'Maria da Silva' }).first().click();
  await ver(adm, /Pago em/);
  await adm.getByRole('button', { name: 'Gerar etiqueta', exact: true }).click();
  const abrir = adm.getByRole('link', { name: 'Abrir etiqueta para imprimir' });
  await abrir.waitFor({ state: 'visible', timeout: 20_000 });
  assert.match(await abrir.getAttribute('href'), /^https:\/\/sandbox\.melhorenvio\.com\.br\/me\/imprimir\/pub/);
  assert.equal(await abrir.getAttribute('rel'), 'noopener noreferrer');

  await cliente.pagina.reload();
  await ver(cliente.pagina, 'Seu pedido está quase saindo');
});

test('navegador no Workers: nenhum erro de JavaScript, nenhuma violação de segurança e nenhum pedido que falhou sem querer', { skip: PULAR }, async () => {
  const achados = [];
  for (const c of celulares) achados.push(...(await c.problemas.lista()).map((p) => `[${c.nome}] ${p}`));
  assert.deepEqual(achados, []);

  const registro = worker.saida();
  for (const segredo of [mocks.meToken, mocks.mpToken, mocks.mpSecret, SEGREDO, SENHA_DE_INSTALACAO, DONA.senha, CPF_CLIENTE, CPF_LOJA]) assert.ok(!registro.includes(segredo), `o registro do Worker mostrou "${segredo.slice(0, 12)}…"`);
});
