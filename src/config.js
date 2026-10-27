/**
 * Lê a configuração do servidor a partir do que o painel do Cloudflare entrega (o objeto `env`).
 * Função pura: recebe `env`, devolve valores já conferidos.
 *
 * Ligações e segredos (criados no painel, nunca escritos no código):
 *   DB                       o banco D1 ligado ao Worker (Configurações → Associações → Banco de dados D1, nome DB).
 *   SEGREDO                  SEGREDO: uma frase longa e aleatória (20+ caracteres). Assina o login, protege as senhas e cifra tokens.
 *   ADMIN_SENHA              SEGREDO: a "senha de instalação" que cria a primeira conta (só é usada uma vez).
 * Opcionais:
 *   ROTINA_LIMITE            quantos fretes a rotina confere por execução (1 a 40; padrão 20).
 *   ENDERECOS_DE_TESTE       só para testes automáticos; só aceita endereços da própria máquina (loopback).
 */
const CHAVES_DE_TESTE = ['viacep', 'mp', 'meSandbox', 'meProducao'];
const SEGREDO_MINIMO = 20;

/** Só http://127.0.0.1, localhost e [::1]: um endereço de teste jamais pode apontar para a internet. */
export function enderecoLocal(valor) {
  try {
    const u = new URL(String(valor));
    return u.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname) ? u.href.replace(/\/+$/, '') : '';
  } catch {
    return '';
  }
}

function enderecosDeTeste(texto) {
  if (!texto) return {};
  let bruto;
  try {
    bruto = JSON.parse(String(texto));
  } catch {
    return {};
  }
  const saida = {};
  for (const k of CHAVES_DE_TESTE) {
    const url = bruto && typeof bruto === 'object' ? enderecoLocal(bruto[k]) : '';
    if (url) saida[k] = url;
  }
  return saida;
}

/** @param {Record<string, any>} env */
export function lerConfiguracao(env = {}) {
  const segredo = typeof env.SEGREDO === 'string' ? env.SEGREDO : '';
  const problemas = [];
  if (!env.DB) problemas.push('DB');
  if (segredo.length < SEGREDO_MINIMO) problemas.push('SEGREDO');

  return {
    d1: env.DB || null,
    segredo,
    senhaDeInstalacao: typeof env.ADMIN_SENHA === 'string' ? env.ADMIN_SENHA : '',
    enderecos: enderecosDeTeste(env.ENDERECOS_DE_TESTE),
    limiteDaRotina: Math.min(Math.max(Number(env.ROTINA_LIMITE) || 20, 1), 40),
    problemas,
  };
}
