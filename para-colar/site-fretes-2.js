/**
 * Delas pra Elas — site-fretes-2.js
 * Parte do site, guardada como texto: o código da tela de Fretes — parte 2 de 2 do arquivo /fretes.js.
 *
 * Arquivo gerado por "npm run colar" (o texto de verdade fica nas pastas src/, app/ e site/ do projeto).
 * Cole o arquivo INTEIRO, num arquivo com o nome site-fretes-2.js no editor do Cloudflare. Não precisa mudar nada nele.
 *
 * O texto de cada página fica entre crases. As barras invertidas que aparecem antes de crases e de ${ são só o jeito
 * de escrever esse texto aqui dentro: o Worker entrega a página sem elas, igual ao arquivo da pasta site/.
 * "etag" é o código de verificação da página inteira (/api/saude confere se o texto colado bate com ele).
 */
export default {
  "/fretes.js": {
    tipo: "text/javascript; charset=utf-8",
    etag: "951ff6a519877185",
    parte: 2,
    de: 2,
    corpo: `      ),
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
        d.siteUrl.trim().replace(/\\/+$/, "") !== window.location.origin &&
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
    const webhook = \`\${(config.siteUrl || window.location.origin).replace(/\\/+$/, "")}/api/mp/webhook\`;
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
            h(Selo, { ok: me.configurado }, me.configurado ? \`Token salvo \${me.final}\` : "Sem token"),
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
            h(Selo, { ok: mp.configurado }, mp.configurado ? \`Credencial salva \${mp.final}\` : "Sem credencial"),
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
      .split(/\\s+/)[0] || "";
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
    if (p.status === "approved") return \`Pago em \${dataHora(p.pagoEm)}\`;
    if (p.status === "pending") {
      return p.expiraEm > agora ? \`Aguardando o Pix (vale até \${dataHora(p.expiraEm)})\` : "Pix venceu sem pagamento";
    }
    if (p.status === "refunded") return "Pagamento estornado";
    return (
      { expired: "Pix venceu", cancelled: "Pix cancelado", rejected: "Pix recusado" }[p.status] || String(p.status)
    );
  }
  function CartaoFrete({ f, agora, onAbrir }) {
    const s = situacao(f, agora);
    const preco = f.servico ? brlCentavos(f.servico.precoCentavos) : "";
    const pacote = f.caixa ? \`\${f.caixa.nome} · \${pesoTexto(f.pesoKg)}\` : "";
    const destino = f.cidade ? \`\${f.cidade}/\${f.uf}\` : "";
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
            [pacote, destino, f.servico ? \`\${f.servico.empresa} \${f.servico.nome}\` : ""].filter(Boolean).join(" · "),
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
    const servicoTxt = f.servico ? \`\${f.servico.empresa} \${f.servico.nome}\` : "";
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
      ? \`Oi \${nome}! Seu pedido foi enviado 🎉
\${servicoTxt ? \`\${servicoTxt} · \` : ""}código de rastreio: \${r.codigo}
Acompanhe aqui: \${link}\`
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
              ? \`\${f.caixa.nome} · \${num(f.caixa.comprimento)}×\${num(f.caixa.largura)}×\${num(f.caixa.altura)} cm\`
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
              ? \`\${f.cidade}/\${f.uf}\${f.cep ? \` · CEP \${String(f.cep).replace(/^(\\d{5})(\\d{3})$/, "$1-$2")}\` : ""}\`
              : "",
          ],
          ["Frete", servicoTxt],
          ["Prazo", f.servico && f.servico.prazoDias ? \`até \${f.servico.prazoDias} dias úteis\` : ""],
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
                    ? \`Entregue\${r.entregueEm ? \` em \${dataHora(r.entregueEm)}\` : ""}.\`
                    : f.status === "postado"
                      ? \`Postado\${r.postadoEm ? \` em \${dataHora(r.postadoEm)}\` : ""}.\`
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
      texto = \`O token do Melhor Envio não tem todas as permissões (faltam \${cred.melhorEnvio.escoposFaltando.length}).\`;
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
                flash(\`\${primeiroNome(f.clienteNome)} pagou o frete! Já dá para gerar a etiqueta.\`, "pago");
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
      document.title = paraEnviar ? \`(\${paraEnviar}) Fretes · Delas pra Elas\` : "Fretes · Delas pra Elas";
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
              contagem[id] ? \`· \${contagem[id]}\` : "",
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
`,
  },
};
