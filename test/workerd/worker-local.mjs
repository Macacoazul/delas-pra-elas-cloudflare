/**
 * Liga o Worker de verdade — os arquivos de para-colar/, exatamente os que vão para o painel do Cloudflare — no motor do
 * Cloudflare (workerd), pelo `wrangler dev`, com um banco D1 de brinquedo que o próprio wrangler cria na máquina.
 *
 * Os arquivos são copiados para uma pasta nova e vazia (sem node_modules, sem src/, sem package.json), como no editor do
 * painel, e os segredos vão num arquivo .dev.vars dessa pasta. Nada aqui fala com a internet.
 */
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const raiz = path.join(import.meta.dirname, '..', '..');

function portaLivre() {
  return new Promise((ok) => {
    const s = http.createServer();
    s.listen(0, '127.0.0.1', () => {
      const p = s.address().port;
      s.close(() => ok(p));
    });
  });
}

/**
 * @param {{segredo:string, senhaDeInstalacao:string, enderecos?:object}} opcoes
 *   `enderecos`: onde ficam os simuladores do ViaCEP, Melhor Envio e Mercado Pago (veja ENDERECOS_DE_TESTE em config.js).
 * @returns {Promise<{base:string, pasta:string, saida:()=>string, parar:()=>Promise<void>}>}
 */
export async function iniciarWorkerLocal({ segredo, senhaDeInstalacao, enderecos = {} }) {
  const kit = path.join(raiz, 'para-colar');
  if (!fs.existsSync(path.join(kit, 'worker.js'))) throw new Error('rode "npm run colar" antes');
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'workerd-'));
  for (const nome of fs.readdirSync(kit)) fs.copyFileSync(path.join(kit, nome), path.join(pasta, nome));

  const toml = fs.readFileSync(path.join(raiz, 'wrangler.toml'), 'utf8');
  if (!/^main = "para-colar\/worker\.js"$/m.test(toml)) throw new Error('wrangler.toml: o "main" mudou, ajuste o teste');
  fs.writeFileSync(path.join(pasta, 'wrangler.toml'), toml.replace(/^main = .*$/m, 'main = "worker.js"'));

  const vars = { SEGREDO: segredo, ADMIN_SENHA: senhaDeInstalacao, ENDERECOS_DE_TESTE: JSON.stringify(enderecos) };
  // Aspas simples: o valor vai literal.
  fs.writeFileSync(path.join(pasta, '.dev.vars'), `${Object.entries(vars).map(([k, v]) => `${k}='${v}'`).join('\n')}\n`);

  const porta = await portaLivre();
  const base = `http://127.0.0.1:${porta}`;
  let saida = '';
  const wrangler = spawn(path.join(raiz, 'node_modules', '.bin', process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler'), ['dev', '--port', String(porta), '--ip', '127.0.0.1', '--test-scheduled', '--log-level', 'log'], {
    cwd: pasta,
    env: { ...process.env, CI: '1', NO_COLOR: '1', WRANGLER_SEND_METRICS: 'false' },
  });

  const parar = async () => {
    const saiu = new Promise((ok) => wrangler.once('exit', ok));
    wrangler.kill('SIGTERM');
    await Promise.race([saiu, new Promise((ok) => setTimeout(ok, 3000))]);
    fs.rmSync(pasta, { recursive: true, force: true });
  };

  try {
    await new Promise((ok, falha) => {
      const t = setTimeout(() => falha(new Error(`wrangler não ficou pronto em 120 s.\n${saida.slice(-1500)}`)), 120000);
      const ouvir = (d) => {
        saida += d.toString();
        if (/Ready on/i.test(saida)) {
          clearTimeout(t);
          ok();
        }
      };
      wrangler.stdout.on('data', ouvir);
      wrangler.stderr.on('data', ouvir);
      wrangler.on('exit', (c) => {
        clearTimeout(t);
        falha(new Error(`wrangler terminou (${c}).\n${saida.slice(-1500)}`));
      });
    });
  } catch (e) {
    await parar();
    throw e;
  }
  return { base, pasta, saida: () => saida, parar };
}
