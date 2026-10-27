/**
 * Delas pra Elas — site-live-3.js
 * Parte do site, guardada como texto: o código do app da live — parte 3 de 3 do arquivo /app.js.
 *
 * Arquivo gerado por "npm run colar" (o texto de verdade fica nas pastas src/, app/ e site/ do projeto).
 * Cole o arquivo INTEIRO, num arquivo com o nome site-live-3.js no editor do Cloudflare. Não precisa mudar nada nele.
 *
 * O texto de cada página fica entre crases. As barras invertidas que aparecem antes de crases e de ${ são só o jeito
 * de escrever esse texto aqui dentro: o Worker entrega a página sem elas, igual ao arquivo da pasta site/.
 * "etag" é o código de verificação da página inteira (/api/saude confere se o texto colado bate com ele).
 */
export default {
  "/app.js": {
    tipo: "text/javascript; charset=utf-8",
    etag: "016cefdaa9efa744",
    parte: 3,
    de: 3,
    corpo: `              },
            },
            d,
            teve && h("span", { style: { ...S.calPonto, background: escolhido ? "#fff" : t.rose } }),
          );
        }),
      ),
      h(
        "div",
        { style: S.calDetalhe },
        h("div", { style: S.calDataSel }, dateLabel(sel)),
        resumoSel.pecas > 0
          ? h(
              Fragment,
              null,
              h("div", { style: { ...S.totalNum, fontSize: 34, marginTop: 4 } }, brl(resumoSel.total)),
              h(
                "div",
                { style: S.metaRow },
                h(Meta, { n: resumoSel.pecas, l: resumoSel.pecas === 1 ? "peça" : "peças" }),
                h(Meta, { n: resumoSel.clientes, l: resumoSel.clientes === 1 ? "cliente" : "clientes" }),
                h(Meta, { n: resumoSel.novas, l: resumoSel.novas === 1 ? "nova" : "novas", destaque: true }),
              ),
              resumoSel.pendente > 0 &&
                h(
                  "div",
                  { style: S.pendBar },
                  h("span", { style: { fontWeight: 500 } }, brl(resumoSel.pendente)),
                  " ainda a receber",
                ),
              h("button", { style: { ...S.cta, marginTop: 16 }, onClick: () => onEscolher(sel) }, "Abrir esse dia"),
            )
          : h(
              Fragment,
              null,
              h(
                "p",
                { style: { fontSize: 15, color: t.inkSoft, margin: "8px 0 0", lineHeight: 1.5 } },
                "Nenhuma peça registrada nesse dia.",
              ),
              h(
                "button",
                { style: { ...S.ctaGhost, marginTop: 14 }, onClick: () => onEscolher(sel) },
                "Lançar peça nesse dia",
              ),
            ),
        h("div", { style: { height: 40 } }),
      ),
    );
  }

  // app/telas/exportar.jsx
  function SheetMensagem({ config, onClose, onSave, onFlash }) {
    const [abertura, setAbertura] = useState(config.abertura || "");
    const [fechamento, setFechamento] = useState(config.fechamento || "");
    return h(
      "div",
      { style: S.overlay, onClick: onClose },
      h(
        "div",
        { style: S.sheet, onClick: (e) => e.stopPropagation() },
        h(
          "div",
          { style: S.sheetHead },
          h("span", { style: S.sheetTitle }, "Mensagem do WhatsApp"),
          h("button", { style: S.linkBtn, onClick: onClose }, "Fechar"),
        ),
        h(
          "div",
          { style: { padding: "4px 20px 20px", overflowY: "auto" } },
          h(
            "p",
            { style: { fontSize: 14, color: t.inkSoft, lineHeight: 1.55, margin: "0 0 16px" } },
            "É o texto que acompanha a lista de peças de cada cliente. Escreva",
            " ",
            h("strong", null, "{nome}"),
            " para o nome dela, ",
            h("strong", null, "{data}"),
            " para a data da live, ",
            h("strong", null, "{total}"),
            " e ",
            h("strong", null, "{apagar}"),
            " para os valores.",
          ),
          h("label", { style: S.label }, "Antes da lista"),
          h("textarea", {
            value: abertura,
            onChange: (e) => setAbertura(e.target.value),
            style: { ...S.exportTxt, height: 170 },
          }),
          h("label", { style: { ...S.label, marginTop: 16 } }, "Depois da lista"),
          h("textarea", {
            value: fechamento,
            onChange: (e) => setFechamento(e.target.value),
            style: { ...S.exportTxt, height: 170 },
          }),
          h(
            "button",
            {
              style: { ...S.cta, marginTop: 18 },
              onClick: () => {
                onSave({ abertura, fechamento });
                onFlash("Mensagem salva");
                onClose();
              },
            },
            "Salvar mensagem",
          ),
          h(
            "button",
            {
              style: S.ctaGhost,
              onClick: () => {
                setAbertura(ABERTURA_PADRAO);
                setFechamento(FECHAMENTO_PADRAO);
              },
            },
            "Voltar ao texto original",
          ),
        ),
      ),
    );
  }
  function SheetExport({ dados, onClose, onFlash }) {
    const [i, setI] = useState(0);
    const [baixou, setBaixou] = useState("");
    const op = dados.opcoes[i];
    const copiar2 = async () => {
      try {
        await navigator.clipboard.writeText(op.texto);
        onFlash("Copiado, é só colar no WhatsApp");
      } catch (e) {
        onFlash("Selecione o texto e copie na mão");
      }
    };
    const baixar = () => {
      try {
        const blob = op.gerarArquivo
          ? op.gerarArquivo()
          : new Blob(["\\uFEFF" + op.csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = op.arquivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1e3);
        setBaixou("ok");
      } catch (e) {
        setBaixou("erro");
      }
    };
    const numeroLimpo = String(dados.whatsapp || "").replace(/\\D/g, "");
    const temNumero = numeroLimpo.length >= 10;
    const enviar = () => {
      const completo = numeroLimpo.length <= 11 ? \`55\${numeroLimpo}\` : numeroLimpo;
      const url = \`https://wa.me/\${completo}?text=\${encodeURIComponent(op.texto)}\`;
      try {
        const aba = window.open(url, "_blank");
        if (aba) aba.opener = null;
        else setBaixou("bloqueado");
      } catch (e) {
        setBaixou("bloqueado");
      }
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
          h("span", { style: S.sheetTitle }, dados.titulo),
          h("button", { style: S.linkBtn, onClick: onClose }, "Fechar"),
        ),
        h(
          "div",
          { style: { padding: "4px 20px 20px", overflowY: "auto" } },
          dados.opcoes.length > 1 &&
            h(
              "div",
              { style: { ...S.segmento, marginBottom: 12 } },
              dados.opcoes.map((o, n) =>
                h(
                  "button",
                  {
                    key: o.rotulo,
                    style: { ...S.segBtn, ...(n === i ? S.segOnEscopo : {}) },
                    onClick: () => {
                      setI(n);
                      setBaixou("");
                    },
                  },
                  o.rotulo,
                ),
              ),
            ),
          h("textarea", {
            readOnly: true,
            value: op.texto,
            onFocus: (e) => e.target.select(),
            style: S.exportTxt,
          }),
          temNumero
            ? h(
                Fragment,
                null,
                h(
                  "button",
                  { style: { ...S.cta, marginTop: 14 }, onClick: enviar },
                  "Enviar para ",
                  dados.titulo.split(" ")[0],
                  " no WhatsApp",
                ),
                h("button", { style: S.ctaGhost, onClick: copiar2 }, "Só copiar o texto"),
              )
            : h("button", { style: { ...S.cta, marginTop: 14 }, onClick: copiar2 }, "Copiar para o WhatsApp"),
          h("button", { style: S.ctaGhost, onClick: baixar }, op.rotuloArquivo || "Baixar planilha (.csv)"),
          dados.whatsapp !== void 0 &&
            !temNumero &&
            h(
              "p",
              { style: { fontSize: 13, color: t.inkSoft, marginTop: 12, lineHeight: 1.5 } },
              "Salve o WhatsApp dela no cadastro e o envio passa a ser direto, sem copiar e colar.",
            ),
          baixou === "bloqueado" &&
            h(
              "p",
              { style: S.erro },
              'O navegador bloqueou a abertura do WhatsApp aqui dentro. Use "Só copiar o texto" — o envio direto funciona quando a ferramenta estiver publicada num link próprio.',
            ),
          baixou === "erro" &&
            h(
              "p",
              { style: S.erro },
              "O download foi bloqueado aqui. Use o botão de copiar — a planilha vai funcionar quando a ferramenta estiver publicada num link próprio.",
            ),
          baixou === "ok" &&
            h(
              "p",
              { style: { fontSize: 13, color: t.inkSoft, marginTop: 12, lineHeight: 1.5 } },
              "Se o arquivo não aparecer nos downloads, use o botão de copiar.",
            ),
        ),
      ),
    );
  }
  function SheetBackup({ texto: texto2, onClose, onFlash }) {
    const copiar2 = async () => {
      try {
        await navigator.clipboard.writeText(texto2);
        onFlash("Backup copiado");
      } catch (e) {
        onFlash("Selecione o texto e copie na mão");
      }
    };
    const baixar = () => {
      try {
        const url = URL.createObjectURL(new Blob([texto2], { type: "application/json;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = \`backup-delas-pra-elas-\${todayKey()}.json\`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1e3);
      } catch (e) {
        onFlash("Não deu para baixar o arquivo. Use o botão de copiar.");
      }
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
          h("span", { style: S.sheetTitle }, "Backup dos dados"),
          h("button", { style: S.linkBtn, onClick: onClose }, "Fechar"),
        ),
        h(
          "div",
          { style: { padding: "4px 20px 20px" } },
          h(
            "p",
            { style: { fontSize: 14, color: t.inkSoft, lineHeight: 1.5, margin: "0 0 14px" } },
            "Baixe o arquivo (ou copie o texto e cole num bloco de notas). É a cópia de segurança de tudo que está registrado, menos as fotos das peças.",
          ),
          h("textarea", {
            readOnly: true,
            value: texto2,
            onFocus: (e) => e.target.select(),
            style: {
              width: "100%",
              height: 180,
              background: t.surface,
              color: t.inkSoft,
              border: \`1px solid \${t.line}\`,
              borderRadius: 9,
              padding: 12,
              fontSize: 12,
              fontFamily: "monospace",
              resize: "none",
            },
          }),
          h("button", { style: { ...S.cta, marginTop: 14 }, onClick: baixar }, "Baixar arquivo do backup"),
          h("button", { style: S.ctaGhost, onClick: copiar2 }, "Copiar o texto"),
        ),
      ),
    );
  }

  // app/telas/folha.jsx
  function Folha({ titulo, aoFechar, rotuloFechar = "Fechar", children }) {
    return h(
      "div",
      { style: S.overlay, onClick: aoFechar },
      h(
        "div",
        {
          style: S.sheet,
          onClick: (e) => e.stopPropagation(),
          role: "dialog",
          "aria-modal": "true",
          "aria-label": titulo,
        },
        h(
          "div",
          { style: S.sheetHead },
          h("span", { style: S.sheetTitle }, titulo),
          h("button", { style: S.linkBtn, onClick: aoFechar }, rotuloFechar),
        ),
        h("div", { style: { padding: "4px 20px 20px", overflowY: "auto" } }, children),
      ),
    );
  }

  // app/telas/conta.jsx
  var SENHA_MIN = 8;
  var plural = (n, um, varios) => \`\${n.toLocaleString("pt-BR")} \${n === 1 ? um : varios}\`;
  function SheetConta({ usuario, pendentes, aoFechar, aoAbrir, aoSair }) {
    const [confirmando, setConfirmando] = useState(false);
    const [saindo, setSaindo] = useState(false);
    const [erro, setErro] = useState("");
    const dona = usuario.papel === "dono";
    const sair = async () => {
      setSaindo(true);
      setErro("");
      try {
        await aoSair();
      } catch (e) {
        setErro(
          e instanceof SemRede
            ? "Sem internet: não dá para sair agora. Tente de novo quando a conexão voltar."
            : textoDoErro(e),
        );
        setSaindo(false);
        setConfirmando(false);
      }
    };
    return h(
      Folha,
      { titulo: "Minha conta", aoFechar },
      h(
        "p",
        { style: S.nota },
        "Você entrou como ",
        h("strong", null, usuario.email),
        dona ? " (dona do brechó)." : ".",
      ),
      h("button", { style: S.ctaGhost, onClick: () => aoAbrir("senha") }, "Trocar minha senha"),
      dona &&
        h(
          Fragment,
          null,
          h("button", { style: S.ctaGhost, onClick: () => aoAbrir("equipe") }, "Equipe do app"),
          h("a", { style: S.botaoLink, href: "/fretes.html" }, "Abrir Fretes"),
          h("button", { style: S.ctaGhost, onClick: () => aoAbrir("restaurar") }, "Restaurar backup antigo"),
        ),
      confirmando
        ? h(
            "div",
            { style: { ...S.histBox, marginTop: 18 } },
            h(
              "div",
              { style: { fontSize: 14, color: t.ink, lineHeight: 1.5 } },
              plural(pendentes, "alteração ainda não foi enviada", "alterações ainda não foram enviadas"),
              ". Se você sair agora, elas serão perdidas.",
            ),
            h(
              "button",
              { style: { ...S.cta, marginTop: 12 }, disabled: saindo, onClick: sair },
              saindo ? "Saindo…" : "Sair mesmo assim",
            ),
            h("button", { style: S.ctaGhost, onClick: () => setConfirmando(false) }, "Voltar"),
          )
        : h(
            "button",
            {
              style: {
                ...S.ctaGhost,
                marginTop: 18,
                color: t.rose,
                borderColor: t.roseSoft,
                opacity: saindo ? 0.6 : 1,
              },
              disabled: saindo,
              onClick: () => (pendentes > 0 ? setConfirmando(true) : sair()),
            },
            saindo ? "Saindo…" : "Sair",
          ),
      erro && h("p", { style: S.erro }, erro),
    );
  }
  function SheetTrocarSenha({ aoFechar, aoTrocar, aoAvisar }) {
    const [atual, setAtual] = useState("");
    const [nova, setNova] = useState("");
    const [repetida, setRepetida] = useState("");
    const [erro, setErro] = useState("");
    const [salvando, setSalvando] = useState(false);
    const salvar = async () => {
      if (!atual || !nova) return setErro("Preencha a senha atual e a nova.");
      if (nova.length < SENHA_MIN) return setErro(\`A senha nova precisa ter pelo menos \${SENHA_MIN} caracteres.\`);
      if (nova !== repetida) return setErro("As duas senhas novas não são iguais.");
      setSalvando(true);
      setErro("");
      try {
        await aoTrocar(atual, nova);
        aoAvisar("Senha trocada");
        aoFechar();
      } catch (e) {
        setErro(textoDoErro(e));
        setSalvando(false);
      }
    };
    const campo = (rotulo, valor, mudar, completar, extra = {}) =>
      h(
        Fragment,
        null,
        h("label", { style: { ...S.label, marginTop: 14 } }, rotulo),
        h("input", {
          style: S.input,
          type: "password",
          value: valor,
          autoComplete: completar,
          onChange: (e) => {
            mudar(e.target.value);
            setErro("");
          },
          ...extra,
        }),
      );
    return h(
      Folha,
      { titulo: "Trocar minha senha", aoFechar },
      campo("Senha atual", atual, setAtual, "current-password"),
      campo(\`Senha nova (mínimo \${SENHA_MIN} caracteres)\`, nova, setNova, "new-password"),
      campo("Repita a senha nova", repetida, setRepetida, "new-password", {
        onKeyDown: (e) => e.key === "Enter" && salvar(),
      }),
      erro && h("p", { style: S.erro }, erro),
      h(
        "button",
        { style: { ...S.cta, marginTop: 20, opacity: salvando ? 0.6 : 1 }, disabled: salvando, onClick: salvar },
        salvando ? "Salvando…" : "Trocar a senha",
      ),
    );
  }
  function SheetEquipe({ aoFechar, equipe, meuEmail, aoAvisar }) {
    const [pessoas, setPessoas] = useState(null);
    const [erro, setErro] = useState("");
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [trabalhando, setTrabalhando] = useState(false);
    const [mexendo, setMexendo] = useState(null);
    const [novaSenha, setNovaSenha] = useState("");
    const carregar = async () => {
      try {
        setPessoas(await equipe.listar());
      } catch (e) {
        setErro(textoDoErro(e));
      }
    };
    useEffect(() => {
      carregar();
    }, []);
    const fazer = async (acao, aviso) => {
      setTrabalhando(true);
      setErro("");
      try {
        await acao();
        aoAvisar(aviso);
        await carregar();
        return true;
      } catch (e) {
        setErro(textoDoErro(e));
        return false;
      } finally {
        setTrabalhando(false);
      }
    };
    const adicionar = async () => {
      if (!email.trim() || !senha) return setErro("Preencha o e-mail e a senha da pessoa.");
      if (senha.length < SENHA_MIN) return setErro(\`A senha precisa ter pelo menos \${SENHA_MIN} caracteres.\`);
      if (await fazer(() => equipe.adicionar(email.trim(), senha), "Pessoa adicionada")) {
        setEmail("");
        setSenha("");
      }
    };
    const trocarSenha = async (pessoa) => {
      if (novaSenha.length < SENHA_MIN) return setErro(\`A senha precisa ter pelo menos \${SENHA_MIN} caracteres.\`);
      if (await fazer(() => equipe.redefinirSenha(pessoa, novaSenha), "Senha trocada. Ela precisa entrar de novo.")) {
        setMexendo(null);
        setNovaSenha("");
      }
    };
    const remover = async (pessoa) => {
      if (await fazer(() => equipe.remover(pessoa), "Pessoa removida")) setMexendo(null);
    };
    return h(
      Folha,
      { titulo: "Equipe do app", aoFechar },
      h(
        "p",
        { style: S.nota },
        "Quem está aqui entra no app da live com o próprio e-mail e senha. Só a dona cadastra e remove pessoas.",
      ),
      pessoas === null && !erro && h("p", { style: S.nota }, "Abrindo a lista…"),
      (pessoas || []).map((p) => {
        const eu = p.email === meuEmail;
        const aberta = mexendo && mexendo.email === p.email;
        return h(
          "div",
          { key: p.email, style: { borderBottom: \`1px solid \${t.line}\` } },
          h(
            "div",
            { style: { ...S.pessoa, borderBottom: "none" } },
            h("span", { style: S.pessoaEmail }, p.email, eu ? " (você)" : ""),
            h("span", { style: S.pessoaPapel }, p.papel === "dono" ? "dona" : "equipe"),
            p.papel !== "dono" &&
              !aberta &&
              h(
                Fragment,
                null,
                h(
                  "button",
                  {
                    style: S.linkAcao,
                    onClick: () => {
                      setMexendo({ email: p.email, acao: "senha" });
                      setNovaSenha("");
                      setErro("");
                    },
                  },
                  "Nova senha",
                ),
                h(
                  "button",
                  {
                    style: S.linkAcao,
                    onClick: () => {
                      setMexendo({ email: p.email, acao: "remover" });
                      setErro("");
                    },
                  },
                  "Remover",
                ),
              ),
          ),
          aberta &&
            mexendo.acao === "senha" &&
            h(
              "div",
              { style: { paddingBottom: 14 } },
              h("input", {
                style: S.input,
                type: "password",
                autoComplete: "new-password",
                value: novaSenha,
                placeholder: \`Senha nova (mínimo \${SENHA_MIN} caracteres)\`,
                onChange: (e) => {
                  setNovaSenha(e.target.value);
                  setErro("");
                },
              }),
              h(
                "button",
                { style: { ...S.cta, marginTop: 10 }, disabled: trabalhando, onClick: () => trocarSenha(p.email) },
                "Salvar a senha nova",
              ),
              h("button", { style: S.ctaGhost, onClick: () => setMexendo(null) }, "Cancelar"),
            ),
          aberta &&
            mexendo.acao === "remover" &&
            h(
              "div",
              { style: { paddingBottom: 14 } },
              h(
                "p",
                { style: { ...S.nota, margin: "0 0 10px" } },
                "Remover ",
                p.email,
                "? A pessoa perde o acesso na hora.",
              ),
              h(
                "button",
                { style: { ...S.cta, background: t.rose }, disabled: trabalhando, onClick: () => remover(p.email) },
                "Remover",
              ),
              h("button", { style: S.ctaGhost, onClick: () => setMexendo(null) }, "Cancelar"),
            ),
        );
      }),
      h("label", { style: { ...S.label, marginTop: 22 } }, "Adicionar uma pessoa"),
      h("input", {
        style: S.input,
        type: "email",
        inputMode: "email",
        autoCapitalize: "none",
        autoCorrect: "off",
        autoComplete: "off",
        value: email,
        placeholder: "E-mail dela",
        onChange: (e) => {
          setEmail(e.target.value);
          setErro("");
        },
      }),
      h("input", {
        style: { ...S.input, marginTop: 10 },
        type: "password",
        autoComplete: "new-password",
        value: senha,
        placeholder: \`Senha para ela (mínimo \${SENHA_MIN} caracteres)\`,
        onChange: (e) => {
          setSenha(e.target.value);
          setErro("");
        },
        onKeyDown: (e) => e.key === "Enter" && adicionar(),
      }),
      h(
        "p",
        { style: S.notaPequena },
        "Combine a senha com ela pessoalmente. Depois ela pode trocar em “Minha conta”.",
      ),
      erro && h("p", { style: S.erro }, erro),
      h(
        "button",
        {
          style: { ...S.cta, marginTop: 16, opacity: trabalhando ? 0.6 : 1 },
          disabled: trabalhando,
          onClick: adicionar,
        },
        "Adicionar",
      ),
    );
  }
  function SheetRestaurar({ aoFechar, aoImportar, aoAvisar }) {
    const area = useRef(null);
    const [arquivo, setArquivo] = useState(null);
    const [conferido, setConferido] = useState(null);
    const [erro, setErro] = useState("");
    const [progresso, setProgresso] = useState(null);
    const [pronto, setPronto] = useState("");
    const escolher = async (e) => {
      const arq = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!arq) return;
      setErro("");
      setConferido(null);
      if (arq.size > 20 * 1024 * 1024) return setErro("Esse arquivo é grande demais para ser um backup do app.");
      try {
        setArquivo({ nome: arq.name, texto: await arq.text() });
      } catch {
        setErro("Não consegui ler esse arquivo.");
      }
    };
    const conferir = () => {
      setErro("");
      setPronto("");
      try {
        setConferido(lerBackup(arquivo ? arquivo.texto : area.current.value, todayKey()));
      } catch (e) {
        setConferido(null);
        setErro(e.message);
      }
    };
    const restaurar = async () => {
      setErro("");
      setProgresso({ feito: 0, total: 1 });
      try {
        await aoImportar(conferido, (feito, total) => setProgresso({ feito, total }));
        setPronto(
          \`Pronto: \${plural(conferido.clientes.length, "cliente", "clientes")} e \${plural(conferido.vendas.length, "venda", "vendas")} restauradas.\`,
        );
        aoAvisar("Backup restaurado");
        setConferido(null);
        setArquivo(null);
        if (area.current) area.current.value = "";
      } catch (e) {
        setErro(
          \`O envio parou: \${textoDoErro(e)} O que já foi enviado fica; você pode restaurar de novo sem duplicar nada.\`,
        );
      }
      setProgresso(null);
    };
    return h(
      Folha,
      { titulo: "Restaurar backup antigo", aoFechar },
      h(
        "p",
        { style: S.nota },
        "Use o arquivo (ou o texto) que o app antigo gerou em “Baixar backup dos dados”. As fotos das peças não vêm no backup antigo. Se uma cliente ou venda do backup já existir aqui, a do backup substitui a que está aqui.",
      ),
      h(
        "label",
        { style: S.fotoAdd },
        arquivo ? \`Arquivo: \${arquivo.nome}\` : "Escolher o arquivo do backup",
        h("input", {
          type: "file",
          accept: ".json,.txt,application/json,text/plain",
          style: { display: "none" },
          onChange: escolher,
        }),
      ),
      !arquivo &&
        h(
          Fragment,
          null,
          h("label", { style: { ...S.label, marginTop: 16 } }, "Ou cole o texto do backup aqui"),
          h("textarea", {
            ref: area,
            style: { ...S.exportTxt, height: 120, fontFamily: "monospace", fontSize: 12 },
            placeholder: "{ ... }",
            onInput: () => setConferido(null),
          }),
        ),
      conferido &&
        h(
          "div",
          { style: { ...S.histBox, marginTop: 16 } },
          h(
            "div",
            { style: { fontSize: 15, color: t.ink, lineHeight: 1.5 } },
            "Encontrei ",
            plural(conferido.clientes.length, "cliente", "clientes"),
            " e ",
            plural(conferido.vendas.length, "venda", "vendas"),
            ".",
            conferido.ignorados > 0 &&
              \` \${plural(conferido.ignorados, "item foi ignorado", "itens foram ignorados")} por estar incompleto.\`,
          ),
          conferido.avisos.length > 0 &&
            h(
              "div",
              { style: { fontSize: 13, color: t.inkSoft, marginTop: 6 } },
              "Ex.: ",
              conferido.avisos.join("; "),
              ".",
            ),
        ),
      erro && h("p", { style: S.erro }, erro),
      pronto && h("p", { style: S.ok }, pronto),
      progresso &&
        h(
          "p",
          { style: S.notaPequena },
          "Enviando ",
          progresso.feito.toLocaleString("pt-BR"),
          " de ",
          progresso.total.toLocaleString("pt-BR"),
          "…",
        ),
      conferido
        ? h(
            "button",
            {
              style: { ...S.cta, marginTop: 18, opacity: progresso ? 0.6 : 1 },
              disabled: Boolean(progresso),
              onClick: restaurar,
            },
            progresso ? "Restaurando…" : "Restaurar agora",
          )
        : h("button", { style: { ...S.cta, marginTop: 18 }, onClick: conferir }, "Conferir o backup"),
    );
  }

  // app/app.jsx
  var alteracoes = (n) => \`\${n} \${n === 1 ? "alteração guardada" : "alterações guardadas"}\`;
  function FaixaDeConexao({ conexao, pendentes }) {
    if (conexao === "ok" && !pendentes) return null;
    let texto2;
    if (conexao === "sem-rede") {
      texto2 = pendentes
        ? \`Sem internet. \${alteracoes(pendentes)} no celular; \${pendentes === 1 ? "sobe sozinha" : "sobem sozinhas"} quando a conexão voltar.\`
        : "Sem internet. O que você lançar fica guardado no celular e sobe sozinho quando a conexão voltar.";
    } else if (conexao === "erro") {
      texto2 = \`O servidor não respondeu agora. Tentando de novo. \${pendentes ? \`\${alteracoes(pendentes)} no celular.\` : ""}\`;
    } else {
      texto2 = \`Enviando \${pendentes} \${pendentes === 1 ? "alteração" : "alterações"}…\`;
    }
    return h("div", { style: { ...S.faixa, ...(conexao === "erro" ? S.faixaErro : {}) }, role: "status" }, texto2);
  }
  function TelaSimples({ children }) {
    return h(
      "div",
      { style: { ...S.screen, alignItems: "center", justifyContent: "center", display: "flex", padding: 24 } },
      h(
        "div",
        { style: { textAlign: "center", fontFamily: sans, color: t.inkSoft, maxWidth: 340, lineHeight: 1.5 } },
        children,
      ),
    );
  }
  function resolverCliente(clientes, clienteId, nome) {
    if (clienteId) return { id: clienteId, nova: null };
    const existente = clientes.find((c) => norm(c.nome) === norm(nome));
    if (existente) return { id: existente.id, nova: null };
    const id = novoId();
    return { id, nova: { id, nome: (nome || "").trim(), whatsapp: "", preExistente: false, criadaEm: todayKey() } };
  }
  var gravarNova = ({ id, ...dados }) => ({ col: "clientes", id, op: "set", dados });
  var DIA_VALIDO = /^\\d{4}-\\d{2}-\\d{2}$/;
  function useEstado(cliente) {
    const [estado, setEstado] = useState(cliente.estado());
    useEffect(() => {
      setEstado(cliente.estado());
      return cliente.assinar(setEstado);
    }, [cliente]);
    return estado;
  }
  function App({ cliente }) {
    const estado = useEstado(cliente);
    const [tab, setTab] = useState("hoje");
    const [dia, setDia] = useState(todayKey());
    const [sheet, setSheet] = useState(null);
    const [backup, setBackup] = useState(null);
    const [exportar, setExportar] = useState(null);
    const [msg, setMsg] = useState(false);
    const [conta, setConta] = useState(null);
    const [toast, setToast] = useState("");
    const relogioDoAviso = useRef(null);
    const flash = (texto2) => {
      setToast(texto2);
      clearTimeout(relogioDoAviso.current);
      relogioDoAviso.current = setTimeout(() => setToast(""), Math.max(2200, Math.min(7e3, texto2.length * 70)));
    };
    const numeroDoAviso = estado.aviso ? estado.aviso.n : 0;
    useEffect(() => {
      if (estado.aviso) flash(estado.aviso.texto);
    }, [numeroDoAviso]);
    useEffect(() => {
      const marcar = () => cliente.marcarAtividade();
      window.addEventListener("pointerdown", marcar, { passive: true });
      window.addEventListener("keydown", marcar);
      return () => {
        window.removeEventListener("pointerdown", marcar);
        window.removeEventListener("keydown", marcar);
      };
    }, [cliente]);
    const config = useMemo(() => ({ ...CONFIG_PADRAO, ...estado.config }), [estado.config]);
    const data = useMemo(() => {
      const primeira = {};
      estado.vendas.forEach((v) => {
        if (!primeira[v.clienteId] || v.data < primeira[v.clienteId]) primeira[v.clienteId] = v.data;
      });
      return {
        clientes: estado.clientes.map((c) => ({ ...c, primeiraCompra: primeira[c.id] || null })),
        vendas: estado.vendas,
        config,
      };
    }, [estado.clientes, estado.vendas, config]);
    const avisarErro = (e) => {
      console.error(e);
      flash("Não deu para salvar. Tente de novo.");
    };
    const gravar = async (ops) => {
      try {
        await cliente.gravar(ops);
        return true;
      } catch (e) {
        avisarErro(e);
        return false;
      }
    };
    const vendasDoDia = useMemo(() => data.vendas.filter((v) => v.data === dia), [data.vendas, dia]);
    const clientePorId = useMemo(() => {
      const m = {};
      data.clientes.forEach((c) => (m[c.id] = c));
      return m;
    }, [data.clientes]);
    const resumo = useMemo(() => calcResumo(data.vendas, data.clientes, dia), [data.vendas, data.clientes, dia]);
    const grupos = useMemo(() => {
      const map = /* @__PURE__ */ new Map();
      vendasDoDia.forEach((v) => {
        if (!map.has(v.clienteId)) map.set(v.clienteId, []);
        map.get(v.clienteId).push(v);
      });
      return [...map.entries()]
        .map(([id, vs]) => ({
          cliente: clientePorId[id],
          vendas: [...vs].sort((a, b) => b.criadaEm - a.criadaEm),
          total: vs.reduce((s, v) => s + v.valor, 0),
          ultima: Math.max(...vs.map((v) => v.criadaEm)),
        }))
        .sort((a, b) => b.ultima - a.ultima);
    }, [vendasDoDia, clientePorId]);
    const salvarVenda = async (form, vendaEditada) => {
      const novas = [];
      const lista = [...data.clientes];
      const r = resolverCliente(lista, form.clienteId, form.clienteNome);
      if (r.nova) {
        novas.push(r.nova);
        lista.push(r.nova);
      }
      const fila = (form.fila || []).map((f) => {
        const rf = resolverCliente(lista, f.clienteId, f.nome);
        if (rf.nova) {
          novas.push(rf.nova);
          lista.push(rf.nova);
        }
        const c = lista.find((x) => x.id === rf.id);
        return { nome: c ? c.nome : f.nome, clienteId: rf.id };
      });
      const id = vendaEditada ? vendaEditada.id : novoId();
      let temFoto = vendaEditada ? !!vendaEditada.temFoto : false;
      const ops = [];
      if (form.fotoMudou) {
        if (form.foto) {
          ops.push({ col: "fotos", id, op: "set", dados: { imagem: form.foto } });
          temFoto = true;
        } else {
          ops.push({ col: "fotos", id, op: "apagar" });
          temFoto = false;
        }
      }
      novas.forEach((c) => ops.push(gravarNova(c)));
      ops.push({
        col: "vendas",
        id,
        op: "set",
        dados: {
          data: vendaEditada ? vendaEditada.data : dia,
          criadaEm: vendaEditada ? vendaEditada.criadaEm : Date.now(),
          clienteId: r.id,
          codigo: form.codigo.trim(),
          peca: form.peca.trim(),
          valor: parseMoney(form.valor),
          pago: form.pago,
          fila,
          temFoto,
        },
      });
      await gravar(ops);
      return r.id;
    };
    const passarFila = async (venda) => {
      const fila = venda.fila || [];
      if (fila.length === 0) return;
      const [proxima, ...resto] = fila;
      const r = resolverCliente(data.clientes, proxima.clienteId, proxima.nome);
      const ops = [];
      if (r.nova) ops.push(gravarNova(r.nova));
      ops.push({ col: "vendas", id: venda.id, op: "mesclar", dados: { clienteId: r.id, fila: resto, pago: false } });
      if (await gravar(ops)) flash(\`Peça passou para \${proxima.nome}\`);
    };
    const excluirVenda = async (id) => {
      if (
        await gravar([
          { col: "vendas", id, op: "apagar" },
          { col: "fotos", id, op: "apagar" },
        ])
      )
        flash("Peça excluída");
    };
    const mesclarClientes = async (deId, paraId) => {
      const de = data.clientes.find((c) => c.id === deId);
      const para = data.clientes.find((c) => c.id === paraId);
      if (!de || !para) return;
      const ops = [];
      data.vendas.forEach((v) => {
        const naFila = (v.fila || []).some((f) => f.clienteId === deId);
        if (v.clienteId !== deId && !naFila) return;
        const fila = [];
        (v.fila || []).forEach((f) => {
          const id = f.clienteId === deId ? paraId : f.clienteId;
          if (fila.some((x) => x.clienteId === id)) return;
          fila.push({ nome: id === paraId ? para.nome : f.nome, clienteId: id });
        });
        ops.push({
          col: "vendas",
          id: v.id,
          op: "mesclar",
          dados: { clienteId: v.clienteId === deId ? paraId : v.clienteId, fila },
        });
      });
      ops.push({
        col: "clientes",
        id: paraId,
        op: "mesclar",
        dados: { whatsapp: para.whatsapp || de.whatsapp || "", preExistente: !!(para.preExistente || de.preExistente) },
      });
      ops.push({ col: "clientes", id: deId, op: "apagar" });
      if (await gravar(ops)) flash(\`\${de.nome} foi juntada em \${para.nome}\`);
    };
    const togglePago = (id, pago) => gravar([{ col: "vendas", id, op: "mesclar", dados: { pago: !pago } }]);
    const carregarFoto = (idVenda) => cliente.foto(idVenda);
    const exportarCliente = (g) => {
      const c = g.cliente;
      const cfg = data.config || CONFIG_PADRAO;
      const ordem = [...g.vendas].reverse();
      const pagoDia = ordem.filter((v) => v.pago).reduce((s, v) => s + v.valor, 0);
      const vals = {
        nome: c.nome,
        data: dataCurta(dia),
        total: brl(g.total),
        apagar: brl(g.total - pagoDia),
      };
      const corpo =
        ordem.map((v) => itemLinha(v, false)).join("\\n") +
        \`

*Valor total: \${brl(g.total)}*
*Valor a pagar: \${brl(g.total - pagoDia)}*\`;
      const abertura = preencher(cfg.abertura, vals).trim();
      const fechamento = preencher(cfg.fechamento, vals).trim();
      const txtDia = [abertura, corpo, fechamento].filter(Boolean).join("\\n\\n");
      const todas = data.vendas
        .filter((v) => v.clienteId === c.id)
        .sort((a, b) => a.data.localeCompare(b.data) || a.criadaEm - b.criadaEm);
      const totalGeral = todas.reduce((s, v) => s + v.valor, 0);
      const pagoGeral = todas.filter((v) => v.pago).reduce((s, v) => s + v.valor, 0);
      const porData = [];
      todas.forEach((v) => {
        const bloco = porData.find((b) => b.data === v.data);
        if (bloco) bloco.itens.push(v);
        else porData.push({ data: v.data, itens: [v] });
      });
      let txtTudo = \`*Delas pra Elas*
*\${c.nome}* — histórico

\`;
      txtTudo += porData
        .map(
          (b) => \`\${dataCurta(b.data)}
\${b.itens.map((v) => itemLinha(v, false)).join("\\n")}\`,
        )
        .join("\\n\\n");
      txtTudo += \`

*Valor total: \${brl(totalGeral)}*\`;
      txtTudo += \`
*Valor a pagar: \${brl(totalGeral - pagoGeral)}*\`;
      setExportar({
        titulo: c.nome,
        whatsapp: c.whatsapp,
        opcoes: [
          {
            rotulo: "Desta live",
            texto: txtDia,
            csv: csvVendas(g.vendas, data.clientes),
            arquivo: \`\${arquivoNome(c.nome)}-\${dia}.csv\`,
          },
          {
            rotulo: "Histórico dela",
            texto: txtTudo,
            csv: csvVendas(todas, data.clientes),
            arquivo: \`\${arquivoNome(c.nome)}-historico.csv\`,
          },
        ],
      });
    };
    const exportarDia = () => {
      const blocos = [...grupos].reverse().map((g) => {
        const itens = [...g.vendas]
          .reverse()
          .map((v) => \`   \${itemLinha(v, true)}\`)
          .join("\\n");
        const qtd = \`\${g.vendas.length} \${g.vendas.length === 1 ? "peça" : "peças"}\`;
        const pago = g.vendas.filter((v) => v.pago).reduce((s, v) => s + v.valor, 0);
        let bloco = \`*\${g.cliente.nome}* — \${brl(g.total)} (\${qtd})
\${itens}\`;
        if (g.total - pago > 0)
          bloco += \`
   A pagar: \${brl(g.total - pago)}\`;
        return bloco;
      });
      let txt = \`*Delas pra Elas*
Live de \${dataCurta(dia)}

\${blocos.join("\\n\\n")}\`;
      txt += \`

──────────
*Valor total: \${brl(resumo.total)}*\`;
      txt += \`
*Valor a pagar: \${brl(resumo.pendente)}*\`;
      txt += \`
Peças: \${resumo.pecas}\`;
      txt += \`
Clientes: \${resumo.clientes}\`;
      if (resumo.novas > 0) txt += \` (\${resumo.novas} \${resumo.novas === 1 ? "nova" : "novas"})\`;
      setExportar({
        titulo: \`Live de \${dataCurta(dia)}\`,
        opcoes: [
          {
            rotulo: "Live do dia",
            texto: txt,
            arquivo: \`live-\${dia}.xlsx\`,
            rotuloArquivo: "Baixar planilha da live (.xlsx)",
            gerarArquivo: () =>
              new Blob([planilhaDoDia(grupos, dataCurta(dia).replace(/\\//g, "-"))], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              }),
          },
        ],
      });
    };
    const exportarTudo = () => {
      const dias = [...new Set(data.vendas.map((v) => v.data))].sort();
      const linhas = dias.map((d) => {
        const r = calcResumo(data.vendas, data.clientes, d);
        let l = \`\${dataCurta(d)} — \${brl(r.total)} · \${r.pecas} \${r.pecas === 1 ? "peça" : "peças"} · \${r.clientes} \${r.clientes === 1 ? "cliente" : "clientes"}\`;
        if (r.novas > 0) l += \` (\${r.novas} \${r.novas === 1 ? "nova" : "novas"})\`;
        return l;
      });
      const total = data.vendas.reduce((s, v) => s + v.valor, 0);
      const pago = data.vendas.filter((v) => v.pago).reduce((s, v) => s + v.valor, 0);
      let txt = \`*Delas pra Elas* — histórico completo

\${linhas.join("\\n")}\`;
      txt += \`

──────────
*Valor total: \${brl(total)}*\`;
      txt += \`
*Valor a pagar: \${brl(total - pago)}*\`;
      txt += \`
Lives: \${dias.length}
Peças: \${data.vendas.length}\`;
      setExportar({
        titulo: "Histórico completo",
        opcoes: [
          {
            rotulo: "Tudo",
            texto: txt,
            csv: csvVendas(data.vendas, data.clientes),
            arquivo: "historico-delas-pra-elas.csv",
          },
        ],
      });
    };
    const salvarCliente = async (c) => {
      const dados = { nome: c.nome, whatsapp: c.whatsapp || "", preExistente: !!c.preExistente };
      if (DIA_VALIDO.test(c.criadaEm || "")) dados.criadaEm = c.criadaEm;
      else if (!c.id) dados.criadaEm = todayKey();
      await gravar([{ col: "clientes", id: c.id || novoId(), op: "mesclar", dados }]);
    };
    const salvarConfig = (cfg) => gravar([{ col: "config", id: "geral", op: "mesclar", dados: cfg }]);
    if (estado.tela === "abrindo") return h(TelaSimples, null, "Abrindo…");
    if (estado.tela === "falha") {
      return h(
        TelaSimples,
        null,
        h("p", { style: { margin: "0 0 16px" } }, estado.falhaInicial),
        h("button", { style: S.cta, onClick: () => cliente.tentarDeNovo() }, "Tentar de novo"),
      );
    }
    if (estado.tela === "entrada") {
      return h(Entrada, {
        primeiroAcesso: estado.primeiroAcesso,
        sessaoPerdida: estado.sessaoPerdida,
        aoEntrar: cliente.entrar,
        aoCriar: cliente.criarPrimeiraConta,
      });
    }
    if (estado.tela === "carregando") {
      return h(
        TelaSimples,
        null,
        h(
          "p",
          { style: { margin: 0 } },
          estado.conexao === "ok" ? "Carregando os dados…" : "Sem conexão com o servidor. Tentando de novo…",
        ),
      );
    }
    return h(
      "div",
      { style: S.screen },
      h(
        "div",
        { style: S.frame },
        h(
          "header",
          { style: S.header },
          h(
            "div",
            { style: S.brandRow },
            h("span", { style: S.brand }, "Delas pra Elas"),
            h("button", { style: S.linkBtn, onClick: () => setConta("menu") }, "Conta"),
          ),
          h(
            "div",
            { style: S.tabs },
            h(
              "button",
              {
                style: { ...S.tab, ...(tab === "hoje" ? S.tabOn : {}) },
                onClick: () => setTab("hoje"),
              },
              "Live",
            ),
            h(
              "button",
              {
                style: { ...S.tab, ...(tab === "calendario" ? S.tabOn : {}) },
                onClick: () => setTab("calendario"),
              },
              "Calendário",
            ),
            h(
              "button",
              {
                style: { ...S.tab, ...(tab === "clientes" ? S.tabOn : {}) },
                onClick: () => setTab("clientes"),
              },
              "Clientes",
            ),
          ),
        ),
        h(FaixaDeConexao, { conexao: estado.conexao, pendentes: estado.pendentes }),
        tab === "hoje"
          ? h(
              Fragment,
              null,
              h(
                "div",
                { style: S.dateRow },
                h(
                  "button",
                  { style: S.arrow, onClick: () => setDia(shiftKey(dia, -1)), "aria-label": "Dia anterior" },
                  "‹",
                ),
                h(
                  "div",
                  { style: { textAlign: "center" } },
                  h("button", { style: S.dateTxt, onClick: () => setTab("calendario") }, dateLabel(dia)),
                  dia !== todayKey() &&
                    h("button", { style: S.todayBtn, onClick: () => setDia(todayKey()) }, "voltar para hoje"),
                ),
                h(
                  "button",
                  {
                    style: { ...S.arrow, opacity: dia >= todayKey() ? 0.25 : 1 },
                    disabled: dia >= todayKey(),
                    onClick: () => setDia(shiftKey(dia, 1)),
                    "aria-label": "Próximo dia",
                  },
                  "›",
                ),
              ),
              h(Resumo, { r: resumo }),
              h(
                "main",
                { style: S.list },
                grupos.length === 0
                  ? h(
                      "div",
                      { style: S.empty },
                      h("p", { style: S.emptyTitle }, "Nenhuma peça lançada neste dia."),
                      h(
                        "p",
                        { style: S.emptyTxt },
                        "Toque em ",
                        h("strong", null, "Lançar peça"),
                        " assim que a primeira venda sair.",
                      ),
                    )
                  : grupos.map((g) =>
                      h(GrupoCliente, {
                        key: g.cliente?.id || "x",
                        g,
                        dia,
                        onToggle: togglePago,
                        onEdit: (v) => setSheet({ mode: "edit", venda: v }),
                        onExportar: () => exportarCliente(g),
                      }),
                    ),
                grupos.length > 0 &&
                  h(
                    "button",
                    { style: { ...S.ctaGhost, marginTop: 8 }, onClick: exportarDia },
                    "Exportar relatório do dia",
                  ),
                h("div", { style: { height: 96 } }),
              ),
              h(
                "div",
                { style: S.dock },
                h("button", { style: S.cta, onClick: () => setSheet({ mode: "new" }) }, "Lançar peça"),
              ),
            )
          : tab === "calendario"
            ? h(Calendario, {
                data,
                dia,
                onEscolher: (d) => {
                  setDia(d);
                  setTab("hoje");
                },
              })
            : h(Clientes, {
                data,
                dia,
                onSave: salvarCliente,
                onFlash: flash,
                onExport: () => setBackup(JSON.stringify(data, null, 2)),
                onExportTudo: exportarTudo,
                onMesclar: mesclarClientes,
                onEditarMensagem: () => setMsg(true),
              }),
      ),
      sheet &&
        h(SheetVenda, {
          mode: sheet.mode,
          venda: sheet.venda,
          clientes: data.clientes,
          vendasDoDia,
          onClose: () => setSheet(null),
          onSave: salvarVenda,
          onDelete: excluirVenda,
          onPassar: passarFila,
          onFlash: flash,
          carregarFoto,
        }),
      exportar && h(SheetExport, { dados: exportar, onClose: () => setExportar(null), onFlash: flash }),
      msg &&
        h(SheetMensagem, {
          config: data.config || CONFIG_PADRAO,
          onClose: () => setMsg(false),
          onFlash: flash,
          onSave: salvarConfig,
        }),
      backup && h(SheetBackup, { texto: backup, onClose: () => setBackup(null), onFlash: flash }),
      conta === "menu" &&
        h(SheetConta, {
          usuario: estado.usuario,
          pendentes: estado.pendentes,
          aoFechar: () => setConta(null),
          aoAbrir: setConta,
          aoSair: cliente.sair,
        }),
      conta === "senha" &&
        h(SheetTrocarSenha, { aoFechar: () => setConta(null), aoTrocar: cliente.trocarSenha, aoAvisar: flash }),
      conta === "equipe" &&
        h(SheetEquipe, {
          aoFechar: () => setConta(null),
          equipe: cliente.equipe,
          meuEmail: estado.usuario.email,
          aoAvisar: flash,
        }),
      conta === "restaurar" &&
        h(SheetRestaurar, { aoFechar: () => setConta(null), aoImportar: cliente.importarBackup, aoAvisar: flash }),
      toast && h("div", { style: S.toast }, toast),
    );
  }
  async function abrir() {
    carregarFontes();
    const cliente = criarCliente({ armazem: await criarArmazem() });
    createRoot(document.getElementById("app")).render(h(Barreira, null, h(App, { cliente })));
    cliente.iniciar();
  }
  abrir();
})();
`,
  },
};
