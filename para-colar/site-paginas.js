/**
 * Delas pra Elas — site-paginas.js
 * Parte do site, guardada como texto: as páginas e o estilo do site, e o código da página que a cliente abre para
 * escolher o frete (frete.html e frete.js) — arquivos /index.html, /estilo.css, /404.html, /fretes.html,
 * /frete.html, /frete.css, /frete.js.
 *
 * Arquivo gerado por "npm run colar" (o texto de verdade fica nas pastas src/, app/ e site/ do projeto).
 * Cole o arquivo INTEIRO, num arquivo com o nome site-paginas.js no editor do Cloudflare. Não precisa mudar nada nele.
 *
 * O texto de cada página fica entre crases. As barras invertidas que aparecem antes de crases e de ${ são só o jeito
 * de escrever esse texto aqui dentro: o Worker entrega a página sem elas, igual ao arquivo da pasta site/.
 * "etag" é o código de verificação da página inteira (/api/saude confere se o texto colado bate com ele).
 */
export default {
  "/index.html": {
    tipo: "text/html; charset=utf-8",
    etag: "9ed8cc66ce2701b2",
    corpo: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#FAF5F3" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Delas pra Elas" />
<meta name="robots" content="noindex, nofollow" />
<title>Delas pra Elas</title>
<link rel="stylesheet" href="/estilo.css" />
</head>
<body>
<div id="app"><p class="abrindo">Abrindo…</p></div>
<noscript><p class="abrindo">Para usar o app, ative o JavaScript do navegador.</p></noscript>
<script src="/biblioteca.js"></script>
<script src="/app.js"></script>
</body>
</html>
`,
  },
  "/estilo.css": {
    tipo: "text/css; charset=utf-8",
    etag: "28d2ba1eab6bda9c",
    corpo: `/* Regras básicas das telas do app e da tela de Fretes (as cores e o resto do visual ficam dentro das próprias telas). */
html, body { margin: 0; padding: 0; background: #FAF5F3; }
#app { min-height: 100vh; }
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
button { cursor: pointer; font-family: inherit; }
input, textarea, select { font-family: inherit; }
button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible, a:focus-visible { outline: 2px solid #BE1450; outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }

/* "Abrindo…" enquanto o JavaScript carrega */
.abrindo { margin: 0; padding: 40px 24px; text-align: center; color: #7A6874; font: 15px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }

/* página "não encontrada" */
.erro-pagina { min-height: 100vh; display: flex; align-items: center; justify-content: center; color: #2B1C28; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.erro-pagina main { max-width: 360px; padding: 24px; text-align: center; }
.erro-pagina h1 { font-family: Georgia, serif; font-weight: 400; font-size: 24px; margin: 0 0 8px; }
.erro-pagina p { color: #7A6874; line-height: 1.5; margin: 0; }
`,
  },
  "/404.html": {
    tipo: "text/html; charset=utf-8",
    etag: "e73934308651548c",
    corpo: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Página não encontrada</title>
<link rel="stylesheet" href="/estilo.css" />
</head>
<body class="erro-pagina">
<main>
  <h1>Página não encontrada</h1>
  <p>Confira o endereço. Se era o link de um frete, peça um novo para a loja.</p>
</main>
</body>
</html>
`,
  },
  "/fretes.html": {
    tipo: "text/html; charset=utf-8",
    etag: "ce01cdd198aba1fb",
    corpo: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#FAF5F3" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Fretes" />
<meta name="robots" content="noindex, nofollow" />
<title>Fretes · Delas pra Elas</title>
<link rel="stylesheet" href="/estilo.css" />
</head>
<body>
<div id="app"><p class="abrindo">Abrindo…</p></div>
<noscript><p class="abrindo">Para usar a tela de Fretes, ative o JavaScript do navegador.</p></noscript>
<script src="/biblioteca.js"></script>
<script src="/fretes.js"></script>
</body>
</html>
`,
  },
  "/frete.html": {
    tipo: "text/html; charset=utf-8",
    etag: "5847b73825f37430",
    corpo: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#FAF5F3" />
<meta name="robots" content="noindex, nofollow" />
<!-- O endereço deste link contém um código secreto: nunca repassar para outros sites. -->
<meta name="referrer" content="no-referrer" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'" />
<title>Frete — Delas pra Elas</title>
<link rel="stylesheet" href="/frete.css" />
</head>
<body>
<main id="raiz" class="moldura">
  <p class="carregando">Abrindo…</p>
</main>
<noscript><p class="carregando">Para ver o seu frete, ative o JavaScript do navegador.</p></noscript>
<script src="/frete.js"></script>
</body>
</html>
`,
  },
  "/frete.css": {
    tipo: "text/css; charset=utf-8",
    etag: "a2e912f10919f112",
    corpo: `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=Fraunces:opsz,wght@9..144,400;9..144,600&display=swap');

:root {
  --bg: #FAF5F3;
  --surface: #FFFFFF;
  --ink: #2B1C28;
  --ink-soft: #7A6874;
  --ink-faint: #A89AA3;
  --line: #EBDFDA;
  --rose: #BE1450;
  --rose-soft: #FBE8EF;
  --green: #12695A;
  --green-soft: #E2F0EC;
  --amber: #9C5B08;
  --amber-soft: #FAEEDB;
  --sans: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --display: "Fraunces", Georgia, serif;
}

* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body { margin: 0; padding: 0; background: var(--bg); color: var(--ink); font-family: var(--sans); }
button, input, textarea { font-family: inherit; }
button { cursor: pointer; }
button:focus-visible, input:focus-visible, textarea:focus-visible, a:focus-visible { outline: 2px solid var(--rose); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }

.moldura { max-width: 480px; margin: 0 auto; min-height: 100vh; padding: 22px 20px 48px; }
.carregando { text-align: center; color: var(--ink-soft); padding: 60px 0; }

.marca { font-family: var(--display); font-size: 28px; line-height: 1.1; margin: 0; }
.sub { color: var(--ink-soft); font-size: 15px; margin: 6px 0 0; }

.ola { font-family: var(--display); font-size: 24px; margin: 26px 0 6px; line-height: 1.2; }
.texto { font-size: 15px; color: var(--ink-soft); line-height: 1.55; margin: 0 0 14px; }
.pequeno { font-size: 13px; color: var(--ink-soft); line-height: 1.5; margin: 10px 0 0; }

.cartao { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 16px; margin-top: 14px; }
.cartao h2 { font-family: var(--display); font-size: 19px; font-weight: 400; margin: 0 0 10px; }

.pacote { display: inline-block; background: #F2EDEF; color: var(--ink-soft); font-size: 13px; padding: 5px 10px; border-radius: 20px; margin-bottom: 4px; }

label { display: block; font-size: 13px; color: var(--ink-soft); margin: 14px 0 6px; }
label:first-child { margin-top: 0; }
input[type=text], input[type=tel], input[type=email], input[type=search], input:not([type]) {
  width: 100%; background: var(--surface); border: 1px solid var(--line); border-radius: 9px;
  padding: 13px; font-size: 16px; color: var(--ink);
}
.cep { font-family: var(--display); font-size: 22px; letter-spacing: 1px; }
.dupla { display: flex; gap: 10px; }
.dupla > div { flex: 1; min-width: 0; }
.dupla > .estreito { flex: 0 0 38%; }

.botao {
  width: 100%; background: var(--rose); color: #fff; border: none; border-radius: 10px;
  padding: 15px 16px; font-size: 16px; font-weight: 500; margin-top: 18px;
}
.botao[disabled] { opacity: .55; cursor: default; }
.botao.claro { background: none; color: var(--ink-soft); border: 1px solid var(--line); font-weight: 400; margin-top: 10px; padding: 13px 16px; font-size: 15px; }
.link { background: none; border: none; color: var(--rose); font-size: 14px; padding: 6px 0; text-decoration: underline; text-underline-offset: 3px; }

.erro { background: var(--rose-soft); color: var(--rose); font-size: 14px; line-height: 1.45; padding: 11px 13px; border-radius: 9px; margin-top: 14px; }
.aviso { background: var(--amber-soft); color: var(--amber); font-size: 14px; line-height: 1.45; padding: 11px 13px; border-radius: 9px; margin-top: 14px; }
.ok { background: var(--green-soft); color: var(--green); font-size: 15px; line-height: 1.45; padding: 12px 14px; border-radius: 9px; margin-top: 14px; font-weight: 500; }

.opcoes { display: grid; gap: 10px; margin-top: 4px; }
.opcao {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; text-align: left;
  background: var(--surface); border: 1.5px solid var(--line); border-radius: 12px; padding: 14px; color: var(--ink);
}
.opcao[aria-pressed=true] { border-color: var(--rose); background: var(--rose-soft); }
.opcao .nome { font-size: 16px; font-weight: 500; }
.opcao .prazo { font-size: 13px; color: var(--ink-soft); margin-top: 2px; }
.opcao .preco { font-family: var(--display); font-size: 20px; white-space: nowrap; }

.resumo { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; font-size: 15px; padding: 6px 0; }
.resumo strong { font-family: var(--display); font-size: 22px; font-weight: 400; }

.pix { text-align: center; }
.pix img { width: 220px; height: 220px; max-width: 100%; image-rendering: pixelated; border: 1px solid var(--line); border-radius: 10px; padding: 8px; background: #fff; }
.pix .valor { font-family: var(--display); font-size: 30px; margin: 10px 0 2px; }
.codigo {
  width: 100%; height: 92px; resize: none; border: 1px solid var(--line); border-radius: 9px; padding: 10px;
  font-size: 12px; color: var(--ink-soft); background: #fff; word-break: break-all; margin-top: 10px;
}

.passos { list-style: none; padding: 0; margin: 4px 0 0; }
.passos li { display: flex; gap: 12px; align-items: flex-start; padding: 9px 0; color: var(--ink-faint); font-size: 15px; }
.passos li .bola { width: 22px; height: 22px; border-radius: 22px; border: 1.5px solid var(--line); flex: 0 0 22px; text-align: center; line-height: 19px; font-size: 12px; color: #fff; background: var(--surface); }
.passos li.feito { color: var(--ink); }
.passos li.feito .bola { background: var(--green); border-color: var(--green); }
.passos li.agora { color: var(--ink); font-weight: 500; }
.passos li.agora .bola { border-color: var(--rose); background: var(--rose-soft); }
.passos small { display: block; font-weight: 400; color: var(--ink-soft); font-size: 13px; margin-top: 1px; }

.rastreio { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: #F2EDEF; border-radius: 9px; padding: 11px 12px; margin-top: 12px; }
.rastreio code { font-size: 15px; letter-spacing: .5px; word-break: break-all; }
.rastreio button { background: none; border: none; color: var(--rose); font-size: 14px; padding: 4px 2px; flex: 0 0 auto; }

a.botao { display: block; text-align: center; text-decoration: none; }

.toast { position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%); background: var(--ink); color: #fff; font-size: 14px; padding: 10px 16px; border-radius: 8px; z-index: 10; max-width: calc(100% - 40px); }
.rodape { text-align: center; color: var(--ink-faint); font-size: 12px; margin-top: 28px; }
`,
  },
  "/frete.js": {
    tipo: "text/javascript; charset=utf-8",
    etag: "3971545dd87114bc",
    corpo: `/* ─────────────────────────────────────────────────────────────
   Página do frete (a que a cliente abre pelo link).

   Passos: CEP → opções de frete → dados + Pix → acompanhamento (pago, etiqueta, postado, entregue).
   Regras desta página:
   - tudo o que vem do servidor entra na tela como TEXTO (nunca como HTML);
   - nenhum dado pessoal é guardado no navegador;
   - quem decide preço, status e pagamento é sempre o servidor.
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var raiz = document.getElementById('raiz');
  var API = '/api'; // a página e a API ficam no mesmo servidor

  /* ----------------------------------------------------------- utilidades */

  function pegarToken() {
    var m = location.pathname.match(/\\/f\\/([A-Za-z0-9_-]{32})\\/?$/);
    if (m) return m[1];
    var q = new URLSearchParams(location.search).get('c');
    return q && /^[A-Za-z0-9_-]{32}$/.test(q) ? q : '';
  }

  /** Cria elemento. filhos: texto, elemento, array ou null. Atributos on* viram eventos. */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'class') el.className = v;
        else if (k === 'value') el.value = v;
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, String(v));
      });
    }
    for (var i = 2; i < arguments.length; i += 1) juntar(el, arguments[i]);
    return el;
  }
  function juntar(el, f) {
    if (f === null || f === undefined || f === false) return;
    if (Array.isArray(f)) f.forEach(function (x) { juntar(el, x); });
    else if (f.nodeType) el.appendChild(f);
    else el.appendChild(document.createTextNode(String(f)));
  }

  var fmtReais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  function brl(centavos) { return fmtReais.format(Number(centavos) / 100); }

  function soDigitos(v) { return String(v || '').replace(/\\D/g, ''); }
  function mascaraCep(v) { var d = soDigitos(v).slice(0, 8); return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d; }
  function mascaraCpf(v) {
    var d = soDigitos(v).slice(0, 11);
    if (d.length > 9) return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9);
    if (d.length > 6) return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6);
    if (d.length > 3) return d.slice(0, 3) + '.' + d.slice(3);
    return d;
  }
  function mascaraTel(v) {
    var d = soDigitos(v);
    if (d.length > 11 && d.slice(0, 2) === '55') d = d.slice(2);
    d = d.slice(0, 11);
    if (d.length > 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length - 4) + '-' + d.slice(d.length - 4);
    if (d.length > 2) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    return d;
  }
  function cpfOk(v) {
    var c = soDigitos(v);
    if (c.length !== 11 || /^(\\d)\\1{10}$/.test(c)) return false;
    function calc(base) {
      var soma = 0;
      for (var i = 0; i < base; i += 1) soma += Number(c[i]) * (base + 1 - i);
      var r = (soma * 10) % 11;
      return r === 10 ? 0 : r;
    }
    return calc(9) === Number(c[9]) && calc(10) === Number(c[10]);
  }
  function emailOk(v) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(String(v || '').trim()); }

  function pesoTexto(kg) {
    var n = Number(kg);
    if (!isFinite(n) || n <= 0) return '';
    return n < 1 ? Math.round(n * 1000) + ' g' : n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' kg';
  }
  function numTexto(n) { return Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 }); }

  function dataHora(ms) {
    if (!ms) return '';
    try {
      return new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) { return ''; }
  }

  function linkSeguro(url) {
    try {
      var u = new URL(String(url || ''));
      return u.protocol === 'https:' ? u.href : '';
    } catch (e) { return ''; }
  }

  var toastTimer = null;
  function aviso(texto) {
    var antigo = document.querySelector('.toast');
    if (antigo) antigo.remove();
    var t = h('div', { class: 'toast', role: 'status' }, texto);
    document.body.appendChild(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.remove(); }, 2600);
  }

  function copiar(texto, areaFallback) {
    function plano() {
      try {
        var a = areaFallback || h('textarea', { readonly: true });
        if (!areaFallback) { document.body.appendChild(a); a.value = texto; }
        a.focus();
        a.select();
        a.setSelectionRange(0, texto.length);
        var ok = document.execCommand('copy');
        if (!areaFallback) a.remove();
        return ok;
      } catch (e) { return false; }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(texto).then(function () { return true; }, function () { return plano(); });
    }
    return Promise.resolve(plano());
  }

  /* ------------------------------------------------------------ servidor */

  var TOKEN = pegarToken();

  // Diferença entre o relógio do servidor e o do aparelho (relógio errado não pode "vencer" um Pix válido).
  var deltaRelogio = 0;
  function agoraServidor() { return Date.now() + deltaRelogio; }

  function chamar(metodo, caminho, corpo) {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var limite = setTimeout(function () { if (ctrl) ctrl.abort(); }, 30000);
    var opcoes = {
      method: metodo,
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: { Accept: 'application/json' },
    };
    if (ctrl) opcoes.signal = ctrl.signal;
    if (corpo !== undefined) {
      opcoes.headers['Content-Type'] = 'application/json';
      opcoes.body = JSON.stringify(corpo);
    }
    return fetch(API + '/frete/' + TOKEN + caminho, opcoes)
      .then(function (r) {
        var cab = r.headers && r.headers.get && r.headers.get('Date');
        var ms = cab ? Date.parse(cab) : NaN;
        if (isFinite(ms)) deltaRelogio = ms - Date.now();
        return r.text().then(function (txt) {
          var json = null;
          try { json = txt ? JSON.parse(txt) : {}; } catch (e) { json = null; }
          if (!r.ok || !json) {
            var err = new Error((json && json.erro) || 'Não conseguimos falar com a loja agora. Tente de novo em instantes.');
            err.codigo = (json && json.codigo) || 'falha';
            err.http = r.status;
            throw err;
          }
          return json;
        });
      })
      .catch(function (e) {
        if (e && e.codigo) throw e;
        var err = new Error('Sem conexão com a loja. Confira sua internet e tente de novo.');
        err.codigo = 'rede';
        throw err;
      })
      .then(function (v) { clearTimeout(limite); return v; }, function (e) { clearTimeout(limite); throw e; });
  }

  /* -------------------------------------------------------------- estado */

  var estado = {
    view: null,
    etapa: '', // cep | opcoes | dados | pix | acompanha | cancelado | invalido
    cotacao: null, // { cep, endereco, foraDoPadrao, opcoes }
    opcaoId: '',
    campos: { cep: '', nome: '', telefone: '', email: '', cpf: '', numero: '', complemento: '', rua: '', bairro: '', cidade: '', uf: '' },
    avisoInicial: '',
  };
  var relogios = { poll: null, contagem: null };

  function parar() {
    clearTimeout(relogios.poll);
    clearInterval(relogios.contagem);
    relogios.poll = null;
    relogios.contagem = null;
  }

  function assinatura(v) {
    return JSON.stringify([v.status, v.servico, v.pagamento && v.pagamento.status, !!v.pix, v.rastreio, v.etiquetaPronta]);
  }

  function etapaDaView(v) {
    if (v.status === 'cancelado') return 'cancelado';
    if (v.status === 'criado') return 'cep';
    if (v.status === 'aguardando_pagamento') return v.pix ? 'pix' : 'cep';
    return 'acompanha';
  }

  function aplicarView(v, opcoes) {
    var antes = estado.view;
    var assinaturaAntes = antes ? assinatura(antes) : '';
    estado.view = v;
    var nova = etapaDaView(v);
    var forcar = opcoes && opcoes.forcar;
    // Quem está preenchendo o CEP/dados não deve perder o que digitou por causa de uma atualização.
    var digitando = estado.etapa === 'cep' || estado.etapa === 'opcoes' || estado.etapa === 'dados';
    if (digitando && nova === 'cep' && !forcar) return;
    if (!forcar && estado.etapa === nova && assinaturaAntes === assinatura(v)) return;
    estado.etapa = nova;
    if (nova !== 'cep') estado.avisoInicial = '';
    if (nova === 'cep' && !estado.campos.cep && v.cep) estado.campos.cep = mascaraCep(v.cep);
    desenhar();
  }

  /* ------------------------------------------------------------ desenho */

  function cabecalho() {
    var v = estado.view;
    return [
      h('h1', { class: 'marca' }, v ? v.loja : 'Delas pra Elas'),
      h('p', { class: 'sub' }, 'Frete da sua compra'),
    ];
  }

  function chipPacote() {
    var p = estado.view && estado.view.pacote;
    if (!p) return null;
    var partes = [numTexto(p.comprimento) + ' × ' + numTexto(p.largura) + ' × ' + numTexto(p.altura) + ' cm'];
    var peso = pesoTexto(p.pesoKg);
    if (peso) partes.push(peso);
    return h('span', { class: 'pacote' }, 'Seu pacote: ' + partes.join(' · '));
  }

  function rodape() {
    return h('p', { class: 'rodape' }, 'Delas pra Elas · este link é só seu, não compartilhe.');
  }

  function desenhar() {
    parar();
    var v = estado.view;
    var e = estado.etapa;
    raiz.textContent = '';
    if (e === 'invalido') return telaInvalida();
    if (!v) return;
    if (e === 'cancelado') return telaCancelado();
    if (e === 'cep') return telaCep();
    if (e === 'opcoes') return telaOpcoes();
    if (e === 'dados') return telaDados();
    if (e === 'pix') return telaPix();
    return telaAcompanha();
  }

  function telaInvalida(msg) {
    raiz.textContent = '';
    raiz.appendChild(h('div', null,
      cabecalho(),
      h('div', { class: 'cartao' },
        h('h2', null, 'Link não encontrado'),
        h('p', { class: 'texto' }, msg || 'Este link não é válido ou foi trocado. Peça um novo para a loja pelo WhatsApp.'),
      ),
      rodape(),
    ));
  }

  function telaCancelado() {
    raiz.appendChild(h('div', null,
      cabecalho(),
      h('div', { class: 'cartao' },
        h('h2', null, 'Link cancelado'),
        h('p', { class: 'texto' }, 'A loja cancelou este link de frete. Se foi engano, é só pedir um novo pelo WhatsApp.'),
      ),
      rodape(),
    ));
  }

  /* ---- passo 1: CEP */

  function telaCep() {
    var v = estado.view;
    var erro = h('div', { class: 'erro', role: 'alert', hidden: true });
    var campo = h('input', {
      type: 'text', id: 'cep', class: 'cep', inputmode: 'numeric', autocomplete: 'postal-code', maxlength: '9',
      placeholder: '00000-000', value: estado.campos.cep, 'aria-describedby': 'cep-ajuda',
    });
    var botao = h('button', { class: 'botao', type: 'submit' }, 'Ver opções de frete');

    function mostrar(msg) { erro.textContent = msg; erro.hidden = !msg; }

    campo.addEventListener('input', function () {
      var m = mascaraCep(campo.value);
      if (campo.value !== m) campo.value = m;
      estado.campos.cep = m;
      mostrar('');
    });

    var form = h('form', {
      novalidate: true,
      onsubmit: function (ev) {
        ev.preventDefault();
        var cep = soDigitos(campo.value);
        if (cep.length !== 8) { mostrar('Digite o CEP com 8 números.'); campo.focus(); return; }
        botao.disabled = true;
        botao.textContent = 'Calculando…';
        mostrar('');
        chamar('POST', '/cotar', { cep: cep }).then(function (c) {
          estado.cotacao = c;
          estado.opcaoId = '';
          estado.campos.cep = mascaraCep(c.cep);
          // Cidade/estado/rua/bairro do CEP entram sozinhos; a cliente só completa o que faltar.
          if (c.endereco) {
            estado.campos.rua = c.endereco.rua || '';
            estado.campos.bairro = c.endereco.bairro || '';
            estado.campos.cidade = c.endereco.cidade || '';
            estado.campos.uf = c.endereco.uf || '';
          } else {
            estado.campos.rua = estado.campos.bairro = estado.campos.cidade = estado.campos.uf = '';
          }
          estado.etapa = 'opcoes';
          desenhar();
        }).catch(function (err) {
          botao.disabled = false;
          botao.textContent = 'Ver opções de frete';
          if (err.codigo === 'encerrado' || err.codigo === 'link_invalido') { recarregar(true); return; }
          mostrar(err.message);
        });
      },
    },
      h('label', { for: 'cep' }, 'Para qual CEP vamos enviar?'),
      campo,
      h('p', { class: 'pequeno', id: 'cep-ajuda' }, 'Usamos o CEP só para calcular o frete e o prazo.'),
      erro,
      botao,
    );

    var avisoTopo = estado.avisoInicial ? h('div', { class: 'aviso', role: 'status' }, estado.avisoInicial) : null;
    estado.avisoInicial = '';

    raiz.appendChild(h('div', null,
      cabecalho(),
      h('p', { class: 'ola' }, v.nome ? 'Oi, ' + v.nome + '!' : 'Oi!'),
      h('p', { class: 'texto' }, 'Sua compra já está separada. Falta escolher o envio e pagar o frete — leva um minutinho.'),
      chipPacote(),
      avisoTopo,
      h('div', { class: 'cartao' }, form),
      rodape(),
    ));
  }

  /* ---- passo 2: opções do Melhor Envio */

  function prazoTexto(dias) {
    var n = Number(dias);
    if (!isFinite(n) || n <= 0) return '';
    return n === 1 ? 'Chega em até 1 dia útil' : 'Chega em até ' + n + ' dias úteis';
  }

  function telaOpcoes() {
    var c = estado.cotacao;
    var erro = h('div', { class: 'erro', role: 'alert', hidden: true });
    var continuar = h('button', { class: 'botao', type: 'button', disabled: !estado.opcaoId }, 'Continuar');
    var botoes = [];

    function marcar(id) {
      estado.opcaoId = id;
      botoes.forEach(function (b) { b.el.setAttribute('aria-pressed', b.id === id ? 'true' : 'false'); });
      continuar.disabled = false;
      erro.hidden = true;
    }

    var lista = h('div', { class: 'opcoes', role: 'group', 'aria-label': 'Opções de frete' });
    c.opcoes.forEach(function (o) {
      var el = h('button', {
        type: 'button', class: 'opcao', 'aria-pressed': estado.opcaoId === o.id ? 'true' : 'false',
        onclick: function () { marcar(o.id); },
      },
        h('span', null,
          h('div', { class: 'nome' }, o.empresa + ' ' + o.nome),
          h('div', { class: 'prazo' }, prazoTexto(o.prazoDias)),
        ),
        h('span', { class: 'preco' }, brl(o.precoCentavos)),
      );
      botoes.push({ id: o.id, el: el });
      lista.appendChild(el);
    });

    continuar.addEventListener('click', function () {
      if (!estado.opcaoId) { erro.textContent = 'Escolha uma das opções.'; erro.hidden = false; return; }
      estado.etapa = 'dados';
      desenhar();
    });

    var local = c.endereco && c.endereco.cidade ? c.endereco.cidade + ' / ' + c.endereco.uf + ' · CEP ' + mascaraCep(c.cep) : 'CEP ' + mascaraCep(c.cep);

    raiz.appendChild(h('div', null,
      cabecalho(),
      h('div', { class: 'cartao' },
        h('h2', null, 'Escolha o envio'),
        h('p', { class: 'texto' }, 'Entrega em ' + local + '.'),
        c.foraDoPadrao ? h('div', { class: 'aviso' }, 'Correios e Jadlog não atendem este CEP. Estas são as opções disponíveis.') : null,
        lista,
        erro,
        continuar,
        h('button', {
          class: 'botao claro', type: 'button',
          onclick: function () { estado.etapa = 'cep'; desenhar(); },
        }, 'Trocar CEP'),
      ),
      h('p', { class: 'pequeno' }, 'O valor do frete é pago por Pix, logo em seguida. As peças você já pagou.'),
      rodape(),
    ));
  }

  /* ---- passo 3: dados da cliente e Pix */

  function telaDados() {
    var c = estado.cotacao;
    var opcao = c.opcoes.filter(function (o) { return o.id === estado.opcaoId; })[0];
    if (!opcao) { estado.etapa = 'opcoes'; return desenhar(); }
    var f = estado.campos;
    var erro = h('div', { class: 'erro', role: 'alert', hidden: true });
    var botao = h('button', { class: 'botao', type: 'submit' }, 'Gerar Pix de ' + brl(opcao.precoCentavos));
    function mostrar(msg) { erro.textContent = msg; erro.hidden = !msg; }

    function entrada(id, rotulo, extras, mascara) {
      var el = h('input', Object.assign({ type: 'text', id: id, value: f[id] || '', maxlength: '120' }, extras));
      el.addEventListener('input', function () {
        if (mascara) {
          var m = mascara(el.value);
          if (el.value !== m) el.value = m;
        }
        f[id] = el.value;
        mostrar('');
      });
      return { rotulo: h('label', { for: id }, rotulo), el: el };
    }

    var nome = entrada('nome', 'Nome completo', { autocomplete: 'name', autocapitalize: 'words' });
    var tel = entrada('telefone', 'WhatsApp com DDD', { type: 'tel', inputmode: 'tel', autocomplete: 'tel-national', placeholder: '(47) 99999-9999', maxlength: '16' }, mascaraTel);
    var email = entrada('email', 'E-mail (o Pix exige)', { type: 'email', inputmode: 'email', autocomplete: 'email', autocapitalize: 'none' });
    var cpf = entrada('cpf', 'CPF (do Pix)', { inputmode: 'numeric', autocomplete: 'off', placeholder: '000.000.000-00', maxlength: '14' }, mascaraCpf);
    var numero = entrada('numero', 'Número', { autocomplete: 'off', maxlength: '20' });
    var compl = entrada('complemento', 'Complemento (opcional)', { autocomplete: 'address-line2', maxlength: '60' });

    // Endereço: o que o CEP trouxe aparece pronto; só pedimos o que faltou.
    var end = c.endereco || {};
    var pedirRua = !end.rua;
    var pedirBairro = !end.bairro;
    var pedirCidade = !end.cidade || !end.uf;
    var rua = pedirRua ? entrada('rua', 'Rua / avenida', { autocomplete: 'address-line1' }) : null;
    var bairro = pedirBairro ? entrada('bairro', 'Bairro', { autocomplete: 'address-level3' }) : null;
    var cidade = pedirCidade ? entrada('cidade', 'Cidade', { autocomplete: 'address-level2' }) : null;
    var uf = pedirCidade ? entrada('uf', 'UF', { autocomplete: 'address-level1', maxlength: '2', autocapitalize: 'characters' }, function (s) { return s.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2); }) : null;

    var resumoEndereco = (!pedirRua || !pedirBairro || !pedirCidade)
      ? h('p', { class: 'texto' }, [end.rua, end.bairro, end.cidade ? end.cidade + ' / ' + end.uf : ''].filter(Boolean).join(' · ') + ' · CEP ' + mascaraCep(c.cep))
      : null;

    function verificar() {
      if (f.nome.trim().split(/\\s+/).filter(Boolean).length < 2) { nome.el.focus(); return 'Digite seu nome completo (nome e sobrenome).'; }
      var t = soDigitos(f.telefone);
      if (t.length >= 12 && t.slice(0, 2) === '55') t = t.slice(2);
      if (t.length !== 10 && t.length !== 11) { tel.el.focus(); return 'Digite seu WhatsApp com DDD. Exemplo: (47) 99999-9999.'; }
      if (!emailOk(f.email)) { email.el.focus(); return 'Digite um e-mail válido.'; }
      if (!cpfOk(f.cpf)) { cpf.el.focus(); return 'CPF inválido. Confira os números.'; }
      if (!String(f.numero).trim()) { numero.el.focus(); return 'Falta o número da casa (ou digite S/N).'; }
      if (pedirRua && !String(f.rua).trim()) { rua.el.focus(); return 'Falta o nome da rua.'; }
      if (pedirBairro && !String(f.bairro).trim()) { bairro.el.focus(); return 'Falta o bairro.'; }
      if (pedirCidade && (!String(f.cidade).trim() || String(f.uf).length !== 2)) { (cidade || uf).el.focus(); return 'Falta a cidade e o estado (UF).'; }
      return '';
    }

    var form = h('form', {
      novalidate: true,
      onsubmit: function (ev) {
        ev.preventDefault();
        var problema = verificar();
        if (problema) return mostrar(problema);
        botao.disabled = true;
        botao.textContent = 'Gerando o Pix…';
        mostrar('');
        chamar('POST', '/pagar', {
          opcaoId: opcao.id,
          nome: f.nome.trim(),
          telefone: soDigitos(f.telefone),
          email: f.email.trim(),
          cpf: soDigitos(f.cpf),
          numero: String(f.numero).trim(),
          complemento: String(f.complemento || '').trim(),
          rua: String(f.rua || '').trim(),
          bairro: String(f.bairro || '').trim(),
          cidade: String(f.cidade || '').trim(),
          uf: String(f.uf || '').trim(),
        }).then(function (v) {
          aplicarView(v, { forcar: true });
        }).catch(function (err) {
          botao.disabled = false;
          botao.textContent = 'Gerar Pix de ' + brl(opcao.precoCentavos);
          if (err.codigo === 'cotacao_vencida' || err.codigo === 'sem_cotacao') {
            estado.avisoInicial = err.message;
            estado.etapa = 'cep';
            return desenhar();
          }
          if (err.codigo === 'encerrado' || err.codigo === 'link_invalido') return recarregar(true);
          mostrar(err.message);
        });
      },
    },
      nome.rotulo, nome.el,
      tel.rotulo, tel.el,
      email.rotulo, email.el,
      cpf.rotulo, cpf.el,
      h('p', { class: 'pequeno' }, 'O CPF é exigido pelo Pix e usado só neste pagamento e na etiqueta do envio.'),
      resumoEndereco,
      rua ? [rua.rotulo, rua.el] : null,
      bairro ? [bairro.rotulo, bairro.el] : null,
      cidade ? h('div', { class: 'dupla' }, h('div', null, cidade.rotulo, cidade.el), h('div', { class: 'estreito' }, uf.rotulo, uf.el)) : null,
      h('div', { class: 'dupla' },
        h('div', { class: 'estreito' }, numero.rotulo, numero.el),
        h('div', null, compl.rotulo, compl.el),
      ),
      erro,
      botao,
    );

    raiz.appendChild(h('div', null,
      cabecalho(),
      h('div', { class: 'cartao' },
        h('h2', null, 'Seus dados'),
        h('div', { class: 'resumo' },
          h('span', null, opcao.empresa + ' ' + opcao.nome),
          h('strong', null, brl(opcao.precoCentavos)),
        ),
        h('button', { class: 'link', type: 'button', onclick: function () { estado.etapa = 'opcoes'; desenhar(); } }, 'Trocar a opção de frete'),
      ),
      h('div', { class: 'cartao' }, form),
      rodape(),
    ));
  }

  /* ---- passo 4: Pix */

  function tempoRestante(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var m = Math.floor(s / 60);
    var seg = s % 60;
    if (m >= 120) return Math.floor(m / 60) + ' h';
    return m + ':' + (seg < 10 ? '0' : '') + seg;
  }

  function telaPix() {
    var v = estado.view;
    var pix = v.pix;
    var mimeOk = pix.mime === 'image/png' || pix.mime === 'image/jpeg';
    var base64Ok = typeof pix.qrImagem === 'string' && /^[A-Za-z0-9+/=]+$/.test(pix.qrImagem);
    var imagem = mimeOk && base64Ok ? h('img', { src: 'data:' + pix.mime + ';base64,' + pix.qrImagem, alt: 'QR Code do Pix', width: '220', height: '220' }) : null;
    var codigo = h('textarea', { class: 'codigo', readonly: true, 'aria-label': 'Código Pix copia e cola', onfocus: function (ev) { ev.target.select(); } });
    codigo.value = pix.copiaECola;
    var vence = h('p', { class: 'pequeno' }, '');
    var botaoCopiar = h('button', {
      class: 'botao', type: 'button',
      onclick: function () {
        copiar(pix.copiaECola, codigo).then(function (ok) { aviso(ok ? 'Código Pix copiado!' : 'Toque no código e copie manualmente.'); });
      },
    }, 'Copiar código Pix');

    var confirmandoDesde = 0;
    function atualizarContagem() {
      var resta = pix.expiraEm - agoraServidor();
      if (resta > 0) {
        confirmandoDesde = 0;
        vence.textContent = 'Este Pix vale por ' + tempoRestante(resta) + '. Depois você gera outro.';
        return;
      }
      // Venceu: pergunta ao servidor (a cliente pode ter pago no último minuto) antes de pedir tudo de novo.
      vence.textContent = 'Confirmando o pagamento…';
      if (confirmandoDesde && Date.now() - confirmandoDesde < 30000) return;
      confirmandoDesde = Date.now();
      chamar('GET', '/status').then(function (nv) {
        if (nv.pix && nv.pix.expiraEm > agoraServidor()) { estado.view = nv; return; }
        if (nv.pix) return; // o servidor ainda considera este Pix ativo: mantém a tela, sem repetir a pergunta
        if (!estado.campos.cep && nv.cep) estado.campos.cep = mascaraCep(nv.cep);
        if (nv.status === 'aguardando_pagamento') estado.avisoInicial = 'O Pix venceu sem pagamento. Confirme o CEP para gerar um novo.';
        aplicarView(nv, { forcar: true });
      }).catch(function () { /* tenta de novo na próxima volta */ });
    }

    var servico = v.servico ? v.servico.empresa + ' ' + v.servico.nome : 'Frete';
    raiz.appendChild(h('div', null,
      cabecalho(),
      h('div', { class: 'cartao pix' },
        h('h2', null, 'Pague o frete com Pix'),
        h('p', { class: 'texto' }, servico),
        h('div', { class: 'valor' }, brl(pix.valorCentavos)),
        imagem,
        h('p', { class: 'pequeno' }, imagem ? 'Abra o app do seu banco e leia o QR Code, ou use o código abaixo.' : 'Abra o app do seu banco, escolha Pix copia e cola e cole o código abaixo.'),
        codigo,
        botaoCopiar,
        vence,
      ),
      h('div', { class: 'aviso', role: 'status' }, 'Assim que o pagamento cair, esta página muda sozinha. Pode deixar aberta.'),
      rodape(),
    ));

    atualizarContagem();
    relogios.contagem = setInterval(atualizarContagem, 1000);
    agendarConferencia(5000);
  }

  /* ---- passo 5: acompanhamento */

  function telaAcompanha() {
    var v = estado.view;
    var s = v.status;
    var ordem = { pago: 1, etiqueta: 2, postado: 3, entregue: 4 };
    var nivel = ordem[s] || 1;
    var r = v.rastreio;

    var servico = v.servico ? v.servico.empresa + ' ' + v.servico.nome : '';
    var passos = [
      { t: 'Frete pago', d: v.pagamento && v.pagamento.valorCentavos ? brl(v.pagamento.valorCentavos) + (v.pagamento.pagoEm ? ' · ' + dataHora(v.pagamento.pagoEm) : '') : '' },
      { t: nivel >= 2 ? 'Pedido preparado' : 'Preparando o seu pedido', d: nivel >= 2 ? 'Etiqueta pronta' + (servico ? ' · ' + servico : '') : 'A loja está separando e embalando' },
      { t: nivel >= 3 ? 'Postado' : 'Postagem', d: r && r.postadoEm ? dataHora(r.postadoEm) : (nivel >= 3 ? 'A transportadora já está com o seu pacote' : 'Aparece aqui quando o pacote for entregue à transportadora') },
      { t: nivel >= 4 ? 'Entregue' : 'Entrega', d: r && r.entregueEm ? dataHora(r.entregueEm) : (v.servico && v.servico.prazoDias && nivel < 4 ? prazoTexto(v.servico.prazoDias) + ', contando da postagem' : '') },
    ];

    var lista = h('ul', { class: 'passos' }, passos.map(function (p, i) {
      var n = i + 1;
      var classe = n <= nivel ? 'feito' : (n === nivel + 1 ? 'agora' : '');
      return h('li', { class: classe },
        h('span', { class: 'bola', 'aria-hidden': 'true' }, classe === 'feito' ? '✓' : ''),
        h('span', null, p.t, p.d ? h('small', null, p.d) : null),
      );
    }));

    var titulo = { pago: 'Frete pago, obrigada!', etiqueta: 'Seu pedido está quase saindo', postado: 'Seu pedido está a caminho', entregue: 'Pedido entregue!' }[s] || 'Frete pago, obrigada!';
    var frase = {
      pago: 'Recebemos o pagamento do frete. A loja vai preparar o seu pedido e postar. O código de rastreio aparece aqui, nesta mesma página.',
      etiqueta: 'A etiqueta já foi feita. Assim que a transportadora receber o pacote, o rastreio começa a andar.',
      postado: 'A transportadora já está com o seu pacote. Acompanhe pelo código abaixo.',
      entregue: 'Que bom que chegou! Obrigada por comprar na Delas pra Elas.',
    }[s] || '';

    var blocoRastreio = null;
    if (r && r.codigo) {
      var urlRast = linkSeguro(r.url);
      var botaoCodigo = h('button', {
        type: 'button',
        onclick: function () { copiar(r.codigo).then(function (ok) { aviso(ok ? 'Código copiado!' : 'Não consegui copiar.'); }); },
      }, 'Copiar');
      blocoRastreio = h('div', { class: 'cartao' },
        h('h2', null, 'Código de rastreio'),
        h('div', { class: 'rastreio' }, h('code', null, r.codigo), botaoCodigo),
        urlRast ? h('a', { class: 'botao', href: urlRast, target: '_blank', rel: 'noopener noreferrer' }, 'Acompanhar a entrega') : null,
        nivel < 3 ? h('p', { class: 'pequeno' }, 'O código já existe, mas só mostra movimento depois que o pacote for postado.') : null,
      );
    }

    raiz.appendChild(h('div', null,
      cabecalho(),
      h('div', { class: 'ok', role: 'status' }, titulo),
      h('p', { class: 'texto' }, frase),
      h('div', { class: 'cartao' }, h('h2', null, 'Andamento'), lista),
      blocoRastreio,
      rodape(),
    ));

    if (s !== 'entregue') agendarConferencia(s === 'pago' ? 15000 : 60000);
  }

  /* --------------------------------------------------------- atualização */

  function agendarConferencia(ms) {
    clearTimeout(relogios.poll);
    relogios.poll = setTimeout(function () { relogios.poll = null; conferir(ms); }, ms);
  }

  function conferir(ms) {
    clearTimeout(relogios.poll);
    relogios.poll = null;
    if (document.hidden) { agendarConferencia(ms); return; }
    chamar('GET', '/status').then(function (v) {
      var etapaAntes = estado.etapa;
      aplicarView(v, {});
      // aplicarView redesenha (e reagenda) quando algo mudou; se nada mudou, só reagenda.
      if (estado.etapa === etapaAntes && !relogios.poll) agendarConferencia(ms);
    }).catch(function (err) {
      if (err.codigo === 'link_invalido') return mostrarInvalido(err.message);
      agendarConferencia(Math.min(ms * 2, 120000));
    });
  }

  function mostrarInvalido(msg) {
    parar();
    estado.view = null;
    estado.etapa = 'invalido';
    telaInvalida(msg);
  }

  function recarregar(forcar) {
    return chamar('GET', '').then(function (v) { aplicarView(v, { forcar: !!forcar }); }).catch(function (err) {
      if (err.codigo === 'link_invalido') return mostrarInvalido(err.message);
      raiz.textContent = '';
      raiz.appendChild(h('div', null, cabecalho(),
        h('div', { class: 'cartao' },
          h('h2', null, 'Não deu para abrir'),
          h('p', { class: 'texto' }, err.message),
          h('button', { class: 'botao', type: 'button', onclick: function () { recarregar(true); } }, 'Tentar de novo'),
        ), rodape()));
    });
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && estado.view && (estado.etapa === 'pix' || estado.etapa === 'acompanha')) conferir(estado.etapa === 'pix' ? 5000 : 15000);
  });

  /* --------------------------------------------------------------- início */

  if (!TOKEN) {
    mostrarInvalido('Falta o código no endereço. Abra o link completo que a loja enviou pelo WhatsApp.');
  } else {
    recarregar(true);
  }
})();
`,
  },
};
