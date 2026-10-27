/**
 * Teste de navegador dos Fretes (Chromium de verdade, contra o servidor de verdade):
 *
 *   a dona cria o link → a cliente abre, digita o CEP, escolhe o frete e recebe o Pix → o Pix é pago (aviso do Mercado Pago) →
 *   a dona é avisada e gera a etiqueta → postagem e entrega aparecem para as duas → cancelar, Pix vencido, links inválidos,
 *   quem não pode abrir a tela, ajustes, conexões e sessão que cai.
 *
 * O que é real: as duas páginas (fretes.html + fretes.js e frete.html + frete.js), a entrega do site, a política de segurança,
 * as regras do servidor (src/) e o navegador. O que é simulado: o banco (SQLite com a interface do D1) e o ViaCEP, a Melhor
 * Envio e o Mercado Pago (simuladores). Não prova nada sobre os serviços verdadeiros.
 */
import assert from 'node:assert/strict';

import { CPF_CLIENTE } from '../helpers/ambiente.js';
import { ADMIN_SENHA_DE_TESTE, EMAIL_DA_DONA, SENHA_DA_DONA } from '../helpers/ecossistema.js';
import { abrirPagina } from './navegador.js';

const EQUIPE = { email: 'equipe@exemplo.com', senha: 'senha da equipe 456' };

const ver = (pagina, alvo, ms = 10_000) => pagina.getByText(alvo).first().waitFor({ state: 'visible', timeout: ms });
async function naoVer(pagina, alvo, ms = 800) {
  await pagina.waitForTimeout(ms);
  assert.equal(await pagina.getByText(alvo).count(), 0, `não deveria aparecer: ${alvo}`);
}

/** Guarda os caminhos que a página pediu ao servidor (para provar o que ela NÃO pediu). */
function vigiarPedidos(pagina) {
  const caminhos = [];
  pagina.on('request', (r) => caminhos.push(new URL(r.url()).pathname));
  return caminhos;
}

/**
 * @param {{navegador: import('playwright').Browser, servidor: {url:string, eco:object, pedidos:object[], avancar:Function}, passo: Function, capturar: Function}} contexto
 */
export async function testarFretes({ navegador, servidor, passo, capturar }) {
  const { eco } = servidor;
  const pedidosPublicos = () => servidor.pedidos.filter((p) => p.caminho.startsWith('/api/frete/'));
  const acumulados = []; // problemas vistos em cada celular, juntados antes de fechá-lo

  /** Abre um "celular" (perfil novo) que vigia erros de JavaScript, violações de segurança e pedidos que falharam. */
  async function novoCelular(nome) {
    const celular = await abrirPagina(navegador);
    celular.problemas.permitir(/status of 40[0-9]/); // o teste provoca recusas de propósito (link cancelado, CPF errado, sem login…)
    celular.nome = nome;
    celular.fechar = async () => {
      acumulados.push(...(await celular.problemas.lista()).map((p) => `[${nome}] ${p}`));
      await celular.contexto.close();
    };
    return celular;
  }

  /** Cria a conta da dona (e, se pedido, uma pessoa da equipe) direto pela API, e deixa o celular já logado. */
  async function logar(celular, { email, senha }) {
    const r = await celular.contexto.request.post(`${servidor.url}/api/auth/entrar`, { data: { email, senha } });
    assert.equal(r.status(), 200, `não consegui entrar como ${email}`);
  }

  // A dona e a equipe (contas criadas pela API: o fluxo de tela do primeiro acesso já é testado no app da live).
  const conta = await novoCelular('dona');
  const resposta = await conta.contexto.request.post(`${servidor.url}/api/auth/primeiro-acesso`, { data: { chave: ADMIN_SENHA_DE_TESTE, email: EMAIL_DA_DONA, senha: SENHA_DA_DONA } });
  assert.equal(resposta.status(), 200);
  const equipeCriada = await conta.contexto.request.post(`${servidor.url}/api/equipe/adicionar`, { data: EQUIPE });
  assert.equal(equipeCriada.status(), 200);

  // Dados do app da live que a tela de Fretes consulta: clientes e peças.
  eco.banco.gravar('clientes/c1', { nome: 'Maria da Silva', whatsapp: '47999998888', preExistente: false, criadaEm: '2026-09-01' });
  eco.banco.gravar('clientes/c2', { nome: 'Mariana Souza', whatsapp: '', preExistente: true, criadaEm: '2026-09-01' });
  eco.banco.gravar('vendas/v0', { clienteId: 'c1', data: '2026-09-01', valor: 30, peca: 'Blusa', pago: true, criadaEm: 1 });
  eco.banco.gravar('vendas/v1', { clienteId: 'c1', data: '2026-10-08', valor: 187, peca: 'Vestido', pago: true, criadaEm: 2 });
  eco.banco.gravar('vendas/v2', { clienteId: 'c1', data: '2026-10-08', valor: 50, peca: 'Saia', pago: true, criadaEm: 3 });
  eco.mocks.baseImpressao = 'https://sandbox.melhorenvio.com.br'; // a Melhor Envio de verdade entrega links https

  /** Chama um comando da dona pela API (como a tela faz), para preparar fretes extras. */
  const comandoDaDona = async (nome, dados) => {
    const r = await conta.contexto.request.post(`${servidor.url}/api/admin/${nome}`, { data: dados });
    assert.equal(r.status(), 200, `${nome}: ${await r.text()}`);
    return (await r.json()).data;
  };
  /** Rotas da cliente (públicas, sem login): o mesmo que a página dela chama. */
  const rotaDaCliente = async (caminho, corpo) => {
    const r = await fetch(`${servidor.url}/api/frete/${caminho}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
    return { status: r.status, corpo: await r.json() };
  };

  const adm = conta.pagina;
  const respostasDaTela = []; // tudo o que a tela da dona recebeu dos comandos
  adm.on('response', async (r) => {
    if (r.url().includes('/api/admin/')) respostasDaTela.push(await r.text().catch(() => ''));
  });

  let linkDaCliente = '';
  let freteId = '';
  let token = '';

  /* ── a dona cria o link ── */
  await passo('a tela de Fretes abre logada, sem avisos de configuração', async () => {
    await adm.goto(`${servidor.url}/fretes.html`);
    await ver(adm, 'Nenhum frete ainda');
    await naoVer(adm, /Falta (conectar|informar)/);
    await capturar(adm, 'fretes-1-vazio');
  });

  await passo('novo frete: acha a cliente, sugere o valor da live, escolhe caixa e peso', async () => {
    await adm.getByRole('button', { name: 'Novo frete' }).click();
    await adm.getByPlaceholder('Nome da cliente').fill('mar');
    await ver(adm, 'Mariana Souza');
    await adm.getByRole('button', { name: /^Maria da Silva/ }).click();
    const sugestao = adm.getByRole('button', { name: /R\$\s237,00 · peças da live de 08\/10/ });
    await sugestao.waitFor({ state: 'visible', timeout: 8000 });
    await sugestao.click();
    assert.equal(await adm.locator('input[inputmode=decimal]').nth(1).inputValue(), '237,00');
    await adm.getByRole('button', { name: /Média/ }).click();
    await adm.getByRole('button', { name: '1 kg', exact: true }).click();
    assert.equal(await adm.locator('input[inputmode=decimal]').first().inputValue(), '1');
    await capturar(adm, 'fretes-2-novo-frete');
  });

  await passo('gera o link (no endereço do site configurado) e prepara o WhatsApp', async () => {
    await adm.getByRole('button', { name: 'Gerar link' }).click();
    await ver(adm, 'Link pronto');
    const texto = await adm.locator('span', { hasText: /\/f\// }).first().textContent();
    const m = texto.match(/^https:\/\/loja-teste\.workers\.dev\/f\/([A-Za-z0-9_-]{32})$/);
    assert.ok(m, `link inesperado: ${texto}`);
    token = m[1];
    linkDaCliente = `${servidor.url}/f/${token}`;
    const wa = await adm.getByRole('link', { name: 'Enviar pelo WhatsApp' }).getAttribute('href');
    assert.ok(wa.startsWith('https://wa.me/5547999998888?text='), wa);
    const mensagem = decodeURIComponent(wa.split('?text=')[1]);
    assert.ok(mensagem.startsWith('Oi Maria!') && mensagem.includes(texto), mensagem);
    await capturar(adm, 'fretes-3-link-pronto');
    await adm.getByRole('button', { name: 'Concluir' }).click();
  });

  await passo('o frete foi gravado com caixa, peso e valor declarado certos, e a lista já o mostra', async () => {
    const [f] = eco.banco.listar('fretes');
    freteId = f.id;
    assert.equal(f.data.caixa.id, 'm');
    assert.equal(f.data.pesoKg, 1);
    assert.equal(f.data.declaradoCentavos, 23700);
    assert.equal(f.data.clienteId, 'c1');
    assert.equal(f.data.whatsapp, '47999998888');
    assert.equal(f.data.token, token);
    await ver(adm, 'Aguardando a cliente abrir o link', 4000); // sem esperar o relógio: a tela confere logo depois de criar
    await ver(adm, /Ativos · 1/, 4000);
  });

  /* ── a cliente abre o link ── */
  const cliente = await novoCelular('cliente');
  const cli = cliente.pagina;

  await passo('a cliente abre o link: nome, pacote e pedido do CEP', async () => {
    await cli.goto(linkDaCliente);
    await ver(cli, 'Oi, Maria!');
    await ver(cli, 'Seu pacote: 32 × 25 × 10 cm · 1 kg');
    await capturar(cli, 'fretes-10-cliente-cep');
  });

  await passo('CEP incompleto é recusado antes de ir ao servidor', async () => {
    const antes = pedidosPublicos().length;
    await cli.locator('#cep').fill('123');
    await cli.getByRole('button', { name: 'Ver opções de frete' }).click();
    await ver(cli, 'Digite o CEP com 8 números.');
    assert.equal(pedidosPublicos().length, antes);
  });

  await passo('CEP certo: máscara, endereço e opções do Melhor Envio (Correios e Jadlog)', async () => {
    await cli.locator('#cep').fill('01310100');
    assert.equal(await cli.locator('#cep').inputValue(), '01310-100');
    await cli.getByRole('button', { name: 'Ver opções de frete' }).click();
    await ver(cli, 'Escolha o envio');
    await ver(cli, /São Paulo \/ SP/);
    assert.equal(await cli.locator('button.opcao').count(), 4);
    const textos = await cli.locator('button.opcao').allTextContents();
    assert.ok(textos.every((x) => /Correios|Jadlog/.test(x) && /R\$/.test(x)), textos.join(' | '));
    assert.equal(await cli.getByRole('button', { name: 'Continuar' }).isDisabled(), true);
    await capturar(cli, 'fretes-11-cliente-opcoes');
  });

  let precoEscolhido = '';
  await passo('escolhe a opção e vê o formulário (rua e bairro vêm do CEP)', async () => {
    const primeira = cli.locator('button.opcao').first();
    precoEscolhido = (await primeira.locator('.preco').textContent()).trim();
    await primeira.click();
    assert.equal(await primeira.getAttribute('aria-pressed'), 'true');
    await cli.getByRole('button', { name: 'Continuar' }).click();
    await ver(cli, 'Seus dados');
    await ver(cli, /Avenida Paulista/);
    assert.equal(await cli.locator('#rua').count(), 0, 'rua não deve ser pedida de novo');
    await cli.getByRole('button', { name: /Gerar Pix de/ }).click();
    await ver(cli, 'Digite seu nome completo (nome e sobrenome).');
  });

  await passo('preenche os dados (máscaras, CPF) e recebe o Pix com QR Code e copia-e-cola', async () => {
    await cli.locator('#nome').fill('Maria da Silva');
    await cli.locator('#telefone').fill('47999998888');
    assert.equal(await cli.locator('#telefone').inputValue(), '(47) 99999-8888');
    await cli.locator('#email').fill('maria@exemplo.com');
    await cli.locator('#cpf').fill('11144477700');
    await cli.getByRole('button', { name: /Gerar Pix de/ }).click();
    await ver(cli, 'CPF inválido. Confira os números.');
    await cli.locator('#cpf').fill(CPF_CLIENTE);
    assert.equal(await cli.locator('#cpf').inputValue(), '111.444.777-35');
    await cli.locator('#numero').fill('250');
    await cli.locator('#complemento').fill('Apto 12');
    await cli.getByRole('button', { name: /Gerar Pix de/ }).click();
    await ver(cli, 'Pague o frete com Pix', 15_000);
    const src = await cli.locator('.pix img').getAttribute('src');
    assert.ok(src.startsWith('data:image/png;base64,'), 'QR Code como imagem embutida');
    const codigo = await cli.locator('textarea.codigo').inputValue();
    assert.ok(codigo.startsWith('000201'), codigo.slice(0, 20));
    await ver(cli, /Este Pix vale por/);
    assert.equal((await cli.locator('.pix .valor').textContent()).trim(), precoEscolhido);
    await capturar(cli, 'fretes-12-cliente-pix');
    await cli.getByRole('button', { name: 'Copiar código Pix' }).click();
    await ver(cli, /Código Pix copiado|copie manualmente/);
  });

  await passo('o servidor guardou o Pix e o destino, e NÃO deixou dado pessoal nos documentos que a equipe lê', async () => {
    const f = eco.banco.ler(`fretes/${freteId}`);
    assert.equal(f.status, 'aguardando_pagamento');
    assert.equal(f.pagamento.status, 'pending');
    assert.equal(f.cidade, 'São Paulo');
    const publico = JSON.stringify(f);
    assert.ok(!publico.includes(CPF_CLIENTE), 'CPF não fica no documento lido pelo navegador');
    assert.ok(!publico.includes('maria@exemplo.com'));
    assert.equal(eco.banco.ler(`fretes_privado/${freteId}`).destinatario.cpf, CPF_CLIENTE, 'CPF fica só no documento privado');
    assert.ok(!eco.banco.bruto(`fretes_privado/${freteId}`).includes(CPF_CLIENTE), 'e o documento privado está cifrado no banco');
  });

  /* ── pagamento ── */
  const idDoPix = () => eco.banco.ler(`fretes/${freteId}`).pagamento.id;

  await passo('a dona vê o frete aguardando o Pix, com o valor escolhido', async () => {
    await ver(adm, 'Aguardando o Pix', 15_000);
    await ver(adm, /Correios|Jadlog/);
  });

  await passo('a página da cliente continua conferindo o Pix enquanto ele não é pago', async () => {
    const conta = () => pedidosPublicos().filter((p) => p.caminho.endsWith('/status')).length;
    const antes = conta();
    await cli.waitForTimeout(11_500); // duas voltas de conferência (a cada 5 s) sem pagamento
    assert.ok(conta() - antes >= 2, `esperava 2 conferências, vieram ${conta() - antes}`);
    await ver(cli, 'Pague o frete com Pix');
  });

  await passo('o Mercado Pago avisa (webhook assinado): a dona é avisada e a cliente vê "pago" sozinha', async () => {
    eco.mocks.aprovar(idDoPix());
    const resp = await fetch(`${servidor.url}/api/mp/webhook?data.id=${idDoPix()}&type=payment`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...eco.mocks.assinar(idDoPix()) },
      body: JSON.stringify({ type: 'payment', data: { id: idDoPix() } }),
    });
    assert.equal(resp.status, 200);
    await ver(adm, /Maria pagou o frete!/, 12_000);
    await ver(adm, 'Pago · gerar etiqueta');
    assert.match(await adm.title(), /^\(1\) Fretes/);
    await capturar(adm, 'fretes-4-pagou');
    await ver(cli, 'Frete pago, obrigada!', 20_000);
    await ver(cli, 'Preparando o seu pedido');
    await capturar(cli, 'fretes-13-cliente-pago');
  });

  await passo('webhook sem assinatura é recusado', async () => {
    const resp = await fetch(`${servidor.url}/api/mp/webhook?data.id=${idDoPix()}&type=payment`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'payment', data: { id: idDoPix() } }),
    });
    assert.equal(resp.status, 401);
  });

  /* ── etiqueta e rastreio ── */
  await passo('a dona gera a etiqueta e recebe o link de impressão', async () => {
    await adm.locator('button', { hasText: 'Maria da Silva' }).first().click();
    await ver(adm, /Pago em/);
    await adm.getByRole('button', { name: 'Gerar etiqueta', exact: true }).click();
    const abrir = adm.getByRole('link', { name: 'Abrir etiqueta para imprimir' });
    await abrir.waitFor({ state: 'visible', timeout: 20_000 });
    const href = await abrir.getAttribute('href');
    assert.match(href, /^https:\/\/sandbox\.melhorenvio\.com\.br\/me\/imprimir\/pub/);
    assert.equal(await abrir.getAttribute('rel'), 'noopener noreferrer');
    await ver(adm, 'Etiqueta pronta · falta postar', 4000);
    await capturar(adm, 'fretes-5-etiqueta');
    const f = eco.banco.ler(`fretes/${freteId}`);
    assert.equal(f.status, 'etiqueta');
    assert.ok(f.rastreio.codigo, 'código de rastreio gravado');
  });

  await passo('a cliente passa a ver "quase saindo" com o código de rastreio', async () => {
    await cli.reload();
    await ver(cli, 'Seu pedido está quase saindo');
    await ver(cli, eco.banco.ler(`fretes/${freteId}`).rastreio.codigo);
    await ver(cli, /só mostra movimento depois que o pacote for postado/);
    await capturar(cli, 'fretes-14-cliente-etiqueta');
  });

  await passo('postado: a dona atualiza o rastreio e avisa pelo WhatsApp; a cliente acompanha', async () => {
    const f = eco.banco.ler(`fretes/${freteId}`);
    eco.mocks.postar(f.etiqueta.meId);
    await adm.getByRole('button', { name: 'Atualizar rastreio', exact: true }).click();
    await ver(adm, 'Postado · a caminho', 4000);
    const wa = await adm.getByRole('link', { name: 'Avisar o rastreio pelo WhatsApp' }).getAttribute('href');
    const mensagem = decodeURIComponent(wa.split('?text=')[1]);
    assert.ok(mensagem.includes(f.rastreio.codigo) && mensagem.includes(`/f/${token}`), mensagem);
    await cli.reload();
    await ver(cli, 'Seu pedido está a caminho');
    const link = await cli.getByRole('link', { name: 'Acompanhar a entrega' }).getAttribute('href');
    assert.equal(link, `https://www.melhorrastreio.com.br/rastreio/${f.rastreio.codigo}`);
    await capturar(cli, 'fretes-15-cliente-postado');
  });

  await passo('entregue: as duas telas mostram o fim', async () => {
    eco.mocks.entregar(eco.banco.ler(`fretes/${freteId}`).etiqueta.meId);
    await adm.getByRole('button', { name: 'Atualizar rastreio', exact: true }).click();
    await ver(adm, /Entregue em/, 4000);
    await cli.reload();
    await ver(cli, 'Pedido entregue!');
    await adm.getByRole('button', { name: 'Fechar' }).click();
    await adm.getByRole('button', { name: /^Todos/ }).click();
    await ver(adm, 'Entregue');
  });

  /* ── cancelar, Pix vencido e outros casos ── */
  await passo('cancelar um link (dois toques) e a cliente vê que foi cancelado', async () => {
    const f2 = await comandoDaDona('criarFrete', { clienteNome: 'Joana Prado', whatsapp: '47988887777', caixaId: 'p', pesoKg: 0.4 });
    await adm.getByRole('button', { name: /^Todos/ }).click();
    await adm.locator('button', { hasText: 'Joana Prado' }).first().waitFor({ timeout: 10_000 });
    await adm.locator('button', { hasText: 'Joana Prado' }).first().click();
    await adm.getByRole('button', { name: 'Cancelar este link' }).click();
    await adm.getByRole('button', { name: 'Sim, cancelar' }).click();
    await ver(adm, 'Link cancelado');
    assert.equal(eco.banco.ler(`fretes/${f2.id}`).status, 'cancelado');
    const outra = await novoCelular('cliente-cancelado');
    await outra.pagina.goto(`${servidor.url}/f/${f2.token}`);
    await ver(outra.pagina, 'Link cancelado');
    await outra.fechar();
  });

  await passo('celular com o relógio adiantado 2 dias: o Pix válido continua aparecendo como válido', async () => {
    const f4 = await comandoDaDona('criarFrete', { clienteNome: 'Bia Lopes', caixaId: 'p', pesoKg: 0.5 });
    const cotacao = await rotaDaCliente(`${f4.token}/cotar`, { cep: '01310100' });
    assert.equal(cotacao.status, 200);
    const pagamento = await rotaDaCliente(`${f4.token}/pagar`, { opcaoId: cotacao.corpo.opcoes[0].id, nome: 'Bia Lopes', telefone: '11988887777', email: 'bia@exemplo.com', cpf: CPF_CLIENTE, numero: '1' });
    assert.equal(pagamento.status, 200);
    const errado = await novoCelular('relogio-errado');
    await errado.pagina.clock.setFixedTime(new Date(Date.now() + 2 * 86_400_000));
    await errado.pagina.goto(`${servidor.url}/f/${f4.token}`);
    await ver(errado.pagina, 'Pague o frete com Pix');
    await ver(errado.pagina, /Este Pix vale por/);
    await errado.pagina.waitForTimeout(1500);
    await naoVer(errado.pagina, 'Confirmando o pagamento…', 100);
    await errado.fechar();
  });

  await passo('nomes com HTML aparecem como texto nas duas telas (nada é interpretado)', async () => {
    const f5 = await comandoDaDona('criarFrete', { clienteNome: '<img/src=x/onerror=window.__xss=1> Silva', caixaId: 'p', pesoKg: 0.5 });
    const pagina = await novoCelular('xss');
    await pagina.pagina.goto(`${servidor.url}/f/${f5.token}`);
    await ver(pagina.pagina, 'Oi, <img/src=x/onerror=window.__xss=1>!');
    assert.equal(await pagina.pagina.locator('img[src="x"]').count(), 0, 'a página da cliente não pode criar elementos a partir do nome');
    await adm.getByRole('button', { name: /^Todos/ }).click();
    await ver(adm, '<img/src=x/onerror=window.__xss=1> Silva', 12_000);
    assert.equal(await adm.locator('img[src="x"]').count(), 0);
    assert.equal(await adm.evaluate(() => window.__xss), undefined);
    await pagina.fechar();
  });

  await passo('Pix vencido: a cliente volta ao CEP, com o CEP já preenchido, e gera um novo Pix', async () => {
    const f3 = await comandoDaDona('criarFrete', { clienteNome: 'Carla Dias', caixaId: 'p', pesoKg: 0.6 });
    const cotacao = await rotaDaCliente(`${f3.token}/cotar`, { cep: '30140071' });
    assert.equal(cotacao.status, 200);
    const pagamento = await rotaDaCliente(`${f3.token}/pagar`, { opcaoId: cotacao.corpo.opcoes[0].id, nome: 'Carla Dias', telefone: '31988887777', email: 'carla@exemplo.com', cpf: CPF_CLIENTE, numero: '10' });
    assert.equal(pagamento.status, 200);
    const pixAntigo = eco.banco.ler(`fretes/${f3.id}`).pagamento.id;
    eco.mocks.expirar(pixAntigo);
    servidor.avancar(2 * 86_400_000);

    const pagina = (await novoCelular('pix-vencido')).pagina;
    await pagina.goto(`${servidor.url}/f/${f3.token}`);
    await ver(pagina, 'Para qual CEP vamos enviar?');
    assert.equal(await pagina.locator('#cep').inputValue(), '30140-071');
    await pagina.getByRole('button', { name: 'Ver opções de frete' }).click();
    await ver(pagina, 'Escolha o envio');
    await pagina.locator('button.opcao').first().click();
    await pagina.getByRole('button', { name: 'Continuar' }).click();
    await pagina.locator('#nome').fill('Carla Dias');
    await pagina.locator('#telefone').fill('31988887777');
    await pagina.locator('#email').fill('carla@exemplo.com');
    await pagina.locator('#cpf').fill(CPF_CLIENTE);
    await pagina.locator('#numero').fill('10');
    await pagina.getByRole('button', { name: /Gerar Pix de/ }).click();
    await ver(pagina, 'Pague o frete com Pix', 15_000);
    assert.notEqual(eco.banco.ler(`fretes/${f3.id}`).pagamento.id, pixAntigo, 'um Pix novo foi criado');
  });

  /* ── links inválidos e quem não pode abrir a tela ── */
  await passo('link inexistente e endereço sem código mostram avisos claros', async () => {
    const visitante = await novoCelular('link-invalido');
    await visitante.pagina.goto(`${servidor.url}/f/${'x'.repeat(32)}`);
    await ver(visitante.pagina, 'Link não encontrado');
    await visitante.pagina.goto(`${servidor.url}/f/abc`);
    await ver(visitante.pagina, 'Página não encontrada');
    await visitante.fechar();
  });

  await passo('sem login, a tela de Fretes pede para entrar no app e não chama nenhum comando', async () => {
    const semLogin = await novoCelular('sem-login');
    const pedidos = vigiarPedidos(semLogin.pagina);
    await semLogin.pagina.goto(`${servidor.url}/fretes.html`);
    await ver(semLogin.pagina, /entre primeiro no app da live/);
    await semLogin.pagina.waitForTimeout(500);
    assert.deepEqual(pedidos.filter((c) => c.startsWith('/api/admin/')), [], 'sem login não pode chamar os comandos da dona');
    await semLogin.fechar();
  });

  await passo('a pessoa da equipe não abre a tela de Fretes (nem o servidor atende os comandos dela)', async () => {
    const equipe = await novoCelular('equipe');
    await logar(equipe, EQUIPE);
    const pedidos = vigiarPedidos(equipe.pagina);
    await equipe.pagina.goto(`${servidor.url}/fretes.html`);
    await ver(equipe.pagina, 'Só a dona do brechó abre esta tela.');
    await equipe.pagina.waitForTimeout(500);
    assert.deepEqual(pedidos.filter((c) => c.startsWith('/api/admin/')), []);
    const status = await equipe.pagina.evaluate(async () => {
      const r = await fetch('/api/admin/listarFretes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      await r.text();
      return r.status;
    });
    assert.equal(status, 403);
    await equipe.fechar();
  });

  /* ── ajustes e conexões ── */
  await passo('Ajustes: recusa CEP e medidas ruins e salva a caixa nova com números', async () => {
    await adm.getByRole('button', { name: 'Ajustes' }).click();
    await ver(adm, 'Ajustes dos fretes');
    const cepDeOrigem = adm.locator('input[placeholder="00000-000"]').first();
    await cepDeOrigem.fill('123');
    await adm.getByRole('button', { name: 'Salvar ajustes' }).click();
    await ver(adm, 'O CEP de origem precisa ter 8 números.');
    await cepDeOrigem.fill('89201001');
    await adm.getByRole('button', { name: 'Adicionar caixa' }).click();
    await adm.getByRole('button', { name: 'Salvar ajustes' }).click();
    await ver(adm, /confira as medidas/);
    await adm.getByLabel('Nome da caixa 3').fill('Mini');
    await adm.getByLabel('Comprim. (cm) da caixa 3').fill('20');
    await adm.getByLabel('Largura (cm) da caixa 3').fill('15,5');
    await adm.getByLabel('Altura (cm) da caixa 3').fill('5');
    await capturar(adm, 'fretes-6-ajustes');
    await adm.getByRole('button', { name: 'Salvar ajustes' }).click();
    await ver(adm, 'Ajustes salvos');
    const config = eco.banco.ler('ajustes/frete');
    assert.equal(config.caixas.length, 3);
    assert.deepEqual({ ...config.caixas[2], id: 'x' }, { id: 'x', nome: 'Mini', altura: 5, largura: 15.5, comprimento: 20 });
    assert.equal(config.origemCep, '89201001');
    assert.equal(config.remetente.nome, 'Simone Dutra dos Reis', 'dados de quem envia não se perdem');
    assert.equal(config.siteUrl, 'https://loja-teste.workers.dev');
  });

  await passo('Conexões: mostra só o final do token, aceita token enorme sem exibi-lo de volta e testa', async () => {
    await adm.getByRole('button', { name: 'Conexões' }).click();
    await ver(adm, /Token salvo …aaaa/);
    await ver(adm, /Credencial salva/);
    const longo = `eyJhbGciOiJSUzI1NiJ9.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 86400 * 25, scopes: ['shipping-calculate'], x: 'z'.repeat(1400) })).toString('base64url')}.assinatura`;
    assert.ok(longo.length > 1500);
    await adm.getByPlaceholder('Cole o token inteiro').fill(longo);
    await adm.getByRole('button', { name: 'Salvar e testar' }).click();
    await ver(adm, /recusou o token/, 15_000);
    assert.equal(eco.banco.ler('privado/credenciais').melhorEnvio.token, longo, 'o servidor guardou o token inteiro');
    assert.equal(await adm.getByPlaceholder('Cole o token inteiro').inputValue(), '', 'o campo é limpo depois de salvar');
    assert.ok(!(await adm.content()).includes(longo.slice(0, 80)), 'o token não fica na página');
    await ver(adm, /Faltam permissões neste token/);
    await capturar(adm, 'fretes-7-conexoes');
    await adm.getByPlaceholder('Cole o token inteiro').fill(eco.mocks.meToken);
    await adm.getByRole('button', { name: 'Salvar e testar' }).click();
    await ver(adm, /Melhor Envio:.*Cotação e carrinho funcionando/, 15_000);
    await ver(adm, /Mercado Pago:/);
  });

  await passo('nenhuma resposta enviada à tela da dona contém token ou segredo', async () => {
    const tudo = respostasDaTela.join('\n');
    assert.ok(tudo.length > 100);
    for (const segredo of [eco.mocks.meToken, eco.mocks.mpToken, eco.mocks.mpSecret]) assert.ok(!tudo.includes(segredo), 'vazou um segredo para o navegador');
    assert.ok(!tudo.includes(CPF_CLIENTE), 'o CPF da cliente não vai para a tela da dona');
  });

  await passo('sessão que cai com a tela aberta: avisa em vez de ficar parada, e nada mais é pedido', async () => {
    await adm.getByRole('button', { name: 'Fechar' }).click();
    await conta.contexto.clearCookies();
    await ver(adm, 'Sua sessão acabou. Entre de novo no app da live e depois volte aqui.', 15_000);
    const depois = servidor.pedidos.length;
    await adm.waitForTimeout(1500);
    assert.equal(servidor.pedidos.slice(depois).filter((p) => p.caminho.startsWith('/api/admin/')).length, 0, 'depois de avisar, a tela para de conferir');
    await capturar(adm, 'fretes-8-sessao-acabou');
  });

  await passo('em todo o percurso: nenhum erro de JavaScript, nenhuma violação de segurança e nenhum pedido que falhou sem querer', async () => {
    await cliente.fechar();
    await conta.fechar();
    assert.deepEqual(acumulados, []);
  });
}
