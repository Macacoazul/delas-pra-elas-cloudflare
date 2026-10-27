/**
 * Delas pra Elas — site-live-2.js
 * Parte do site, guardada como texto: o código do app da live — parte 2 de 3 do arquivo /app.js.
 *
 * Arquivo gerado por "npm run colar" (o texto de verdade fica nas pastas src/, app/ e site/ do projeto).
 * Cole o arquivo INTEIRO, num arquivo com o nome site-live-2.js no editor do Cloudflare. Não precisa mudar nada nele.
 *
 * O texto de cada página fica entre crases. As barras invertidas que aparecem antes de crases e de ${ são só o jeito
 * de escrever esse texto aqui dentro: o Worker entrega a página sem elas, igual ao arquivo da pasta site/.
 * "etag" é o código de verificação da página inteira (/api/saude confere se o texto colado bate com ele).
 */
export default {
  "/app.js": {
    tipo: "text/javascript; charset=utf-8",
    etag: "016cefdaa9efa744",
    parte: 2,
    de: 3,
    corpo: `    const saida = new Uint8Array(tamanho);
    let p = 0;
    total.forEach((x) => {
      saida.set(x, p);
      p += x.length;
    });
    return saida;
  }
  var escapar = (s) =>
    String(s === null || s === void 0 ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  var letraColuna = (n) => {
    let s = "";
    n += 1;
    while (n > 0) {
      const r = (n - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  };
  function criarEstilos() {
    const bordas = ["<border><left/><right/><top/><bottom/><diagonal/></border>"];
    const chavesBorda = { "": 0 };
    const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
    const chavesXf = { "0|0|0|0": 0 };
    const borda = (l, r, t2, b) => {
      const chave = \`\${l ? 1 : 0}\${r ? 1 : 0}\${t2 ? 1 : 0}\${b ? 1 : 0}\`;
      if (chave === "0000") return 0;
      if (chavesBorda[chave] !== void 0) return chavesBorda[chave];
      const lado = (nome, tem) => (tem ? \`<\${nome} style="medium"><color rgb="FF000000"/></\${nome}>\` : \`<\${nome}/>\`);
      bordas.push(
        \`<border>\${lado("left", l)}\${lado("right", r)}\${lado("top", t2)}\${lado("bottom", b)}<diagonal/></border>\`,
      );
      chavesBorda[chave] = bordas.length - 1;
      return bordas.length - 1;
    };
    const xf = (fonte, formato, idBorda, centro) => {
      const chave = \`\${fonte}|\${formato}|\${idBorda}|\${centro}\`;
      if (chavesXf[chave] !== void 0) return chavesXf[chave];
      const alinha = centro ? '<alignment horizontal="center" vertical="center"/>' : "";
      xfs.push(
        \`<xf numFmtId="\${formato}" fontId="\${fonte}" fillId="0" borderId="\${idBorda}" xfId="0" applyFont="1" applyBorder="1" applyNumberFormat="1"\${centro ? ' applyAlignment="1"' : ""}>\${alinha}</xf>\`,
      );
      chavesXf[chave] = xfs.length - 1;
      return xfs.length - 1;
    };
    const xml = () =>
      \`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="_-&quot;R$&quot;\\\\ * #,##0.00_-;\\\\-&quot;R$&quot;\\\\ * #,##0.00_-;_-&quot;R$&quot;\\\\ * &quot;-&quot;??_-;_-@_-"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="\${bordas.length}">\${bordas.join("")}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="\${xfs.length}">\${xfs.join("")}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>\`;
    return { borda, xf, xml };
  }
  var COLUNAS_BLOCO = [0, 3, 6, 9, 12, 15, 18, 21];
  var LINHAS_ENTRE_FAIXAS = 3;
  function planilhaDoDia(grupos, nomeAba) {
    const est = criarEstilos();
    const celulas = {};
    let ultimaLinha = 0;
    let ultimaColuna = 0;
    const por = (r, c, conteudo) => {
      celulas[\`\${r},\${c}\`] = conteudo;
      if (r > ultimaLinha) ultimaLinha = r;
      if (c > ultimaColuna) ultimaColuna = c;
    };
    const texto2 = (r, c, valor, estilo) =>
      por(
        r,
        c,
        \`<c r="\${letraColuna(c)}\${r + 1}" s="\${estilo}" t="inlineStr"><is><t xml:space="preserve">\${escapar(valor)}</t></is></c>\`,
      );
    const numero = (r, c, valor, estilo) =>
      por(r, c, \`<c r="\${letraColuna(c)}\${r + 1}" s="\${estilo}"><v>\${valor}</v></c>\`);
    const formula = (r, c, f, valor, estilo) =>
      por(r, c, \`<c r="\${letraColuna(c)}\${r + 1}" s="\${estilo}"><f>\${escapar(f)}</f><v>\${valor}</v></c>\`);
    const vazia = (r, c, estilo) => por(r, c, \`<c r="\${letraColuna(c)}\${r + 1}" s="\${estilo}"/>\`);
    const emOrdem = [...grupos].reverse();
    let linhaBase = 0;
    for (let i = 0; i < emOrdem.length; i += COLUNAS_BLOCO.length) {
      const faixa = emOrdem.slice(i, i + COLUNAS_BLOCO.length);
      let altura = 0;
      faixa.forEach((g, j) => {
        const c = COLUNAS_BLOCO[j];
        const itens = [...g.vendas].reverse();
        const linhaNome = linhaBase;
        const temPago = itens.some((v) => v.pago);
        const tudoPago = itens.length > 0 && itens.every((v) => v.pago);
        const colFim = temPago ? c + 2 : c + 1;
        const linhaFim = tudoPago ? linhaNome + itens.length : linhaNome + itens.length + 1;
        texto2(linhaNome, c, (g.cliente.nome || "").toUpperCase(), est.xf(1, 0, est.borda(1, colFim === c, 1, 0), 1));
        for (let col = c + 1; col <= colFim; col++) {
          vazia(linhaNome, col, est.xf(1, 0, est.borda(0, col === colFim, 1, 0), 0));
        }
        itens.forEach((v, k) => {
          const r = linhaNome + 1 + k;
          const base = tudoPago && k === itens.length - 1 ? 1 : 0;
          texto2(r, c, (v.peca || "").toUpperCase(), est.xf(0, 0, est.borda(1, 0, 0, base), 1));
          numero(r, c + 1, v.valor, est.xf(0, 164, est.borda(0, colFim === c + 1, 0, base), 0));
          if (colFim === c + 2) {
            const estilo = est.xf(1, 0, est.borda(0, 1, 0, base), 1);
            if (v.pago) texto2(r, c + 2, "PG", estilo);
            else vazia(r, c + 2, estilo);
          }
        });
        if (!tudoPago) {
          const colValor = letraColuna(c + 1);
          const colPago = letraColuna(c + 2);
          const primeira = linhaNome + 2;
          const ultima = linhaFim;
          const soma = itens.reduce((s, v) => s + v.valor, 0);
          const aPagar = itens.filter((v) => !v.pago).reduce((s, v) => s + v.valor, 0);
          let rotulo = "";
          let f = \`SUM(\${colValor}\${primeira}:\${colValor}\${ultima})\`;
          let valor = soma;
          if (temPago) {
            rotulo = "A PAGAR";
            f = \`SUMIF(\${colPago}\${primeira}:\${colPago}\${ultima},"",\${colValor}\${primeira}:\${colValor}\${ultima})\`;
            valor = aPagar;
          }
          texto2(linhaFim, c, rotulo, est.xf(1, 0, est.borda(1, colFim === c, 0, 1), 1));
          formula(
            linhaFim,
            c + 1,
            f,
            Math.round(valor * 100) / 100,
            est.xf(1, 164, est.borda(0, colFim === c + 1, 0, 1), 0),
          );
          if (colFim === c + 2) vazia(linhaFim, c + 2, est.xf(1, 0, est.borda(0, 1, 0, 1), 0));
        }
        altura = Math.max(altura, linhaFim - linhaBase + 1);
      });
      linhaBase += altura + LINHAS_ENTRE_FAIXAS;
    }
    const porLinha = {};
    Object.keys(celulas).forEach((k) => {
      const [r, c] = k.split(",").map(Number);
      if (!porLinha[r]) porLinha[r] = [];
      porLinha[r].push([c, celulas[k]]);
    });
    const linhasXml = Object.keys(porLinha)
      .map(Number)
      .sort((a, b) => a - b)
      .map((r) => {
        const cs = porLinha[r]
          .sort((a, b) => a[0] - b[0])
          .map((x) => x[1])
          .join("");
        return \`<row r="\${r + 1}">\${cs}</row>\`;
      })
      .join("");
    const colunasXml = Array.from({ length: 24 }, (_, n) => {
      const dentro = n % 3;
      const largura = dentro === 0 ? 32 : dentro === 1 ? 13 : 4;
      return \`<col min="\${n + 1}" max="\${n + 1}" width="\${largura}" customWidth="1"/>\`;
    }).join("");
    const ref = \`A1:\${letraColuna(Math.max(ultimaColuna, 23))}\${Math.max(ultimaLinha, 0) + 1}\`;
    const folha = \`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="\${ref}"/><sheetFormatPr defaultRowHeight="15"/><cols>\${colunasXml}</cols><sheetData>\${linhasXml}</sheetData><pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>\`;
    const arquivos = [
      {
        nome: "[Content_Types].xml",
        dados: bytesDe(
          \`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>\`,
        ),
      },
      {
        nome: "_rels/.rels",
        dados: bytesDe(
          \`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>\`,
        ),
      },
      {
        nome: "xl/workbook.xml",
        dados: bytesDe(
          \`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="\${escapar(nomeAba)}" sheetId="1" r:id="rId1"/></sheets><calcPr fullCalcOnLoad="1"/></workbook>\`,
        ),
      },
      {
        nome: "xl/_rels/workbook.xml.rels",
        dados: bytesDe(
          \`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>\`,
        ),
      },
      { nome: "xl/styles.xml", dados: bytesDe(est.xml()) },
      { nome: "xl/worksheets/sheet1.xml", dados: bytesDe(folha) },
    ];
    return zipar(arquivos);
  }

  // app/telas/erro.jsx
  var Barreira = class extends react_global_default.Component {
    constructor(p) {
      super(p);
      this.state = { erro: null };
    }
    static getDerivedStateFromError(e) {
      return { erro: e };
    }
    render() {
      if (this.state.erro) {
        return h(
          "div",
          { style: { ...S.screen, padding: 28 } },
          h(
            "div",
            { style: { maxWidth: 380, margin: "60px auto" } },
            h(
              "div",
              { style: { fontFamily: display, fontSize: 24, color: t.ink, marginBottom: 10 } },
              "Algo travou nesta tela",
            ),
            h(
              "p",
              { style: { fontSize: 15, color: t.inkSoft, lineHeight: 1.5 } },
              "Nada do que você registrou foi perdido. Toque abaixo para voltar.",
            ),
            h("button", { style: { ...S.cta, marginTop: 20 }, onClick: () => this.setState({ erro: null }) }, "Voltar"),
            h(
              "p",
              { style: { fontSize: 12, color: t.inkFaint, marginTop: 20, wordBreak: "break-word" } },
              String(this.state.erro && this.state.erro.message),
            ),
          ),
        );
      }
      return this.props.children;
    }
  };

  // app/telas/entrada.jsx
  var MOLDURA = { ...S.screen, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 };
  var textoDoErro = (e) =>
    e instanceof SemRede
      ? "Sem internet. Confira a conexão."
      : e && e.message
        ? e.message
        : "Não deu certo. Tente de novo.";
  function Titulo({ children }) {
    return h(
      Fragment,
      null,
      h(
        "div",
        { style: { fontFamily: display, fontSize: 34, lineHeight: 1.1, color: t.ink, marginBottom: 6 } },
        "Delas pra Elas",
      ),
      h(
        "p",
        { style: { fontFamily: sans, fontSize: 15, color: t.inkSoft, margin: "0 0 28px", lineHeight: 1.5 } },
        children,
      ),
    );
  }
  function Login({ sessaoPerdida, aoEntrar }) {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [erro, setErro] = useState("");
    const [entrando, setEntrando] = useState(false);
    const entrar = async () => {
      if (!email.trim() || !senha) return setErro("Preencha o e-mail e a senha.");
      setEntrando(true);
      setErro("");
      try {
        await aoEntrar(email.trim(), senha);
      } catch (e) {
        setErro(textoDoErro(e));
        setEntrando(false);
      }
    };
    return h(
      "div",
      { style: MOLDURA },
      h(
        "div",
        { style: { width: "100%", maxWidth: 340 } },
        h(
          Titulo,
          null,
          sessaoPerdida
            ? "Sua sessão acabou. Entre de novo: o que você lançou ficou guardado e sobe sozinho."
            : "Controle de vendas da live.",
        ),
        h("label", { style: S.label }, "E-mail"),
        h("input", {
          style: S.input,
          type: "email",
          value: email,
          autoCapitalize: "none",
          autoCorrect: "off",
          autoComplete: "username",
          inputMode: "email",
          onChange: (e) => {
            setEmail(e.target.value);
            setErro("");
          },
        }),
        h("label", { style: { ...S.label, marginTop: 14 } }, "Senha"),
        h("input", {
          style: S.input,
          type: "password",
          value: senha,
          autoComplete: "current-password",
          onChange: (e) => {
            setSenha(e.target.value);
            setErro("");
          },
          onKeyDown: (e) => e.key === "Enter" && entrar(),
        }),
        erro && h("p", { style: { fontFamily: sans, fontSize: 14, color: t.rose, marginTop: 12 } }, erro),
        h(
          "button",
          { style: { ...S.cta, marginTop: 22, opacity: entrando ? 0.6 : 1 }, disabled: entrando, onClick: entrar },
          entrando ? "Entrando…" : "Entrar",
        ),
      ),
    );
  }
  function PrimeiroAcesso({ aoCriar }) {
    const [chave, setChave] = useState("");
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [repetida, setRepetida] = useState("");
    const [erro, setErro] = useState("");
    const [criando, setCriando] = useState(false);
    const criar = async () => {
      if (!chave || !email.trim() || !senha) return setErro("Preencha todos os campos.");
      if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
      if (senha !== repetida) return setErro("As duas senhas não são iguais.");
      setCriando(true);
      setErro("");
      try {
        await aoCriar({ chave, email: email.trim(), senha });
      } catch (e) {
        setErro(textoDoErro(e));
        setCriando(false);
      }
    };
    const campo = (rotulo, valor, mudar, extra = {}) =>
      h(
        Fragment,
        null,
        h("label", { style: { ...S.label, marginTop: 14 } }, rotulo),
        h("input", {
          style: S.input,
          value: valor,
          autoCapitalize: "none",
          autoCorrect: "off",
          onChange: (e) => {
            mudar(e.target.value);
            setErro("");
          },
          ...extra,
        }),
      );
    return h(
      "div",
      { style: MOLDURA },
      h(
        "div",
        { style: { width: "100%", maxWidth: 340 } },
        h(Titulo, null, "Primeiro acesso. Crie a conta da dona do brechó; depois ela cadastra a equipe."),
        campo("Senha de instalação", chave, setChave, { type: "password", autoComplete: "off" }),
        h("p", { style: S.notaPequena }, "É a senha que você guardou no painel da Cloudflare, no segredo ADMIN_SENHA."),
        campo("Seu e-mail", email, setEmail, { type: "email", inputMode: "email", autoComplete: "username" }),
        campo("Senha nova (mínimo 8 caracteres)", senha, setSenha, { type: "password", autoComplete: "new-password" }),
        campo("Repita a senha nova", repetida, setRepetida, {
          type: "password",
          autoComplete: "new-password",
          onKeyDown: (e) => e.key === "Enter" && criar(),
        }),
        erro && h("p", { style: { fontFamily: sans, fontSize: 14, color: t.rose, marginTop: 12 } }, erro),
        h(
          "button",
          { style: { ...S.cta, marginTop: 22, opacity: criando ? 0.6 : 1 }, disabled: criando, onClick: criar },
          criando ? "Criando…" : "Criar a conta e entrar",
        ),
      ),
    );
  }
  function Entrada({ primeiroAcesso, sessaoPerdida, aoEntrar, aoCriar }) {
    return primeiroAcesso ? h(PrimeiroAcesso, { aoCriar }) : h(Login, { sessaoPerdida, aoEntrar });
  }

  // app/telas/resumo.jsx
  function Resumo({ r }) {
    return h(
      "section",
      { style: S.resumo },
      h("div", { style: S.totalNum }, brl(r.total)),
      h(
        "div",
        { style: S.metaRow },
        h(Meta, { n: r.pecas, l: r.pecas === 1 ? "peça" : "peças" }),
        h(Meta, { n: r.clientes, l: r.clientes === 1 ? "cliente" : "clientes" }),
        h(Meta, { n: r.novas, l: r.novas === 1 ? "nova" : "novas", destaque: true }),
      ),
      r.pendente > 0 &&
        h("div", { style: S.pendBar }, h("span", { style: { fontWeight: 500 } }, brl(r.pendente)), " ainda a receber"),
    );
  }
  function Meta({ n, l, destaque }) {
    return h(
      "div",
      { style: { display: "flex", alignItems: "baseline", gap: 5 } },
      h(
        "span",
        {
          style: {
            fontFamily: display,
            fontSize: 22,
            color: destaque && n > 0 ? t.rose : t.ink,
          },
        },
        n,
      ),
      h("span", { style: { fontFamily: sans, fontSize: 14, color: t.inkSoft } }, l),
    );
  }
  function GrupoCliente({ g, dia, onToggle, onEdit, onExportar }) {
    const c = g.cliente;
    if (!c) return null;
    const nova = !c.preExistente && c.primeiraCompra === dia;
    return h(
      "article",
      { style: S.card },
      h(
        "div",
        { style: S.cardHead },
        h(
          "div",
          { style: { minWidth: 0 } },
          h("div", { style: S.cliNome }, c.nome),
          h("div", { style: S.cliSub }, g.vendas.length, " ", g.vendas.length === 1 ? "peça" : "peças"),
        ),
        h(
          "div",
          { style: { textAlign: "right", flexShrink: 0 } },
          h("div", { style: S.cliTotal }, brl(g.total)),
          h("span", { style: nova ? S.badgeNova : S.badgeAntiga }, nova ? "nova" : "antiga"),
        ),
      ),
      h(
        "div",
        null,
        g.vendas.map((v) =>
          h(
            "div",
            { key: v.id, style: S.row },
            h(
              "button",
              { style: S.rowMain, onClick: () => onEdit(v) },
              h("span", { style: S.codigo }, v.codigo || "—"),
              h("span", { style: S.peca }, v.peca),
              v.temFoto && h("span", { style: S.fotoTag }, "foto"),
              (v.fila || []).length > 0 && h("span", { style: S.filaTag }, "fila ", v.fila.length),
            ),
            h("span", { style: S.rowValor }, brl(v.valor)),
            h(
              "button",
              {
                style: v.pago ? S.chipPago : S.chipPend,
                onClick: () => onToggle(v.id, v.pago),
                "aria-label": v.pago ? "Marcar como pendente" : "Marcar como pago",
              },
              v.pago ? "pago" : "pendente",
            ),
          ),
        ),
      ),
      h("button", { style: S.cardExport, onClick: onExportar }, "Exportar lista dela"),
    );
  }

  // app/foto.js
  var LIMITE_DE_CARACTERES = 5e5;
  var TENTATIVAS = [
    { lado: 720, qualidade: 0.62 },
    { lado: 560, qualidade: 0.5 },
    { lado: 420, qualidade: 0.45 },
  ];
  function lerArquivo(arquivo) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onerror = () => reject(new Error("Não deu para ler a imagem"));
      leitor.onload = () => resolve(leitor.result);
      leitor.readAsDataURL(arquivo);
    });
  }
  function abrirImagem(endereco) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Arquivo não é uma imagem"));
      img.onload = () => resolve(img);
      img.src = endereco;
    });
  }
  function desenhar(img, lado, qualidade) {
    const escala = Math.min(1, lado / Math.max(img.width, img.height));
    const largura = Math.max(1, Math.round(img.width * escala));
    const altura = Math.max(1, Math.round(img.height * escala));
    const tela = document.createElement("canvas");
    tela.width = largura;
    tela.height = altura;
    tela.getContext("2d").drawImage(img, 0, 0, largura, altura);
    return tela.toDataURL("image/jpeg", qualidade);
  }
  async function comprimirImagem(arquivo) {
    const img = await abrirImagem(await lerArquivo(arquivo));
    let resultado = "";
    for (const { lado, qualidade } of TENTATIVAS) {
      resultado = desenhar(img, lado, qualidade);
      if (resultado.length <= LIMITE_DE_CARACTERES) return resultado;
    }
    throw new Error("A foto ficou grande demais");
  }

  // app/telas/venda.jsx
  function SheetVenda({
    mode,
    venda,
    clientes,
    vendasDoDia,
    onClose,
    onSave,
    onDelete,
    onPassar,
    onFlash,
    carregarFoto,
  }) {
    const editando = mode === "edit";
    const [clienteNome, setClienteNome] = useState("");
    const [clienteId, setClienteId] = useState(null);
    const [codigo, setCodigo] = useState("");
    const [peca, setPeca] = useState("");
    const [valor, setValor] = useState("");
    const [pago, setPago] = useState(false);
    const [fila, setFila] = useState([]);
    const [foto, setFoto] = useState(null);
    const [fotoMudou, setFotoMudou] = useState(false);
    const [fotoStatus, setFotoStatus] = useState("");
    const [filaNome, setFilaNome] = useState("");
    const [filaId, setFilaId] = useState(null);
    const [erro, setErro] = useState("");
    const [aberto, setAberto] = useState(false);
    const nomeRef = useRef(null);
    useEffect(() => {
      if (editando && venda) {
        const c = clientes.find((x) => x.id === venda.clienteId);
        setClienteNome(c ? c.nome : "");
        setClienteId(venda.clienteId);
        setCodigo(venda.codigo);
        setPeca(venda.peca);
        setValor(String(venda.valor).replace(".", ","));
        setPago(venda.pago);
        setFila(venda.fila || []);
        if (venda.temFoto && carregarFoto) {
          setFotoStatus("carregando");
          carregarFoto(venda.id)
            .then((img) => {
              setFoto(img || null);
              setFotoStatus("");
            })
            .catch(() => setFotoStatus(""));
        }
      } else {
        setTimeout(() => nomeRef.current && nomeRef.current.focus(), 120);
      }
    }, []);
    const filaSugestoes = useMemo(() => {
      const q = norm(filaNome);
      if (!q || filaId) return [];
      return clientes.filter((c) => norm(c.nome).includes(q) && c.id !== clienteId).slice(0, 4);
    }, [filaNome, filaId, clientes, clienteId]);
    const addFila = () => {
      const nome = filaNome.trim();
      if (!nome) return;
      if (norm(nome) === norm(clienteNome)) {
        setErro("Essa já é a cliente principal da peça.");
        return;
      }
      if (fila.some((f) => norm(f.nome) === norm(nome))) {
        setErro(\`\${nome} já está na fila.\`);
        return;
      }
      setFila([...fila, { nome, clienteId: filaId }]);
      setFilaNome("");
      setFilaId(null);
      setErro("");
    };
    const sugestoes = useMemo(() => {
      const q = norm(clienteNome);
      if (!q || clienteId) return [];
      return clientes
        .filter((c) => norm(c.nome).includes(q))
        .slice(0, 5)
        .map((c) => ({
          ...c,
          compras: 0,
        }));
    }, [clienteNome, clienteId, clientes]);
    const exataExiste = clientes.some((c) => norm(c.nome) === norm(clienteNome));
    const salvar = async () => {
      if (!clienteNome.trim()) return setErro("Falta o nome da cliente.");
      if (!peca.trim()) return setErro("Falta o nome da peça.");
      if (parseMoney(valor) <= 0) return setErro("Falta o valor da peça.");
      const cod = codigo.trim();
      if (cod) {
        const conflito = vendasDoDia.find((v) => norm(v.codigo) === norm(cod) && (!editando || v.id !== venda.id));
        if (conflito) {
          return setErro(\`O código \${cod} já foi usado hoje em "\${conflito.peca}".\`);
        }
      }
      await onSave(
        { clienteId, clienteNome, codigo, peca, valor, pago, fila, foto, fotoMudou },
        editando ? venda : null,
      );
      onFlash(editando ? "Peça atualizada" : "Peça lançada");
      onClose();
    };
    return h(
      "div",
      { style: S.overlay, onClick: onClose },
      h(
        "div",
        { style: S.sheet, onClick: (e) => e.stopPropagation() },
        h(
          "div",
          { style: S.sheetHead },
          h("span", { style: S.sheetTitle }, editando ? "Editar peça" : "Lançar peça"),
          h("button", { style: S.linkBtn, onClick: onClose }, "Fechar"),
        ),
        h(
          "div",
          { style: { padding: "4px 20px 20px", overflowY: "auto" } },
          editando &&
            (venda.fila || []).length > 0 &&
            h(
              "div",
              { style: S.passaBox },
              h(
                "div",
                { style: S.passaTxt },
                venda.fila.length === 1
                  ? \`\${venda.fila[0].nome} está esperando essa peça.\`
                  : \`\${venda.fila.length} clientes esperando. A primeira é \${venda.fila[0].nome}.\`,
              ),
              h(
                "button",
                {
                  style: S.passaBtn,
                  onClick: () => {
                    onPassar(venda);
                    onClose();
                  },
                },
                "Passar para ",
                venda.fila[0].nome,
              ),
            ),
          h("label", { style: S.label }, "Cliente"),
          h(
            "div",
            { style: { position: "relative" } },
            h("input", {
              ref: nomeRef,
              style: S.input,
              value: clienteNome,
              placeholder: "Comece a digitar o nome",
              onChange: (e) => {
                setClienteNome(e.target.value);
                setClienteId(null);
                setErro("");
                setAberto(true);
              },
              onFocus: () => setAberto(true),
            }),
            clienteId && h("span", { style: S.okMark }, "✓"),
          ),
          aberto &&
            sugestoes.length > 0 &&
            h(
              "div",
              { style: S.sugBox },
              sugestoes.map((c) =>
                h(
                  "button",
                  {
                    key: c.id,
                    style: S.sugItem,
                    onClick: () => {
                      setClienteNome(c.nome);
                      setClienteId(c.id);
                      setAberto(false);
                    },
                  },
                  h("span", null, c.nome),
                  h("span", { style: { color: t.inkFaint, fontSize: 13 } }, "já cadastrada"),
                ),
              ),
            ),
          clienteNome.trim() &&
            !clienteId &&
            !exataExiste &&
            h("p", { style: S.hintNova }, "Ninguém com esse nome no cadastro. Vai entrar como cliente nova."),
          h(
            "div",
            { style: { display: "flex", gap: 12, marginTop: 16 } },
            h(
              "div",
              { style: { width: 96, flexShrink: 0 } },
              h("label", { style: S.label }, "Código"),
              h("input", {
                style: S.input,
                value: codigo,
                inputMode: "numeric",
                placeholder: "12",
                onChange: (e) => {
                  setCodigo(e.target.value);
                  setErro("");
                },
              }),
            ),
            h(
              "div",
              { style: { flex: 1, minWidth: 0 } },
              h("label", { style: S.label }, "Peça"),
              h("input", {
                style: S.input,
                value: peca,
                placeholder: "Blusa jeans",
                onChange: (e) => {
                  setPeca(e.target.value);
                  setErro("");
                },
              }),
            ),
          ),
          h("label", { style: { ...S.label, marginTop: 16 } }, "Valor"),
          h("input", {
            style: { ...S.input, fontFamily: display, fontSize: 20 },
            value: valor,
            inputMode: "decimal",
            placeholder: "0,00",
            onChange: (e) => {
              setValor(e.target.value);
              setErro("");
            },
          }),
          h("label", { style: { ...S.label, marginTop: 16 } }, "Pagamento"),
          h(
            "div",
            { style: S.segmento },
            h(
              "button",
              {
                style: { ...S.segBtn, ...(!pago ? S.segOnPend : {}) },
                onClick: () => setPago(false),
              },
              "Pendente",
            ),
            h(
              "button",
              {
                style: { ...S.segBtn, ...(pago ? S.segOnPago : {}) },
                onClick: () => setPago(true),
              },
              "Pago",
            ),
          ),
          h(
            "label",
            { style: { ...S.label, marginTop: 18 } },
            "Foto da peça ",
            h("span", { style: { color: t.inkFaint } }, "· opcional"),
          ),
          fotoStatus === "carregando"
            ? h("div", { style: S.fotoVazia }, "Abrindo a foto…")
            : foto
              ? h(
                  "div",
                  null,
                  h("img", { src: foto, alt: peca || "Peça", style: S.fotoImg }),
                  h(
                    "button",
                    {
                      style: { ...S.ctaGhost, marginTop: 8 },
                      onClick: () => {
                        setFoto(null);
                        setFotoMudou(true);
                      },
                    },
                    "Remover foto",
                  ),
                )
              : h(
                  "label",
                  { style: S.fotoAdd },
                  fotoStatus === "comprimindo" ? "Preparando a foto…" : "Tirar ou escolher foto",
                  h("input", {
                    type: "file",
                    accept: "image/*",
                    style: { display: "none" },
                    onChange: async (e) => {
                      const arq = e.target.files && e.target.files[0];
                      if (!arq) return;
                      setFotoStatus("comprimindo");
                      try {
                        const menor = await comprimirImagem(arq);
                        setFoto(menor);
                        setFotoMudou(true);
                        setFotoStatus("");
                      } catch (err) {
                        setFotoStatus("");
                        setErro("Não deu para usar essa imagem. Tente outra.");
                      }
                      e.target.value = "";
                    },
                  }),
                ),
          h(
            "label",
            { style: { ...S.label, marginTop: 18 } },
            "Fila de espera ",
            h("span", { style: { color: t.inkFaint } }, "· opcional"),
          ),
          fila.length > 0 &&
            h(
              "div",
              { style: S.filaBox },
              fila.map((f, i) =>
                h(
                  "div",
                  { key: i, style: S.filaItem },
                  h("span", { style: S.filaPos }, i + 1),
                  h(
                    "span",
                    {
                      style: {
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      },
                    },
                    f.nome,
                  ),
                  h(
                    "button",
                    {
                      style: S.linkBtn,
                      onClick: () => setFila(fila.filter((_, j) => j !== i)),
                    },
                    "Tirar",
                  ),
                ),
              ),
            ),
          h(
            "div",
            { style: { display: "flex", gap: 8, marginTop: fila.length ? 8 : 0 } },
            h("input", {
              style: { ...S.input, flex: 1, minWidth: 0 },
              value: filaNome,
              placeholder: "Quem fica esperando",
              onChange: (e) => {
                setFilaNome(e.target.value);
                setFilaId(null);
                setErro("");
              },
              onKeyDown: (e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addFila();
                }
              },
            }),
            h(
              "button",
              {
                style: { ...S.addFila, opacity: filaNome.trim() ? 1 : 0.4 },
                disabled: !filaNome.trim(),
                onClick: addFila,
              },
              "Entrar na fila",
            ),
          ),
          filaSugestoes.length > 0 &&
            h(
              "div",
              { style: S.sugBox },
              filaSugestoes.map((c) =>
                h(
                  "button",
                  {
                    key: c.id,
                    style: S.sugItem,
                    onClick: () => {
                      setFilaNome(c.nome);
                      setFilaId(c.id);
                    },
                  },
                  h("span", null, c.nome),
                  h("span", { style: { color: t.inkFaint, fontSize: 13 } }, "já cadastrada"),
                ),
              ),
            ),
          erro && h("p", { style: S.erro }, erro),
          h(
            "button",
            { style: { ...S.cta, marginTop: 20 }, onClick: salvar },
            editando ? "Salvar alterações" : "Salvar",
          ),
          editando &&
            h(
              "button",
              {
                style: { ...S.ctaGhost, color: t.rose, borderColor: t.roseSoft },
                onClick: () => {
                  onDelete(venda.id);
                  onClose();
                },
              },
              "Excluir peça",
            ),
        ),
      ),
    );
  }

  // app/telas/clientes.jsx
  function Clientes({ data, dia, onSave, onFlash, onExport, onExportTudo, onMesclar, onEditarMensagem }) {
    const [busca, setBusca] = useState("");
    const [escopo, setEscopo] = useState("dia");
    const [form, setForm] = useState(null);
    const vazio = { total: 0, pecas: 0, totalDia: 0, pecasDia: 0, pendenteDia: 0, ultima: "", fila: 0 };
    const enriquecidas = useMemo(() => {
      const st = {};
      const pega = (id) => {
        if (!st[id]) st[id] = { ...vazio };
        return st[id];
      };
      data.vendas.forEach((v) => {
        const s = pega(v.clienteId);
        s.total += v.valor;
        s.pecas += 1;
        if (v.data > s.ultima) s.ultima = v.data;
        if (v.data === dia) {
          s.totalDia += v.valor;
          s.pecasDia += 1;
          if (!v.pago) s.pendenteDia += v.valor;
        }
        (v.fila || []).forEach((f) => {
          if (f.clienteId) pega(f.clienteId).fila += 1;
        });
      });
      const q = norm(busca);
      return data.clientes
        .map((c) => ({ ...c, ...(st[c.id] || vazio) }))
        .filter((c) => !q || norm(c.nome).includes(q))
        .filter((c) => (escopo === "dia" ? c.pecasDia > 0 : true))
        .sort((a, b) => (escopo === "dia" ? b.totalDia - a.totalDia : b.total - a.total || b.fila - a.fila));
    }, [data, busca, escopo, dia]);
    const ehNova = (c) => !c.preExistente && c.primeiraCompra === dia;
    const legenda = (c) => {
      if (escopo === "dia") return \`\${c.pecasDia} \${c.pecasDia === 1 ? "peça" : "peças"} nesse dia\`;
      if (c.pecas > 0) return \`\${c.pecas} \${c.pecas === 1 ? "peça" : "peças"} no total\`;
      if (c.fila > 0) return \`esperando \${c.fila} \${c.fila === 1 ? "peça" : "peças"} na fila\`;
      if (c.preExistente) return "cliente antiga, sem compras no app";
      return "sem compras ainda";
    };
    const somaDia = enriquecidas.reduce((s, c) => s + c.totalDia, 0);
    return h(
      Fragment,
      null,
      h(
        "div",
        { style: { padding: "14px 20px 0" } },
        h(
          "div",
          { style: S.segmento },
          h(
            "button",
            {
              style: { ...S.segBtn, ...(escopo === "dia" ? S.segOnEscopo : {}) },
              onClick: () => setEscopo("dia"),
            },
            "Do dia",
          ),
          h(
            "button",
            {
              style: { ...S.segBtn, ...(escopo === "sempre" ? S.segOnEscopo : {}) },
              onClick: () => setEscopo("sempre"),
            },
            "Todas",
          ),
        ),
        h(
          "div",
          { style: S.escopoInfo },
          escopo === "dia"
            ? \`\${dateLabel(dia)} · \${brl(somaDia)}\`
            : \`\${data.clientes.length} \${data.clientes.length === 1 ? "cliente cadastrada" : "clientes cadastradas"}\`,
        ),
        h("input", {
          style: S.input,
          value: busca,
          placeholder: "Buscar cliente",
          onChange: (e) => setBusca(e.target.value),
        }),
      ),
      h(
        "main",
        { style: { ...S.list, paddingTop: 14 } },
        enriquecidas.length === 0
          ? h(
              "div",
              { style: S.empty },
              h(
                "p",
                { style: S.emptyTitle },
                busca
                  ? "Nenhuma cliente com esse nome."
                  : escopo === "dia"
                    ? "Ninguém comprou nesse dia."
                    : "Nenhuma cliente cadastrada ainda.",
              ),
              h(
                "p",
                { style: S.emptyTxt },
                escopo === "dia"
                  ? "Troque o dia pelo calendário ou veja todas as clientes."
                  : "Cadastre aqui quem já comprava com você antes do app, para ela não entrar como nova.",
              ),
            )
          : enriquecidas.map((c) =>
              h(
                "button",
                { key: c.id, style: S.cliRow, onClick: () => setForm(c) },
                h(
                  "div",
                  { style: { minWidth: 0, textAlign: "left" } },
                  h(
                    "div",
                    { style: { display: "flex", alignItems: "center", gap: 7, minWidth: 0 } },
                    h("span", { style: S.cliNome }, c.nome),
                    escopo === "dia" &&
                      h(
                        "span",
                        { style: { ...(ehNova(c) ? S.badgeNova : S.badgeAntiga), marginTop: 0 } },
                        ehNova(c) ? "nova" : "antiga",
                      ),
                  ),
                  h("div", { style: S.cliSub }, legenda(c)),
                ),
                h(
                  "div",
                  { style: { textAlign: "right", flexShrink: 0 } },
                  h("div", { style: S.cliTotal }, brl(escopo === "dia" ? c.totalDia : c.total)),
                  escopo === "dia"
                    ? h("div", { style: S.cliSub }, brl(c.total), " no total")
                    : c.whatsapp
                      ? h("div", { style: S.cliSub }, c.whatsapp)
                      : null,
                ),
              ),
            ),
        escopo === "sempre" &&
          h(
            "button",
            { style: { ...S.ctaGhost, marginTop: 18 }, onClick: onExportTudo },
            "Exportar histórico completo",
          ),
        h(
          "button",
          {
            style: { ...S.ctaGhost, marginTop: escopo === "sempre" ? 10 : 18 },
            onClick: onEditarMensagem,
          },
          "Mensagem do WhatsApp",
        ),
        h("button", { style: { ...S.ctaGhost, marginTop: 10 }, onClick: onExport }, "Baixar backup dos dados"),
        h("div", { style: { height: 96 } }),
      ),
      h(
        "div",
        { style: S.dock },
        h(
          "button",
          {
            style: S.cta,
            onClick: () => setForm({ nome: "", whatsapp: "", preExistente: true }),
          },
          "Cadastrar cliente",
        ),
      ),
      form &&
        h(FormCliente, {
          c: form,
          clientes: data.clientes,
          onMesclar,
          onClose: () => setForm(null),
          onSave: async (x) => {
            await onSave(x);
            onFlash(x.id ? "Cliente atualizada" : "Cliente cadastrada");
            setForm(null);
          },
        }),
    );
  }
  function FormCliente({ c, clientes, onClose, onSave, onMesclar }) {
    const [nome, setNome] = useState(c.nome || "");
    const [wpp, setWpp] = useState(c.whatsapp || "");
    const [pre, setPre] = useState(c.preExistente !== false);
    const [mesclando, setMesclando] = useState(false);
    const [buscaM, setBuscaM] = useState("");
    const [alvo, setAlvo] = useState(null);
    const editando = !!c.id;
    const candidatas = useMemo(() => {
      if (!clientes) return [];
      const q = norm(buscaM);
      return clientes.filter((x) => x.id !== c.id && (!q || norm(x.nome).includes(q))).slice(0, 6);
    }, [clientes, buscaM, c.id]);
    if (mesclando) {
      return h(
        "div",
        { style: S.overlay, onClick: onClose },
        h(
          "div",
          { style: S.sheet, onClick: (e) => e.stopPropagation() },
          h(
            "div",
            { style: S.sheetHead },
            h("span", { style: S.sheetTitle }, "Juntar cadastros"),
            h("button", { style: S.linkBtn, onClick: () => setMesclando(false) }, "Voltar"),
          ),
          h(
            "div",
            { style: { padding: "4px 20px 20px", overflowY: "auto" } },
            alvo
              ? h(
                  Fragment,
                  null,
                  h(
                    "p",
                    { style: { fontSize: 15, color: t.ink, lineHeight: 1.55, margin: "4px 0 0" } },
                    "Tudo que está em ",
                    h("strong", null, c.nome),
                    " passa para",
                    " ",
                    h("strong", null, alvo.nome),
                    ": as compras, o histórico e as filas.",
                  ),
                  h(
                    "p",
                    { style: { fontSize: 14, color: t.inkSoft, lineHeight: 1.5, marginTop: 12 } },
                    "O cadastro ",
                    h("strong", null, c.nome),
                    " deixa de existir. O nome que fica é",
                    " ",
                    h("strong", null, alvo.nome),
                    ". Nenhuma venda é perdida, e isso não tem como desfazer.",
                  ),
                  h(
                    "button",
                    {
                      style: { ...S.cta, marginTop: 20 },
                      onClick: () => {
                        onMesclar(c.id, alvo.id);
                        onClose();
                      },
                    },
                    "Juntar em ",
                    alvo.nome,
                  ),
                  h("button", { style: S.ctaGhost, onClick: () => setAlvo(null) }, "Escolher outra"),
                )
              : h(
                  Fragment,
                  null,
                  h(
                    "p",
                    { style: { fontSize: 14, color: t.inkSoft, lineHeight: 1.5, margin: "4px 0 12px" } },
                    "Qual cadastro é a mesma pessoa que ",
                    c.nome,
                    "?",
                  ),
                  h("input", {
                    style: S.input,
                    value: buscaM,
                    placeholder: "Buscar cliente",
                    onChange: (e) => setBuscaM(e.target.value),
                  }),
                  h(
                    "div",
                    { style: { marginTop: 10 } },
                    candidatas.map((x) =>
                      h(
                        "button",
                        { key: x.id, style: S.cliRow, onClick: () => setAlvo(x) },
                        h("span", { style: S.cliNome }, x.nome),
                        h("span", { style: S.cliSub }, x.whatsapp || ""),
                      ),
                    ),
                    candidatas.length === 0 &&
                      h(
                        "p",
                        { style: { fontSize: 14, color: t.inkSoft, padding: "10px 2px" } },
                        "Nenhuma outra cliente com esse nome.",
                      ),
                  ),
                ),
          ),
        ),
      );
    }
    return h(
      "div",
      { style: S.overlay, onClick: onClose },
      h(
        "div",
        { style: S.sheet, onClick: (e) => e.stopPropagation() },
        h(
          "div",
          { style: S.sheetHead },
          h("span", { style: S.sheetTitle }, editando ? "Editar cliente" : "Cadastrar cliente"),
          h("button", { style: S.linkBtn, onClick: onClose }, "Fechar"),
        ),
        h(
          "div",
          { style: { padding: "4px 20px 20px", overflowY: "auto" } },
          editando &&
            (c.pecas > 0 || c.fila > 0) &&
            h(
              "div",
              { style: S.histBox },
              h("div", { style: { fontFamily: display, fontSize: 26, color: t.ink } }, brl(c.total)),
              h(
                "div",
                { style: { fontSize: 13, color: t.inkSoft, marginTop: 4, lineHeight: 1.5 } },
                c.pecas,
                " ",
                c.pecas === 1 ? "peça" : "peças",
                " desde sempre",
                c.ultima ? \` · última em \${dataCurta(c.ultima)}\` : "",
                c.fila > 0 ? \` · \${c.fila} na fila\` : "",
              ),
            ),
          h("label", { style: S.label }, "Nome"),
          h("input", { style: S.input, value: nome, onChange: (e) => setNome(e.target.value) }),
          h("label", { style: { ...S.label, marginTop: 16 } }, "WhatsApp"),
          h("input", {
            style: S.input,
            value: wpp,
            inputMode: "tel",
            placeholder: "(55) 99999-9999",
            onChange: (e) => setWpp(e.target.value),
          }),
          h(
            "p",
            { style: { fontSize: 13, color: t.inkSoft, margin: "7px 2px 0", lineHeight: 1.45 } },
            "Com o número salvo, a lista dela vai direto pra conversa dela.",
          ),
          h(
            "button",
            { style: S.checkRow, onClick: () => setPre(!pre) },
            h("span", { style: { ...S.checkBox, ...(pre ? S.checkOn : {}) } }, pre ? "✓" : ""),
            h(
              "span",
              { style: { textAlign: "left" } },
              "Já era minha cliente antes do app",
              h("span", { style: S.checkHelp }, "Marcada assim, ela nunca entra na contagem de novas."),
            ),
          ),
          h(
            "button",
            {
              style: { ...S.cta, marginTop: 20 },
              onClick: () =>
                nome.trim() && onSave({ ...c, nome: nome.trim(), whatsapp: wpp.trim(), preExistente: pre }),
            },
            editando ? "Salvar alterações" : "Cadastrar",
          ),
          editando &&
            onMesclar &&
            h("button", { style: S.ctaGhost, onClick: () => setMesclando(true) }, "Essa cliente está duplicada"),
        ),
      ),
    );
  }

  // app/telas/calendario.jsx
  var SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  function Calendario({ data, dia, onEscolher }) {
    const [ano, setAno] = useState(() => Number(dia.split("-")[0]));
    const [mes, setMes] = useState(() => Number(dia.split("-")[1]) - 1);
    const [sel, setSel] = useState(dia);
    const hoje = todayKey();
    const porDia = useMemo(() => {
      const m = {};
      data.vendas.forEach((v) => {
        if (!m[v.data]) m[v.data] = { total: 0, pecas: 0 };
        m[v.data].total += v.valor;
        m[v.data].pecas += 1;
      });
      return m;
    }, [data.vendas]);
    const chave = (d) => \`\${ano}-\${String(mes + 1).padStart(2, "0")}-\${String(d).padStart(2, "0")}\`;
    const celulas = useMemo(() => {
      const inicio = new Date(ano, mes, 1).getDay();
      const qtd = new Date(ano, mes + 1, 0).getDate();
      const arr = [];
      for (let i = 0; i < inicio; i++) arr.push(null);
      for (let d = 1; d <= qtd; d++) arr.push(d);
      return arr;
    }, [ano, mes]);
    const doMes = useMemo(() => {
      let total = 0;
      let lives = 0;
      Object.keys(porDia).forEach((k) => {
        const [y, m] = k.split("-").map(Number);
        if (y === ano && m === mes + 1) {
          total += porDia[k].total;
          lives += 1;
        }
      });
      return { total, lives };
    }, [porDia, ano, mes]);
    const resumoSel = useMemo(() => calcResumo(data.vendas, data.clientes, sel), [data.vendas, data.clientes, sel]);
    const andar = (n) => {
      const d = new Date(ano, mes + n, 1);
      setAno(d.getFullYear());
      setMes(d.getMonth());
    };
    const nomeMes = new Date(ano, mes, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
    return h(
      Fragment,
      null,
      h(
        "div",
        { style: S.mesRow },
        h("button", { style: S.arrow, onClick: () => andar(-1), "aria-label": "Mês anterior" }, "‹"),
        h(
          "div",
          { style: { textAlign: "center" } },
          h("div", { style: S.mesNome }, nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)),
          h(
            "div",
            { style: S.mesSub },
            doMes.lives === 0
              ? "nenhuma live"
              : \`\${doMes.lives} \${doMes.lives === 1 ? "live" : "lives"} · \${brl(doMes.total)}\`,
          ),
        ),
        h("button", { style: S.arrow, onClick: () => andar(1), "aria-label": "Próximo mês" }, "›"),
      ),
      h(
        "div",
        { style: S.calGrid },
        SEMANA.map((s) => h("div", { key: s, style: S.calSemana }, s)),
        celulas.map((d, i) => {
          if (!d) return h("div", { key: \`v\${i}\` });
          const k = chave(d);
          const teve = !!porDia[k];
          const futuro = k > hoje;
          const escolhido = k === sel;
          return h(
            "button",
            {
              key: k,
              disabled: futuro,
              onClick: () => setSel(k),
              style: {
                ...S.calDia,
                ...(teve ? S.calDiaLive : {}),
                ...(escolhido ? S.calDiaSel : {}),
                ...(futuro ? S.calDiaFuturo : {}),
                ...(k === hoje && !escolhido ? S.calDiaHoje : {}),
`,
  },
};
