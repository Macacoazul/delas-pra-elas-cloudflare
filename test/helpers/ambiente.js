import { BancoEmMemoria } from './banco-em-memoria.js';
import { Mocks } from './mocks.js';
import { criarBancoDeTeste } from './d1-sqlite.js';

const SEGREDO_DE_TESTE = 'segredo-de-teste-com-mais-de-vinte-caracteres';

const CPF_LOJA = '52998224725';
const CPF_CLIENTE = '11144477735';

const CONFIG_BASE = {
  origemCep: '89201001',
  caixas: [
    { id: 'p', nome: 'Pequena', altura: 6, largura: 20, comprimento: 25 },
    { id: 'm', nome: 'Média', altura: 10, largura: 25, comprimento: 32 },
  ],
  transportadoras: ['Correios', 'Jadlog'],
  mostrarOutras: false,
  pixValidadeMin: 1440,
  siteUrl: 'https://loja-teste.workers.dev',
  etiquetaPublica: true,
  naoComercial: true,
  valorDeclaradoPadrao: 50,
  conteudoPadrao: 'Roupas',
  remetente: {
    nome: 'Simone Dutra dos Reis',
    telefone: '47997919934',
    email: 'loja@exemplo.com',
    cep: '89201001',
    endereco: 'Rua Dr. Abdon Batista',
    numero: '100',
    complemento: '',
    bairro: 'Centro',
    cidade: 'Joinville',
    uf: 'SC',
  },
};

/**
 * Ambiente completo para os testes: banco, simuladores dos serviços e relógio controlável.
 *
 * Por padrão o banco é um mapa em memória (rápido). Com TESTE_DB=d1, a lógica do servidor fala com o banco de verdade
 * (src/banco-d1.js, SQL de verdade num SQLite imitando o D1). Os testes continuam lendo e gravando direto no `db`
 * (os dados são os mesmos nos dois modos).
 */
async function criarAmbiente({ semConfig = false, semCredenciais = false, config = {} } = {}) {
  const mocks = await new Mocks().iniciar();
  let db;
  let bancoDoServidor;
  let d1 = null;
  if (process.env.TESTE_DB === 'd1') {
    db = await criarBancoDeTeste({ segredo: SEGREDO_DE_TESTE });
    bancoDoServidor = db.banco;
    d1 = db.d1;
  } else {
    db = new BancoEmMemoria();
    bancoDoServidor = db;
  }
  const relogio = { t: Date.now() };
  const logs = [];
  const registrar = (nivel) => (mensagem, dados) => logs.push({ nivel, mensagem, dados });

  const ctx = {
    db: bancoDoServidor,
    d1,
    segredo: SEGREDO_DE_TESTE,
    fetch: globalThis.fetch,
    now: () => relogio.t,
    urls: mocks.urls,
    log: { info: registrar('info'), warn: registrar('warn'), error: registrar('error') },
    dormir: async () => {},
  };

  if (!semConfig) db.gravar('ajustes/frete', { ...CONFIG_BASE, ...config });
  if (!semCredenciais) {
    db.gravar('privado/credenciais', {
      melhorEnvio: { token: mocks.meToken, ambiente: 'sandbox', emailContato: 'contato@exemplo.com' },
      mercadoPago: { accessToken: mocks.mpToken, webhookSecret: mocks.mpSecret },
      remetenteDocumento: CPF_LOJA,
    });
  }

  return {
    ctx,
    db,
    mocks,
    relogio,
    logs,
    avancar: (ms) => {
      relogio.t += ms;
    },
    async parar() {
      await mocks.parar();
      if (d1) db.fechar();
    },
  };
}

/** Dados de entrega válidos para a cliente (CEP de Joinville). */
function dadosCliente(extra = {}) {
  return {
    nome: 'Maria da Silva',
    telefone: '47 99999-8888',
    email: 'maria@exemplo.com',
    cpf: CPF_CLIENTE,
    numero: '250',
    complemento: 'Apto 12',
    ...extra,
  };
}

export { criarAmbiente, dadosCliente, CPF_LOJA, CPF_CLIENTE, CONFIG_BASE, SEGREDO_DE_TESTE };
