/* Funções pequenas que as telas usam: texto, dinheiro, datas, mensagens e as contas do dia.
   Nada aqui mexe na tela nem na rede. */

/* ── helpers ────────────────────────────────────────────── */
export const norm = (s) =>
  (s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

export const brl = (n) =>
  (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
};

export const shiftKey = (key, days) => {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
    dt.getDate()
  ).padStart(2, '0')}`;
};

export const dateLabel = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const s = dt.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const parseMoney = (s) => {
  const clean = String(s).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
};

export const ABERTURA_PADRAO = `Bom dia gata🌸
Tudo bem ?
Gratidão pela compra 🙏🏼
Que Deus em sua infinita bondade, te abençoe sempre .
A live foi incrível e você arrasou nas escolhas , gratidão por sua presença.
Arrase muito com suas peças ✨
Segue abaixo peças e valores referente a compra na live {data} ♻️`;

export const FECHAMENTO_PADRAO = `PIX BRECHÓ
Tipo de Chave: Telefone
➡️ Chave: 47 99791-9934
➡️ Banco: Stone
➡️ Simone Dutra dos Reis

*Lembrete*
Você tem a opção de pagar em cartão de crédito à vista ou parcelado , em até *3*x sem acréscimo , compras acima de $120,00 .
Acima de 3 parcelas - acréscimo da operadora ( varia pela quantidade de parcela ) .

Beijo 🍀♥️😘`;

export const CONFIG_PADRAO = { abertura: ABERTURA_PADRAO, fechamento: FECHAMENTO_PADRAO };

export const preencher = (txt, vals) =>
  String(txt || '').replace(/\{(\w+)\}/g, (m, k) => (vals[k] !== undefined ? vals[k] : m));

/* Resumo de um dia. Fica solto aqui porque a tela da Live e o
   calendário precisam exatamente da mesma conta. */
export function calcResumo(vendas, clientes, dia) {
  const doDia = vendas.filter((v) => v.data === dia);
  const mapa = {};
  clientes.forEach((c) => (mapa[c.id] = c));
  const ids = [...new Set(doDia.map((v) => v.clienteId))];
  return {
    total: doDia.reduce((s, v) => s + v.valor, 0),
    pendente: doDia.filter((v) => !v.pago).reduce((s, v) => s + v.valor, 0),
    pecas: doDia.length,
    clientes: ids.length,
    novas: ids.filter((id) => {
      const c = mapa[id];
      return c && !c.preExistente && c.primeiraCompra === dia;
    }).length,
  };
}

export const dataCurta = (k) => {
  const [y, m, d] = k.split('-');
  return `${d}/${m}/${y}`;
};

export const arquivoNome = (s) =>
  norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'exportacao';

export const itemLinha = (v, comCodigo) =>
  `• ${v.peca}${comCodigo && v.codigo ? ` (${v.codigo})` : ''} — ${brl(v.valor)}`;

/* Planilha com ponto-e-vírgula e vírgula decimal, que é o que o
   Excel em português abre direto sem pedir configuração. */
export function csvVendas(vendas, clientes) {
  const mapa = {};
  clientes.forEach((c) => (mapa[c.id] = c));
  const esc = (x) => `"${String(x === undefined || x === null ? '' : x).replace(/"/g, '""')}"`;
  const linhas = [['Data', 'Cliente', 'Codigo', 'Peca', 'Valor', 'Situacao'].join(';')];
  [...vendas]
    .sort((a, b) => a.data.localeCompare(b.data) || a.criadaEm - b.criadaEm)
    .forEach((v) => {
      const c = mapa[v.clienteId] || {};
      linhas.push(
        [
          esc(dataCurta(v.data)),
          esc(c.nome || ''),
          esc(v.codigo),
          esc(v.peca),
          esc(v.valor.toFixed(2).replace('.', ',')),
          esc(v.pago ? 'Pago' : 'Pendente'),
        ].join(';')
      );
    });
  return linhas.join('\r\n');
}
