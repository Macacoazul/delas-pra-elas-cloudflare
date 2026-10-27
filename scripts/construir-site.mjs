/**
 * Gera os arquivos JavaScript do site a partir do código-fonte das telas (que usa JSX):
 *
 *   app/biblioteca.js          ->  site/biblioteca.js   a biblioteca de telas (Preact), minificada como a oficial
 *   app/app.jsx                ->  site/app.js          o app da live
 *   app/fretes/fretes.jsx      ->  site/fretes.js       a tela de Fretes (só a dona)
 *
 * O que sai daqui é JavaScript comum, legível (sem minificar), sem nenhuma dependência de fora: o navegador só precisa
 * de biblioteca.js + o arquivo da tela. Rode com `npm run site`.
 */
import { build } from 'esbuild';
import { format } from 'prettier';
import { escreverInvisiveis } from './caracteres.mjs';
import { PROIBIDOS } from './proibidos.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raizDoProjeto = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Palavras que NÃO podem aparecer no que o navegador recebe (a lista de sempre fica em proibidos.mjs). */
const PROIBIDO = [
  ...PROIBIDOS,
  [/\beval\s*\(|new\s+Function\s*\(/, 'eval/new Function (a política de segurança do site não permite)'],
];

const CABECALHO = (nome, resumo) => `/* ${nome} — ${resumo}\n   ARQUIVO GERADO por "npm run site" a partir da pasta app/. Não edite aqui: o código-fonte comentado fica lá. */`;

/** Arruma a aparência do JavaScript gerado (linhas curtas e indentadas). Só espaços e quebras de linha mudam, nunca o que o código faz. */
const FORMATO = { parser: 'babel', printWidth: 120, tabWidth: 2, semi: true, singleQuote: false, trailingComma: 'all', endOfLine: 'lf' };

const OPCOES_COMUNS = {
  bundle: true,
  format: 'iife',
  target: ['es2020', 'safari14'],
  charset: 'utf8', // mantém acentos e emojis como estão, em vez de \uXXXX
  legalComments: 'none',
  logLevel: 'warning',
  write: false,
};

/**
 * @param {{raiz?:string, saida?:string}} [opcoes]
 * @returns {Promise<Record<string,string>>} nome do arquivo -> conteúdo (já gravados em `saida`)
 */
export async function construirSite({ raiz = raizDoProjeto, saida = path.join(raiz, 'site') } = {}) {
  const aqui = (...p) => path.join(raiz, ...p);
  const telas = [
    ['app', 'app/app.jsx', 'app.js', 'o app da live'],
    ['fretes', 'app/fretes/fretes.jsx', 'fretes.js', 'a tela de Fretes'],
  ].filter(([, entrada]) => fs.existsSync(aqui(entrada)));

  const trabalhos = [
    {
      arquivo: 'biblioteca.js',
      banner: CABECALHO('biblioteca.js', 'Preact 10 (MIT, https://preactjs.com): a biblioteca que desenha as telas. Versão minificada, igual à oficial.'),
      opcoes: { entryPoints: [aqui('app/biblioteca.js')], minify: true },
      formatar: false, // código de terceiros: fica como a biblioteca é distribuída
    },
    ...telas.map(([, entrada, arquivo, resumo]) => ({
      arquivo,
      banner: CABECALHO(arquivo, resumo),
      opcoes: {
        entryPoints: [aqui(entrada)],
        minify: false,
        jsx: 'transform',
        jsxFactory: 'h', // <div/> vira h("div"): linhas bem mais curtas que React.createElement(...)
        jsxFragment: 'Fragment',
        jsxSideEffects: true, // sem o comentário /* @__PURE__ */ antes de cada elemento
        inject: [aqui('app/react-global.js')],
        alias: { react: aqui('app/react-global.js'), 'react-dom/client': aqui('app/react-dom-global.js') },
      },
    })),
  ];

  fs.mkdirSync(saida, { recursive: true });
  const gerados = {};
  for (const { arquivo, banner, opcoes, formatar = true } of trabalhos) {
    const r = await build({ ...OPCOES_COMUNS, ...opcoes });
    const codigo = escreverInvisiveis(formatar ? await format(r.outputFiles[0].text, FORMATO) : r.outputFiles[0].text);
    const texto = `${banner}\n${codigo}`;
    for (const [padrao, motivo] of PROIBIDO) {
      if (padrao.test(texto)) throw new Error(`${arquivo} ficou com ${motivo}.`);
    }
    fs.writeFileSync(path.join(saida, arquivo), texto);
    gerados[arquivo] = texto;
  }
  return gerados;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const gerados = await construirSite();
  for (const [arquivo, texto] of Object.entries(gerados)) {
    console.log(`site/${arquivo}: ${texto.split('\n').length.toLocaleString('pt-BR')} linhas, ${(Buffer.byteLength(texto) / 1024).toFixed(1)} KB`);
  }
}
