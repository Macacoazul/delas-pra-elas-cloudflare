/** Um site pequeno só para os testes do servidor (o site de verdade é testado em site.test.js). */
import { ARQUIVOS_OBRIGATORIOS } from '../../src/site.js';

const HTML = 'text/html; charset=utf-8';
const JS = 'text/javascript; charset=utf-8';

export function arquivosDeTeste() {
  return {
    '/index.html': { tipo: HTML, corpo: '<!doctype html><html lang="pt-BR"><head><title>App</title></head><body><div id="raiz"></div><script src="/biblioteca.js"></script><script src="/app.js"></script></body></html>' },
    '/app.js': { tipo: JS, corpo: 'console.log("app");\n' },
    '/biblioteca.js': { tipo: JS, corpo: 'console.log("biblioteca");\n' },
    '/fretes.html': { tipo: HTML, corpo: '<!doctype html><html><head><title>Fretes</title></head><body><script src="/fretes.js"></script></body></html>' },
    '/fretes.js': { tipo: JS, corpo: 'console.log("fretes");\n' },
    '/frete.html': { tipo: HTML, corpo: '<!doctype html><html><head><title>Frete</title></head><body><script src="/frete.js"></script></body></html>' },
    '/frete.js': { tipo: JS, corpo: 'console.log("frete");\n' },
    '/frete.css': { tipo: 'text/css; charset=utf-8', corpo: 'body{margin:0}\n' },
    '/estilo.css': { tipo: 'text/css; charset=utf-8', corpo: 'body{margin:0}\n' },
    '/404.html': { tipo: HTML, corpo: '<!doctype html><html><head><title>Não encontrado</title></head><body>Não encontrado</body></html>' },
  };
}

export const CAMINHOS_DO_SITE_DE_TESTE = ARQUIVOS_OBRIGATORIOS;
