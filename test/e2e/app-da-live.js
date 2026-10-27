/**
 * Teste de navegador do app da live (Chromium de verdade, contra o servidor de verdade e o banco de teste):
 *
 *   primeiro acesso → lançar peças → fila de espera → exportar → equipe (dona e pessoa da equipe em dois celulares) →
 *   trocar senha → sessão que cai → sem internet com reenvio → backup e restauração → sair apaga o que ficou no aparelho.
 *
 * O que é real: o HTML/JS/CSS do site, a política de segurança (CSP), o servidor (src/), o navegador.
 * O que é simulado: o banco (um SQLite com a interface do D1). Nada aqui prova o comportamento do Cloudflare de verdade.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { ADMIN_SENHA_DE_TESTE } from '../helpers/ecossistema.js';
import { TERMO_DO_SISTEMA_ANTIGO } from '../../scripts/proibidos.mjs';
import { abrirPagina } from './navegador.js';

const DONA = { email: 'dona@exemplo.com', senha: 'uma senha bem longa 123' };
const EQUIPE = { email: 'equipe@exemplo.com', senha: 'senha da equipe 456' };

const dinheiro = (texto) => new RegExp(String(texto).replace(/\$/g, '\\$').replace(/\s/g, '\\s'));

async function esperarPor(condicao, descricao, ms = 10_000) {
  const limite = Date.now() + ms;
  for (;;) {
    const r = await condicao();
    if (r) return r;
    if (Date.now() > limite) throw new Error(`Esperei ${ms / 1000} s por: ${descricao}`);
    await new Promise((ok) => setTimeout(ok, 100));
  }
}

/** O que está guardado no servidor (para conferir o que o app mandou de verdade). */
const lerDocumentos = (servidor, colecao) => servidor.eco.banco.listar(colecao).map(({ id, data }) => ({ id, ...data }));

async function entrar(pagina, { email, senha }) {
  await pagina.locator('input[type=email]').fill(email);
  await pagina.locator('input[type=password]').fill(senha);
  await pagina.getByRole('button', { name: 'Entrar', exact: true }).click();
}

const esperarOApp = (pagina) => pagina.getByRole('button', { name: 'Lançar peça' }).waitFor();

async function lancarPeca(pagina, { cliente, codigo, peca, valor, pago = false, fila = [] }) {
  await pagina.getByRole('button', { name: 'Lançar peça' }).click();
  await pagina.getByPlaceholder('Comece a digitar o nome').fill(cliente);
  await pagina.getByPlaceholder('12').fill(codigo);
  await pagina.getByPlaceholder('Blusa jeans').fill(peca);
  await pagina.getByPlaceholder('0,00').fill(valor);
  if (pago) await pagina.getByRole('button', { name: 'Pago', exact: true }).click();
  for (const nome of fila) {
    await pagina.getByPlaceholder('Quem fica esperando').fill(nome);
    await pagina.getByRole('button', { name: 'Entrar na fila' }).click();
  }
  await pagina.getByRole('button', { name: 'Salvar', exact: true }).click();
  await pagina.getByRole('button', { name: 'Salvar', exact: true }).waitFor({ state: 'detached' });
}

async function abrirConta(pagina) {
  await pagina.getByRole('button', { name: 'Conta', exact: true }).click();
  await pagina.getByText('Minha conta').waitFor();
}

async function chavesGuardadasNoAparelho(pagina) {
  return pagina.evaluate(
    () =>
      new Promise((ok, falha) => {
        const pedido = indexedDB.open('delas-pra-elas', 1);
        pedido.onerror = () => falha(pedido.error);
        pedido.onsuccess = () => {
          const consulta = pedido.result.transaction('kv').objectStore('kv').getAllKeys();
          consulta.onsuccess = () => ok(consulta.result);
        };
      }),
  );
}

/**
 * @param {{navegador: import('playwright').Browser, servidor: {url:string, eco:object}, passo: Function, capturar: Function}} contexto
 */
export async function testarAppDaLive({ navegador, servidor, passo, capturar }) {
  const dona = await abrirPagina(navegador);
  const p1 = dona.pagina;
  // Erros do servidor que o teste provoca de propósito (senha errada, sem permissão, sessão caída) aparecem no console do navegador.
  dona.problemas.permitir(/status of 40[0-9]/);

  /* ── a página ── */
  await passo('a página chega com política de segurança e sem script nem estilo escritos dentro dela', async () => {
    const resposta = await p1.request.get(`${servidor.url}/`);
    const csp = resposta.headers()['content-security-policy'] || '';
    assert.match(csp, /script-src 'self'(;|$)/);
    assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
    assert.match(csp, /frame-ancestors 'none'/);
    const html = await resposta.text();
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)/i, 'não pode haver <script> com código dentro da página');
    assert.doesNotMatch(html, /<style|\sstyle=/i, 'não pode haver estilo escrito dentro da página');
    assert.doesNotMatch(html, TERMO_DO_SISTEMA_ANTIGO);
  });

  /* ── primeiro acesso ── */
  await passo('sem nenhuma conta, o app pede o primeiro acesso', async () => {
    await p1.goto(`${servidor.url}/`);
    await p1.getByText('Primeiro acesso').waitFor();
    await capturar(p1, 'app-1-primeiro-acesso');
  });

  await passo('a senha de instalação errada é recusada', async () => {
    const campos = p1.locator('input');
    await campos.nth(0).fill('senha errada');
    await campos.nth(1).fill(DONA.email);
    await campos.nth(2).fill(DONA.senha);
    await campos.nth(3).fill(DONA.senha);
    await p1.getByRole('button', { name: 'Criar a conta e entrar' }).click();
    await p1.getByText('A senha de instalação não confere.').waitFor();
    assert.equal(servidor.eco.banco.d1.sqlite.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n, 0);
  });

  await passo('a senha de instalação certa cria a conta da dona e já entra no app', async () => {
    await p1.locator('input').nth(0).fill(ADMIN_SENHA_DE_TESTE);
    await p1.getByRole('button', { name: 'Criar a conta e entrar' }).click();
    await p1.getByText('Nenhuma peça lançada neste dia.').waitFor();
    const usuarios = servidor.eco.banco.d1.sqlite.prepare('SELECT * FROM usuarios').all();
    assert.equal(usuarios.length, 1);
    assert.equal(usuarios[0].papel, 'dono');
    assert.ok(!JSON.stringify(usuarios).includes(DONA.senha), 'a senha não pode ficar guardada no banco');
    await capturar(p1, 'app-2-vazio');
  });

  /* ── lançar peças ── */
  await passo('lançar uma peça: aparece na hora e vai para o servidor', async () => {
    await lancarPeca(p1, { cliente: 'Maria da Silva', codigo: '12', peca: 'Blusa jeans', valor: '45,90' });
    await p1.getByText('Blusa jeans').first().waitFor();
    assert.match(await p1.innerText('body'), dinheiro('R$ 45,90'));
    await esperarPor(() => lerDocumentos(servidor, 'vendas').length === 1, 'a venda chegar ao servidor');
    const [venda] = lerDocumentos(servidor, 'vendas');
    assert.equal(venda.peca, 'Blusa jeans');
    assert.equal(venda.valor, 45.9);
    assert.equal(venda.pago, false);
    assert.equal(lerDocumentos(servidor, 'clientes').length, 1);
    await capturar(p1, 'app-3-peca-lancada');
  });

  await passo('a mesma cliente (nome em letras diferentes) não vira ficha duplicada', async () => {
    await lancarPeca(p1, { cliente: 'maria da silva', codigo: '14', peca: 'Calça preta', valor: '80', pago: true });
    await esperarPor(() => lerDocumentos(servidor, 'vendas').length === 2, 'a segunda venda chegar ao servidor');
    assert.equal(lerDocumentos(servidor, 'clientes').length, 1);
    assert.match(await p1.innerText('body'), dinheiro('R$ 125,90'));
  });

  await passo('fila de espera: a peça passa para a próxima pessoa', async () => {
    await lancarPeca(p1, { cliente: 'Carla Dias', codigo: '15', peca: 'Vestido floral', valor: '120', fila: ['Ana Souza'] });
    await esperarPor(() => lerDocumentos(servidor, 'vendas').some((v) => v.peca === 'Vestido floral'), 'o vestido chegar ao servidor');
    const antes = lerDocumentos(servidor, 'vendas').find((v) => v.peca === 'Vestido floral');
    assert.equal(antes.fila.length, 1);
    await p1.getByRole('button', { name: /Vestido floral/ }).click();
    await p1.getByRole('button', { name: 'Passar para Ana Souza' }).click();
    await esperarPor(() => {
      const v = lerDocumentos(servidor, 'vendas').find((x) => x.peca === 'Vestido floral');
      return v && v.fila.length === 0 && v.clienteId !== antes.clienteId;
    }, 'a peça mudar de dona no servidor');
    const clientes = lerDocumentos(servidor, 'clientes');
    assert.deepEqual(clientes.map((c) => c.nome).sort(), ['Ana Souza', 'Carla Dias', 'Maria da Silva']);
    assert.equal(clientes.find((c) => c.nome === 'Ana Souza').id, lerDocumentos(servidor, 'vendas').find((v) => v.peca === 'Vestido floral').clienteId);
  });

  await passo('marcar como pago, editar e excluir peças', async () => {
    const maria = lerDocumentos(servidor, 'vendas').find((v) => v.peca === 'Blusa jeans');
    await p1.getByRole('button', { name: 'Marcar como pago' }).first().click();
    await esperarPor(() => lerDocumentos(servidor, 'vendas').filter((v) => v.pago).length === 2, 'o pagamento chegar ao servidor');

    await p1.getByRole('button', { name: /Blusa jeans/ }).click();
    await p1.getByPlaceholder('0,00').fill('50');
    await p1.getByRole('button', { name: 'Salvar alterações' }).click();
    await esperarPor(() => lerDocumentos(servidor, 'vendas').find((v) => v.id === maria.id).valor === 50, 'a edição chegar ao servidor');

    await p1.getByRole('button', { name: /Calça preta/ }).click();
    await p1.getByRole('button', { name: 'Excluir peça' }).click();
    await esperarPor(() => lerDocumentos(servidor, 'vendas').length === 2, 'a exclusão chegar ao servidor');
    assert.ok(!lerDocumentos(servidor, 'vendas').some((v) => v.peca === 'Calça preta'));
    await p1.getByText('Calça preta').waitFor({ state: 'detached' });
  });

  /* ── exportar ── */
  await passo('"Exportar lista dela" monta a mensagem do WhatsApp com os totais', async () => {
    await p1.getByRole('button', { name: 'Exportar lista dela' }).first().click();
    const texto = await p1.locator('textarea').inputValue();
    assert.match(texto, /Valor total: R\$\s*\d/);
    assert.match(texto, /Valor a pagar: R\$\s*\d/);
    await p1.getByRole('button', { name: 'Fechar' }).click();
  });

  await passo('"Exportar relatório do dia" baixa uma planilha .xlsx de verdade', async () => {
    await p1.getByRole('button', { name: 'Exportar relatório do dia' }).click();
    const [arquivo] = await Promise.all([p1.waitForEvent('download'), p1.getByRole('button', { name: 'Baixar planilha da live (.xlsx)' }).click()]);
    assert.match(arquivo.suggestedFilename(), /^live-\d{4}-\d{2}-\d{2}\.xlsx$/);
    const bytes = fs.readFileSync(await arquivo.path());
    assert.equal(bytes.subarray(0, 2).toString('latin1'), 'PK');
    for (const nome of ['[Content_Types].xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml']) {
      assert.ok(bytes.includes(Buffer.from(nome)), `a planilha não tem ${nome}`);
    }
    await p1.getByRole('button', { name: 'Fechar' }).click();
  });

  /* ── calendário, clientes, mensagem ── */
  await passo('o calendário mostra o mês com a live de hoje', async () => {
    await p1.getByRole('button', { name: 'Calendário', exact: true }).click();
    const mes = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(new Date());
    await p1.getByText(new RegExp(`^${mes}$`, 'i')).waitFor();
    await p1.getByText(/1 live · R\$/).waitFor();
    await p1.getByRole('button', { name: 'Live', exact: true }).click();
  });

  await passo('clientes: cadastrar com WhatsApp, buscar e editar', async () => {
    await p1.getByRole('button', { name: 'Clientes', exact: true }).click();
    await p1.getByRole('button', { name: 'Cadastrar cliente' }).click();
    await p1.locator('label:has-text("Nome") + input').fill('Beatriz Lima');
    await p1.getByPlaceholder('(55) 99999-9999').fill('(47) 99999-1234');
    await p1.getByRole('button', { name: 'Cadastrar', exact: true }).click();
    await esperarPor(() => lerDocumentos(servidor, 'clientes').some((c) => c.nome === 'Beatriz Lima'), 'a cliente chegar ao servidor');
    const beatriz = lerDocumentos(servidor, 'clientes').find((c) => c.nome === 'Beatriz Lima');
    assert.equal(beatriz.whatsapp, '(47) 99999-1234');
    assert.equal(beatriz.preExistente, true);
    await p1.getByRole('button', { name: 'Todas', exact: true }).click();
    await p1.getByPlaceholder('Buscar cliente').first().fill('beat');
    await p1.getByRole('button', { name: /Beatriz Lima/ }).waitFor();
    await p1.getByPlaceholder('Buscar cliente').first().fill('');
  });

  await passo('mensagem do WhatsApp personalizada fica guardada', async () => {
    await p1.getByRole('button', { name: 'Mensagem do WhatsApp' }).click();
    await p1.locator('textarea').first().fill('Oi, {nome}! Segue a lista da live de {data}.');
    await p1.getByRole('button', { name: 'Salvar mensagem' }).click();
    await esperarPor(() => (servidor.eco.banco.ler('config/geral') || {}).abertura === 'Oi, {nome}! Segue a lista da live de {data}.', 'a mensagem chegar ao servidor');
  });

  /* ── trocar a própria senha ── */
  await passo('trocar a própria senha: confere a atual e as duas novas', async () => {
    await abrirConta(p1);
    await p1.getByRole('button', { name: 'Trocar minha senha' }).click();
    const campos = p1.locator('input[type=password]');
    await campos.nth(0).fill('senha atual errada');
    await campos.nth(1).fill('outra senha nova 789');
    await campos.nth(2).fill('outra senha nova 789');
    await p1.getByRole('button', { name: 'Trocar a senha' }).click();
    await p1.getByText('A senha atual não confere.').waitFor();
    await campos.nth(0).fill(DONA.senha);
    await campos.nth(2).fill('diferente da outra');
    await p1.getByRole('button', { name: 'Trocar a senha' }).click();
    await p1.getByText('As duas senhas novas não são iguais.').waitFor();
    await campos.nth(2).fill('outra senha nova 789');
    await p1.getByRole('button', { name: 'Trocar a senha' }).click();
    await p1.getByText('Senha trocada').waitFor();
    DONA.senha = 'outra senha nova 789'; // daqui em diante vale a nova
    // continua logada: trocar a própria senha não derruba a própria sessão
    await p1.getByRole('button', { name: 'Conta', exact: true }).waitFor();
  });

  /* ── equipe, em dois celulares ── */
  await passo('a dona cadastra uma pessoa da equipe', async () => {
    await abrirConta(p1);
    await p1.getByRole('button', { name: 'Equipe do app' }).click();
    await p1.getByText('Adicionar uma pessoa').waitFor();
    await p1.getByPlaceholder('E-mail dela').fill(EQUIPE.email);
    await p1.getByPlaceholder(/^Senha para ela/).fill('curta');
    await p1.getByRole('button', { name: 'Adicionar', exact: true }).click();
    await p1.getByText('A senha precisa ter pelo menos 8 caracteres.').waitFor();
    await p1.getByPlaceholder(/^Senha para ela/).fill(EQUIPE.senha);
    await p1.getByRole('button', { name: 'Adicionar', exact: true }).click();
    await p1.getByText(EQUIPE.email).waitFor();
    await capturar(p1, 'app-4-equipe');
    await p1.getByRole('button', { name: 'Fechar' }).click();
  });

  const equipe = await abrirPagina(navegador);
  const p2 = equipe.pagina;
  equipe.problemas.permitir(/status of 40[0-9]/);

  await passo('a pessoa da equipe entra, vê os dados e não vê o que é só da dona', async () => {
    await p2.goto(`${servidor.url}/`);
    await p2.getByText('Controle de vendas da live.').waitFor();
    await entrar(p2, { email: EQUIPE.email, senha: 'senha errada qualquer' });
    await p2.getByText('E-mail ou senha não confere.').waitFor();
    await entrar(p2, EQUIPE);
    await esperarOApp(p2);
    await p2.getByText('Maria da Silva').waitFor();
    await abrirConta(p2);
    assert.ok(await p2.getByRole('button', { name: 'Trocar minha senha' }).isVisible());
    for (const nome of ['Equipe do app', 'Restaurar backup antigo']) assert.equal(await p2.getByRole('button', { name: nome }).count(), 0, `a equipe não pode ver "${nome}"`);
    assert.equal(await p2.getByRole('link', { name: 'Abrir Fretes' }).count(), 0);
    await p2.getByRole('button', { name: 'Fechar' }).click();
    // e o servidor também recusa, mesmo que alguém chame a rota na mão
    const recusas = await p2.evaluate(async () => {
      const chamar = (caminho, metodo = 'GET', corpo) =>
        fetch(caminho, { method: metodo, headers: corpo ? { 'Content-Type': 'application/json' } : {}, body: corpo ? JSON.stringify(corpo) : undefined }).then(async (r) => (await r.text(), r.status));
      return [await chamar('/api/equipe'), await chamar('/api/equipe/adicionar', 'POST', { email: 'x@y.com', senha: 'senha comprida 1' }), await chamar('/api/admin/listarFretes', 'POST', {})];
    });
    assert.deepEqual(recusas, [403, 403, 403]);
  });

  await passo('o que uma pessoa lança aparece no celular da outra, sem recarregar', async () => {
    await p1.getByRole('button', { name: 'Live', exact: true }).click();
    await lancarPeca(p2, { cliente: 'Helena Prado', codigo: '21', peca: 'Casaco de lã', valor: '150' });
    await p1.getByText('Casaco de lã').waitFor({ timeout: 15_000 });
    await lancarPeca(p1, { cliente: 'Helena Prado', codigo: '22', peca: 'Cachecol', valor: '35' });
    await p2.getByText('Cachecol').waitFor({ timeout: 15_000 });
    assert.equal(lerDocumentos(servidor, 'clientes').filter((c) => c.nome === 'Helena Prado').length, 1, 'a mesma cliente não pode virar duas fichas');
    await capturar(p2, 'app-5-equipe-no-celular');
  });

  await passo('a dona troca a senha da pessoa: a sessão dela cai e só a senha nova entra', async () => {
    await abrirConta(p1);
    await p1.getByRole('button', { name: 'Equipe do app' }).click();
    await p1.getByRole('button', { name: 'Nova senha' }).click();
    await p1.getByPlaceholder(/^Senha nova/).fill('senha nova da equipe 1');
    await p1.getByRole('button', { name: 'Salvar a senha nova' }).click();
    await p1.getByText('Senha trocada. Ela precisa entrar de novo.').first().waitFor();
    await p1.getByRole('button', { name: 'Fechar' }).click();
    await p2.getByText('Sua sessão acabou').waitFor({ timeout: 15_000 });
    await entrar(p2, EQUIPE);
    await p2.getByText('E-mail ou senha não confere.').waitFor();
    EQUIPE.senha = 'senha nova da equipe 1';
    await entrar(p2, EQUIPE);
    await esperarOApp(p2);
  });

  await passo('a dona remove a pessoa: a sessão cai e ela não entra mais', async () => {
    await abrirConta(p1);
    await p1.getByRole('button', { name: 'Equipe do app' }).click();
    await p1.getByRole('button', { name: 'Remover' }).click();
    await p1.getByText(/perde o acesso na hora/).waitFor();
    await p1.getByRole('button', { name: 'Remover', exact: true }).last().click();
    await p1.getByText('Pessoa removida').first().waitFor();
    await p1.getByRole('button', { name: 'Fechar' }).click();
    await p2.getByText('Sua sessão acabou').waitFor({ timeout: 15_000 });
    await entrar(p2, EQUIPE);
    await p2.getByText('E-mail ou senha não confere.').waitFor();
    await equipe.contexto.close();
  });

  /* ── sem internet e sessão que cai ── */
  await passo('sem internet: a peça fica guardada no celular e sobe sozinha quando a conexão volta', async () => {
    dona.problemas.permitir(/ERR_INTERNET_DISCONNECTED/);
    await dona.contexto.setOffline(true);
    await lancarPeca(p1, { cliente: 'Ana Souza', codigo: '30', peca: 'Saia midi offline', valor: '30' });
    await p1.getByText('Saia midi offline').first().waitFor();
    await p1.getByText(/Sem internet\. 1 alteração guardada no celular/).waitFor({ timeout: 20_000 });
    await capturar(p1, 'app-6-sem-internet');
    assert.ok(!lerDocumentos(servidor, 'vendas').some((v) => v.peca === 'Saia midi offline'));
    await dona.contexto.setOffline(false);
    await esperarPor(() => lerDocumentos(servidor, 'vendas').some((v) => v.peca === 'Saia midi offline'), 'a peça subir depois da conexão voltar', 45_000);
    await p1.getByText(/Sem internet/).waitFor({ state: 'detached', timeout: 20_000 });
  });

  await passo('sessão que cai com peça na fila: pede o login de novo e não perde nada', async () => {
    await dona.contexto.setOffline(true);
    await lancarPeca(p1, { cliente: 'Ana Souza', codigo: '31', peca: 'Bolsa na fila', valor: '60' });
    await dona.contexto.clearCookies(); // como se a sessão tivesse vencido enquanto estava sem internet
    await dona.contexto.setOffline(false);
    await p1.getByText('Sua sessão acabou').waitFor({ timeout: 45_000 });
    assert.ok(!lerDocumentos(servidor, 'vendas').some((v) => v.peca === 'Bolsa na fila'), 'sem login, nada pode ter sido aceito');
    await capturar(p1, 'app-7-sessao-acabou');
    await entrar(p1, DONA);
    await esperarPor(() => lerDocumentos(servidor, 'vendas').some((v) => v.peca === 'Bolsa na fila'), 'a peça da fila subir depois do login', 30_000);
  });

  /* ── backup e restauração ── */
  let textoDoBackup = '';
  await passo('"Baixar backup dos dados" gera o arquivo com tudo, menos as fotos', async () => {
    await p1.getByRole('button', { name: 'Clientes', exact: true }).click();
    await p1.getByRole('button', { name: 'Baixar backup dos dados' }).click();
    const [arquivo] = await Promise.all([p1.waitForEvent('download'), p1.getByRole('button', { name: 'Baixar arquivo do backup' }).click()]);
    assert.match(arquivo.suggestedFilename(), /^backup-delas-pra-elas-\d{4}-\d{2}-\d{2}\.json$/);
    textoDoBackup = fs.readFileSync(await arquivo.path(), 'utf8');
    const backup = JSON.parse(textoDoBackup);
    assert.equal(backup.clientes.length, lerDocumentos(servidor, 'clientes').length);
    assert.equal(backup.vendas.length, lerDocumentos(servidor, 'vendas').length);
    await p1.getByRole('button', { name: 'Fechar' }).click();
  });

  await passo('restaurar um backup antigo: confere, ignora o que está incompleto e grava o resto', async () => {
    const backup = JSON.parse(textoDoBackup);
    backup.clientes.push({ id: 'cliAntiga0000000001', nome: 'Beatriz Antiga', whatsapp: '(47) 99999-1111', preExistente: true, criadaEm: '2025-01-10' });
    backup.vendas.push({ id: 'venAntiga0000000001', data: '2025-01-10', criadaEm: 1736510400000, clienteId: 'cliAntiga0000000001', codigo: '7', peca: 'Bolsa de couro', valor: 59.9, pago: true, fila: [], temFoto: false });
    backup.vendas.push({ id: 'venQuebrada000000001', data: 'ontem', peca: '', valor: 'abc', clienteId: 'cliAntiga0000000001' });
    const clientesAntes = lerDocumentos(servidor, 'clientes').length;
    const vendasAntes = lerDocumentos(servidor, 'vendas').length;

    await abrirConta(p1);
    await p1.getByRole('button', { name: 'Restaurar backup antigo' }).click();
    await p1.locator('textarea').fill('isto não é um backup');
    await p1.getByRole('button', { name: 'Conferir o backup' }).click();
    await p1.getByText(/não é um backup do app/).waitFor();
    await p1.locator('textarea').fill(JSON.stringify(backup));
    await p1.getByRole('button', { name: 'Conferir o backup' }).click();
    await p1.getByText(new RegExp(`Encontrei ${clientesAntes + 1} clientes e ${vendasAntes + 1} vendas\\.`)).waitFor();
    await p1.getByText(/1 item foi ignorado/).waitFor();
    await p1.getByRole('button', { name: 'Restaurar agora' }).click();
    await p1.getByText(/^Pronto: /).waitFor();
    assert.equal(lerDocumentos(servidor, 'clientes').length, clientesAntes + 1);
    assert.equal(lerDocumentos(servidor, 'vendas').length, vendasAntes + 1);
    const antiga = lerDocumentos(servidor, 'vendas').find((v) => v.id === 'venAntiga0000000001');
    assert.equal(antiga.peca, 'Bolsa de couro');
    assert.equal(antiga.valor, 59.9);
    assert.ok(!lerDocumentos(servidor, 'vendas').some((v) => v.id === 'venQuebrada000000001'));
    await capturar(p1, 'app-8-restaurado');
    await p1.getByRole('button', { name: 'Fechar' }).click();
    // restaurar de novo não duplica nada
    await abrirConta(p1);
    await p1.getByRole('button', { name: 'Restaurar backup antigo' }).click();
    await p1.locator('textarea').fill(JSON.stringify(backup));
    await p1.getByRole('button', { name: 'Conferir o backup' }).click();
    await p1.getByRole('button', { name: 'Restaurar agora' }).click();
    await p1.getByText(/^Pronto: /).waitFor();
    assert.equal(lerDocumentos(servidor, 'vendas').length, vendasAntes + 1);
    await p1.getByRole('button', { name: 'Fechar' }).click();
  });

  /* ── sair ── */
  await passo('sair apaga do aparelho os dados e a fila, e volta para o login', async () => {
    assert.ok((await chavesGuardadasNoAparelho(p1)).length > 0, 'antes de sair, o aparelho guarda uma cópia');
    await abrirConta(p1);
    await p1.getByRole('button', { name: 'Sair', exact: true }).click();
    await p1.getByText('Controle de vendas da live.').waitFor();
    assert.deepEqual(await chavesGuardadasNoAparelho(p1), [], 'depois de sair, não pode sobrar nada no aparelho');
    const semLogin = await p1.evaluate(() => fetch('/api/app/estado?desde=0').then(async (r) => (await r.text(), r.status)));
    assert.equal(semLogin, 401);
    await p1.reload();
    await p1.getByText('Controle de vendas da live.').waitFor();
    await entrar(p1, DONA);
    await esperarOApp(p1);
    await p1.getByText('Helena Prado').first().waitFor();
  });

  await passo('em todo o teste, nenhum erro de JavaScript, nenhuma violação de segurança e nenhum pedido que falhou sem querer', async () => {
    assert.deepEqual(await dona.problemas.lista(), []);
    assert.deepEqual(await equipe.problemas.lista(), []);
  });

  await dona.contexto.close();
}
