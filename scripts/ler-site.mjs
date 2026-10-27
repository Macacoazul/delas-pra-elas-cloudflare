/**
 * Lê a pasta site/ e devolve os arquivos no formato que o servidor entrega (veja src/site.js):
 *   { '/index.html': { tipo: 'text/html; charset=utf-8', etag: 'a1b2c3…', corpo: '<!DOCTYPE html>…' }, … }
 * O `etag` é calculado aqui, na geração, para o servidor não precisar calcular nada ao responder.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

export function lerSite(pasta) {
  const arquivos = {};
  const nomes = fs.readdirSync(pasta, { withFileTypes: true }).filter((d) => d.isFile() && !d.name.startsWith('.'));
  for (const d of nomes.sort((a, b) => a.name.localeCompare(b.name))) {
    const tipo = TIPOS[path.extname(d.name).toLowerCase()];
    if (!tipo) throw new Error(`Tipo de arquivo desconhecido no site: ${d.name} (só .html, .js e .css)`);
    const corpo = fs.readFileSync(path.join(pasta, d.name), 'utf8').replace(/\r\n/g, '\n');
    arquivos[`/${d.name}`] = { tipo, etag: crypto.createHash('sha256').update(corpo).digest('hex').slice(0, 16), corpo };
  }
  return arquivos;
}
