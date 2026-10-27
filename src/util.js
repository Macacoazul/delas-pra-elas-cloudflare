/**
 * Funções pequenas e sem dependência externa: dinheiro, CEP, CPF, telefone, texto e limpeza de log.
 * Todo valor em dinheiro circula em CENTAVOS (inteiro) dentro do servidor.
 */

/** "12,50" | "12.5" | 12.5 -> 1250 (centavos) ou null se inválido. */
function paraCentavos(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) return null;
    return Math.round(valor * 100);
  }
  if (typeof valor !== 'string') return null;
  let s = valor.trim().replace(/[^\d,.-]/g, '');
  if (!s) return null;
  // "1.234,56" (pt-BR) vs "1234.56" (API)
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/** 1250 -> 12.5 (para falar com APIs que querem decimal). */
function deCentavos(c) {
  return Math.round(Number(c)) / 100;
}

function reais(c) {
  return (Number(c) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Mantém só dígitos. */
function digitos(v) {
  return String(v === null || v === undefined ? '' : v).replace(/\D/g, '');
}

/** CEP com 8 dígitos ou '' */
function limparCep(v) {
  const d = digitos(v);
  return d.length === 8 ? d : '';
}

function cpfValido(v) {
  const c = digitos(v);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const calc = (base) => {
    let soma = 0;
    for (let i = 0; i < base; i += 1) soma += Number(c[i]) * (base + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(c[9]) && calc(10) === Number(c[10]);
}

function cnpjValido(v) {
  const c = digitos(v);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const calc = (len) => {
    const pesos = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < len; i += 1) soma += Number(c[i]) * pesos[i];
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
}

/** Telefone brasileiro com DDD (10 ou 11 dígitos); aceita +55. Devolve só dígitos ou ''. */
function limparTelefone(v) {
  let d = digitos(v);
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  return d.length === 10 || d.length === 11 ? d : '';
}

function emailValido(v) {
  const s = String(v || '').trim();
  return s.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

/** Texto curto e seguro: sem caracteres de controle, espaços normalizados, tamanho limitado. */
function texto(v, max = 120) {
  return String(v === null || v === undefined ? '' : v)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Texto com várias linhas (mensagens): mantém as quebras de linha, tira só caracteres de controle. */
function textoLongo(v, max = 4000) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, max);
}

function ufValida(v) {
  const uf = String(v || '').trim().toUpperCase();
  return /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(uf) ? uf : '';
}

/** Remove segredos de qualquer texto que vá para o log. */
function limparParaLog(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [oculto]')
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, '[jwt oculto]')
    .replace(/(APP_USR|TEST)-[A-Za-z0-9-]{12,}/g, '$1-[oculto]')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[cpf oculto]')
    .slice(0, 400);
}

export {
  paraCentavos,
  deCentavos,
  reais,
  digitos,
  limparCep,
  cpfValido,
  cnpjValido,
  limparTelefone,
  emailValido,
  texto,
  textoLongo,
  ufValida,
  limparParaLog,
};
