/**
 * Ajudas para os testes no navegador (Chromium de verdade, controlado pelo Playwright).
 *
 * Cada página aberta aqui vigia três coisas que não podem acontecer: erro de JavaScript, aviso de segurança (CSP) e
 * pedido que falhou sem querer. Os testes conferem `problemas.lista()` no fim; o que é esperado (por exemplo, o pedido que
 * falha de propósito quando a internet é cortada) é liberado antes com `problemas.permitir(...)`.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const requerer = createRequire(import.meta.url);

export function carregarPlaywright() {
  for (const alvo of ['playwright', '/opt/npm-tools/node_modules/playwright']) {
    try {
      return requerer(alvo);
    } catch {
      /* tenta o próximo */
    }
  }
  throw new Error('Playwright não encontrado. Instale com: npm install --no-save playwright && npx playwright install chromium');
}

function acharChromium() {
  const candidatos = [process.env.CHROMIUM_PATH, '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].filter(Boolean);
  return candidatos.find((c) => fs.existsSync(c));
}

export async function iniciarNavegador() {
  const { chromium } = carregarPlaywright();
  const executablePath = acharChromium();
  return chromium.launch(executablePath ? { executablePath } : {});
}

/**
 * Abre uma página nova (num "perfil" novo: sem cookies nem dados guardados).
 * @param {import('playwright').Browser} navegador
 * @param {{ celular?: boolean }} [opcoes]
 */
export async function abrirPagina(navegador, { celular = true } = {}) {
  const contexto = await navegador.newContext({
    viewport: celular ? { width: 390, height: 844 } : { width: 1100, height: 800 },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    acceptDownloads: true,
    serviceWorkers: 'block',
  });
  // As fontes do Google não são o assunto do teste (e podem não ser alcançáveis): respondem vazio, e a política de segurança continua valendo.
  await contexto.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (rota) => rota.fulfill({ status: 200, contentType: 'text/css', body: '' }));

  const pagina = await contexto.newPage();
  pagina.setDefaultTimeout(10_000);
  await pagina.addInitScript(() => {
    window.__violacoes = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__violacoes.push(`${e.violatedDirective}: ${e.blockedURI || ''} ${e.sample || ''}`.trim()));
  });

  const achados = [];
  const liberados = [];
  const registrar = (texto) => {
    if (!liberados.some((re) => re.test(texto))) achados.push(texto);
  };
  pagina.on('pageerror', (e) => registrar(`erro de JavaScript: ${e.message}`));
  pagina.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') registrar(`console.${m.type()}: ${m.text()}`);
  });
  pagina.on('requestfailed', (r) => registrar(`pedido falhou: ${r.method()} ${r.url()} (${r.failure() && r.failure().errorText})`));

  const problemas = {
    /** Libera problemas esperados (o texto casa com a expressão). */
    permitir: (re) => liberados.push(re),
    limpar: () => (achados.length = 0),
    /** Problemas vistos até agora, mais as violações de segurança que o navegador registrou na página. */
    async lista() {
      const csp = await pagina.evaluate(() => window.__violacoes || []).catch(() => []);
      return [...achados, ...csp.map((v) => `violação da política de segurança: ${v}`)];
    },
  };
  return { contexto, pagina, problemas };
}
