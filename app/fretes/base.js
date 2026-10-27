/* Base da tela de Fretes: textos e contas comuns, valores de partida dos ajustes e os estilos das telas.
   As cores, as fontes e algumas contas são as mesmas do app da live (../estilos.js e ../util.js). */
import { t, sans, display } from '../estilos.js';
import { norm, brl, preencher } from '../util.js';

export { t, sans, display, norm, brl, preencher };

/* ── helpers ────────────────────────────────────────────── */
export const brlCentavos = (c) => brl((Number(c) || 0) / 100);

/** "12,50" | "1.234,56" | "12.5" -> número (ou NaN). */
export const lerNumero = (s) => {
  if (typeof s === 'number') return s;
  let x = String(s || '').trim().replace(/[^\d,.-]/g, '');
  if (!x) return NaN;
  if (x.includes(',')) x = x.replace(/\./g, '').replace(',', '.');
  return Number(x);
};

export const soDigitos = (s) => String(s || '').replace(/\D/g, '');

export const num = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

export const pesoTexto = (kg) => {
  const n = Number(kg);
  if (!Number.isFinite(n) || n <= 0) return '';
  return n < 1 ? `${Math.round(n * 1000)} g` : `${num(n)} kg`;
};

export const dataHora = (ms) => {
  if (!ms) return '';
  const d = new Date(ms);
  const dia = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dia} às ${hora}`;
};

/** '2026-10-25' -> '25/10' */
export const diaMes = (chave) => {
  const [, m, d] = String(chave || '').split('-');
  return d && m ? `${d}/${m}` : '';
};

/** Abre só endereços https (o que vem do servidor nunca vira link sem conferir). */
export const httpsOuVazio = (url) => {
  try {
    const u = new URL(String(url || ''));
    return u.protocol === 'https:' ? u.href : '';
  } catch {
    return '';
  }
};

export const waLink = (whatsapp, texto) => {
  let d = soDigitos(whatsapp);
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  const base = d.length >= 12 ? `https://wa.me/${d}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(texto)}`;
};

/* ── ajustes da loja: valores de partida quando ainda não há nada salvo ── */
export const CAIXAS_PADRAO = [
  { id: 'p', nome: 'Pequena', altura: 6, largura: 20, comprimento: 25 },
  { id: 'm', nome: 'Média', altura: 10, largura: 25, comprimento: 32 },
  { id: 'g', nome: 'Grande', altura: 15, largura: 30, comprimento: 40 },
];
export const MENSAGEM_LINK_PADRAO =
  'Oi {nome}! Para receber suas peças, é só abrir o link, digitar o seu CEP e escolher o frete: {link}';

export const REMETENTE_VAZIO = {
  nome: '', telefone: '', email: '', cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
};

export const CONFIG_FRETE_PADRAO = {
  origemCep: '',
  caixas: CAIXAS_PADRAO,
  transportadoras: ['Correios', 'Jadlog'],
  mostrarOutras: false,
  pixValidadeMin: 1440,
  siteUrl: '',
  etiquetaPublica: true,
  naoComercial: true,
  valorDeclaradoPadrao: 50,
  conteudoPadrao: 'Roupas',
  remetente: REMETENTE_VAZIO,
  mensagemLink: MENSAGEM_LINK_PADRAO,
};

export function configDoBanco(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const caixas = Array.isArray(r.caixas) && r.caixas.length ? r.caixas.filter((c) => c && c.id) : CAIXAS_PADRAO;
  return {
    ...CONFIG_FRETE_PADRAO,
    ...r,
    caixas: caixas.length ? caixas : CAIXAS_PADRAO,
    transportadoras: Array.isArray(r.transportadoras) && r.transportadoras.length ? r.transportadoras : CONFIG_FRETE_PADRAO.transportadoras,
    remetente: { ...REMETENTE_VAZIO, ...(r.remetente || {}) },
    mensagemLink: r.mensagemLink || MENSAGEM_LINK_PADRAO,
  };
}

export const linkDoFrete = (config, token) => {
  const base = (config.siteUrl || window.location.origin).replace(/\/+$/, '');
  return `${base}/f/${token}`;
};

/* ── estilos (mesma linguagem visual do app da live) ───────── */
export const S = {
  screen: { minHeight: '100vh', background: t.bg, fontFamily: sans, color: t.ink },
  frame: { maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: t.bg, position: 'relative', paddingBottom: 110 },
  header: { padding: '16px 20px 0' },
  brandRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontFamily: display, fontSize: 21, color: t.ink },
  linkBtn: { background: 'none', border: 'none', color: t.inkSoft, fontSize: 14, padding: 6, fontFamily: 'inherit', cursor: 'pointer' },
  linkRose: { background: 'none', border: 'none', color: t.rose, fontSize: 14, padding: '6px 0', fontFamily: 'inherit', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 },
  titulo: { fontFamily: display, fontSize: 28, lineHeight: 1.1, margin: '14px 0 2px', color: t.ink, fontWeight: 400 },
  subtitulo: { fontSize: 14, color: t.inkSoft, margin: '0 0 4px' },

  chips: { display: 'flex', gap: 8, overflowX: 'auto', padding: '14px 20px 2px', scrollbarWidth: 'none' },
  chip: { flexShrink: 0, background: t.surface, border: `1px solid ${t.line}`, borderRadius: 20, padding: '8px 13px', fontSize: 14, color: t.inkSoft, fontFamily: 'inherit', cursor: 'pointer' },
  chipOn: { background: t.roseSoft, borderColor: t.roseSoft, color: t.rose, fontWeight: 500 },

  list: { padding: '14px 20px 0' },
  empty: { padding: '48px 8px', textAlign: 'center' },
  emptyTitle: { fontFamily: display, fontSize: 19, color: t.ink, margin: '0 0 8px', fontWeight: 400 },
  emptyTxt: { fontSize: 15, color: t.inkSoft, margin: 0, lineHeight: 1.5 },

  card: { display: 'block', width: '100%', textAlign: 'left', background: t.surface, borderRadius: 12, border: `1px solid ${t.line}`, marginBottom: 12, padding: 14, fontFamily: 'inherit', color: t.ink, cursor: 'pointer' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  cliNome: { fontSize: 16, fontWeight: 500, color: t.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cliSub: { fontSize: 13, color: t.inkSoft, marginTop: 3, lineHeight: 1.4 },
  preco: { fontFamily: display, fontSize: 19, color: t.ink, whiteSpace: 'nowrap' },
  chipStatus: { display: 'inline-block', marginTop: 8, fontSize: 12, padding: '3px 9px', borderRadius: 20 },
  alertaLinha: { marginTop: 10, background: t.roseSoft, color: t.rose, fontSize: 13, lineHeight: 1.4, padding: '8px 10px', borderRadius: 8 },

  dock: { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, padding: '12px 20px 20px', background: `linear-gradient(to top, ${t.bg} 62%, rgba(250,245,243,0))`, zIndex: 20 },
  cta: { width: '100%', background: t.rose, color: '#fff', border: 'none', borderRadius: 10, padding: '15px 16px', fontSize: 16, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer', display: 'block', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' },
  ctaGhost: { width: '100%', background: 'none', color: t.inkSoft, border: `1px solid ${t.line}`, borderRadius: 10, padding: '13px 16px', fontSize: 15, marginTop: 10, fontFamily: 'inherit', cursor: 'pointer', display: 'block', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' },
  ctaVerde: { width: '100%', background: t.green, color: '#fff', border: 'none', borderRadius: 10, padding: '15px 16px', fontSize: 16, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer', display: 'block', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' },

  label: { display: 'block', fontSize: 13, color: t.inkSoft, marginBottom: 6, marginTop: 16 },
  input: { width: '100%', background: t.surface, border: `1px solid ${t.line}`, borderRadius: 9, padding: '13px 13px', fontSize: 16, color: t.ink, fontFamily: 'inherit', boxSizing: 'border-box' },
  textarea: { width: '100%', background: t.surface, color: t.ink, border: `1px solid ${t.line}`, borderRadius: 9, padding: 12, fontSize: 14, lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' },
  ajuda: { fontSize: 13, color: t.inkSoft, lineHeight: 1.5, margin: '6px 2px 0' },
  erro: { fontSize: 14, color: t.rose, margin: '14px 0 0', lineHeight: 1.4 },
  sugBox: { background: t.surface, border: `1px solid ${t.line}`, borderRadius: 9, marginTop: 6, overflow: 'hidden' },
  sugItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', borderBottom: `1px solid ${t.line}`, padding: '12px 13px', fontSize: 15, color: t.ink, textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer' },

  segmento: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  segBtn: { flex: '1 1 0', minWidth: 90, background: t.surface, border: `1px solid ${t.line}`, borderRadius: 9, padding: '11px 8px', fontSize: 14, color: t.inkSoft, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'center', lineHeight: 1.3 },
  segOn: { background: t.roseSoft, borderColor: t.roseSoft, color: t.rose, fontWeight: 500 },
  dica: { background: t.surface, border: `1px solid ${t.line}`, borderRadius: 20, padding: '6px 11px', fontSize: 13, color: t.inkSoft, fontFamily: 'inherit', cursor: 'pointer' },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(43,28,40,0.42)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 },
  sheet: { width: '100%', maxWidth: 480, background: t.bg, borderRadius: '16px 16px 0 0', maxHeight: '92vh', display: 'flex', flexDirection: 'column' },
  sheetHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 10px' },
  sheetTitle: { fontFamily: display, fontSize: 20, color: t.ink },
  sheetBody: { padding: '4px 20px 24px', overflowY: 'auto' },

  bloco: { background: t.surface, border: `1px solid ${t.line}`, borderRadius: 12, padding: 14, marginTop: 14 },
  blocoTitulo: { fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: t.inkFaint, margin: '0 0 8px' },
  linha: { display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 15, padding: '5px 0', color: t.ink },
  linhaRot: { color: t.inkSoft },
  caixaAviso: { background: t.amberSoft, color: t.amber, fontSize: 14, lineHeight: 1.45, padding: '11px 13px', borderRadius: 9, marginTop: 14 },
  caixaErro: { background: t.roseSoft, color: t.rose, fontSize: 14, lineHeight: 1.45, padding: '11px 13px', borderRadius: 9, marginTop: 14 },
  caixaOk: { background: t.greenSoft, color: t.green, fontSize: 14, lineHeight: 1.45, padding: '11px 13px', borderRadius: 9, marginTop: 14 },
  codigoLinha: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: '#F2EDEF', borderRadius: 9, padding: '10px 12px', marginTop: 8 },
  codigoTxt: { fontSize: 14, wordBreak: 'break-all', color: t.ink, flex: 1, minWidth: 0 },

  toast: { position: 'fixed', bottom: 92, left: '50%', transform: 'translateX(-50%)', background: t.ink, color: '#fff', fontSize: 14, padding: '10px 16px', borderRadius: 8, zIndex: 60, maxWidth: 'calc(100% - 40px)', textAlign: 'center' },
  toastPago: { background: t.green },
};
