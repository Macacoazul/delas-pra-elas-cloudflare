/**
 * Lê o texto do "Baixar backup dos dados" (o JSON que o app sempre gerou) e devolve as alterações prontas para gravar.
 *
 *   { "clientes": [...], "vendas": [...], "config": { "abertura": "...", "fechamento": "..." } }
 *
 * - O que não der para aproveitar é contado em `ignorados` (e explicado em `avisos`); o resto entra.
 * - As fotos não vêm no backup antigo (só o aviso "temFoto"), então as peças entram sem foto.
 * - Nada aqui fala com a rede: é só conferir e arrumar os dados.
 */

const ID = /^[A-Za-z0-9_-]{1,64}$/;
const DIA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const ehObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** @param {string} conteudo  o texto do backup
 *  @param {string} hoje       AAAA-MM-DD, usado quando uma cliente não tem a data de cadastro */
export function lerBackup(conteudo, hoje) {
  let dados;
  try {
    dados = JSON.parse(String(conteudo || '').replace(/^\uFEFF/, ''));
  } catch {
    throw new Error('Esse texto não é um backup do app (não consegui ler). Copie o backup inteiro, do primeiro { ao último }.');
  }
  if (!ehObjeto(dados) || !Array.isArray(dados.clientes) || !Array.isArray(dados.vendas)) {
    throw new Error('Esse texto não parece um backup do app: faltam as listas de clientes e de vendas.');
  }

  const avisos = [];
  let ignorados = 0;
  const ignorar = (motivo) => {
    ignorados += 1;
    if (avisos.length < 5) avisos.push(motivo);
  };

  const clientes = [];
  const idsDeClientes = new Set();
  for (const c of dados.clientes) {
    const nome = ehObjeto(c) ? texto(c.nome, 80) : '';
    if (!ehObjeto(c) || typeof c.id !== 'string' || !ID.test(c.id) || !nome) {
      ignorar('uma cliente sem nome ou sem identificação');
      continue;
    }
    if (idsDeClientes.has(c.id)) continue;
    idsDeClientes.add(c.id);
    clientes.push({
      id: c.id,
      nome,
      whatsapp: texto(c.whatsapp, 30),
      preExistente: c.preExistente === true,
      criadaEm: typeof c.criadaEm === 'string' && DIA.test(c.criadaEm) ? c.criadaEm : hoje,
    });
  }

  const vendas = [];
  const idsDeVendas = new Set();
  for (const v of dados.vendas) {
    const peca = ehObjeto(v) ? texto(v.peca, 160) : '';
    const valorOk = ehObjeto(v) && typeof v.valor === 'number' && Number.isFinite(v.valor) && v.valor >= 0 && v.valor <= 10_000_000;
    if (!ehObjeto(v) || typeof v.id !== 'string' || !ID.test(v.id) || !peca || !valorOk || typeof v.clienteId !== 'string' || !ID.test(v.clienteId) || typeof v.data !== 'string' || !DIA.test(v.data)) {
      ignorar('uma venda com dados que faltam ou estão fora do padrão');
      continue;
    }
    if (idsDeVendas.has(v.id)) continue;
    idsDeVendas.add(v.id);
    const fila = (Array.isArray(v.fila) ? v.fila : [])
      .filter((f) => ehObjeto(f) && typeof f.clienteId === 'string' && ID.test(f.clienteId))
      .slice(0, 30)
      .map((f) => ({ nome: texto(f.nome, 80), clienteId: f.clienteId }));
    vendas.push({
      id: v.id,
      data: v.data,
      criadaEm: Number.isFinite(v.criadaEm) && v.criadaEm > 0 && v.criadaEm < 4e12 ? Math.round(v.criadaEm) : Date.parse(`${v.data}T12:00:00`) || Date.now(),
      clienteId: v.clienteId,
      codigo: texto(v.codigo, 40),
      peca,
      valor: Math.round(v.valor * 100) / 100,
      pago: v.pago === true,
      fila,
      temFoto: false,
    });
  }

  let config = null;
  if (ehObjeto(dados.config)) {
    const c = {};
    if (typeof dados.config.abertura === 'string') c.abertura = dados.config.abertura.slice(0, 4000);
    if (typeof dados.config.fechamento === 'string') c.fechamento = dados.config.fechamento.slice(0, 4000);
    if (Object.keys(c).length) config = c;
  }

  if (!clientes.length && !vendas.length) throw new Error('O backup não tem nenhuma cliente nem venda que eu consiga aproveitar.');
  return { clientes, vendas, config, ignorados, avisos };
}

/** As alterações (no formato de /api/app/gravar) que restauram o backup: clientes primeiro, depois vendas, depois a mensagem. */
export function operacoesDoBackup(backup) {
  const ops = [];
  for (const { id, ...dados } of backup.clientes) ops.push({ col: 'clientes', id, op: 'set', dados });
  for (const { id, ...dados } of backup.vendas) ops.push({ col: 'vendas', id, op: 'set', dados });
  if (backup.config) ops.push({ col: 'config', id: 'geral', op: 'mesclar', dados: backup.config });
  return ops;
}
