/**
 * Consulta de endereço por CEP (ViaCEP). Falha nunca bloqueia: a cliente pode digitar o endereço.
 * Cache em memória por 24 h, no máximo 500 CEPs (cada instância do servidor tem o seu; o ViaCEP é gratuito e rápido).
 */
import { requisitar } from './http.js';
import { limparCep, texto, ufValida } from './util.js';

const cache = new Map();
const VALIDADE_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRADAS = 500; // teto de memória: ao encher, descarta a mais antiga
const BASE_PADRAO = 'https://viacep.com.br';

function limparCache() {
  cache.clear();
}

/**
 * @returns {Promise<{ok:boolean, naoEncontrado?:boolean, erro?:string, endereco?:{cep:string,rua:string,bairro:string,cidade:string,uf:string}}>}
 */
async function consultar(ctx, cepBruto) {
  const cep = limparCep(cepBruto);
  if (!cep) return { ok: false, erro: 'CEP inválido. Confira os 8 números.' };

  const guardado = cache.get(cep);
  if (guardado && guardado.ate > ctx.now()) return { ok: true, endereco: guardado.endereco };

  const r = await requisitar(ctx, 'viacep', 'GET', `${(ctx.urls && ctx.urls.viacep) || BASE_PADRAO}/ws/${cep}/json/`, { timeoutMs: 8000 });
  if (!r.ok || !r.body || typeof r.body !== 'object') {
    return { ok: false, erro: 'Não foi possível consultar o CEP agora.' };
  }
  if (r.body.erro) return { ok: false, naoEncontrado: true, erro: 'CEP não encontrado. Confira os números.' };

  const endereco = {
    cep,
    rua: texto(r.body.logradouro, 160),
    bairro: texto(r.body.bairro, 80),
    cidade: texto(r.body.localidade, 80),
    uf: ufValida(r.body.uf),
  };
  if (cache.size >= MAX_ENTRADAS) cache.delete(cache.keys().next().value);
  cache.set(cep, { endereco, ate: ctx.now() + VALIDADE_MS });
  return { ok: true, endereco };
}

export { consultar, limparCache };
