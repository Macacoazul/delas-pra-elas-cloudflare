/**
 * Servidor de teste para o navegador: o MESMO código do Worker (src/servidor.js) atrás de um servidor HTTP local, com o site
 * de verdade (pasta site/), o banco D1 de teste (SQLite) e os simuladores dos serviços de fora (ViaCEP, Melhor Envio, Mercado Pago).
 */
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { criarServidor } from '../../src/servidor.js';
import { lerSite } from '../../scripts/ler-site.mjs';
import { criarEcossistema } from '../helpers/ecossistema.js';

const PASTA_DO_SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'site');

function lerBytes(req) {
  return new Promise((resolver, falhar) => {
    const partes = [];
    req.on('data', (c) => partes.push(c));
    req.on('end', () => resolver(Buffer.concat(partes)));
    req.on('error', falhar);
  });
}

/**
 * @param {{ecossistema?: object, pastaDoSite?: string}} [opcoes]
 * @returns {Promise<{url:string, eco:object, avancar:(ms:number)=>void, parar:()=>Promise<void>, pedidos:{metodo:string,caminho:string}[]}>}
 */
export async function iniciarServidorDeTeste({ ecossistema = {}, pastaDoSite = PASTA_DO_SITE } = {}) {
  const eco = await criarEcossistema(ecossistema);
  let adiantado = 0; // quanto o relógio do servidor está à frente do relógio de verdade
  const servidor = criarServidor({ arquivos: lerSite(pastaDoSite), agora: () => Date.now() + adiantado });
  const pedidos = [];

  const http_ = http.createServer(async (req, res) => {
    try {
      const corpo = await lerBytes(req);
      const cabecalhos = new Headers();
      for (const [nome, valor] of Object.entries(req.headers)) cabecalhos.set(nome, Array.isArray(valor) ? valor.join(', ') : valor);
      cabecalhos.set('cf-connecting-ip', '127.0.0.1'); // no Cloudflare este cabeçalho traz o endereço real de quem pediu
      const semCorpo = req.method === 'GET' || req.method === 'HEAD';
      pedidos.push({ metodo: req.method, caminho: req.url });
      const resposta = await servidor.fetch(new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers: cabecalhos, body: semCorpo ? undefined : corpo }), eco.env);
      const saida = {};
      for (const [nome, valor] of resposta.headers) if (nome !== 'set-cookie') saida[nome] = valor;
      const cookies = resposta.headers.getSetCookie();
      if (cookies.length) saida['set-cookie'] = cookies;
      res.writeHead(resposta.status, saida);
      res.end(Buffer.from(await resposta.arrayBuffer()));
    } catch (e) {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end(String(e && e.stack));
    }
  });
  await new Promise((resolver) => http_.listen(0, '127.0.0.1', resolver));
  const url = `http://127.0.0.1:${http_.address().port}`;

  return {
    url,
    eco,
    pedidos,
    /** Adianta o relógio do servidor (não o do navegador): para ver um Pix vencer, por exemplo. */
    avancar(ms) {
      adiantado += ms;
    },
    async parar() {
      await new Promise((resolver) => http_.close(resolver));
      http_.closeAllConnections?.();
      await eco.parar();
    },
  };
}
