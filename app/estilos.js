/* Cores, fontes e estilos de todas as telas do app. */

/* ── tokens ─────────────────────────────────────────────── */
export const t = {
  bg: '#FAF5F3',
  surface: '#FFFFFF',
  ink: '#2B1C28',
  inkSoft: '#7A6874',
  inkFaint: '#A89AA3',
  line: '#EBDFDA',
  rose: '#BE1450',
  roseSoft: '#FBE8EF',
  green: '#12695A',
  greenSoft: '#E2F0EC',
  amber: '#9C5B08',
  amberSoft: '#FAEEDB',
};

export const sans = '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
export const display = '"Fraunces", Georgia, serif';

/** Pede à Google as fontes DM Sans e Fraunces sem travar a abertura do app (sem elas, entram as fontes do aparelho). */
export function carregarFontes() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=Fraunces:opsz,wght@9..144,400;9..144,600&display=swap';
  document.head.appendChild(link);
}

/* ── estilos ────────────────────────────────────────────── */
export const S = {
  screen: { minHeight: '100vh', background: t.bg, fontFamily: sans, color: t.ink },
  frame: { maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: t.bg, position: 'relative' },
  header: { padding: '16px 20px 0' },
  brandRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontFamily: display, fontSize: 21, color: t.ink },
  linkBtn: { background: 'none', border: 'none', color: t.inkSoft, fontSize: 14, padding: 6 },
  tabs: { display: 'flex', gap: 22, marginTop: 14, borderBottom: `1px solid ${t.line}` },
  tab: {
    background: 'none', border: 'none', padding: '8px 0 10px', fontSize: 15,
    color: t.inkSoft, borderBottom: '2px solid transparent', marginBottom: -1,
  },
  tabOn: { color: t.ink, borderBottomColor: t.rose, fontWeight: 500 },

  dateRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 12px 0' },
  arrow: { background: 'none', border: 'none', fontSize: 26, color: t.inkSoft, width: 44, height: 44, lineHeight: 1 },
  dateTxt: { fontSize: 14, color: t.inkSoft, background: 'none', border: 'none', padding: 4, textDecoration: 'underline', textDecorationColor: t.line, textUnderlineOffset: 4 },
  todayBtn: { background: 'none', border: 'none', color: t.rose, fontSize: 13, padding: '2px 0' },

  mesRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 12px 4px' },
  mesNome: { fontFamily: display, fontSize: 20, color: t.ink },
  mesSub: { fontSize: 13, color: t.inkSoft, marginTop: 2 },
  calGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 4, padding: '10px 14px 4px',
  },
  calSemana: { fontSize: 11, color: t.inkFaint, textAlign: 'center', paddingBottom: 4 },
  calDia: {
    position: 'relative', aspectRatio: '1 / 1', width: '100%',
    background: 'none', border: '1px solid transparent', borderRadius: 10,
    fontSize: 15, color: t.inkSoft, display: 'flex',
    alignItems: 'center', justifyContent: 'center', padding: 0,
  },
  calDiaLive: { background: t.surface, borderColor: t.line, color: t.ink, fontWeight: 500 },
  calDiaHoje: { borderColor: t.inkFaint },
  calDiaSel: { background: t.rose, borderColor: t.rose, color: '#fff', fontWeight: 500 },
  calDiaFuturo: { color: '#D9CDD4' },
  calPonto: {
    position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
    width: 4, height: 4, borderRadius: 4,
  },
  calDetalhe: { padding: '18px 20px 0', borderTop: `1px solid ${t.line}`, marginTop: 14 },
  calDataSel: { fontSize: 14, color: t.inkSoft },

  resumo: { padding: '10px 20px 20px', borderBottom: `1px solid ${t.line}` },
  totalNum: { fontFamily: display, fontSize: 42, lineHeight: 1.05, letterSpacing: '-0.5px', color: t.ink },
  metaRow: { display: 'flex', gap: 18, marginTop: 10, flexWrap: 'wrap' },
  pendBar: {
    marginTop: 14, background: t.amberSoft, color: t.amber,
    padding: '9px 12px', borderRadius: 8, fontSize: 14,
  },

  list: { padding: '16px 20px 0' },
  empty: { padding: '48px 8px', textAlign: 'center' },
  emptyTitle: { fontFamily: display, fontSize: 19, color: t.ink, margin: '0 0 8px' },
  emptyTxt: { fontSize: 15, color: t.inkSoft, margin: 0, lineHeight: 1.5 },

  card: { background: t.surface, borderRadius: 12, border: `1px solid ${t.line}`, marginBottom: 12, overflow: 'hidden' },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '14px 14px 10px' },
  cliNome: { fontSize: 16, fontWeight: 500, color: t.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cliSub: { fontSize: 13, color: t.inkSoft, marginTop: 2 },
  cliTotal: { fontFamily: display, fontSize: 19, color: t.ink },
  badgeNova: {
    display: 'inline-block', marginTop: 4, background: t.roseSoft, color: t.rose,
    fontSize: 12, padding: '2px 8px', borderRadius: 20,
  },
  badgeAntiga: {
    display: 'inline-block', marginTop: 4, background: '#F2EDEF', color: t.inkSoft,
    fontSize: 12, padding: '2px 8px', borderRadius: 20,
  },

  row: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderTop: `1px solid ${t.line}` },
  rowMain: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 8, background: 'none', border: 'none', padding: 0, textAlign: 'left' },
  codigo: { fontSize: 13, color: t.inkFaint, minWidth: 22 },
  peca: { fontSize: 15, color: t.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rowValor: { fontSize: 15, color: t.ink, flexShrink: 0 },
  chipPago: { background: t.greenSoft, color: t.green, border: 'none', fontSize: 12, padding: '4px 9px', borderRadius: 20, flexShrink: 0 },
  chipPend: { background: t.amberSoft, color: t.amber, border: 'none', fontSize: 12, padding: '4px 9px', borderRadius: 20, flexShrink: 0 },

  dock: {
    position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: 480, padding: '12px 20px 20px',
    background: `linear-gradient(to top, ${t.bg} 62%, rgba(250,245,243,0))`,
  },
  cta: {
    width: '100%', background: t.rose, color: '#fff', border: 'none',
    borderRadius: 10, padding: '15px 16px', fontSize: 16, fontWeight: 500,
  },
  ctaGhost: {
    width: '100%', background: 'none', color: t.inkSoft,
    border: `1px solid ${t.line}`, borderRadius: 10, padding: '13px 16px',
    fontSize: 15, marginTop: 10,
  },

  label: { display: 'block', fontSize: 13, color: t.inkSoft, marginBottom: 6 },
  input: {
    width: '100%', background: t.surface, border: `1px solid ${t.line}`,
    borderRadius: 9, padding: '13px 13px', fontSize: 16, color: t.ink,
  },
  okMark: { position: 'absolute', right: 13, top: 14, color: t.green, fontSize: 16 },
  sugBox: { background: t.surface, border: `1px solid ${t.line}`, borderRadius: 9, marginTop: 6, overflow: 'hidden' },
  sugItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%',
    background: 'none', border: 'none', borderBottom: `1px solid ${t.line}`,
    padding: '12px 13px', fontSize: 15, color: t.ink, textAlign: 'left',
  },
  hintNova: { fontSize: 13, color: t.rose, margin: '8px 2px 0' },
  erro: { fontSize: 14, color: t.rose, margin: '14px 0 0', lineHeight: 1.4 },

  filaBox: { background: t.surface, border: `1px solid ${t.line}`, borderRadius: 9, overflow: 'hidden' },
  filaItem: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
    fontSize: 15, color: t.ink, borderBottom: `1px solid ${t.line}`,
  },
  filaPos: {
    width: 20, height: 20, borderRadius: 20, background: t.roseSoft, color: t.rose,
    fontSize: 12, lineHeight: '20px', textAlign: 'center', flexShrink: 0,
  },
  addFila: {
    background: t.surface, border: `1px solid ${t.line}`, borderRadius: 9,
    padding: '0 14px', fontSize: 14, color: t.ink, flexShrink: 0,
  },
  filaTag: {
    background: t.roseSoft, color: t.rose, fontSize: 11,
    padding: '2px 6px', borderRadius: 4, flexShrink: 0,
  },
  passaBox: {
    background: t.roseSoft, borderRadius: 10, padding: 14, marginBottom: 18,
  },
  passaTxt: { fontSize: 14, color: t.ink, lineHeight: 1.45, marginBottom: 11 },
  passaBtn: {
    width: '100%', background: t.rose, color: '#fff', border: 'none',
    borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 500,
  },

  segOnEscopo: { background: t.roseSoft, borderColor: t.roseSoft, color: t.rose, fontWeight: 500 },
  escopoInfo: { fontSize: 13, color: t.inkSoft, margin: '12px 2px 10px' },

  cardExport: {
    width: '100%', background: 'none', border: 'none', borderTop: `1px solid ${t.line}`,
    padding: '11px', fontSize: 14, color: t.rose,
  },
  exportTxt: {
    width: '100%', height: 200, background: t.surface, color: t.ink,
    border: `1px solid ${t.line}`, borderRadius: 9, padding: 12,
    fontSize: 13, lineHeight: 1.6, resize: 'none', fontFamily: sans,
  },

  fotoImg: {
    width: '100%', maxHeight: 260, objectFit: 'cover',
    borderRadius: 9, border: `1px solid ${t.line}`, display: 'block',
  },
  fotoAdd: {
    display: 'block', width: '100%', textAlign: 'center',
    background: t.surface, border: `1px dashed ${t.line}`, borderRadius: 9,
    padding: '20px 12px', fontSize: 15, color: t.inkSoft, cursor: 'pointer',
  },
  fotoVazia: {
    background: t.surface, border: `1px solid ${t.line}`, borderRadius: 9,
    padding: '20px 12px', fontSize: 15, color: t.inkSoft, textAlign: 'center',
  },
  fotoTag: {
    background: '#F2EDEF', color: t.inkSoft, fontSize: 11,
    padding: '2px 6px', borderRadius: 4, flexShrink: 0,
  },
  histBox: {
    background: t.roseSoft, borderRadius: 10, padding: 14, marginBottom: 18,
  },

  segmento: { display: 'flex', gap: 8 },
  segBtn: { flex: 1, background: t.surface, border: `1px solid ${t.line}`, borderRadius: 9, padding: '12px', fontSize: 15, color: t.inkSoft },
  segOnPend: { background: t.amberSoft, borderColor: t.amberSoft, color: t.amber, fontWeight: 500 },
  segOnPago: { background: t.greenSoft, borderColor: t.greenSoft, color: t.green, fontWeight: 500 },

  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(43,28,40,0.42)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50,
  },
  sheet: {
    width: '100%', maxWidth: 480, background: t.bg,
    borderRadius: '16px 16px 0 0', maxHeight: '92vh', display: 'flex', flexDirection: 'column',
  },
  sheetHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 10px' },
  sheetTitle: { fontFamily: display, fontSize: 20, color: t.ink },

  cliRow: {
    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    background: t.surface, border: `1px solid ${t.line}`, borderRadius: 12,
    padding: '14px', marginBottom: 10,
  },

  checkRow: {
    display: 'flex', gap: 11, alignItems: 'flex-start', width: '100%',
    background: 'none', border: 'none', padding: '16px 0 0', fontSize: 15, color: t.ink,
  },
  checkBox: {
    width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${t.line}`,
    background: t.surface, color: '#fff', fontSize: 13, lineHeight: '20px',
    textAlign: 'center', flexShrink: 0,
  },
  checkOn: { background: t.rose, borderColor: t.rose },
  checkHelp: { display: 'block', fontSize: 13, color: t.inkSoft, marginTop: 3, lineHeight: 1.4 },

  toast: {
    position: 'fixed', bottom: 92, left: '50%', transform: 'translateX(-50%)',
    background: t.ink, color: '#fff', fontSize: 14, padding: '10px 16px',
    borderRadius: 8, zIndex: 60,
  },

  /* conexão, conta e equipe */
  faixa: { margin: '12px 20px 0', background: t.amberSoft, color: t.amber, padding: '9px 12px', borderRadius: 8, fontSize: 13, lineHeight: 1.45 },
  faixaErro: { background: t.roseSoft, color: t.rose },
  nota: { fontSize: 14, color: t.inkSoft, lineHeight: 1.55, margin: '0 0 14px' },
  notaPequena: { fontSize: 13, color: t.inkSoft, lineHeight: 1.5, margin: '8px 2px 0' },
  ok: { fontSize: 14, color: t.green, margin: '14px 0 0', lineHeight: 1.45 },
  pessoa: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: `1px solid ${t.line}` },
  pessoaEmail: { flex: 1, minWidth: 0, fontSize: 15, color: t.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  pessoaPapel: { fontSize: 12, color: t.inkSoft, background: '#F2EDEF', padding: '2px 8px', borderRadius: 20, flexShrink: 0 },
  linkAcao: { background: 'none', border: 'none', color: t.rose, fontSize: 14, padding: 6, flexShrink: 0 },
  botaoLink: {
    display: 'block', width: '100%', textAlign: 'center', textDecoration: 'none', background: 'none', color: t.inkSoft,
    border: `1px solid ${t.line}`, borderRadius: 10, padding: '13px 16px', fontSize: 15, marginTop: 10,
  },
};
