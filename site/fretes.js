/* fretes.js — a tela de Fretes
   ARQUIVO GERADO por "npm run site" a partir da pasta app/. Não edite aqui: o código-fonte comentado fica lá. */
(() => {
  // app/react-global.js
  var R = window.React;
  var h = R.createElement;
  var {
    useState,
    useEffect,
    useMemo,
    useRef,
    useCallback,
    useReducer,
    useLayoutEffect,
    useContext,
    Fragment,
    Component,
  } = R;

  // app/react-dom-global.js
  var { createRoot } = window.ReactDOM;

  // app/estilos.js
  var t = {
    bg: "#FAF5F3",
    surface: "#FFFFFF",
    ink: "#2B1C28",
    inkSoft: "#7A6874",
    inkFaint: "#A89AA3",
    line: "#EBDFDA",
    rose: "#BE1450",
    roseSoft: "#FBE8EF",
    green: "#12695A",
    greenSoft: "#E2F0EC",
    amber: "#9C5B08",
    amberSoft: "#FAEEDB",
  };
  var sans = '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  var display = '"Fraunces", Georgia, serif';
  function carregarFontes() {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=Fraunces:opsz,wght@9..144,400;9..144,600&display=swap";
    document.head.appendChild(link);
  }
  var S = {
    screen: { minHeight: "100vh", background: t.bg, fontFamily: sans, color: t.ink },
    frame: { maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: t.bg, position: "relative" },
    header: { padding: "16px 20px 0" },
    brandRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
    brand: { fontFamily: display, fontSize: 21, color: t.ink },
    linkBtn: { background: "none", border: "none", color: t.inkSoft, fontSize: 14, padding: 6 },
    tabs: { display: "flex", gap: 22, marginTop: 14, borderBottom: `1px solid ${t.line}` },
    tab: {
      background: "none",
      border: "none",
      padding: "8px 0 10px",
      fontSize: 15,
      color: t.inkSoft,
      borderBottom: "2px solid transparent",
      marginBottom: -1,
    },
    tabOn: { color: t.ink, borderBottomColor: t.rose, fontWeight: 500 },
    dateRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 12px 0" },
    arrow: { background: "none", border: "none", fontSize: 26, color: t.inkSoft, width: 44, height: 44, lineHeight: 1 },
    dateTxt: {
      fontSize: 14,
      color: t.inkSoft,
      background: "none",
      border: "none",
      padding: 4,
      textDecoration: "underline",
      textDecorationColor: t.line,
      textUnderlineOffset: 4,
    },
    todayBtn: { background: "none", border: "none", color: t.rose, fontSize: 13, padding: "2px 0" },
    mesRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 12px 4px" },
    mesNome: { fontFamily: display, fontSize: 20, color: t.ink },
    mesSub: { fontSize: 13, color: t.inkSoft, marginTop: 2 },
    calGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(7, 1fr)",
      gap: 4,
      padding: "10px 14px 4px",
    },
    calSemana: { fontSize: 11, color: t.inkFaint, textAlign: "center", paddingBottom: 4 },
    calDia: {
      position: "relative",
      aspectRatio: "1 / 1",
      width: "100%",
      background: "none",
      border: "1px solid transparent",
      borderRadius: 10,
      fontSize: 15,
      color: t.inkSoft,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 0,
    },
    calDiaLive: { background: t.surface, borderColor: t.line, color: t.ink, fontWeight: 500 },
    calDiaHoje: { borderColor: t.inkFaint },
    calDiaSel: { background: t.rose, borderColor: t.rose, color: "#fff", fontWeight: 500 },
    calDiaFuturo: { color: "#D9CDD4" },
    calPonto: {
      position: "absolute",
      bottom: 6,
      left: "50%",
      transform: "translateX(-50%)",
      width: 4,
      height: 4,
      borderRadius: 4,
    },
    calDetalhe: { padding: "18px 20px 0", borderTop: `1px solid ${t.line}`, marginTop: 14 },
    calDataSel: { fontSize: 14, color: t.inkSoft },
    resumo: { padding: "10px 20px 20px", borderBottom: `1px solid ${t.line}` },
    totalNum: { fontFamily: display, fontSize: 42, lineHeight: 1.05, letterSpacing: "-0.5px", color: t.ink },
    metaRow: { display: "flex", gap: 18, marginTop: 10, flexWrap: "wrap" },
    pendBar: {
      marginTop: 14,
      background: t.amberSoft,
      color: t.amber,
      padding: "9px 12px",
      borderRadius: 8,
      fontSize: 14,
    },
    list: { padding: "16px 20px 0" },
    empty: { padding: "48px 8px", textAlign: "center" },
    emptyTitle: { fontFamily: display, fontSize: 19, color: t.ink, margin: "0 0 8px" },
    emptyTxt: { fontSize: 15, color: t.inkSoft, margin: 0, lineHeight: 1.5 },
    card: {
      background: t.surface,
      borderRadius: 12,
      border: `1px solid ${t.line}`,
      marginBottom: 12,
      overflow: "hidden",
    },
    cardHead: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
      padding: "14px 14px 10px",
    },
    cliNome: {
      fontSize: 16,
      fontWeight: 500,
      color: t.ink,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    cliSub: { fontSize: 13, color: t.inkSoft, marginTop: 2 },
    cliTotal: { fontFamily: display, fontSize: 19, color: t.ink },
    badgeNova: {
      display: "inline-block",
      marginTop: 4,
      background: t.roseSoft,
      color: t.rose,
      fontSize: 12,
      padding: "2px 8px",
      borderRadius: 20,
    },
    badgeAntiga: {
      display: "inline-block",
      marginTop: 4,
      background: "#F2EDEF",
      color: t.inkSoft,
      fontSize: 12,
      padding: "2px 8px",
      borderRadius: 20,
    },
    row: { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderTop: `1px solid ${t.line}` },
    rowMain: {
      flex: 1,
      minWidth: 0,
      display: "flex",
      alignItems: "baseline",
      gap: 8,
      background: "none",
      border: "none",
      padding: 0,
      textAlign: "left",
    },
    codigo: { fontSize: 13, color: t.inkFaint, minWidth: 22 },
    peca: { fontSize: 15, color: t.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    rowValor: { fontSize: 15, color: t.ink, flexShrink: 0 },
    chipPago: {
      background: t.greenSoft,
      color: t.green,
      border: "none",
      fontSize: 12,
      padding: "4px 9px",
      borderRadius: 20,
      flexShrink: 0,
    },
    chipPend: {
      background: t.amberSoft,
      color: t.amber,
      border: "none",
      fontSize: 12,
      padding: "4px 9px",
      borderRadius: 20,
      flexShrink: 0,
    },
    dock: {
      position: "fixed",
      bottom: 0,
      left: "50%",
      transform: "translateX(-50%)",
      width: "100%",
      maxWidth: 480,
      padding: "12px 20px 20px",
      background: `linear-gradient(to top, ${t.bg} 62%, rgba(250,245,243,0))`,
    },
    cta: {
      width: "100%",
      background: t.rose,
      color: "#fff",
      border: "none",
      borderRadius: 10,
      padding: "15px 16px",
      fontSize: 16,
      fontWeight: 500,
    },
    ctaGhost: {
      width: "100%",
      background: "none",
      color: t.inkSoft,
      border: `1px solid ${t.line}`,
      borderRadius: 10,
      padding: "13px 16px",
      fontSize: 15,
      marginTop: 10,
    },
    label: { display: "block", fontSize: 13, color: t.inkSoft, marginBottom: 6 },
    input: {
      width: "100%",
      background: t.surface,
      border: `1px solid ${t.line}`,
      borderRadius: 9,
      padding: "13px 13px",
      fontSize: 16,
      color: t.ink,
    },
    okMark: { position: "absolute", right: 13, top: 14, color: t.green, fontSize: 16 },
    sugBox: { background: t.surface, border: `1px solid ${t.line}`, borderRadius: 9, marginTop: 6, overflow: "hidden" },
    sugItem: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      background: "none",
      border: "none",
      borderBottom: `1px solid ${t.line}`,
      padding: "12px 13px",
      fontSize: 15,
      color: t.ink,
      textAlign: "left",
    },
    hintNova: { fontSize: 13, color: t.rose, margin: "8px 2px 0" },
    erro: { fontSize: 14, color: t.rose, margin: "14px 0 0", lineHeight: 1.4 },
    filaBox: { background: t.surface, border: `1px solid ${t.line}`, borderRadius: 9, overflow: "hidden" },
    filaItem: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      fontSize: 15,
      color: t.ink,
      borderBottom: `1px solid ${t.line}`,
    },
    filaPos: {
      width: 20,
      height: 20,
      borderRadius: 20,
      background: t.roseSoft,
      color: t.rose,
      fontSize: 12,
      lineHeight: "20px",
      textAlign: "center",
      flexShrink: 0,
    },
    addFila: {
      background: t.surface,
      border: `1px solid ${t.line}`,
      borderRadius: 9,
      padding: "0 14px",
      fontSize: 14,
      color: t.ink,
      flexShrink: 0,
    },
    filaTag: {
      background: t.roseSoft,
      color: t.rose,
      fontSize: 11,
      padding: "2px 6px",
      borderRadius: 4,
      flexShrink: 0,
    },
    passaBox: {
      background: t.roseSoft,
      borderRadius: 10,
      padding: 14,
      marginBottom: 18,
    },
    passaTxt: { fontSize: 14, color: t.ink, lineHeight: 1.45, marginBottom: 11 },
    passaBtn: {
      width: "100%",
      background: t.rose,
      color: "#fff",
      border: "none",
      borderRadius: 8,
      padding: "12px",
      fontSize: 15,
      fontWeight: 500,
    },
    segOnEscopo: { background: t.roseSoft, borderColor: t.roseSoft, color: t.rose, fontWeight: 500 },
    escopoInfo: { fontSize: 13, color: t.inkSoft, margin: "12px 2px 10px" },
    cardExport: {
      width: "100%",
      background: "none",
      border: "none",
      borderTop: `1px solid ${t.line}`,
      padding: "11px",
      fontSize: 14,
      color: t.rose,
    },
    exportTxt: {
      width: "100%",
      height: 200,
      background: t.surface,
      color: t.ink,
      border: `1px solid ${t.line}`,
      borderRadius: 9,
      padding: 12,
      fontSize: 13,
      lineHeight: 1.6,
      resize: "none",
      fontFamily: sans,
    },
    fotoImg: {
      width: "100%",
      maxHeight: 260,
      objectFit: "cover",
      borderRadius: 9,
      border: `1px solid ${t.line}`,
      display: "block",
    },
    fotoAdd: {
      display: "block",
      width: "100%",
      textAlign: "center",
      background: t.surface,
      border: `1px dashed ${t.line}`,
      borderRadius: 9,
      padding: "20px 12px",
      fontSize: 15,
      color: t.inkSoft,
      cursor: "pointer",
    },
    fotoVazia: {
      background: t.surface,
      border: `1px solid ${t.line}`,
      borderRadius: 9,
      padding: "20px 12px",
      fontSize: 15,
      color: t.inkSoft,
      textAlign: "center",
    },
    fotoTag: {
      background: "#F2EDEF",
      color: t.inkSoft,
      fontSize: 11,
      padding: "2px 6px",
      borderRadius: 4,
      flexShrink: 0,
    },
    histBox: {
      background: t.roseSoft,
      borderRadius: 10,
      padding: 14,
      marginBottom: 18,
    },
    segmento: { display: "flex", gap: 8 },
    segBtn: {
      flex: 1,
      background: t.surface,
      border: `1px solid ${t.line}`,
      borderRadius: 9,
      padding: "12px",
      fontSize: 15,
      color: t.inkSoft,
    },
    segOnPend: { background: t.amberSoft, borderColor: t.amberSoft, color: t.amber, fontWeight: 500 },
    segOnPago: { background: t.greenSoft, borderColor: t.greenSoft, color: t.green, fontWeight: 500 },
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(43,28,40,0.42)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      zIndex: 50,
    },
    sheet: {
      width: "100%",
      maxWidth: 480,
      background: t.bg,
      borderRadius: "16px 16px 0 0",
      maxHeight: "92vh",
      display: "flex",
      flexDirection: "column",
    },
    sheetHead: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px 10px" },
    sheetTitle: { fontFamily: display, fontSize: 20, color: t.ink },
    cliRow: {
      width: "100%",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      background: t.surface,
      border: `1px solid ${t.line}`,
      borderRadius: 12,
      padding: "14px",
      marginBottom: 10,
    },
    checkRow: {
      display: "flex",
      gap: 11,
      alignItems: "flex-start",
      width: "100%",
      background: "none",
      border: "none",
      padding: "16px 0 0",
      fontSize: 15,
      color: t.ink,
    },
    checkBox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      border: `1.5px solid ${t.line}`,
      background: t.surface,
      color: "#fff",
      fontSize: 13,
      lineHeight: "20px",
      textAlign: "center",
      flexShrink: 0,
    },
    checkOn: { background: t.rose, borderColor: t.rose },
    checkHelp: { display: "block", fontSize: 13, color: t.inkSoft, marginTop: 3, lineHeight: 1.4 },
    toast: {
      position: "fixed",
      bottom: 92,
      left: "50%",
      transform: "translateX(-50%)",
      background: t.ink,
      color: "#fff",
      fontSize: 14,
      padding: "10px 16px",
      borderRadius: 8,
      zIndex: 60,
    },
    /* conexão, conta e equipe */
    faixa: {
      margin: "12px 20px 0",
      background: t.amberSoft,
      color: t.amber,
      padding: "9px 12px",
      borderRadius: 8,
      fontSize: 13,
      lineHeight: 1.45,
    },
    faixaErro: { background: t.roseSoft, color: t.rose },
    nota: { fontSize: 14, color: t.inkSoft, lineHeight: 1.55, margin: "0 0 14px" },
    notaPequena: { fontSize: 13, color: t.inkSoft, lineHeight: 1.5, margin: "8px 2px 0" },
    ok: { fontSize: 14, color: t.green, margin: "14px 0 0", lineHeight: 1.45 },
    pessoa: { display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: `1px solid ${t.line}` },
    pessoaEmail: {
      flex: 1,
      minWidth: 0,
      fontSize: 15,
      color: t.ink,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    pessoaPapel: {
      fontSize: 12,
      color: t.inkSoft,
      background: "#F2EDEF",
      padding: "2px 8px",
      borderRadius: 20,
      flexShrink: 0,
    },
    linkAcao: { background: "none", border: "none", color: t.rose, fontSize: 14, padding: 6, flexShrink: 0 },
    botaoLink: {
      display: "block",
      width: "100%",
      textAlign: "center",
      textDecoration: "none",
      background: "none",
      color: t.inkSoft,
      border: `1px solid ${t.line}`,
      borderRadius: 10,
      padding: "13px 16px",
      fontSize: 15,
      marginTop: 10,
    },
  };

  // app/util.js
  var norm = (s) =>
    (s || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  var brl = (n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  var preencher = (txt, vals) => String(txt || "").replace(/\{(\w+)\}/g, (m, k) => (vals[k] !== void 0 ? vals[k] : m));

  // app/fretes/base.js
  var brlCentavos = (c) => brl((Number(c) || 0) / 100);
  var lerNumero = (s) => {
    if (typeof s === "number") return s;
    let x = String(s || "")
      .trim()
      .replace(/[^\d,.-]/g, "");
    if (!x) return NaN;
    if (x.includes(",")) x = x.replace(/\./g, "").replace(",", ".");
    return Number(x);
  };
  var soDigitos = (s) => String(s || "").replace(/\D/g, "");
  var num = (n) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  var pesoTexto = (kg) => {
    const n = Number(kg);
    if (!Number.isFinite(n) || n <= 0) return "";
    return n < 1 ? `${Math.round(n * 1e3)} g` : `${num(n)} kg`;
  };
  var dataHora = (ms) => {
    if (!ms) return "";
    const d = new Date(ms);
    const dia = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `${dia} às ${hora}`;
  };
  var diaMes = (chave) => {
    const [, m, d] = String(chave || "").split("-");
    return d && m ? `${d}/${m}` : "";
  };
  var httpsOuVazio = (url) => {
    try {
      const u = new URL(String(url || ""));
      return u.protocol === "https:" ? u.href : "";
    } catch {
      return "";
    }
  };
  var waLink = (whatsapp, texto) => {
    let d = soDigitos(whatsapp);
    if (d.length === 10 || d.length === 11) d = `55${d}`;
    const base = d.length >= 12 ? `https://wa.me/${d}` : "https://wa.me/";
    return `${base}?text=${encodeURIComponent(texto)}`;
  };
  var CAIXAS_PADRAO = [
    { id: "p", nome: "Pequena", altura: 6, largura: 20, comprimento: 25 },
    { id: "m", nome: "Média", altura: 10, largura: 25, comprimento: 32 },
    { id: "g", nome: "Grande", altura: 15, largura: 30, comprimento: 40 },
  ];
  var MENSAGEM_LINK_PADRAO =
    "Oi {nome}! Para receber suas peças, é só abrir o link, digitar o seu CEP e escolher o frete: {link}";
  var REMETENTE_VAZIO = {
    nome: "",
    telefone: "",
    email: "",
    cep: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
  };
  var CONFIG_FRETE_PADRAO = {
    origemCep: "",
    caixas: CAIXAS_PADRAO,
    transportadoras: ["Correios", "Jadlog"],
    mostrarOutras: false,
    pixValidadeMin: 1440,
    siteUrl: "",
    etiquetaPublica: true,
    naoComercial: true,
    valorDeclaradoPadrao: 50,
    conteudoPadrao: "Roupas",
    remetente: REMETENTE_VAZIO,
    mensagemLink: MENSAGEM_LINK_PADRAO,
  };
  function configDoBanco(raw) {
    const r = raw && typeof raw === "object" ? raw : {};
    const caixas = Array.isArray(r.caixas) && r.caixas.length ? r.caixas.filter((c) => c && c.id) : CAIXAS_PADRAO;
    return {
      ...CONFIG_FRETE_PADRAO,
      ...r,
      caixas: caixas.length ? caixas : CAIXAS_PADRAO,
      transportadoras:
        Array.isArray(r.transportadoras) && r.transportadoras.length
          ? r.transportadoras
          : CONFIG_FRETE_PADRAO.transportadoras,
      remetente: { ...REMETENTE_VAZIO, ...(r.remetente || {}) },
      mensagemLink: r.mensagemLink || MENSAGEM_LINK_PADRAO,
    };
  }
  var linkDoFrete = (config, token) => {
    const base = (config.siteUrl || window.location.origin).replace(/\/+$/, "");
    return `${base}/f/${token}`;
  };
  var S2 = {
    screen: { minHeight: "100vh", background: t.bg, fontFamily: sans, color: t.ink },
    frame: {
      maxWidth: 480,
      margin: "0 auto",
      minHeight: "100vh",
      background: t.bg,
      position: "relative",
      paddingBottom: 110,
    },
    header: { padding: "16px 20px 0" },
    brandRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
    brand: { fontFamily: display, fontSize: 21, color: t.ink },
    linkBtn: {
      background: "none",
      border: "none",
      color: t.inkSoft,
      fontSize: 14,
      padding: 6,
      fontFamily: "inherit",
      cursor: "pointer",
    },
    linkRose: {
      background: "none",
      border: "none",
      color: t.rose,
      fontSize: 14,
      padding: "6px 0",
      fontFamily: "inherit",
      cursor: "pointer",
      textDecoration: "underline",
      textUnderlineOffset: 3,
    },
    titulo: { fontFamily: display, fontSize: 28, lineHeight: 1.1, margin: "14px 0 2px", color: t.ink, fontWeight: 400 },
    subtitulo: { fontSize: 14, color: t.inkSoft, margin: "0 0 4px" },
    chips: { display: "flex", gap: 8, overflowX: "auto", padding: "14px 20px 2px", scrollbarWidth: "none" },
    chip: {
      flexShrink: 0,
      background: t.surface,
      border: `1px solid ${t.line}`,
      borderRadius: 20,
      padding: "8px 13px",
      fontSize: 14,
      color: t.inkSoft,
      fontFamily: "inherit",
      cursor: "pointer",
    },
    chipOn: { background: t.roseSoft, borderColor: t.roseSoft, color: t.rose, fontWeight: 500 },
    list: { padding: "14px 20px 0" },
    empty: { padding: "48px 8px", textAlign: "center" },
    emptyTitle: { fontFamily: display, fontSize: 19, color: t.ink, margin: "0 0 8px", fontWeight: 400 },
    emptyTxt: { fontSize: 15, color: t.inkSoft, margin: 0, lineHeight: 1.5 },
    card: {
      display: "block",
      width: "100%",
      textAlign: "left",
      background: t.surface,
      borderRadius: 12,
      border: `1px solid ${t.line}`,
      marginBottom: 12,
      padding: 14,
      fontFamily: "inherit",
      color: t.ink,
      cursor: "pointer",
    },
    cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
    cliNome: {
      fontSize: 16,
      fontWeight: 500,
      color: t.ink,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    cliSub: { fontSize: 13, color: t.inkSoft, marginTop: 3, lineHeight: 1.4 },
    preco: { fontFamily: display, fontSize: 19, color: t.ink, whiteSpace: "nowrap" },
    chipStatus: { display: "inline-block", marginTop: 8, fontSize: 12, padding: "3px 9px", borderRadius: 20 },
    alertaLinha: {
      marginTop: 10,
      background: t.roseSoft,
      color: t.rose,
      fontSize: 13,
      lineHeight: 1.4,
      padding: "8px 10px",
      borderRadius: 8,
    },
    dock: {
      position: "fixed",
      bottom: 0,
      left: "50%",
      transform: "translateX(-50%)",
      width: "100%",
      maxWidth: 480,
      padding: "12px 20px 20px",
      background: `linear-gradient(to top, ${t.bg} 62%, rgba(250,245,243,0))`,
      zIndex: 20,
    },
    cta: {
      width: "100%",
      background: t.rose,
      color: "#fff",
      border: "none",
      borderRadius: 10,
      padding: "15px 16px",
      fontSize: 16,
      fontWeight: 500,
      fontFamily: "inherit",
      cursor: "pointer",
      display: "block",
      textAlign: "center",
      textDecoration: "none",
      boxSizing: "border-box",
    },
    ctaGhost: {
      width: "100%",
      background: "none",
      color: t.inkSoft,
      border: `1px solid ${t.line}`,
      borderRadius: 10,
      padding: "13px 16px",
      fontSize: 15,
      marginTop: 10,
      fontFamily: "inherit",
      cursor: "pointer",
      display: "block",
      textAlign: "center",
      textDecoration: "none",
      boxSizing: "border-box",
    },
    ctaVerde: {
      width: "100%",
      background: t.green,
      color: "#fff",
      border: "none",
      borderRadius: 10,
      padding: "15px 16px",
      fontSize: 16,
      fontWeight: 500,
      fontFamily: "inherit",
      cursor: "pointer",
      display: "block",
      textAlign: "center",
      textDecoration: "none",
      boxSizing: "border-box",
    },
    label: { display: "block", fontSize: 13, color: t.inkSoft, marginBottom: 6, marginTop: 16 },
    input: {
      width: "100%",
      background: t.surface,
      border: `1px solid ${t.line}`,
      borderRadius: 9,
      padding: "13px 13px",
      fontSize: 16,
      color: t.ink,
      fontFamily: "inherit",
      boxSizing: "border-box",
    },
    textarea: {
      width: "100%",
      background: t.surface,
      color: t.ink,
      border: `1px solid ${t.line}`,
      borderRadius: 9,
      padding: 12,
      fontSize: 14,
      lineHeight: 1.5,
      resize: "vertical",
      fontFamily: "inherit",
      boxSizing: "border-box",
    },
    ajuda: { fontSize: 13, color: t.inkSoft, lineHeight: 1.5, margin: "6px 2px 0" },
    erro: { fontSize: 14, color: t.rose, margin: "14px 0 0", lineHeight: 1.4 },
    sugBox: { background: t.surface, border: `1px solid ${t.line}`, borderRadius: 9, marginTop: 6, overflow: "hidden" },
    sugItem: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      background: "none",
      border: "none",
      borderBottom: `1px solid ${t.line}`,
      padding: "12px 13px",
      fontSize: 15,
      color: t.ink,
      textAlign: "left",
      fontFamily: "inherit",
      cursor: "pointer",
    },
    segmento: { display: "flex", gap: 8, flexWrap: "wrap" },
    segBtn: {
      flex: "1 1 0",
      minWidth: 90,
      background: t.surface,
      border: `1px solid ${t.line}`,
      borderRadius: 9,
      padding: "11px 8px",
      fontSize: 14,
      color: t.inkSoft,
      fontFamily: "inherit",
      cursor: "pointer",
      textAlign: "center",
      lineHeight: 1.3,
    },
    segOn: { background: t.roseSoft, borderColor: t.roseSoft, color: t.rose, fontWeight: 500 },
    dica: {
      background: t.surface,
      border: `1px solid ${t.line}`,
      borderRadius: 20,
      padding: "6px 11px",
      fontSize: 13,
      color: t.inkSoft,
      fontFamily: "inherit",
      cursor: "pointer",
    },
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(43,28,40,0.42)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      zIndex: 50,
    },
    sheet: {
      width: "100%",
      maxWidth: 480,
      background: t.bg,
      borderRadius: "16px 16px 0 0",
      maxHeight: "92vh",
      display: "flex",
      flexDirection: "column",
    },
    sheetHead: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px 10px" },
    sheetTitle: { fontFamily: display, fontSize: 20, color: t.ink },
    sheetBody: { padding: "4px 20px 24px", overflowY: "auto" },
    bloco: { background: t.surface, border: `1px solid ${t.line}`, borderRadius: 12, padding: 14, marginTop: 14 },
    blocoTitulo: { fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase", color: t.inkFaint, margin: "0 0 8px" },
    linha: { display: "flex", justifyContent: "space-between", gap: 12, fontSize: 15, padding: "5px 0", color: t.ink },
    linhaRot: { color: t.inkSoft },
    caixaAviso: {
      background: t.amberSoft,
      color: t.amber,
      fontSize: 14,
      lineHeight: 1.45,
      padding: "11px 13px",
      borderRadius: 9,
      marginTop: 14,
    },
    caixaErro: {
      background: t.roseSoft,
      color: t.rose,
      fontSize: 14,
      lineHeight: 1.45,
      padding: "11px 13px",
      borderRadius: 9,
      marginTop: 14,
    },
    caixaOk: {
      background: t.greenSoft,
      color: t.green,
      fontSize: 14,
      lineHeight: 1.45,
      padding: "11px 13px",
      borderRadius: 9,
      marginTop: 14,
    },
    codigoLinha: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      background: "#F2EDEF",
      borderRadius: 9,
      padding: "10px 12px",
      marginTop: 8,
    },
    codigoTxt: { fontSize: 14, wordBreak: "break-all", color: t.ink, flex: 1, minWidth: 0 },
    toast: {
      position: "fixed",
      bottom: 92,
      left: "50%",
      transform: "translateX(-50%)",
      background: t.ink,
      color: "#fff",
      fontSize: 14,
      padding: "10px 16px",
      borderRadius: 8,
      zIndex: 60,
      maxWidth: "calc(100% - 40px)",
      textAlign: "center",
    },
    toastPago: { background: t.green },
  };

  // app/fretes/dados.js
  var ErroDaApi = class extends Error {
    constructor(mensagem, { status = 0, codigo = "" } = {}) {
      super(mensagem);
      this.name = "ErroDaApi";
      this.status = status;
      this.codigo = codigo;
    }
    /** O login não vale mais (nunca entrou ou a sessão acabou). */
    get semLogin() {
      return this.status === 401;
    }
  };
  var PRAZO_PADRAO_MS = 13e4;
  async function pedir(metodo, caminho, corpo, prazoMs = PRAZO_PADRAO_MS) {
    const controle = new AbortController();
    const relogio = setTimeout(() => controle.abort(), prazoMs);
    let resposta;
    let texto;
    try {
      resposta = await fetch(caminho, {
        method: metodo,
        headers: corpo === void 0 ? {} : { "Content-Type": "application/json" },
        body: corpo === void 0 ? void 0 : JSON.stringify(corpo),
        credentials: "same-origin",
        signal: controle.signal,
      });
      texto = await resposta.text();
    } catch (e) {
      const demorou = e && e.name === "AbortError";
      throw new ErroDaApi(
        demorou
          ? "O servidor demorou demais para responder. Confira na lista se deu certo antes de tentar de novo."
          : "Sem conexão com o servidor. Confira a internet e tente de novo.",
        { codigo: demorou ? "demorou" : "sem_rede" },
      );
    } finally {
      clearTimeout(relogio);
    }
    let json = null;
    try {
      json = JSON.parse(texto);
    } catch {
      json = null;
    }
    if (resposta.ok && json) return json;
    const doServidor = json && typeof json.erro === "string" ? json.erro : "";
    const codigo = (json && typeof json.codigo === "string" && json.codigo) || "";
    if (resposta.status === 401)
      throw new ErroDaApi("Sua sessão acabou. Entre de novo no app da live.", {
        status: 401,
        codigo: "nao_autenticado",
      });
    if (resposta.status === 429)
      throw new ErroDaApi(doServidor || "Muitos pedidos seguidos. Espere um pouco e tente de novo.", {
        status: 429,
        codigo,
      });
    if (resposta.status >= 500)
      throw new ErroDaApi(doServidor || "O servidor teve um problema agora. Tente de novo em instantes.", {
        status: resposta.status,
        codigo,
      });
    throw new ErroDaApi(doServidor || "Não deu certo. Tente de novo.", { status: resposta.status, codigo });
  }
  async function chamar(comando, dados) {
    const r = await pedir("POST", `/api/admin/${encodeURIComponent(comando)}`, dados || {});
    return Object.prototype.hasOwnProperty.call(r, "data") ? r.data : null;
  }
  var quemSou = () => pedir("GET", "/api/auth/eu", void 0, 2e4);
  function aplicar(mapa, resposta, colecao) {
    if (resposta.reiniciar) mapa.clear();
    for (const m of resposta.mudancas || []) {
      if (m.c !== colecao) continue;
      if (m.a) mapa.delete(m.i);
      else mapa.set(m.i, { ...m.d, id: m.i });
    }
    return resposta.ate;
  }
  async function listarClientes() {
    const mapa = /* @__PURE__ */ new Map();
    let desde = 0;
    for (let volta = 0; volta < 40; volta += 1) {
      const r = await pedir("GET", `/api/app/estado?desde=${desde}&c=clientes`, void 0, 3e4);
      desde = aplicar(mapa, r, "clientes");
      if (r.completo) break;
    }
    return [...mapa.values()];
  }
  var INTERVALO_VISIVEL_MS = 6e3;
  var INTERVALO_ESCONDIDA_MS = 6e4;
  var INTERVALO_MAXIMO_MS = 6e4;
  function acompanharFretes({
    aoAtualizar,
    aoFalhar,
    aoPerderLogin,
    documento = globalThis.document,
    janela = globalThis.window,
  }) {
    const mapa = /* @__PURE__ */ new Map();
    let posicao = 0;
    let primeira = true;
    let rodando = true;
    let falhasSeguidas = 0;
    let relogio = null;
    let andamento = null;
    const ordenada = () => [...mapa.values()].sort((a, b) => (Number(b.criadoEm) || 0) - (Number(a.criadoEm) || 0));
    async function conferir() {
      let mudou = primeira || falhasSeguidas > 0;
      try {
        for (let volta = 0; volta < 20; volta += 1) {
          const r = await chamar("listarFretes", { desde: posicao });
          const antes = mapa.size;
          posicao = aplicar(mapa, r, "fretes");
          if (r.reiniciar || (r.mudancas || []).some((m) => m.c === "fretes") || mapa.size !== antes) mudou = true;
          if (r.completo) break;
        }
        falhasSeguidas = 0;
        primeira = false;
        if (mudou && rodando) aoAtualizar(ordenada());
      } catch (e) {
        if (!rodando) return;
        if (e instanceof ErroDaApi && e.semLogin) {
          parar();
          aoPerderLogin();
          return;
        }
        falhasSeguidas += 1;
        aoFalhar(e instanceof ErroDaApi ? e : new ErroDaApi("Não consegui atualizar a lista agora."));
      }
    }
    const intervalo = () => {
      if (falhasSeguidas > 0) return Math.min(INTERVALO_MAXIMO_MS, INTERVALO_VISIVEL_MS * 2 ** (falhasSeguidas - 1));
      return documento && documento.visibilityState === "hidden" ? INTERVALO_ESCONDIDA_MS : INTERVALO_VISIVEL_MS;
    };
    function agendar(ms) {
      clearTimeout(relogio);
      if (rodando) relogio = setTimeout(ciclo, ms);
    }
    async function ciclo() {
      if (!andamento) {
        andamento = conferir().finally(() => {
          andamento = null;
        });
      }
      await andamento;
      agendar(intervalo());
    }
    function conferirAgora() {
      if (rodando) {
        clearTimeout(relogio);
        ciclo();
      }
    }
    const aoVoltar = () => {
      if (!documento || documento.visibilityState !== "hidden") {
        falhasSeguidas = 0;
        conferirAgora();
      }
    };
    function parar() {
      rodando = false;
      clearTimeout(relogio);
      if (janela) {
        janela.removeEventListener("online", aoVoltar);
        janela.removeEventListener("focus", aoVoltar);
      }
      if (documento) documento.removeEventListener("visibilitychange", aoVoltar);
    }
    if (janela) {
      janela.addEventListener("online", aoVoltar);
      janela.addEventListener("focus", aoVoltar);
    }
    if (documento) documento.addEventListener("visibilitychange", aoVoltar);
    ciclo();
    return { parar, conferirAgora };
  }

  // app/fretes/componentes.jsx
  function Folha({ titulo, onClose, children }) {
    return h(
      "div",
      { style: S2.overlay, onClick: onClose },
      h(
        "div",
        {
          style: S2.sheet,
          onClick: (e) => e.stopPropagation(),
          role: "dialog",
          "aria-modal": "true",
          "aria-label": titulo,
        },
        h(
          "div",
          { style: S2.sheetHead },
          h("span", { style: S2.sheetTitle }, titulo),
          h("button", { style: S2.linkBtn, onClick: onClose }, "Fechar"),
        ),
        h("div", { style: S2.sheetBody }, children),
      ),
    );
  }
  async function copiarTexto(texto) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(texto);
        return true;
      }
    } catch {}
    try {
      const a = document.createElement("textarea");
      a.value = texto;
      a.setAttribute("readonly", "");
      a.style.position = "fixed";
      a.style.opacity = "0";
      document.body.appendChild(a);
      a.select();
      const ok = document.execCommand("copy");
      a.remove();
      return ok;
    } catch {
      return false;
    }
  }
  function LinhaCopiavel({ texto, rotulo = "Copiar", onCopiado }) {
    return h(
      "div",
      { style: S2.codigoLinha },
      h("span", { style: S2.codigoTxt }, texto),
      h(
        "button",
        {
          style: S2.linkRose,
          onClick: async () => onCopiado(await copiarTexto(texto)),
        },
        rotulo,
      ),
    );
  }
  function ChipStatus({ cor, children }) {
    const cores = {
      amber: { background: t.amberSoft, color: t.amber },
      green: { background: t.greenSoft, color: t.green },
      rose: { background: t.roseSoft, color: t.rose },
      neutral: { background: "#F2EDEF", color: t.inkSoft },
    };
    return h("span", { style: { ...S2.chipStatus, ...(cores[cor] || cores.neutral) } }, children);
  }
  function BotaoAcao({ estilo = S2.cta, ocupado, rotulo, rotuloOcupado, onClick, desabilitado }) {
    return h(
      "button",
      {
        style: { ...estilo, opacity: ocupado || desabilitado ? 0.6 : 1 },
        disabled: ocupado || desabilitado,
        onClick,
      },
      ocupado ? rotuloOcupado || "Aguarde…" : rotulo,
    );
  }
  function ConfirmarDuplo({ rotulo, rotuloConfirma, onConfirma, ocupado }) {
    const [pedindo, setPedindo] = useState(false);
    if (!pedindo) {
      return h("button", { style: S2.ctaGhost, onClick: () => setPedindo(true) }, rotulo);
    }
    return h(
      "div",
      { style: S2.caixaErro },
      h("div", { style: { marginBottom: 10 } }, rotuloConfirma),
      h(
        "div",
        { style: { display: "flex", gap: 8 } },
        h(
          "button",
          {
            style: { ...S2.ctaGhost, marginTop: 0, flex: 1, background: t.surface },
            onClick: () => setPedindo(false),
            disabled: ocupado,
          },
          "Voltar",
        ),
        h(
          "button",
          {
            style: { ...S2.cta, flex: 1, padding: "13px 10px", fontSize: 15, opacity: ocupado ? 0.6 : 1 },
            disabled: ocupado,
            onClick: onConfirma,
          },
          ocupado ? "Aguarde…" : "Sim, cancelar",
        ),
      ),
    );
  }

  // app/fretes/ajustes.jsx
  var mascaraCep = (v) => {
    const d = soDigitos(v).slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  };
  var paraCampo = (n) => String(n === void 0 || n === null ? "" : n).replace(".", ",");
  var HORAS_PIX = [
    [60, "1 hora"],
    [360, "6 horas"],
    [720, "12 horas"],
    [1440, "24 horas (recomendado)"],
    [2880, "2 dias"],
    [4320, "3 dias"],
  ];
  var SITE_OK =
    /^(https:\/\/[A-Za-z0-9.-]+|http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}))(:\d+)?$/;
  function Campo({ rotulo, ajuda, children }) {
    return h(
      Fragment,
      null,
      h("label", { style: S2.label }, rotulo),
      children,
      ajuda && h("p", { style: S2.ajuda }, ajuda),
    );
  }
  function Interruptor({ ligado, onMudar, titulo, ajuda }) {
    return h(
      "button",
      {
        style: {
          display: "flex",
          gap: 11,
          alignItems: "flex-start",
          width: "100%",
          background: "none",
          border: "none",
          padding: "16px 0 0",
          fontSize: 15,
          color: t.ink,
          textAlign: "left",
          fontFamily: "inherit",
        },
        onClick: () => onMudar(!ligado),
        role: "switch",
        "aria-checked": ligado,
      },
      h(
        "span",
        {
          style: {
            width: 22,
            height: 22,
            borderRadius: 6,
            border: `1.5px solid ${ligado ? t.rose : t.line}`,
            background: ligado ? t.rose : t.surface,
            color: "#fff",
            fontSize: 13,
            lineHeight: "20px",
            textAlign: "center",
            flexShrink: 0,
          },
        },
        ligado ? "✓" : "",
      ),
      h(
        "span",
        null,
        titulo,
        ajuda &&
          h(
            "span",
            { style: { display: "block", fontSize: 13, color: t.inkSoft, marginTop: 3, lineHeight: 1.4 } },
            ajuda,
          ),
      ),
    );
  }
  function SheetAjustes({ config, onClose, onFlash, onSalvo, aoPerderLogin }) {
    const [d, setD] = useState(() => ({
      origemCep: mascaraCep(config.origemCep),
      caixas: config.caixas.map((c) => ({
        id: c.id,
        nome: c.nome,
        altura: paraCampo(c.altura),
        largura: paraCampo(c.largura),
        comprimento: paraCampo(c.comprimento),
      })),
      transportadoras: config.transportadoras.join(", "),
      mostrarOutras: !!config.mostrarOutras,
      pixMin: config.pixValidadeMin,
      siteUrl: config.siteUrl || "",
      etiquetaPublica: config.etiquetaPublica !== false,
      naoComercial: config.naoComercial !== false,
      valorDeclaradoPadrao: paraCampo(config.valorDeclaradoPadrao),
      conteudoPadrao: config.conteudoPadrao || "",
      remetente: { ...config.remetente },
      mensagemLink: config.mensagemLink || MENSAGEM_LINK_PADRAO,
    }));
    const [erro, setErro] = useState("");
    const [salvando, setSalvando] = useState(false);
    const mudar = (campo, valor) => {
      setD((x) => ({ ...x, [campo]: valor }));
      setErro("");
    };
    const mudarRem = (campo, valor) => {
      setD((x) => ({ ...x, remetente: { ...x.remetente, [campo]: valor } }));
      setErro("");
    };
    const mudarCaixa = (i, campo, valor) => {
      setD((x) => ({ ...x, caixas: x.caixas.map((c, k) => (k === i ? { ...c, [campo]: valor } : c)) }));
      setErro("");
    };
    const novaCaixa = () => {
      setD((x) => ({
        ...x,
        caixas: [
          ...x.caixas,
          {
            id: `c${Date.now().toString(36)}`,
            nome: `Caixa ${x.caixas.length + 1}`,
            altura: "",
            largura: "",
            comprimento: "",
          },
        ],
      }));
    };
    const tirarCaixa = (i) => {
      setD((x) => (x.caixas.length <= 1 ? x : { ...x, caixas: x.caixas.filter((_, k) => k !== i) }));
    };
    const opcoesPix = HORAS_PIX.some((h2) => h2[0] === d.pixMin)
      ? HORAS_PIX
      : [...HORAS_PIX, [d.pixMin, `${Math.round(d.pixMin / 60)} horas`]].sort((a, b) => a[0] - b[0]);
    const faltaParaEtiqueta = [
      ["nome", "nome"],
      ["telefone", "telefone"],
      ["email", "e-mail"],
      ["cep", "CEP"],
      ["endereco", "rua"],
      ["numero", "número"],
      ["bairro", "bairro"],
      ["cidade", "cidade"],
      ["uf", "estado"],
    ]
      .filter(([k]) => {
        const v = String(d.remetente[k] || "");
        if (k === "cep") return soDigitos(v).length !== 8;
        if (k === "telefone") return ![10, 11].includes(soDigitos(v).length);
        return !v.trim();
      })
      .map(([, nome]) => nome);
    const salvar = async () => {
      const cep = soDigitos(d.origemCep);
      if (cep && cep.length !== 8) return setErro("O CEP de origem precisa ter 8 números.");
      const caixas = [];
      for (let i = 0; i < d.caixas.length; i += 1) {
        const c = d.caixas[i];
        const altura = lerNumero(c.altura);
        const largura = lerNumero(c.largura);
        const comprimento = lerNumero(c.comprimento);
        const medidasOk = [altura, largura, comprimento].every((n) => Number.isFinite(n) && n >= 0.5 && n <= 105);
        if (!medidasOk) return setErro(`Caixa “${c.nome || i + 1}”: confira as medidas (cada uma entre 0,5 e 105 cm).`);
        caixas.push({ id: c.id, nome: (c.nome || "").trim() || `Caixa ${i + 1}`, altura, largura, comprimento });
      }
      const transportadoras = d.transportadoras
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!transportadoras.length) return setErro("Escreva ao menos uma transportadora (ex.: Correios, Jadlog).");
      const site = d.siteUrl.trim().replace(/\/+$/, "");
      if (site && !SITE_OK.test(site))
        return setErro(
          "O endereço do site deve começar com https:// e não ter nada depois do nome (ex.: https://delas-fretes.seu-usuario.workers.dev). Só para teste no seu computador vale http://localhost:8787.",
        );
      const declarado = lerNumero(d.valorDeclaradoPadrao);
      if (!Number.isFinite(declarado) || declarado < 1 || declarado > 1e4)
        return setErro("O valor declarado padrão deve ficar entre R$ 1 e R$ 10.000.");
      const r = d.remetente;
      const uf = String(r.uf || "")
        .toUpperCase()
        .replace(/[^A-Z]/g, "")
        .slice(0, 2);
      const payload = {
        origemCep: cep,
        caixas,
        transportadoras,
        mostrarOutras: d.mostrarOutras,
        pixValidadeMin: d.pixMin,
        siteUrl: site,
        etiquetaPublica: d.etiquetaPublica,
        naoComercial: d.naoComercial,
        valorDeclaradoPadrao: declarado,
        conteudoPadrao: d.conteudoPadrao.trim() || "Roupas",
        remetente: {
          nome: (r.nome || "").trim(),
          telefone: soDigitos(r.telefone),
          email: (r.email || "").trim(),
          cep: soDigitos(r.cep),
          endereco: (r.endereco || "").trim(),
          numero: (r.numero || "").trim(),
          complemento: (r.complemento || "").trim(),
          bairro: (r.bairro || "").trim(),
          cidade: (r.cidade || "").trim(),
          uf,
        },
        mensagemLink: d.mensagemLink.trim() || MENSAGEM_LINK_PADRAO,
      };
      setSalvando(true);
      try {
        onSalvo(await chamar("salvarAjustes", payload));
        onFlash("Ajustes salvos");
        onClose();
      } catch (e) {
        if (e.semLogin) return aoPerderLogin();
        setErro(e.message);
      }
      setSalvando(false);
    };
    return h(
      Folha,
      { titulo: "Ajustes dos fretes", onClose },
      h(
        Campo,
        { rotulo: "CEP de onde você envia", ajuda: "O frete é calculado a partir deste CEP até o CEP da cliente." },
        h("input", {
          style: S2.input,
          inputMode: "numeric",
          placeholder: "00000-000",
          value: d.origemCep,
          onChange: (e) => mudar("origemCep", mascaraCep(e.target.value)),
        }),
      ),
      h(
        "div",
        { style: S2.bloco },
        h("p", { style: S2.blocoTitulo }, "Caixas (medidas fixas)"),
        h(
          "p",
          { style: { ...S2.ajuda, margin: "0 0 8px" } },
          "Na hora de criar o frete você escolhe uma destas e digita só o peso.",
        ),
        d.caixas.map((c, i) =>
          h(
            "div",
            {
              key: c.id,
              style: { borderTop: i ? `1px solid ${t.line}` : "none", paddingTop: i ? 12 : 0, marginTop: i ? 12 : 0 },
            },
            h("input", {
              style: S2.input,
              value: c.nome,
              placeholder: "Nome da caixa",
              onChange: (e) => mudarCaixa(i, "nome", e.target.value),
              "aria-label": `Nome da caixa ${i + 1}`,
            }),
            h(
              "div",
              { style: { display: "flex", gap: 8, marginTop: 8 } },
              [
                ["comprimento", "Comprim. (cm)"],
                ["largura", "Largura (cm)"],
                ["altura", "Altura (cm)"],
              ].map(([campo, rot]) =>
                h(
                  "div",
                  { key: campo, style: { flex: 1, minWidth: 0 } },
                  h("div", { style: { fontSize: 12, color: t.inkSoft, marginBottom: 4 } }, rot),
                  h("input", {
                    style: { ...S2.input, padding: "11px 10px" },
                    inputMode: "decimal",
                    value: c[campo],
                    onChange: (e) => mudarCaixa(i, campo, e.target.value),
                    "aria-label": `${rot} da caixa ${i + 1}`,
                  }),
                ),
              ),
            ),
            d.caixas.length > 1 &&
              h(
                "button",
                { style: { ...S2.linkBtn, color: t.rose, paddingLeft: 0 }, onClick: () => tirarCaixa(i) },
                "Remover esta caixa",
              ),
          ),
        ),
        h("button", { style: { ...S2.ctaGhost, marginTop: 14 }, onClick: novaCaixa }, "Adicionar caixa"),
        h(
          "button",
          {
            style: { ...S2.linkBtn, paddingLeft: 0 },
            onClick: () =>
              setD((x) => ({
                ...x,
                caixas: CAIXAS_PADRAO.map((c) => ({
                  id: c.id,
                  nome: c.nome,
                  altura: paraCampo(c.altura),
                  largura: paraCampo(c.largura),
                  comprimento: paraCampo(c.comprimento),
                })),
              })),
          },
          "Voltar às caixas de exemplo",
        ),
      ),
      h(
        Campo,
        {
          rotulo: "Transportadoras mostradas à cliente",
          ajuda: "Separe por vírgula. Fica só o que você usa; normalmente Correios e Jadlog.",
        },
        h("input", {
          style: S2.input,
          value: d.transportadoras,
          onChange: (e) => mudar("transportadoras", e.target.value),
        }),
      ),
      h(Interruptor, {
        ligado: d.mostrarOutras,
        onMudar: (v) => mudar("mostrarOutras", v),
        titulo: "Mostrar também outras transportadoras",
        ajuda: "Se desligado, só aparecem as de cima.",
      }),
      h(
        Campo,
        {
          rotulo: "Quanto tempo o Pix fica valendo",
          ajuda: "Depois disso a cliente pode gerar outro Pix pelo mesmo link.",
        },
        h(
          "select",
          { style: S2.input, value: d.pixMin, onChange: (e) => mudar("pixMin", Number(e.target.value)) },
          opcoesPix.map(([min, nome]) => h("option", { key: min, value: min }, nome)),
        ),
      ),
      h(
        Campo,
        {
          rotulo: "Endereço do seu site",
          ajuda:
            "Igual aparece no navegador, começando com https://. Vai nos links da cliente e é por ele que o Mercado Pago avisa quando o Pix cai.",
        },
        h("input", {
          style: S2.input,
          inputMode: "url",
          autoCapitalize: "none",
          placeholder: "https://delas-fretes.seu-usuario.workers.dev",
          value: d.siteUrl,
          onChange: (e) => mudar("siteUrl", e.target.value),
        }),
      ),
      window.location.protocol === "https:" &&
        d.siteUrl.trim().replace(/\/+$/, "") !== window.location.origin &&
        h(
          "button",
          { style: S2.linkRose, onClick: () => mudar("siteUrl", window.location.origin) },
          "Usar ",
          window.location.origin,
        ),
      h(
        "div",
        { style: S2.bloco },
        h("p", { style: S2.blocoTitulo }, "Quem envia (vai na etiqueta)"),
        h(
          "p",
          { style: { ...S2.ajuda, margin: "0 0 4px" } },
          "O CPF ou CNPJ fica em Conexões, guardado só no servidor.",
        ),
        h("label", { style: { ...S2.label, marginTop: 10 } }, "Nome (ou loja)"),
        h("input", {
          style: S2.input,
          value: d.remetente.nome || "",
          onChange: (e) => mudarRem("nome", e.target.value),
        }),
        h("label", { style: S2.label }, "WhatsApp com DDD"),
        h("input", {
          style: S2.input,
          type: "tel",
          inputMode: "tel",
          value: d.remetente.telefone || "",
          onChange: (e) => mudarRem("telefone", e.target.value),
        }),
        h("label", { style: S2.label }, "E-mail"),
        h("input", {
          style: S2.input,
          type: "email",
          inputMode: "email",
          autoCapitalize: "none",
          value: d.remetente.email || "",
          onChange: (e) => mudarRem("email", e.target.value),
        }),
        h("label", { style: S2.label }, "CEP"),
        h("input", {
          style: S2.input,
          inputMode: "numeric",
          value: d.remetente.cep ? mascaraCep(d.remetente.cep) : "",
          onChange: (e) => mudarRem("cep", mascaraCep(e.target.value)),
        }),
        h("label", { style: S2.label }, "Rua"),
        h("input", {
          style: S2.input,
          value: d.remetente.endereco || "",
          onChange: (e) => mudarRem("endereco", e.target.value),
        }),
        h(
          "div",
          { style: { display: "flex", gap: 8 } },
          h(
            "div",
            { style: { flex: "0 0 34%" } },
            h("label", { style: S2.label }, "Número"),
            h("input", {
              style: S2.input,
              value: d.remetente.numero || "",
              onChange: (e) => mudarRem("numero", e.target.value),
            }),
          ),
          h(
            "div",
            { style: { flex: 1, minWidth: 0 } },
            h("label", { style: S2.label }, "Complemento"),
            h("input", {
              style: S2.input,
              value: d.remetente.complemento || "",
              onChange: (e) => mudarRem("complemento", e.target.value),
            }),
          ),
        ),
        h("label", { style: S2.label }, "Bairro"),
        h("input", {
          style: S2.input,
          value: d.remetente.bairro || "",
          onChange: (e) => mudarRem("bairro", e.target.value),
        }),
        h(
          "div",
          { style: { display: "flex", gap: 8 } },
          h(
            "div",
            { style: { flex: 1, minWidth: 0 } },
            h("label", { style: S2.label }, "Cidade"),
            h("input", {
              style: S2.input,
              value: d.remetente.cidade || "",
              onChange: (e) => mudarRem("cidade", e.target.value),
            }),
          ),
          h(
            "div",
            { style: { flex: "0 0 26%" } },
            h("label", { style: S2.label }, "UF"),
            h("input", {
              style: S2.input,
              maxLength: 2,
              autoCapitalize: "characters",
              value: d.remetente.uf || "",
              onChange: (e) => mudarRem("uf", e.target.value.toUpperCase()),
            }),
          ),
        ),
        faltaParaEtiqueta.length > 0 &&
          h("div", { style: S2.caixaAviso }, "Para gerar etiquetas ainda falta: ", faltaParaEtiqueta.join(", "), "."),
      ),
      h(
        "div",
        { style: S2.bloco },
        h("p", { style: S2.blocoTitulo }, "Padrões do envio"),
        h("label", { style: { ...S2.label, marginTop: 4 } }, "Valor declarado padrão (R$)"),
        h("input", {
          style: S2.input,
          inputMode: "decimal",
          value: d.valorDeclaradoPadrao,
          onChange: (e) => mudar("valorDeclaradoPadrao", e.target.value),
        }),
        h("label", { style: S2.label }, "Conteúdo que aparece na etiqueta"),
        h("input", {
          style: S2.input,
          value: d.conteudoPadrao,
          maxLength: 80,
          onChange: (e) => mudar("conteudoPadrao", e.target.value),
        }),
        h(Interruptor, {
          ligado: d.naoComercial,
          onMudar: (v) => mudar("naoComercial", v),
          titulo: "Enviar como remessa sem nota fiscal",
          ajuda: "Para vendas de pessoa física (brechó). Desligue se você emite nota.",
        }),
        h(Interruptor, {
          ligado: d.etiquetaPublica,
          onMudar: (v) => mudar("etiquetaPublica", v),
          titulo: "Link da etiqueta abre sem entrar no Melhor Envio",
          ajuda: "Facilita imprimir pelo celular. Quem tiver o link consegue ver a etiqueta, então não compartilhe.",
        }),
      ),
      h(
        Campo,
        {
          rotulo: "Mensagem que acompanha o link",
          ajuda: "Use {nome} para o nome da cliente e {link} para o endereço do link.",
        },
        h("textarea", {
          style: { ...S2.textarea, height: 110 },
          value: d.mensagemLink,
          onChange: (e) => mudar("mensagemLink", e.target.value),
        }),
      ),
      h(
        "button",
        { style: { ...S2.linkBtn, paddingLeft: 0 }, onClick: () => mudar("mensagemLink", MENSAGEM_LINK_PADRAO) },
        "Voltar ao texto original",
      ),
      erro && h("p", { style: S2.erro, role: "alert" }, erro),
      h(BotaoAcao, {
        estilo: { ...S2.cta, marginTop: 18 },
        ocupado: salvando,
        rotulo: "Salvar ajustes",
        rotuloOcupado: "Salvando…",
        onClick: salvar,
      }),
    );
  }
  function Selo({ ok, children }) {
    return h(
      "span",
      {
        style: {
          display: "inline-block",
          fontSize: 12,
          padding: "3px 9px",
          borderRadius: 20,
          background: ok ? t.greenSoft : t.amberSoft,
          color: ok ? t.green : t.amber,
        },
      },
      children,
    );
  }
  function SheetConexoes({ config, cred, onClose, onCred, onFlash }) {
    const [status, setStatus] = useState(cred);
    const [erro, setErro] = useState("");
    const [ambiente, setAmbiente] = useState(cred ? cred.melhorEnvio.ambiente : "sandbox");
    const [meToken, setMeToken] = useState("");
    const [meEmail, setMeEmail] = useState(cred ? cred.melhorEnvio.emailContato || "" : "");
    const [mpToken, setMpToken] = useState("");
    const [mpSegredo, setMpSegredo] = useState("");
    const [documento, setDocumento] = useState("");
    const [ocupado, setOcupado] = useState("");
    const [teste, setTeste] = useState(null);
    const resultadoRef = useRef(null);
    useEffect(() => {
      if (teste && resultadoRef.current && resultadoRef.current.scrollIntoView)
        resultadoRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, [teste]);
    useEffect(() => {
      if (cred) return;
      chamar("statusCredenciais")
        .then((s) => {
          setStatus(s);
          onCred(s);
          setAmbiente(s.melhorEnvio.ambiente);
          setMeEmail(s.melhorEnvio.emailContato || "");
        })
        .catch((e) => setErro(e.message));
    }, []);
    const webhook = `${(config.siteUrl || window.location.origin).replace(/\/+$/, "")}/api/mp/webhook`;
    const me = status && status.melhorEnvio;
    const mp = status && status.mercadoPago;
    const salvar = async () => {
      const entrada = { melhorEnvio: { ambiente }, mercadoPago: {} };
      if (meToken.trim()) entrada.melhorEnvio.token = meToken;
      if (meEmail.trim()) entrada.melhorEnvio.emailContato = meEmail.trim();
      if (mpToken.trim()) entrada.mercadoPago.accessToken = mpToken;
      if (mpSegredo.trim()) entrada.mercadoPago.webhookSecret = mpSegredo;
      if (documento.trim()) entrada.remetenteDocumento = documento;
      const novo = await chamar("salvarCredenciais", entrada);
      setMeToken("");
      setMpToken("");
      setMpSegredo("");
      setDocumento("");
      setStatus(novo);
      onCred(novo);
      return novo;
    };
    const rodar = async (qual, fn) => {
      if (ocupado) return;
      setOcupado(qual);
      setErro("");
      try {
        await fn();
      } catch (e) {
        setErro(e.message);
      }
      setOcupado("");
    };
    const salvarETestar = () =>
      rodar("salvar", async () => {
        await salvar();
        setTeste(await chamar("testarConexoes"));
        onFlash("Salvo");
      });
    const soTestar = () =>
      rodar("testar", async () => {
        setTeste(await chamar("testarConexoes"));
      });
    const remover = (chave, aviso) =>
      rodar("remover", async () => {
        const novo = await chamar("salvarCredenciais", { remover: [chave] });
        setStatus(novo);
        onCred(novo);
        setTeste(null);
        onFlash(aviso);
      });
    const venceLogo = me && me.expiraEm && me.expiraEm - Date.now() < 7 * 864e5;
    return h(
      Folha,
      { titulo: "Conexões", onClose },
      h(
        "p",
        { style: { ...S2.subtitulo, lineHeight: 1.5 } },
        "Aqui você liga o Melhor Envio (frete e etiqueta) e o Mercado Pago (Pix do frete). Os códigos ficam guardados só no servidor: depois de salvar, eles não voltam para a tela.",
      ),
      !status && !erro && h("p", { style: S2.ajuda }, "Carregando…"),
      h(
        "div",
        { style: S2.bloco },
        h("p", { style: S2.blocoTitulo }, "Melhor Envio"),
        me &&
          h(
            "div",
            { style: { marginBottom: 6 } },
            h(Selo, { ok: me.configurado }, me.configurado ? `Token salvo ${me.final}` : "Sem token"),
            " ",
            me.expiraEm && h(Selo, { ok: !venceLogo }, "vence em ", new Date(me.expiraEm).toLocaleDateString("pt-BR")),
          ),
        venceLogo &&
          h("div", { style: S2.caixaAviso }, "O token está perto de vencer. Gere outro no Melhor Envio e cole aqui."),
        me &&
          me.escoposFaltando &&
          me.escoposFaltando.length > 0 &&
          h(
            "div",
            { style: S2.caixaErro },
            "Faltam permissões neste token: ",
            h("strong", null, me.escoposFaltando.join(", ")),
            ". Gere um token novo marcando todas.",
          ),
        h("label", { style: { ...S2.label, marginTop: 10 } }, "Ambiente"),
        h(
          "div",
          { style: S2.segmento, role: "group", "aria-label": "Ambiente do Melhor Envio" },
          [
            ["sandbox", "Teste (sandbox)"],
            ["producao", "Produção (valendo)"],
          ].map(([v, nome]) =>
            h(
              "button",
              {
                key: v,
                style: { ...S2.segBtn, ...(ambiente === v ? S2.segOn : {}) },
                onClick: () => setAmbiente(v),
                "aria-pressed": ambiente === v,
              },
              nome,
            ),
          ),
        ),
        h(
          "p",
          { style: S2.ajuda },
          "Comece no teste: o token do teste só funciona no teste e o de produção só na produção.",
        ),
        h(
          "label",
          { style: S2.label },
          "Token de acesso ",
          me && me.configurado ? "(deixe vazio para manter o atual)" : "",
        ),
        h("textarea", {
          style: { ...S2.textarea, height: 84, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12 },
          value: meToken,
          onChange: (e) => setMeToken(e.target.value),
          autoComplete: "off",
          autoCorrect: "off",
          autoCapitalize: "none",
          spellCheck: false,
          placeholder: "Cole o token inteiro",
        }),
        h("label", { style: S2.label }, "E-mail de contato do aplicativo"),
        h("input", {
          style: S2.input,
          type: "email",
          inputMode: "email",
          autoCapitalize: "none",
          value: meEmail,
          onChange: (e) => setMeEmail(e.target.value),
          placeholder: "o mesmo e-mail do cadastro no Melhor Envio",
        }),
        h(
          "p",
          { style: S2.ajuda },
          "Permissões que o token precisa ter: ",
          status
            ? status.escoposNecessarios.join(", ")
            : "shipping-calculate, cart-read, cart-write, shipping-checkout, shipping-generate, shipping-print, shipping-tracking, orders-read",
          ". Para gerar etiqueta, ainda é preciso ter saldo na carteira do Melhor Envio.",
        ),
        me &&
          me.configurado &&
          h(
            "button",
            {
              style: { ...S2.linkBtn, paddingLeft: 0, color: t.rose },
              onClick: () => remover("melhorEnvioToken", "Token do Melhor Envio removido"),
            },
            "Remover o token salvo",
          ),
      ),
      h(
        "div",
        { style: S2.bloco },
        h("p", { style: S2.blocoTitulo }, "Mercado Pago"),
        mp &&
          h(
            "div",
            { style: { marginBottom: 6 } },
            h(Selo, { ok: mp.configurado }, mp.configurado ? `Credencial salva ${mp.final}` : "Sem credencial"),
            " ",
            mp.configurado && h(Selo, { ok: mp.producao }, mp.producao ? "produção" : "teste"),
            " ",
            h(
              Selo,
              { ok: mp.webhookConfigurado },
              mp.webhookConfigurado ? "aviso automático ligado" : "sem aviso automático",
            ),
          ),
        h(
          "label",
          { style: { ...S2.label, marginTop: 10 } },
          "Access Token ",
          mp && mp.configurado ? "(deixe vazio para manter o atual)" : "",
        ),
        h("input", {
          style: S2.input,
          type: "password",
          autoComplete: "new-password",
          autoCapitalize: "none",
          spellCheck: false,
          value: mpToken,
          onChange: (e) => setMpToken(e.target.value),
          placeholder: "APP_USR-…",
        }),
        h(
          "p",
          { style: S2.ajuda },
          "Fica em Mercado Pago → Suas integrações → sua aplicação → Credenciais de produção. Sua conta precisa ter uma chave Pix cadastrada.",
        ),
        h("label", { style: S2.label }, "Assinatura secreta do aviso (webhook)"),
        h("input", {
          style: S2.input,
          type: "password",
          autoComplete: "new-password",
          autoCapitalize: "none",
          spellCheck: false,
          value: mpSegredo,
          onChange: (e) => setMpSegredo(e.target.value),
          placeholder: "Cole aqui a assinatura secreta",
        }),
        h(
          "p",
          { style: S2.ajuda },
          "No Mercado Pago, em Webhooks, coloque este endereço na URL de produção e marque o evento “Pagamentos”. Depois copie a assinatura secreta que ele mostrar:",
        ),
        h(LinhaCopiavel, {
          texto: webhook,
          onCopiado: (ok) => onFlash(ok ? "Endereço copiado" : "Não consegui copiar"),
        }),
        !config.siteUrl &&
          h(
            "p",
            { style: S2.ajuda },
            "Dica: preencha “Endereço do seu site” em Ajustes para este endereço ficar definitivo.",
          ),
        mp &&
          mp.webhookConfigurado &&
          h(
            "button",
            {
              style: { ...S2.linkBtn, paddingLeft: 0, color: t.rose },
              onClick: () => remover("mercadoPagoWebhook", "Assinatura removida"),
            },
            "Remover a assinatura salva",
          ),
      ),
      h(
        "div",
        { style: S2.bloco },
        h("p", { style: S2.blocoTitulo }, "Quem envia"),
        status &&
          h(
            Selo,
            { ok: status.remetenteDocumentoConfigurado },
            status.remetenteDocumentoConfigurado ? "CPF/CNPJ salvo" : "Falta o CPF/CNPJ",
          ),
        h("label", { style: { ...S2.label, marginTop: 10 } }, "CPF ou CNPJ de quem envia"),
        h("input", {
          style: S2.input,
          inputMode: "numeric",
          autoComplete: "off",
          value: documento,
          onChange: (e) => setDocumento(e.target.value),
          placeholder:
            status && status.remetenteDocumentoConfigurado ? "Já salvo — digite só para trocar" : "Somente números",
        }),
        h(
          "p",
          { style: S2.ajuda },
          "A etiqueta exige o documento de quem envia. Os demais dados (endereço, telefone) ficam em Ajustes.",
        ),
      ),
      teste &&
        h(
          "div",
          { style: { marginTop: 14 }, ref: resultadoRef },
          [
            ["Melhor Envio", teste.melhorEnvio],
            ["Mercado Pago", teste.mercadoPago],
          ].map(([nome, r]) =>
            h(
              "div",
              { key: nome, style: r.ok ? S2.caixaOk : S2.caixaErro },
              h("strong", null, r.ok ? "✓" : "✗", " ", nome, ":"),
              " ",
              r.mensagem,
            ),
          ),
        ),
      erro && h("p", { style: S2.erro, role: "alert" }, erro),
      h(BotaoAcao, {
        estilo: { ...S2.cta, marginTop: 18 },
        ocupado: ocupado === "salvar",
        rotulo: "Salvar e testar",
        rotuloOcupado: "Salvando e testando…",
        onClick: salvarETestar,
      }),
      h(BotaoAcao, {
        estilo: S2.ctaGhost,
        ocupado: ocupado === "testar",
        rotulo: "Só testar o que já está salvo",
        rotuloOcupado: "Testando…",
        onClick: soTestar,
      }),
    );
  }

  // app/fretes/fretes.jsx
  var primeiroNome = (s) =>
    String(s || "")
      .trim()
      .split(/\s+/)[0] || "";
  function situacao(f, agora) {
    const p = f.pagamento;
    switch (f.status) {
      case "criado":
        return f.cep
          ? { txt: "Cliente escolhendo o frete", cor: "amber" }
          : { txt: "Aguardando a cliente abrir o link", cor: "amber" };
      case "aguardando_pagamento":
        return p && p.status === "pending" && p.expiraEm && p.expiraEm < agora
          ? { txt: "Pix venceu sem pagamento", cor: "amber" }
          : { txt: "Aguardando o Pix", cor: "amber" };
      case "pago":
        return { txt: "Pago · gerar etiqueta", cor: "green" };
      case "etiqueta":
        return { txt: "Etiqueta pronta · falta postar", cor: "green" };
      case "postado":
        return { txt: "Postado · a caminho", cor: "neutral" };
      case "entregue":
        return { txt: "Entregue", cor: "neutral" };
      case "cancelado":
        return { txt: "Cancelado", cor: "neutral" };
      default:
        return { txt: f.status || "—", cor: "neutral" };
    }
  }
  var FILTROS = [
    ["ativos", "Ativos", (f) => f.status !== "entregue" && f.status !== "cancelado"],
    ["aguardando", "Aguardando", (f) => f.status === "criado" || f.status === "aguardando_pagamento"],
    ["enviar", "Para enviar", (f) => f.status === "pago" || f.status === "etiqueta"],
    ["caminho", "A caminho", (f) => f.status === "postado"],
    ["todos", "Todos", () => true],
  ];
  function textoPagamento(f, agora) {
    const p = f.pagamento;
    if (!p) return f.status === "cancelado" ? "—" : "A cliente ainda não escolheu o frete";
    if (p.status === "approved") return `Pago em ${dataHora(p.pagoEm)}`;
    if (p.status === "pending") {
      return p.expiraEm > agora ? `Aguardando o Pix (vale até ${dataHora(p.expiraEm)})` : "Pix venceu sem pagamento";
    }
    if (p.status === "refunded") return "Pagamento estornado";
    return (
      { expired: "Pix venceu", cancelled: "Pix cancelado", rejected: "Pix recusado" }[p.status] || String(p.status)
    );
  }
  function CartaoFrete({ f, agora, onAbrir }) {
    const s = situacao(f, agora);
    const preco = f.servico ? brlCentavos(f.servico.precoCentavos) : "";
    const pacote = f.caixa ? `${f.caixa.nome} · ${pesoTexto(f.pesoKg)}` : "";
    const destino = f.cidade ? `${f.cidade}/${f.uf}` : "";
    return h(
      "button",
      { style: { ...S2.card, ...(f.status === "pago" ? { borderColor: t.green } : {}) }, onClick: () => onAbrir(f.id) },
      h(
        "div",
        { style: S2.cardTop },
        h(
          "div",
          { style: { minWidth: 0 } },
          h("div", { style: S2.cliNome }, f.clienteNome),
          h(
            "div",
            { style: S2.cliSub },
            [pacote, destino, f.servico ? `${f.servico.empresa} ${f.servico.nome}` : ""].filter(Boolean).join(" · "),
          ),
        ),
        preco && h("div", { style: S2.preco }, preco),
      ),
      h(ChipStatus, { cor: s.cor }, s.txt),
      h("span", { style: { fontSize: 12, color: t.inkFaint, marginLeft: 8 } }, dataHora(f.criadoEm)),
      f.alerta && f.alerta.texto && h("div", { style: S2.alertaLinha }, f.alerta.texto),
    );
  }
  var PESOS_RAPIDOS = [0.3, 0.5, 1, 1.5, 2, 3];
  function SheetNovo({ clientes, config, onClose, onFlash, aoMudar }) {
    const [nome, setNome] = useState("");
    const [cliente, setCliente] = useState(null);
    const [wpp, setWpp] = useState("");
    const [caixaId, setCaixaId] = useState(config.caixas[0].id);
    const [peso, setPeso] = useState("");
    const [declarado, setDeclarado] = useState(String(config.valorDeclaradoPadrao).replace(".", ","));
    const [conteudo, setConteudo] = useState(config.conteudoPadrao);
    const [obs, setObs] = useState("");
    const [mais, setMais] = useState(false);
    const [live, setLive] = useState(null);
    const [erro, setErro] = useState("");
    const [salvando, setSalvando] = useState(false);
    const [criado, setCriado] = useState(null);
    const sugestoes = useMemo(() => {
      const q = norm(nome);
      if (!q || cliente) return [];
      return clientes.filter((c) => norm(c.nome).includes(q)).slice(0, 6);
    }, [nome, cliente, clientes]);
    useEffect(() => {
      setLive(null);
      if (!cliente || !cliente.id) return void 0;
      let vivo = true;
      chamar("vendasDaCliente", { clienteId: cliente.id })
        .then((vendas) => {
          if (!vivo || !Array.isArray(vendas) || !vendas.length) return;
          const ultima = vendas.reduce((m, v) => (v.data > m ? v.data : m), "");
          const total = vendas.filter((v) => v.data === ultima).reduce((x, v) => x + (Number(v.valor) || 0), 0);
          if (total > 0) setLive({ data: ultima, total });
        })
        .catch(() => {});
      return () => {
        vivo = false;
      };
    }, [cliente]);
    const escolher = (c) => {
      setCliente(c);
      setNome(c.nome);
      setWpp(c.whatsapp || "");
      setErro("");
    };
    const criar = async () => {
      const pesoNum = lerNumero(peso);
      const declNum = lerNumero(declarado);
      if (nome.trim().length < 2) return setErro("Escreva o nome da cliente.");
      if (!config.origemCep) return setErro("Antes de criar links, informe o CEP de origem em Ajustes.");
      if (!Number.isFinite(pesoNum) || pesoNum < 0.01 || pesoNum > 30)
        return setErro("Informe o peso em kg (entre 0,01 e 30).");
      if (!Number.isFinite(declNum) || declNum < 1 || declNum > 1e4)
        return setErro("O valor declarado deve ficar entre R$ 1,00 e R$ 10.000,00.");
      setSalvando(true);
      setErro("");
      try {
        const r = await chamar("criarFrete", {
          clienteId: cliente ? cliente.id : "",
          clienteNome: nome.trim(),
          whatsapp: soDigitos(wpp),
          caixaId,
          pesoKg: pesoNum,
          valorDeclarado: declNum,
          conteudo: conteudo.trim(),
          observacao: obs.trim(),
        });
        aoMudar();
        setCriado({ ...r, nome: nome.trim(), whatsapp: wpp });
      } catch (e) {
        setErro(e.message);
      }
      setSalvando(false);
    };
    if (criado) {
      const link = linkDoFrete(config, criado.token);
      const mensagem = preencher(config.mensagemLink, { nome: primeiroNome(criado.nome), link });
      return h(
        Folha,
        { titulo: "Link pronto", onClose },
        h(
          "p",
          { style: { ...S2.subtitulo, lineHeight: 1.5 } },
          "Envie para ",
          h("strong", null, primeiroNome(criado.nome)),
          ". Ela digita o CEP, escolhe o frete e paga o Pix. Você é avisada aqui quando cair.",
        ),
        h(LinhaCopiavel, { texto: link, onCopiado: (ok) => onFlash(ok ? "Link copiado" : "Não consegui copiar") }),
        h(
          "a",
          {
            style: { ...S2.ctaVerde, marginTop: 14 },
            href: waLink(criado.whatsapp, mensagem),
            target: "_blank",
            rel: "noopener noreferrer",
          },
          "Enviar pelo WhatsApp",
        ),
        h(
          "button",
          {
            style: S2.ctaGhost,
            onClick: async () => {
              try {
                await navigator.clipboard.writeText(mensagem);
                onFlash("Mensagem copiada");
              } catch {
                onFlash("Não consegui copiar");
              }
            },
          },
          "Copiar a mensagem pronta",
        ),
        h("button", { style: { ...S2.ctaGhost, border: "none" }, onClick: onClose }, "Concluir"),
      );
    }
    return h(
      Folha,
      { titulo: "Novo frete", onClose },
      h("label", { style: { ...S2.label, marginTop: 4 } }, "Cliente"),
      h("input", {
        style: S2.input,
        value: nome,
        placeholder: "Nome da cliente",
        autoCapitalize: "words",
        onChange: (e) => {
          setNome(e.target.value);
          setCliente(null);
          setErro("");
        },
      }),
      sugestoes.length > 0 &&
        h(
          "div",
          { style: S2.sugBox },
          sugestoes.map((c) =>
            h(
              "button",
              { key: c.id, style: S2.sugItem, onClick: () => escolher(c) },
              h("span", null, c.nome),
              h("span", { style: { fontSize: 13, color: t.inkFaint } }, c.whatsapp || ""),
            ),
          ),
        ),
      h("label", { style: S2.label }, "WhatsApp da cliente"),
      h("input", {
        style: S2.input,
        type: "tel",
        inputMode: "tel",
        placeholder: "(47) 99999-9999",
        value: wpp,
        onChange: (e) => setWpp(e.target.value),
      }),
      h("label", { style: S2.label }, "Caixa"),
      h(
        "div",
        { style: S2.segmento, role: "group", "aria-label": "Caixa" },
        config.caixas.map((c) =>
          h(
            "button",
            {
              key: c.id,
              style: { ...S2.segBtn, ...(caixaId === c.id ? S2.segOn : {}) },
              onClick: () => setCaixaId(c.id),
              "aria-pressed": caixaId === c.id,
            },
            h("div", null, c.nome),
            h(
              "div",
              { style: { fontSize: 12, marginTop: 2, opacity: 0.85 } },
              num(c.comprimento),
              "×",
              num(c.largura),
              "×",
              num(c.altura),
              " cm",
            ),
          ),
        ),
      ),
      h("p", { style: S2.ajuda }, "Comprimento × largura × altura. Para mudar as caixas: Ajustes."),
      h("label", { style: S2.label }, "Peso do pacote (kg)"),
      h("input", {
        style: S2.input,
        inputMode: "decimal",
        placeholder: "Ex.: 0,8",
        value: peso,
        onChange: (e) => {
          setPeso(e.target.value);
          setErro("");
        },
      }),
      h(
        "div",
        { style: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 } },
        PESOS_RAPIDOS.map((p) =>
          h(
            "button",
            {
              key: p,
              style: S2.dica,
              onClick: () => {
                setPeso(String(p).replace(".", ","));
                setErro("");
              },
            },
            pesoTexto(p),
          ),
        ),
      ),
      h("label", { style: S2.label }, "Valor declarado (seguro do envio)"),
      h("input", {
        style: S2.input,
        inputMode: "decimal",
        value: declarado,
        onChange: (e) => setDeclarado(e.target.value),
      }),
      live &&
        h(
          "div",
          { style: { marginTop: 8 } },
          h(
            "button",
            { style: S2.dica, onClick: () => setDeclarado(String(live.total.toFixed(2)).replace(".", ",")) },
            brl(live.total),
            " · peças da live de ",
            diaMes(live.data),
          ),
        ),
      h(
        "p",
        { style: S2.ajuda },
        "O valor das peças você já cobrou; aqui só entra o frete. Este valor serve para o seguro e para a etiqueta.",
      ),
      h(
        "button",
        { style: { ...S2.linkRose, marginTop: 14 }, onClick: () => setMais(!mais) },
        mais ? "Ocultar" : "Mais opções",
      ),
      mais &&
        h(
          Fragment,
          null,
          h("label", { style: { ...S2.label, marginTop: 6 } }, "Conteúdo (aparece na etiqueta)"),
          h("input", { style: S2.input, value: conteudo, maxLength: 80, onChange: (e) => setConteudo(e.target.value) }),
          h("label", { style: S2.label }, "Observação só sua (a cliente não vê)"),
          h("input", { style: S2.input, value: obs, maxLength: 200, onChange: (e) => setObs(e.target.value) }),
        ),
      erro && h("p", { style: S2.erro, role: "alert" }, erro),
      h(BotaoAcao, {
        estilo: { ...S2.cta, marginTop: 20 },
        ocupado: salvando,
        rotulo: "Gerar link",
        rotuloOcupado: "Gerando…",
        onClick: criar,
      }),
    );
  }
  function SheetDetalhe({ f, config, onClose, onFlash, aoMudar }) {
    const [ocupado, setOcupado] = useState("");
    const [erro, setErro] = useState("");
    const [etq, setEtq] = useState(null);
    const [confirmar, setConfirmar] = useState(null);
    const agora = Date.now();
    if (!f) {
      return h(
        Folha,
        { titulo: "Frete", onClose },
        h("p", { style: S2.subtitulo }, "Este frete não está mais na lista."),
      );
    }
    const nome = primeiroNome(f.clienteNome);
    const link = linkDoFrete(config, f.token);
    const s = situacao(f, agora);
    const r = f.rastreio && f.rastreio.codigo ? f.rastreio : null;
    const etiquetaPronta = f.etiqueta && f.etiqueta.etapa === "gerada";
    const servicoTxt = f.servico ? `${f.servico.empresa} ${f.servico.nome}` : "";
    const rodar = async (qual, fn) => {
      if (ocupado) return;
      setOcupado(qual);
      setErro("");
      try {
        await fn();
        aoMudar();
      } catch (e) {
        setErro(e.message);
      }
      setOcupado("");
    };
    const conferir = () =>
      rodar("conferir", async () => {
        await chamar("atualizarFrete", { freteId: f.id });
        onFlash("Conferido agora");
      });
    const gerar = (confirmarDiferenca) =>
      rodar("gerar", async () => {
        const resp = await chamar("gerarEtiqueta", { freteId: f.id, confirmarDiferenca: !!confirmarDiferenca });
        if (resp.precisaConfirmar) {
          setConfirmar(resp);
          return;
        }
        setConfirmar(null);
        setEtq(resp);
        onFlash("Etiqueta pronta");
      });
    const abrirEtiqueta = () =>
      rodar("imprimir", async () => {
        const resp = await chamar("urlEtiqueta", { freteId: f.id });
        setEtq({ url: resp.url, avisoImpressao: "", codigo: r ? r.codigo : "" });
      });
    const cancelar = () =>
      rodar("cancelar", async () => {
        await chamar("cancelarFrete", { freteId: f.id });
        onFlash("Link cancelado");
        onClose();
      });
    const urlEtiqueta = httpsOuVazio(etq && etq.url);
    const urlRastreio = httpsOuVazio(r && r.url);
    const msgRastreio = r
      ? `Oi ${nome}! Seu pedido foi enviado 🎉
${servicoTxt ? `${servicoTxt} · ` : ""}código de rastreio: ${r.codigo}
Acompanhe aqui: ${link}`
      : "";
    const msgLink = preencher(config.mensagemLink, { nome, link });
    const linhas = (pares) =>
      pares
        .filter((p) => p[1])
        .map((p) =>
          h(
            "div",
            { key: p[0], style: S2.linha },
            h("span", { style: S2.linhaRot }, p[0]),
            h("span", { style: { textAlign: "right" } }, p[1]),
          ),
        );
    const jaPago = f.status === "pago" || f.status === "etiqueta" || f.status === "postado" || f.status === "entregue";
    const blocoLink = h(
      Fragment,
      null,
      f.status !== "cancelado" &&
        h(
          "div",
          { style: S2.bloco },
          h("p", { style: S2.blocoTitulo }, "Link da cliente"),
          h(LinhaCopiavel, { texto: link, onCopiado: (ok) => onFlash(ok ? "Link copiado" : "Não consegui copiar") }),
          h(
            "a",
            {
              style: { ...S2.ctaGhost, marginTop: 10 },
              href: waLink(f.whatsapp, r && f.status !== "criado" ? msgRastreio : msgLink),
              target: "_blank",
              rel: "noopener noreferrer",
            },
            r && f.status !== "criado" ? "Avisar o rastreio pelo WhatsApp" : "Reenviar pelo WhatsApp",
          ),
        ),
    );
    const blocoPacote = h(
      Fragment,
      null,
      h(
        "div",
        { style: S2.bloco },
        h("p", { style: S2.blocoTitulo }, "Pacote"),
        linhas([
          [
            "Caixa",
            f.caixa
              ? `${f.caixa.nome} · ${num(f.caixa.comprimento)}×${num(f.caixa.largura)}×${num(f.caixa.altura)} cm`
              : "",
          ],
          ["Peso", pesoTexto(f.pesoKg)],
          ["Valor declarado", f.declaradoCentavos ? brlCentavos(f.declaradoCentavos) : ""],
          ["Conteúdo", f.conteudo],
          ["Observação", f.observacao],
        ]),
      ),
    );
    const blocoEntrega = h(
      Fragment,
      null,
      h(
        "div",
        { style: S2.bloco },
        h("p", { style: S2.blocoTitulo }, "Entrega e pagamento"),
        linhas([
          [
            "Destino",
            f.cidade
              ? `${f.cidade}/${f.uf}${f.cep ? ` · CEP ${String(f.cep).replace(/^(\d{5})(\d{3})$/, "$1-$2")}` : ""}`
              : "",
          ],
          ["Frete", servicoTxt],
          ["Prazo", f.servico && f.servico.prazoDias ? `até ${f.servico.prazoDias} dias úteis` : ""],
          ["Valor", f.servico ? brlCentavos(f.servico.precoCentavos) : ""],
          ["Pagamento", textoPagamento(f, agora)],
        ]),
        f.status === "aguardando_pagamento" &&
          h(BotaoAcao, {
            estilo: S2.ctaGhost,
            ocupado: ocupado === "conferir",
            rotulo: "Conferir o pagamento agora",
            rotuloOcupado: "Conferindo…",
            onClick: conferir,
          }),
      ),
    );
    const blocoGerar = h(
      Fragment,
      null,
      confirmar &&
        h(
          "div",
          { style: S2.caixaAviso, role: "alert" },
          "O Melhor Envio vai cobrar ",
          h("strong", null, brlCentavos(confirmar.precoCentavos)),
          ", mas a cliente pagou",
          " ",
          h("strong", null, brlCentavos(confirmar.pagoCentavos)),
          ". A diferença sai do seu saldo. Gerar mesmo assim?",
          h(
            "div",
            { style: { display: "flex", gap: 8, marginTop: 10 } },
            h(
              "button",
              {
                style: { ...S2.ctaGhost, marginTop: 0, flex: 1, background: t.surface },
                onClick: () => setConfirmar(null),
              },
              "Agora não",
            ),
            h(BotaoAcao, {
              estilo: { ...S2.cta, flex: 1, padding: "13px 10px", fontSize: 15 },
              ocupado: ocupado === "gerar",
              rotulo: "Gerar mesmo assim",
              onClick: () => gerar(true),
            }),
          ),
        ),
      f.status === "pago" &&
        !confirmar &&
        h(
          Fragment,
          null,
          h(BotaoAcao, {
            estilo: { ...S2.cta, marginTop: 16 },
            ocupado: ocupado === "gerar",
            rotulo: "Gerar etiqueta",
            rotuloOcupado: "Gerando a etiqueta… pode levar um minuto",
            onClick: () => gerar(false),
          }),
          h("p", { style: S2.ajuda }, "Compra a etiqueta no Melhor Envio com o saldo da sua carteira de lá."),
        ),
    );
    const blocoEtiqueta = h(
      Fragment,
      null,
      (f.status === "etiqueta" || f.status === "postado" || f.status === "entregue") &&
        h(
          "div",
          { style: S2.bloco },
          h("p", { style: S2.blocoTitulo }, "Etiqueta e rastreio"),
          r
            ? h(
                Fragment,
                null,
                h(LinhaCopiavel, {
                  texto: r.codigo,
                  onCopiado: (ok) => onFlash(ok ? "Código copiado" : "Não consegui copiar"),
                }),
                h(
                  "p",
                  { style: S2.ajuda },
                  f.status === "entregue"
                    ? `Entregue${r.entregueEm ? ` em ${dataHora(r.entregueEm)}` : ""}.`
                    : f.status === "postado"
                      ? `Postado${r.postadoEm ? ` em ${dataHora(r.postadoEm)}` : ""}.`
                      : "O código só começa a andar depois da postagem.",
                  " ",
                  "A cliente acompanha pelo mesmo link que recebeu.",
                ),
              )
            : h("p", { style: S2.ajuda }, "O código de rastreio ainda não apareceu. Toque em “Atualizar rastreio”."),
          urlEtiqueta
            ? h(
                Fragment,
                null,
                h(
                  "a",
                  {
                    style: { ...S2.ctaVerde, marginTop: 12 },
                    href: urlEtiqueta,
                    target: "_blank",
                    rel: "noopener noreferrer",
                  },
                  "Abrir etiqueta para imprimir",
                ),
                etq && etq.avisoImpressao && h("p", { style: S2.erro }, etq.avisoImpressao),
              )
            : etiquetaPronta &&
                h(BotaoAcao, {
                  estilo: { ...S2.cta, marginTop: 12 },
                  ocupado: ocupado === "imprimir",
                  rotulo: "Imprimir etiqueta",
                  rotuloOcupado: "Buscando a etiqueta…",
                  onClick: abrirEtiqueta,
                }),
          f.status !== "entregue" &&
            h(BotaoAcao, {
              estilo: S2.ctaGhost,
              ocupado: ocupado === "conferir",
              rotulo: "Atualizar rastreio",
              rotuloOcupado: "Atualizando…",
              onClick: conferir,
            }),
          urlRastreio &&
            h(
              "a",
              {
                style: { ...S2.ctaGhost, border: "none" },
                href: urlRastreio,
                target: "_blank",
                rel: "noopener noreferrer",
              },
              "Ver no Melhor Rastreio",
            ),
        ),
    );
    const blocoErro = h(Fragment, null, erro && h("p", { style: S2.erro, role: "alert" }, erro));
    const blocoCancelar = h(
      Fragment,
      null,
      (f.status === "criado" || f.status === "aguardando_pagamento") &&
        h(
          "div",
          { style: { marginTop: 18 } },
          h(ConfirmarDuplo, {
            rotulo: "Cancelar este link",
            rotuloConfirma: "Cancelar o link? A cliente não vai mais conseguir pagar por ele.",
            onConfirma: cancelar,
            ocupado: ocupado === "cancelar",
          }),
        ),
    );
    return h(
      Folha,
      { titulo: f.clienteNome, onClose },
      h(ChipStatus, { cor: s.cor }, s.txt),
      f.alerta && f.alerta.texto && h("div", { style: S2.caixaErro, role: "alert" }, f.alerta.texto),
      f.etiqueta &&
        f.etiqueta.erro &&
        !etiquetaPronta &&
        h("div", { style: S2.caixaErro, role: "alert" }, "Última tentativa de etiqueta: ", f.etiqueta.erro),
      jaPago
        ? h(Fragment, null, blocoGerar, blocoEtiqueta, blocoErro, blocoLink, blocoEntrega, blocoPacote)
        : h(Fragment, null, blocoLink, blocoEntrega, blocoPacote, blocoErro, blocoCancelar),
    );
  }
  function Pendencia({ cred, credErro, config, onAjustes, onConexoes }) {
    let texto = "";
    let acao = null;
    if (credErro) {
      texto = credErro;
      acao = ["Tentar de novo", onConexoes];
    } else if (!config.origemCep) {
      texto = "Falta informar o CEP de onde você envia.";
      acao = ["Abrir Ajustes", onAjustes];
    } else if (cred && !cred.melhorEnvio.configurado) {
      texto = "Falta conectar o Melhor Envio (calcula o frete e faz a etiqueta).";
      acao = ["Abrir Conexões", onConexoes];
    } else if (cred && !cred.mercadoPago.configurado) {
      texto = "Falta conectar o Mercado Pago (cobra o frete no Pix).";
      acao = ["Abrir Conexões", onConexoes];
    } else if (cred && cred.melhorEnvio.escoposFaltando && cred.melhorEnvio.escoposFaltando.length) {
      texto = `O token do Melhor Envio não tem todas as permissões (faltam ${cred.melhorEnvio.escoposFaltando.length}).`;
      acao = ["Ver em Conexões", onConexoes];
    } else if (cred && !cred.mercadoPago.webhookConfigurado) {
      texto =
        "Sem a assinatura do aviso do Mercado Pago, o Pix só é confirmado por consulta (pode demorar até 30 minutos).";
      acao = ["Abrir Conexões", onConexoes];
    } else if (cred && !cred.remetenteDocumentoConfigurado) {
      texto = "Falta o CPF ou CNPJ de quem envia (a etiqueta exige).";
      acao = ["Abrir Conexões", onConexoes];
    }
    if (!texto) return null;
    return h(
      "div",
      { style: { padding: "14px 20px 0" } },
      h(
        "div",
        { style: S2.caixaAviso },
        texto,
        " ",
        acao && h("button", { style: { ...S2.linkRose, color: t.amber }, onClick: acao[1] }, acao[0]),
      ),
    );
  }
  function Fretes({ aoPerderLogin }) {
    const [fretes, setFretes] = useState([]);
    const [carregou, setCarregou] = useState(false);
    const [semConexao, setSemConexao] = useState(false);
    const [clientes, setClientes] = useState([]);
    const [config, setConfig] = useState(configDoBanco(CONFIG_FRETE_PADRAO));
    const [cred, setCred] = useState(null);
    const [credErro, setCredErro] = useState("");
    const [filtro, setFiltro] = useState("ativos");
    const [folha, setFolha] = useState(null);
    const [toast, setToast] = useState(null);
    const [agora, setAgora] = useState(Date.now());
    const anterior = useRef(null);
    const timerToast = useRef(null);
    const acompanhamento = useRef(null);
    const flash = (texto, tipo) => {
      setToast({ texto, tipo });
      clearTimeout(timerToast.current);
      timerToast.current = setTimeout(() => setToast(null), tipo === "pago" ? 6e3 : 2400);
    };
    useEffect(() => {
      acompanhamento.current = acompanharFretes({
        aoAtualizar: (lista) => {
          const novo = {};
          lista.forEach((f) => {
            novo[f.id] = f.status;
          });
          if (anterior.current) {
            lista.forEach((f) => {
              const antes = anterior.current[f.id];
              if ((antes === "criado" || antes === "aguardando_pagamento") && f.status === "pago") {
                flash(`${primeiroNome(f.clienteNome)} pagou o frete! Já dá para gerar a etiqueta.`, "pago");
                if (navigator.vibrate) navigator.vibrate(200);
              }
            });
          }
          anterior.current = novo;
          setFretes(lista);
          setCarregou(true);
          setSemConexao(false);
        },
        aoFalhar: () => setSemConexao(true),
        aoPerderLogin,
      });
      return () => acompanhamento.current.parar();
    }, []);
    const aoMudar = () => acompanhamento.current && acompanhamento.current.conferirAgora();
    const carregarClientes = () => listarClientes().then(setClientes, (e) => e.semLogin && aoPerderLogin());
    useEffect(() => {
      carregarClientes();
      chamar("lerAjustes").then(
        (r) => setConfig(configDoBanco(r)),
        (e) => (e.semLogin ? aoPerderLogin() : flash("Não consegui abrir os ajustes agora.")),
      );
    }, []);
    const carregarCred = async () => {
      try {
        setCred(await chamar("statusCredenciais"));
        setCredErro("");
      } catch (e) {
        if (e.semLogin) aoPerderLogin();
        else setCredErro(e.message);
      }
    };
    useEffect(() => {
      carregarCred();
    }, []);
    useEffect(() => {
      const i = setInterval(() => setAgora(Date.now()), 3e4);
      return () => clearInterval(i);
    }, []);
    const paraEnviar = fretes.filter((f) => f.status === "pago").length;
    useEffect(() => {
      document.title = paraEnviar ? `(${paraEnviar}) Fretes · Delas pra Elas` : "Fretes · Delas pra Elas";
    }, [paraEnviar]);
    const contagem = useMemo(() => {
      const m = {};
      FILTROS.forEach(([id, , fn]) => {
        m[id] = fretes.filter(fn).length;
      });
      return m;
    }, [fretes]);
    const visiveis = useMemo(() => {
      const fn = FILTROS.find((x) => x[0] === filtro)[2];
      return fretes.filter(fn);
    }, [fretes, filtro]);
    const aberto = folha && folha.tipo === "detalhe" ? fretes.find((f) => f.id === folha.id) : null;
    return h(
      "div",
      { style: S2.screen },
      h(
        "div",
        { style: S2.frame },
        h(
          "div",
          { style: S2.header },
          h(
            "div",
            { style: S2.brandRow },
            h("span", { style: S2.brand }, "Delas pra Elas"),
            h("a", { style: { ...S2.linkBtn, textDecoration: "none" }, href: "/" }, "‹ Voltar ao app"),
          ),
          h("h1", { style: S2.titulo }, "Fretes"),
          h(
            "div",
            { style: { display: "flex", gap: 18 } },
            h(
              "button",
              { style: { ...S2.linkRose, padding: "4px 0" }, onClick: () => setFolha({ tipo: "ajustes" }) },
              "Ajustes",
            ),
            h(
              "button",
              { style: { ...S2.linkRose, padding: "4px 0" }, onClick: () => setFolha({ tipo: "conexoes" }) },
              "Conexões",
            ),
          ),
        ),
        h(Pendencia, {
          cred,
          credErro,
          config,
          onAjustes: () => setFolha({ tipo: "ajustes" }),
          onConexoes: () => (credErro ? carregarCred() : setFolha({ tipo: "conexoes" })),
        }),
        semConexao &&
          h(
            "div",
            { style: { ...S2.caixaAviso, margin: "12px 20px 0" }, role: "status" },
            "Sem conexão com o servidor agora. Tentando de novo…",
          ),
        h(
          "div",
          { style: S2.chips, role: "tablist", "aria-label": "Filtro" },
          FILTROS.map(([id, nome]) =>
            h(
              "button",
              {
                key: id,
                style: { ...S2.chip, ...(filtro === id ? S2.chipOn : {}) },
                onClick: () => setFiltro(id),
                "aria-pressed": filtro === id,
              },
              nome,
              " ",
              contagem[id] ? `· ${contagem[id]}` : "",
            ),
          ),
        ),
        h(
          "div",
          { style: S2.list },
          !carregou
            ? h("div", { style: S2.empty }, h("p", { style: S2.emptyTxt }, "Carregando…"))
            : visiveis.length === 0
              ? h(
                  "div",
                  { style: S2.empty },
                  h("p", { style: S2.emptyTitle }, fretes.length === 0 ? "Nenhum frete ainda" : "Nada por aqui"),
                  h(
                    "p",
                    { style: S2.emptyTxt },
                    fretes.length === 0
                      ? "Toque em “Novo frete”, escolha a cliente, a caixa e o peso. O link para ela pagar o frete aparece em seguida."
                      : "Nenhum frete nesta lista agora.",
                  ),
                )
              : visiveis.map((f) =>
                  h(CartaoFrete, { key: f.id, f, agora, onAbrir: (id) => setFolha({ tipo: "detalhe", id }) }),
                ),
        ),
        h(
          "div",
          { style: S2.dock },
          h(
            "button",
            {
              style: S2.cta,
              onClick: () => {
                carregarClientes();
                setFolha({ tipo: "novo" });
              },
            },
            "Novo frete",
          ),
        ),
        folha &&
          folha.tipo === "novo" &&
          h(SheetNovo, { clientes, config, onClose: () => setFolha(null), onFlash: flash, aoMudar }),
        folha &&
          folha.tipo === "detalhe" &&
          h(SheetDetalhe, { f: aberto, config, onClose: () => setFolha(null), onFlash: flash, aoMudar }),
        folha &&
          folha.tipo === "ajustes" &&
          h(SheetAjustes, {
            config,
            onClose: () => setFolha(null),
            onFlash: flash,
            onSalvo: (salvo) => setConfig(configDoBanco(salvo)),
            aoPerderLogin,
          }),
        folha &&
          folha.tipo === "conexoes" &&
          h(SheetConexoes, {
            config,
            cred,
            onClose: () => {
              setFolha(null);
              carregarCred();
            },
            onCred: setCred,
            onFlash: flash,
          }),
        toast &&
          h(
            "div",
            { style: { ...S2.toast, ...(toast.tipo === "pago" ? S2.toastPago : {}) }, role: "status" },
            toast.texto,
          ),
      ),
    );
  }
  function TelaAviso({ titulo, children, acao }) {
    return h(
      "div",
      { style: { ...S2.screen, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 } },
      h(
        "div",
        { style: { width: "100%", maxWidth: 340 } },
        h(
          "div",
          { style: { fontFamily: display, fontSize: 30, lineHeight: 1.1, color: t.ink, marginBottom: 8 } },
          titulo,
        ),
        h(
          "p",
          { style: { fontFamily: sans, fontSize: 15, color: t.inkSoft, lineHeight: 1.5, margin: "0 0 24px" } },
          children,
        ),
        acao || h("a", { style: S2.cta, href: "/" }, "Ir para o app da live"),
      ),
    );
  }
  function Root() {
    const [tela, setTela] = useState({ nome: "abrindo" });
    const verificar = () => {
      setTela({ nome: "abrindo" });
      quemSou().then(
        (r) => setTela({ nome: !r.usuario ? "sem-login" : r.usuario.papel !== "dono" ? "so-dona" : "ok" }),
        (e) => setTela({ nome: "falha", mensagem: e.message }),
      );
    };
    useEffect(verificar, []);
    switch (tela.nome) {
      case "abrindo":
        return h(
          "div",
          { style: { ...S2.screen, display: "flex", alignItems: "center", justifyContent: "center" } },
          h("p", { style: { color: t.inkSoft, fontSize: 15 } }, "Abrindo…"),
        );
      case "falha":
        return h(
          TelaAviso,
          {
            titulo: "Fretes",
            acao: h("button", { style: S2.cta, onClick: verificar }, "Tentar de novo"),
          },
          tela.mensagem,
        );
      case "sem-login":
        return h(
          TelaAviso,
          { titulo: "Fretes" },
          tela.expirou
            ? "Sua sessão acabou. Entre de novo no app da live e depois volte aqui."
            : "Para ver os fretes, entre primeiro no app da live. Depois é só voltar aqui.",
        );
      case "so-dona":
        return h(
          TelaAviso,
          { titulo: "Fretes" },
          "Só a dona do brechó abre esta tela. Quem é da equipe usa o app da live.",
        );
      default:
        return h(Fretes, { aoPerderLogin: () => setTela({ nome: "sem-login", expirou: true }) });
    }
  }
  carregarFontes();
  createRoot(document.getElementById("app")).render(h(Root, null));
})();
