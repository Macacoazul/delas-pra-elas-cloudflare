/**
 * Delas pra Elas — site-fretes-1.js
 * Parte do site, guardada como texto: o código da tela de Fretes — parte 1 de 2 do arquivo /fretes.js.
 *
 * Arquivo gerado por "npm run colar" (o texto de verdade fica nas pastas src/, app/ e site/ do projeto).
 * Cole o arquivo INTEIRO, num arquivo com o nome site-fretes-1.js no editor do Cloudflare. Não precisa mudar nada nele.
 *
 * O texto de cada página fica entre crases. As barras invertidas que aparecem antes de crases e de ${ são só o jeito
 * de escrever esse texto aqui dentro: o Worker entrega a página sem elas, igual ao arquivo da pasta site/.
 * "etag" é o código de verificação da página inteira (/api/saude confere se o texto colado bate com ele).
 */
export default {
  "/fretes.js": {
    tipo: "text/javascript; charset=utf-8",
    etag: "951ff6a519877185",
    parte: 1,
    de: 2,
    corpo: `/* fretes.js — a tela de Fretes
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
    tabs: { display: "flex", gap: 22, marginTop: 14, borderBottom: \`1px solid \${t.line}\` },
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
    calDetalhe: { padding: "18px 20px 0", borderTop: \`1px solid \${t.line}\`, marginTop: 14 },
    calDataSel: { fontSize: 14, color: t.inkSoft },
    resumo: { padding: "10px 20px 20px", borderBottom: \`1px solid \${t.line}\` },
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
      border: \`1px solid \${t.line}\`,
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
    row: { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderTop: \`1px solid \${t.line}\` },
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
      background: \`linear-gradient(to top, \${t.bg} 62%, rgba(250,245,243,0))\`,
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
      border: \`1px solid \${t.line}\`,
      borderRadius: 10,
      padding: "13px 16px",
      fontSize: 15,
      marginTop: 10,
    },
    label: { display: "block", fontSize: 13, color: t.inkSoft, marginBottom: 6 },
    input: {
      width: "100%",
      background: t.surface,
      border: \`1px solid \${t.line}\`,
      borderRadius: 9,
      padding: "13px 13px",
      fontSize: 16,
      color: t.ink,
    },
    okMark: { position: "absolute", right: 13, top: 14, color: t.green, fontSize: 16 },
    sugBox: { background: t.surface, border: \`1px solid \${t.line}\`, borderRadius: 9, marginTop: 6, overflow: "hidden" },
    sugItem: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      background: "none",
      border: "none",
      borderBottom: \`1px solid \${t.line}\`,
      padding: "12px 13px",
      fontSize: 15,
      color: t.ink,
      textAlign: "left",
    },
    hintNova: { fontSize: 13, color: t.rose, margin: "8px 2px 0" },
    erro: { fontSize: 14, color: t.rose, margin: "14px 0 0", lineHeight: 1.4 },
    filaBox: { background: t.surface, border: \`1px solid \${t.line}\`, borderRadius: 9, overflow: "hidden" },
    filaItem: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      fontSize: 15,
      color: t.ink,
      borderBottom: \`1px solid \${t.line}\`,
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
      border: \`1px solid \${t.line}\`,
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
      borderTop: \`1px solid \${t.line}\`,
      padding: "11px",
      fontSize: 14,
      color: t.rose,
    },
    exportTxt: {
      width: "100%",
      height: 200,
      background: t.surface,
      color: t.ink,
      border: \`1px solid \${t.line}\`,
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
      border: \`1px solid \${t.line}\`,
      display: "block",
    },
    fotoAdd: {
      display: "block",
      width: "100%",
      textAlign: "center",
      background: t.surface,
      border: \`1px dashed \${t.line}\`,
      borderRadius: 9,
      padding: "20px 12px",
      fontSize: 15,
      color: t.inkSoft,
      cursor: "pointer",
    },
    fotoVazia: {
      background: t.surface,
      border: \`1px solid \${t.line}\`,
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
      border: \`1px solid \${t.line}\`,
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
      border: \`1px solid \${t.line}\`,
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
      border: \`1.5px solid \${t.line}\`,
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
    pessoa: { display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: \`1px solid \${t.line}\` },
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
      border: \`1px solid \${t.line}\`,
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
      .replace(/[\\u0300-\\u036f]/g, "")
      .replace(/\\s+/g, " ");
  var brl = (n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  var preencher = (txt, vals) => String(txt || "").replace(/\\{(\\w+)\\}/g, (m, k) => (vals[k] !== void 0 ? vals[k] : m));

  // app/fretes/base.js
  var brlCentavos = (c) => brl((Number(c) || 0) / 100);
  var lerNumero = (s) => {
    if (typeof s === "number") return s;
    let x = String(s || "")
      .trim()
      .replace(/[^\\d,.-]/g, "");
    if (!x) return NaN;
    if (x.includes(",")) x = x.replace(/\\./g, "").replace(",", ".");
    return Number(x);
  };
  var soDigitos = (s) => String(s || "").replace(/\\D/g, "");
  var num = (n) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  var pesoTexto = (kg) => {
    const n = Number(kg);
    if (!Number.isFinite(n) || n <= 0) return "";
    return n < 1 ? \`\${Math.round(n * 1e3)} g\` : \`\${num(n)} kg\`;
  };
  var dataHora = (ms) => {
    if (!ms) return "";
    const d = new Date(ms);
    const dia = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return \`\${dia} às \${hora}\`;
  };
  var diaMes = (chave) => {
    const [, m, d] = String(chave || "").split("-");
    return d && m ? \`\${d}/\${m}\` : "";
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
    if (d.length === 10 || d.length === 11) d = \`55\${d}\`;
    const base = d.length >= 12 ? \`https://wa.me/\${d}\` : "https://wa.me/";
    return \`\${base}?text=\${encodeURIComponent(texto)}\`;
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
    const base = (config.siteUrl || window.location.origin).replace(/\\/+$/, "");
    return \`\${base}/f/\${token}\`;
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
      border: \`1px solid \${t.line}\`,
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
      border: \`1px solid \${t.line}\`,
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
      background: \`linear-gradient(to top, \${t.bg} 62%, rgba(250,245,243,0))\`,
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
      border: \`1px solid \${t.line}\`,
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
      border: \`1px solid \${t.line}\`,
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
      border: \`1px solid \${t.line}\`,
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
    sugBox: { background: t.surface, border: \`1px solid \${t.line}\`, borderRadius: 9, marginTop: 6, overflow: "hidden" },
    sugItem: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      background: "none",
      border: "none",
      borderBottom: \`1px solid \${t.line}\`,
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
      border: \`1px solid \${t.line}\`,
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
      border: \`1px solid \${t.line}\`,
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
    bloco: { background: t.surface, border: \`1px solid \${t.line}\`, borderRadius: 12, padding: 14, marginTop: 14 },
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
    const r = await pedir("POST", \`/api/admin/\${encodeURIComponent(comando)}\`, dados || {});
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
      const r = await pedir("GET", \`/api/app/estado?desde=\${desde}&c=clientes\`, void 0, 3e4);
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
    return d.length > 5 ? \`\${d.slice(0, 5)}-\${d.slice(5)}\` : d;
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
    /^(https:\\/\\/[A-Za-z0-9.-]+|http:\\/\\/(localhost|127\\.0\\.0\\.1|192\\.168\\.\\d{1,3}\\.\\d{1,3}|10\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}|172\\.(1[6-9]|2\\d|3[01])\\.\\d{1,3}\\.\\d{1,3}))(:\\d+)?$/;
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
            border: \`1.5px solid \${ligado ? t.rose : t.line}\`,
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
            id: \`c\${Date.now().toString(36)}\`,
            nome: \`Caixa \${x.caixas.length + 1}\`,
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
      : [...HORAS_PIX, [d.pixMin, \`\${Math.round(d.pixMin / 60)} horas\`]].sort((a, b) => a[0] - b[0]);
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
        if (!medidasOk) return setErro(\`Caixa “\${c.nome || i + 1}”: confira as medidas (cada uma entre 0,5 e 105 cm).\`);
        caixas.push({ id: c.id, nome: (c.nome || "").trim() || \`Caixa \${i + 1}\`, altura, largura, comprimento });
      }
      const transportadoras = d.transportadoras
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!transportadoras.length) return setErro("Escreva ao menos uma transportadora (ex.: Correios, Jadlog).");
      const site = d.siteUrl.trim().replace(/\\/+$/, "");
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
              style: { borderTop: i ? \`1px solid \${t.line}\` : "none", paddingTop: i ? 12 : 0, marginTop: i ? 12 : 0 },
            },
            h("input", {
              style: S2.input,
              value: c.nome,
              placeholder: "Nome da caixa",
              onChange: (e) => mudarCaixa(i, "nome", e.target.value),
              "aria-label": \`Nome da caixa \${i + 1}\`,
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
                    "aria-label": \`\${rot} da caixa \${i + 1}\`,
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
`,
  },
};
