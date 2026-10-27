/**
 * Testes de navegador (Chromium de verdade): o app da live e a tela de Fretes, de ponta a ponta.
 *
 * O que é real: o site (HTML, JS e CSS que o Worker entrega), a política de segurança, o servidor (src/) e o navegador.
 * O que é simulado: o banco (SQLite com a interface do D1) e o ViaCEP, a Melhor Envio e o Mercado Pago (simuladores da pasta
 * test/helpers). Não prova nada sobre o Cloudflare nem sobre os serviços verdadeiros.
 *
 * Uso: npm run test:e2e        (gera o site antes; precisa do Playwright com o Chromium)
 */
import fs from 'node:fs';
import path from 'node:path';

import { construirSite } from '../../scripts/construir-site.mjs';
import { iniciarServidorDeTeste } from './servidor.js';
import { iniciarNavegador } from './navegador.js';
import { criarRelator } from './passos.js';
import { testarAppDaLive } from './app-da-live.js';
import { testarFretes } from './fretes.js';

const raiz = path.resolve(import.meta.dirname, '..', '..');
const PASTA_CAPTURAS = path.join(import.meta.dirname, 'capturas');
// E2E_SITE: testar uma pasta de site já pronta, em vez de gerar o site do projeto.
const pastaDoSite = process.env.E2E_SITE || path.join(raiz, 'site');

async function capturar(pagina, nome) {
  await pagina.screenshot({ path: path.join(PASTA_CAPTURAS, `${nome}.png`) });
}

async function principal() {
  if (!process.env.E2E_SITE) await construirSite();
  fs.rmSync(PASTA_CAPTURAS, { recursive: true, force: true });
  fs.mkdirSync(PASTA_CAPTURAS, { recursive: true });

  const navegador = await iniciarNavegador();
  let servidorAtual = null;
  // Quando um passo falha, mostra o que cada página estava mostrando e os últimos pedidos ao servidor (e guarda uma foto da tela).
  const relator = criarRelator({
    async aoFalhar() {
      let n = 0;
      for (const contexto of navegador.contexts()) {
        for (const pagina of contexto.pages()) {
          n += 1;
          const texto = await pagina.innerText('body').catch(() => '(página fechada)');
          console.log(`      página ${n} (${pagina.url()}): ${texto.slice(0, 350).replace(/\s*\n+\s*/g, ' | ')}`);
          await pagina.screenshot({ path: path.join(PASTA_CAPTURAS, `falha-pagina-${n}.png`) }).catch(() => {});
        }
      }
      if (servidorAtual) console.log(`      últimos pedidos ao servidor: ${servidorAtual.pedidos.slice(-10).map((p) => `${p.metodo} ${p.caminho}`).join(' ; ')}`);
    },
  });
  const { passo } = relator;

  /** Cada cenário começa com um servidor e um banco novos, para um não depender do outro. */
  async function cenario(titulo, rodar) {
    console.log(`\n${titulo}`);
    const servidor = await iniciarServidorDeTeste({ pastaDoSite });
    servidorAtual = servidor;
    try {
      await rodar(servidor);
    } finally {
      await servidor.parar();
    }
  }

  try {
    const escolhido = process.env.E2E_SO; // ex.: E2E_SO=fretes roda só os Fretes
    if (!escolhido || escolhido === 'app') await cenario('App da live', (servidor) => testarAppDaLive({ navegador, servidor, passo, capturar }));
    if (!escolhido || escolhido === 'fretes') await cenario('Fretes', (servidor) => testarFretes({ navegador, servidor, passo, capturar }));
  } finally {
    await navegador.close();
  }
  const { total, falhas } = relator.resumo();
  console.log(`\n${total - falhas}/${total} passos passaram.`);
}

principal().then(
  () => process.exit(0),
  (e) => {
    console.error(`\nFalhou: ${(e && e.message) || e}`);
    process.exit(1);
  },
);
