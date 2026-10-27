/**
 * Monta a pasta para-colar/: os arquivos que você cola, um a um, no editor do Cloudflare.
 *
 *   npm install        (uma vez)
 *   npm run colar      gera a pasta para-colar/
 *
 * Tudo que sai daqui é JavaScript comum e legível — nada comprimido, nada em base64:
 *
 *   worker.js          o arquivo principal (poucas linhas): liga o servidor às páginas do site
 *   base.js            peças básicas (textos, dinheiro, criptografia, configuração, banco D1, entrega do site)
 *   negocio.js         o que a loja faz (login da equipe, app da live, Melhor Envio, Pix do Mercado Pago, fretes)
 *   servidor.js        as rotas da API e o servidor em si
 *   site-*.js          as páginas do site (HTML, CSS e o JavaScript do app) guardadas como texto
 *
 * Como os arquivos de código são feitos: cada arquivo de src/ vira um bloco, SEM mudar uma linha do código dele
 * (só o "import/export" é trocado por ligações entre os blocos). Os comentários ficam. Um teste confere que cada bloco
 * oferece as mesmas funções, com o mesmo código, que o arquivo original de src/.
 *
 * Como o site é guardado: o texto de cada página entra entre crases (`...`), com três cuidados — a barra invertida, a
 * crase e ${ ganham uma barra antes. Na hora de usar, o texto sai idêntico ao arquivo da pasta site/ (o teste confere
 * letra por letra e o Worker confere o código de verificação de cada página em /api/saude).
 */
import * as acorn from 'acorn';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

import { INVISIVEIS, comoEscape } from './caracteres.mjs';
import { construirSite } from './construir-site.mjs';
import { PROIBIDOS } from './proibidos.mjs';
import { lerSite } from './ler-site.mjs';

const raizDoProjeto = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ── o que entra em cada arquivo ───────────────────────────────────────────────────────────────────────────────────── */

/**
 * Os arquivos de src/ agrupados em poucos arquivos. Regra: um módulo só pode usar módulos do mesmo arquivo ou de um
 * arquivo mais acima nesta lista (nunca para baixo) — o gerador confere.
 */
export const CAMADAS = [
  {
    arquivo: 'base.js',
    resumo: 'Peças básicas: textos e dinheiro, criptografia, configuração, chamadas a serviços de fora, banco D1 e entrega do site.',
    modulos: ['util', 'cripto', 'config', 'http', 'dados', 'banco-d1', 'site'],
  },
  {
    arquivo: 'servicos.js',
    resumo: 'A conversa com os serviços de fora (CEP, Melhor Envio, Mercado Pago) e o cofre das chaves de acesso deles.',
    modulos: ['viacep', 'melhor-envio', 'mercado-pago', 'credenciais'],
  },
  {
    arquivo: 'negocio.js',
    resumo: 'O que a loja faz: os fretes (cotação, Pix, etiqueta, rastreio), o login da equipe e a sincronia do app da live.',
    modulos: ['fretes', 'acesso', 'app-api'],
  },
  {
    arquivo: 'servidor.js',
    resumo: 'As rotas da API e o servidor em si (os pedidos e a rotina agendada).',
    modulos: ['acoes', 'rotas-admin', 'rotas-app', 'rotas-conta', 'rotas-publicas', 'rotas', 'servidor'],
  },
];

/** As páginas do site, agrupadas em arquivos site-*.js. Um arquivo grande sozinho no grupo é dividido em partes. */
export const GRUPOS_DO_SITE = [
  {
    nome: 'paginas',
    resumo: 'as páginas e o estilo do site, e o código da página que a cliente abre para escolher o frete (frete.html e frete.js)',
    arquivos: ['/index.html', '/estilo.css', '/404.html', '/fretes.html', '/frete.html', '/frete.css', '/frete.js'],
  },
  { nome: 'biblioteca', resumo: 'a biblioteca que desenha as telas (Preact 10, licença MIT; código de terceiros, minificado como é distribuído)', arquivos: ['/biblioteca.js'] },
  { nome: 'live', resumo: 'o código do app da live', arquivos: ['/app.js'] },
  { nome: 'fretes', resumo: 'o código da tela de Fretes', arquivos: ['/fretes.js'] },
];

/** Cada parte de um arquivo grande do site passa disto (em bytes do texto já pronto e em linhas), para colar sem o editor engasgar. */
export const PARTE_MAXIMA = 110_000;
export const PARTE_MAXIMA_EM_LINHAS = 1_600;
/** Teto de qualquer arquivo gerado. Se estourar, o gerador para em vez de entregar algo difícil de colar. */
export const LIMITE_DO_ARQUIVO = 150_000;
export const LIMITE_DE_LINHAS = 1_800;
/** Nenhuma linha de código passa disto. A única exceção é site-biblioteca.js: a Preact é distribuída já minificada. */
export const LINHA_MAXIMA = 1000;
const ARQUIVO_DE_TERCEIROS = 'site-biblioteca.js';

/* ── nomes ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** "melhor-envio" -> "melhor_envio_js": o nome do bloco no arquivo gerado (o mesmo nome do arquivo de src/, para ser fácil de achar). */
const nomeDoBloco = (modulo) => `${modulo.replace(/-/g, '_')}_js`;

const camelCase = (arquivo) => arquivo.replace(/\.js$/, '').replace(/-(\w)/g, (_, c) => c.toUpperCase());

/** Quebra um texto em linhas de comentário (" * ...") com no máximo `largura` caracteres. */
function comoComentario(texto, largura = 112) {
  const linhas = [];
  let atual = '';
  for (const palavra of texto.split(/\s+/)) {
    if (atual && atual.length + 1 + palavra.length > largura) {
      linhas.push(atual);
      atual = palavra;
    } else atual = atual ? `${atual} ${palavra}` : palavra;
  }
  if (atual) linhas.push(atual);
  return linhas.map((l) => ` * ${l}`).join('\n');
}

const AVISO_DE_GERADO = (arquivo) =>
  ` * Arquivo gerado por "npm run colar" (o texto de verdade fica nas pastas src/, app/ e site/ do projeto).\n * Cole o arquivo INTEIRO, num arquivo com o nome ${arquivo} no editor do Cloudflare. Não precisa mudar nada nele.`;
const MARCA_DE_GERADO = 'Arquivo gerado por "npm run colar"';

/* ── leitura de um arquivo de src/ ─────────────────────────────────────────────────────────────────────────────────── */

function percorrer(no, aoVisitar) {
  aoVisitar(no);
  for (const valor of Object.values(no)) {
    if (Array.isArray(valor)) valor.forEach((x) => x && typeof x.type === 'string' && percorrer(x, aoVisitar));
    else if (valor && typeof valor.type === 'string') percorrer(valor, aoVisitar);
  }
}

function nomesDoPadrao(p, saida) {
  if (!p) return;
  if (p.type === 'Identifier') saida.add(p.name);
  else if (p.type === 'ObjectPattern') p.properties.forEach((q) => nomesDoPadrao(q.type === 'RestElement' ? q.argument : q.value, saida));
  else if (p.type === 'ArrayPattern') p.elements.forEach((q) => nomesDoPadrao(q, saida));
  else if (p.type === 'AssignmentPattern') nomesDoPadrao(p.left, saida);
  else if (p.type === 'RestElement') nomesDoPadrao(p.argument, saida);
}

/** Todo nome que o código declara em qualquer lugar (variáveis, funções, parâmetros...). Os imports ficam de fora. */
function nomesDeclarados(ast) {
  const nomes = new Set();
  percorrer(ast, (no) => {
    if (no.type === 'VariableDeclarator') nomesDoPadrao(no.id, nomes);
    if (/^(Function|Class)(Declaration|Expression)$/.test(no.type) && no.id) nomes.add(no.id.name);
    if (/^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(no.type)) no.params.forEach((p) => nomesDoPadrao(p, nomes));
    if (no.type === 'CatchClause') nomesDoPadrao(no.param, nomes);
  });
  return nomes;
}

/**
 * Lê um arquivo de src/ e descobre o que ele importa e exporta. Aceita só as formas que o projeto usa e recusa o resto
 * com uma mensagem clara (melhor parar aqui do que gerar um arquivo que se comporta diferente do original).
 */
function lerModulo(nome, texto) {
  const onde = `src/${nome}.js`;
  if (texto.includes('\r')) throw new Error(`${onde}: o arquivo tem quebras de linha do Windows (CRLF); use só LF.`);
  const ast = acorn.parse(texto, { ecmaVersion: 'latest', sourceType: 'module' });
  const importacoes = []; // { no, modulo, namespace?: 'U', nomeados?: [[importado, local]] }
  const exportados = []; // [nomeDeFora, nomeDeDentro]
  const edicoes = []; // { de, ate, texto }
  const removerAteFimDaLinha = (no) => ({ de: no.start, ate: texto[no.end] === '\n' ? no.end + 1 : no.end, texto: '' });

  for (const no of ast.body) {
    if (no.type === 'ImportDeclaration') {
      const m = /^\.\/([a-z0-9-]+)\.js$/.exec(String(no.source.value));
      if (!m) throw new Error(`${onde}: só se pode importar outro arquivo de src/ ("./nome.js"), mas achei "${no.source.value}".`);
      const usados = no.specifiers;
      if (!usados.length) throw new Error(`${onde}: import sem nomes (import './${m[1]}.js') não é suportado.`);
      if (usados.some((s) => s.type === 'ImportDefaultSpecifier')) throw new Error(`${onde}: import default de "${m[1]}" não é suportado.`);
      const imp = { no, modulo: m[1] };
      const ns = usados.find((s) => s.type === 'ImportNamespaceSpecifier');
      if (ns) imp.namespace = ns.local.name;
      else imp.nomeados = usados.map((s) => [s.imported.name, s.local.name]);
      importacoes.push(imp);
    } else if (no.type === 'ExportNamedDeclaration') {
      if (no.source) throw new Error(`${onde}: "export ... from" não é suportado.`);
      if (no.declaration) {
        const d = no.declaration;
        edicoes.push({ de: no.start, ate: d.start, texto: '' });
        if (d.type === 'FunctionDeclaration' || d.type === 'ClassDeclaration') exportados.push([d.id.name, d.id.name]);
        else if (d.type === 'VariableDeclaration') {
          if (d.kind !== 'const') throw new Error(`${onde}: só se exporta "const" (um "${d.kind}" exportado poderia mudar depois).`);
          for (const dec of d.declarations) {
            if (dec.id.type !== 'Identifier') throw new Error(`${onde}: export com desestruturação não é suportado.`);
            exportados.push([dec.id.name, dec.id.name]);
          }
        } else throw new Error(`${onde}: tipo de export não suportado (${d.type}).`);
      } else {
        edicoes.push(removerAteFimDaLinha(no));
        for (const s of no.specifiers) exportados.push([s.exported.name ?? s.exported.value, s.local.name]);
      }
    } else if (no.type === 'ExportDefaultDeclaration' || no.type === 'ExportAllDeclaration') {
      throw new Error(`${onde}: "export default" e "export *" não são suportados.`);
    }
  }
  percorrer(ast, (no) => {
    if (no.type === 'MetaProperty') throw new Error(`${onde}: import.meta não é suportado.`);
  });
  const repetido = exportados.map((e) => e[0]).find((n, i, todos) => todos.indexOf(n) !== i);
  if (repetido) throw new Error(`${onde}: "${repetido}" é exportado duas vezes.`);
  return { nome, texto, ast, importacoes, exportados, edicoes, declarados: nomesDeclarados(ast) };
}

/* ── montagem de um arquivo de código (uma "camada") ───────────────────────────────────────────────────────────────── */

const FAIXA = '─'.repeat(100);

function aplicarEdicoes(texto, edicoes) {
  let saida = texto;
  for (const e of [...edicoes].sort((a, b) => b.de - a.de)) saida = saida.slice(0, e.de) + e.texto + saida.slice(e.ate);
  return saida;
}

/** Texto de um módulo de src/ já embrulhado como bloco do arquivo gerado. */
function blocoDoModulo(m, todos) {
  const edicoes = [...m.edicoes];
  for (const imp of m.importacoes) {
    const alvo = todos.get(imp.modulo);
    if (!alvo) throw new Error(`src/${m.nome}.js importa "./${imp.modulo}.js", que não está em nenhum arquivo da lista CAMADAS.`);
    const bloco = nomeDoBloco(imp.modulo);
    let novo;
    if (imp.namespace) {
      novo = `const ${imp.namespace} = ${bloco};`;
    } else {
      const lista = imp.nomeados.map(([de, para]) => (de === para ? de : `${de}: ${para}`)).join(', ');
      novo = `const { ${lista} } = ${bloco};`;
    }
    edicoes.push({ de: imp.no.start, ate: imp.no.end, texto: novo });
  }
  const corpo = aplicarEdicoes(m.texto, edicoes).replace(/\s+$/, '\n');
  const retorno = m.exportados.map(([fora, dentro]) => (fora === dentro ? fora : `${fora}: ${dentro}`));
  const lista = retorno.length ? `{ ${retorno.join(', ')} }` : '{}';
  const bloco = nomeDoBloco(m.nome);
  return (
    `/* ${FAIXA}\n` +
    ` * ${bloco}  —  o arquivo src/${m.nome}.js (o código abaixo é o do arquivo, sem alteração)\n` +
    ` * ${FAIXA} */\n` +
    `export const ${bloco} = (() => {\n${corpo}\nreturn ${lista};\n})();\n`
  );
}

/** Ordena os módulos de uma camada de modo que cada um venha depois dos que ele usa. */
function ordenar(camada, lidos) {
  const doGrupo = new Set(camada.modulos);
  const ordem = [];
  const estado = new Map(); // nome -> 'visitando' | 'pronto'
  const visitar = (nome, caminho) => {
    if (estado.get(nome) === 'pronto') return;
    if (estado.get(nome) === 'visitando') throw new Error(`Importação em círculo: ${[...caminho, nome].join(' -> ')}`);
    estado.set(nome, 'visitando');
    for (const imp of lidos.get(nome).importacoes) if (doGrupo.has(imp.modulo)) visitar(imp.modulo, [...caminho, nome]);
    estado.set(nome, 'pronto');
    ordem.push(nome);
  };
  camada.modulos.forEach((n) => visitar(n, []));
  return ordem;
}

function montarCamada(camada, indice, lidos, camadaDe, todos) {
  const ordem = ordenar(camada, lidos);
  const nomesDosBlocos = new Set([...todos.keys()].map(nomeDoBloco));

  // Do que este arquivo precisa dos arquivos de cima.
  const deFora = new Map(); // arquivo -> Set(blocos)
  for (const nome of ordem) {
    const m = lidos.get(nome);
    for (const imp of m.importacoes) {
      const j = camadaDe.get(imp.modulo);
      if (j === undefined) throw new Error(`src/${nome}.js importa "./${imp.modulo}.js", que não está em nenhum arquivo da lista CAMADAS.`);
      if (j > indice) throw new Error(`src/${nome}.js (${camada.arquivo}) usa "${imp.modulo}", que fica num arquivo mais abaixo (${CAMADAS[j].arquivo}): reorganize CAMADAS.`);
      if (j < indice) {
        const arq = CAMADAS[j].arquivo;
        if (!deFora.has(arq)) deFora.set(arq, new Set());
        deFora.get(arq).add(nomeDoBloco(imp.modulo));
      }
    }
    // Nada dentro do módulo pode ter o nome de um bloco (senão esconderia o bloco).
    for (const n of m.declarados) {
      if (nomesDosBlocos.has(n)) throw new Error(`src/${nome}.js declara "${n}", que é também o nome de um bloco do arquivo gerado; renomeie no código.`);
    }
  }

  const importacoes = [...deFora.entries()]
    .map(([arq, blocos]) => `import { ${[...blocos].sort().join(', ')} } from './${arq}';`)
    .join('\n');
  const cabecalho =
    `/**\n * Delas pra Elas — ${camada.arquivo}\n${comoComentario(camada.resumo)}\n *\n${AVISO_DE_GERADO(camada.arquivo)}\n *\n` +
    ` * Dentro, nesta ordem: ${ordem.map((n) => `${n}.js`).join(', ')}.\n` +
    ` * Cada bloco é um arquivo de src/ (o mesmo código, com os comentários); o que um arquivo exporta, o bloco entrega\n` +
    ` * no "return" do fim; o que um arquivo importa, o bloco pega do bloco de origem no começo.\n */\n`;
  const blocos = ordem.map((n) => blocoDoModulo(lidos.get(n), todos));
  return { texto: cabecalho + (importacoes ? `${importacoes}\n` : '') + '\n' + blocos.join('\n'), ordem };
}

/* ── o site guardado como texto ────────────────────────────────────────────────────────────────────────────────────── */

/** Coloca um texto entre crases com segurança: `\`, crase e `${` ganham uma barra antes. */
export const paraTemplate = (texto) => texto.replace(/[\\`]|\$\{/g, (m) => `\\${m}`);

function conferirTextoDoSite(caminho, corpo) {
  if (typeof corpo !== 'string' || !corpo.isWellFormed()) throw new Error(`site${caminho}: o texto tem caracteres inválidos (UTF-8 quebrado).`);
  if (corpo.includes('\r')) throw new Error(`site${caminho}: sobrou "\\r" no texto.`);
  const ruim = new RegExp(INVISIVEIS.source).exec(corpo);
  if (ruim) {
    const linha = corpo.slice(0, ruim.index).split('\n').length;
    throw new Error(`site${caminho}, linha ${linha}: caractere invisível ou de controle (${comoEscape(ruim[0])}); escreva-o como \\uXXXX no código-fonte.`);
  }
}

/** Corta em partes de linhas inteiras, com tamanhos parecidos, cada uma dentro do limite (medido já com as barras do template). */
export function dividirEmPartes(corpo, maximo = PARTE_MAXIMA, maximoDeLinhas = PARTE_MAXIMA_EM_LINHAS) {
  const tamanho = (t) => Buffer.byteLength(paraTemplate(t));
  const linhas = corpo.split(/(?<=\n)/);
  const quantas = Math.max(Math.ceil(tamanho(corpo) / maximo), Math.ceil(linhas.length / maximoDeLinhas));
  if (quantas <= 1) return [corpo];
  const porParte = Math.ceil(linhas.length / quantas); // partes com quase o mesmo número de linhas
  const partes = Array.from({ length: quantas }, (_, i) => linhas.slice(i * porParte, (i + 1) * porParte).join('')).filter(Boolean);
  if (partes.join('') !== corpo) throw new Error('dividirEmPartes: as partes não formam o texto original.');
  if (partes.some((p) => tamanho(p) > maximo)) throw new Error(`dividirEmPartes: uma parte passou de ${maximo} bytes; divida em mais partes.`);
  return partes;
}

function textoDoModuloDeSite(arquivo, resumo, entradas) {
  const itens = entradas.map(({ caminho, tipo, etag, corpo, parte, de }) => {
    const meta = [`    tipo: ${JSON.stringify(tipo)},`, `    etag: ${JSON.stringify(etag)},`];
    if (de) meta.push(`    parte: ${parte},`, `    de: ${de},`);
    return `  ${JSON.stringify(caminho)}: {\n${meta.join('\n')}\n    corpo: \`${paraTemplate(corpo)}\`,\n  },`;
  });
  return (
    `/**\n * Delas pra Elas — ${arquivo}\n${comoComentario(`Parte do site, guardada como texto: ${resumo}.`)}\n *\n${AVISO_DE_GERADO(arquivo)}\n *\n` +
    ` * O texto de cada página fica entre crases. As barras invertidas que aparecem antes de crases e de \${ são só o jeito\n` +
    ` * de escrever esse texto aqui dentro: o Worker entrega a página sem elas, igual ao arquivo da pasta site/.\n` +
    ` * "etag" é o código de verificação da página inteira (/api/saude confere se o texto colado bate com ele).\n */\n` +
    `export default {\n${itens.join('\n')}\n};\n`
  );
}

function montarSite(site) {
  const planejados = GRUPOS_DO_SITE.flatMap((g) => g.arquivos);
  const faltam = planejados.filter((c) => !site[c]);
  const sobram = Object.keys(site).filter((c) => !planejados.includes(c));
  if (faltam.length) throw new Error(`Faltam na pasta site/: ${faltam.join(', ')}.`);
  if (sobram.length) throw new Error(`Há arquivos em site/ que não estão em GRUPOS_DO_SITE (scripts/colar.mjs): ${sobram.join(', ')}.`);
  if (new Set(planejados).size !== planejados.length) throw new Error('Um arquivo do site aparece em dois grupos de GRUPOS_DO_SITE.');

  const modulos = []; // { arquivo, texto }
  for (const g of GRUPOS_DO_SITE) {
    for (const c of g.arquivos) conferirTextoDoSite(c, site[c].corpo);
    if (g.arquivos.length === 1) {
      const [caminho] = g.arquivos;
      const a = site[caminho];
      const partes = dividirEmPartes(a.corpo);
      partes.forEach((corpo, i) => {
        const arquivo = partes.length === 1 ? `site-${g.nome}.js` : `site-${g.nome}-${i + 1}.js`;
        const entrada = { caminho, tipo: a.tipo, etag: a.etag, corpo, ...(partes.length > 1 ? { parte: i + 1, de: partes.length } : {}) };
        const resumo = partes.length > 1 ? `${g.resumo} — parte ${i + 1} de ${partes.length} do arquivo ${caminho}` : `${g.resumo} — arquivo ${caminho}`;
        modulos.push({ arquivo, texto: textoDoModuloDeSite(arquivo, resumo, [entrada]) });
      });
    } else {
      const arquivo = `site-${g.nome}.js`;
      const entradas = g.arquivos.map((caminho) => ({ caminho, ...site[caminho] }));
      modulos.push({ arquivo, texto: textoDoModuloDeSite(arquivo, `${g.resumo} — arquivos ${g.arquivos.join(', ')}`, entradas) });
    }
  }
  return modulos;
}

function textoDoWorker(modulosDoSite) {
  const nomes = modulosDoSite.map((m) => camelCase(m.arquivo));
  const importacoes = modulosDoSite.map((m, i) => `import ${nomes[i]} from './${m.arquivo}';`).join('\n');
  return (
    `/**\n * Delas pra Elas — worker.js\n * O arquivo principal do Worker: liga o servidor (servidor.js) às páginas do site (site-*.js).\n *\n${AVISO_DE_GERADO('worker.js')}\n *\n` +
    ` * Para o Cloudflare funcionar o Worker precisa de: o banco D1 ligado com o nome DB e os segredos SEGREDO e ADMIN_SENHA\n` +
    ` * (veja docs/PASSO-A-PASSO.md). Nada disso é escrito em arquivo nenhum.\n */\n` +
    `import { servidor_js } from './servidor.js';\nimport { site_js } from './base.js';\n${importacoes}\n\n` +
    `export default servidor_js.criarServidor({ arquivos: site_js.juntarSite([${nomes.join(', ')}]) });\n`
  );
}

/* ── conferências sobre o que foi gerado ───────────────────────────────────────────────────────────────────────────── */

const PADROES_PROIBIDOS = [
  ...PROIBIDOS,
  [/[A-Za-z0-9+/]{200,}={0,2}/, 'blocos longos de letras e números sem espaço (parece base64 ou texto comprimido)'],
  [/DecompressionStream|CompressionStream|\binflate\b|\bgunzip\b|\bpako\b/, 'descompressão (o código deve estar legível, sem compressão)'],
];
const PADROES_PROIBIDOS_NO_CODIGO = [
  [/\brequire\s*\(/, 'usa require()'],
  [/\bBuffer\b/, 'usa Buffer (não existe no Workers)'],
  [/\bprocess\.(env|argv|cwd|exit)/, 'usa process'],
  [/\beval\s*\(|new\s+Function\s*\(/, 'usa eval/new Function'],
  [/\bimport\s*\(/, 'usa import() dinâmico'],
  [/\b__dirname\b|\b__filename\b/, 'usa __dirname/__filename'],
  [/from\s+['"]node:/, 'importa módulo do Node'],
];

function conferirArquivos(arquivos) {
  const nomes = new Set(arquivos.keys());
  for (const [nome, texto] of arquivos) {
    if (!/^[a-z0-9-]+\.js$/.test(nome)) throw new Error(`Nome de arquivo inválido: ${nome}`);
    const tamanho = Buffer.byteLength(texto);
    if (tamanho > LIMITE_DO_ARQUIVO) throw new Error(`${nome} passou de ${LIMITE_DO_ARQUIVO} bytes (${tamanho}): divida em mais partes.`);
    const linhasDoArquivo = texto.split('\n').length - 1;
    if (linhasDoArquivo > LIMITE_DE_LINHAS && nome !== ARQUIVO_DE_TERCEIROS) throw new Error(`${nome} passou de ${LIMITE_DE_LINHAS} linhas (${linhasDoArquivo}): divida em mais arquivos (CAMADAS / GRUPOS_DO_SITE).`);
    if (!texto.includes(MARCA_DE_GERADO)) throw new Error(`${nome} perdeu o aviso de arquivo gerado.`);
    if (/\r/.test(texto)) throw new Error(`${nome} tem CR.`);
    const deTerceiros = nome === ARQUIVO_DE_TERCEIROS;
    for (const [padrao, motivo] of PADROES_PROIBIDOS) {
      const achou = deTerceiros && /blocos longos/.test(motivo) ? null : padrao.exec(texto);
      if (achou) throw new Error(`${nome} ficou com ${motivo}: "${achou[0].slice(0, 60)}…"`);
    }
    if (!deTerceiros) {
      texto.split('\n').forEach((linha, i) => {
        if (linha.length > LINHA_MAXIMA) throw new Error(`${nome}, linha ${i + 1}: ${linha.length} caracteres (o máximo é ${LINHA_MAXIMA}).`);
      });
    }
    if (!nome.startsWith('site-')) {
      for (const [padrao, motivo] of PADROES_PROIBIDOS_NO_CODIGO) if (padrao.test(texto)) throw new Error(`${nome} ${motivo}.`);
    }
    // sintaxe + só importa outros arquivos gerados
    const ast = acorn.parse(texto, { ecmaVersion: 'latest', sourceType: 'module' });
    for (const no of ast.body) {
      if (no.type === 'ImportDeclaration' || (no.type === 'ExportNamedDeclaration' && no.source)) {
        const alvo = String(no.source.value);
        if (!/^\.\/[a-z0-9-]+\.js$/.test(alvo) || !nomes.has(alvo.slice(2))) throw new Error(`${nome} importa "${alvo}", que não é um dos arquivos gerados.`);
      }
    }
    const padrao = ast.body.filter((n) => n.type === 'ExportDefaultDeclaration').length;
    const deveTer = nome === 'worker.js' || nome.startsWith('site-') ? 1 : 0;
    if (padrao !== deveTer) throw new Error(`${nome}: "export default" no lugar errado (achei ${padrao}, devia ser ${deveTer}).`);
  }
}

/** Importa o kit de verdade (como um módulo, numa pasta de rascunho) e confere o site e o servidor. */
async function conferirRodando(arquivos, site) {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-delas-'));
  try {
    fs.writeFileSync(path.join(pasta, 'package.json'), '{"type":"module"}\n');
    for (const [nome, texto] of arquivos) fs.writeFileSync(path.join(pasta, nome), texto);
    const worker = (await import(pathToFileURL(path.join(pasta, 'worker.js')).href)).default;
    if (typeof worker.fetch !== 'function' || typeof worker.scheduled !== 'function') throw new Error('worker.js precisa exportar { fetch, scheduled }.');
    for (const [caminho, a] of Object.entries(site)) {
      const r = await worker.fetch(new Request(`https://teste.exemplo${caminho}`), {});
      const texto = await r.text();
      if (r.status !== 200) throw new Error(`Com o kit montado, ${caminho} respondeu ${r.status}.`);
      if (texto !== a.corpo) throw new Error(`Com o kit montado, ${caminho} saiu diferente do arquivo da pasta site/.`);
      if (r.headers.get('etag') !== `"${a.etag}"`) throw new Error(`Com o kit montado, o ETag de ${caminho} não bate.`);
    }
    const saude = await worker.fetch(new Request('https://teste.exemplo/api/saude'), {});
    const corpo = await saude.json();
    if (corpo.site !== true) throw new Error('Com o kit montado, /api/saude diz que o site está incompleto ou diferente do gerado.');
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
  }
}

/* ── montagem completa ─────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * @param {{raiz?:string, pastaDoSite?:string, conferir?:boolean}} [opcoes]
 * @returns {Promise<{arquivos: Map<string,string>, site: object, resumo: Array<{arquivo:string,linhas:number,bytes:number}>}>}
 */
export async function montarKit({ raiz = raizDoProjeto, pastaDoSite = path.join(raiz, 'site'), conferir = true } = {}) {
  const lidos = new Map();
  const todos = new Map(); // módulo -> arquivo (camada)
  const camadaDe = new Map(); // módulo -> índice da camada
  CAMADAS.forEach((c, i) =>
    c.modulos.forEach((m) => {
      if (todos.has(m)) throw new Error(`"${m}" está em dois arquivos de CAMADAS.`);
      todos.set(m, c.arquivo);
      camadaDe.set(m, i);
    }),
  );
  const existentes = fs.readdirSync(path.join(raiz, 'src')).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3));
  const fora = existentes.filter((m) => !todos.has(m));
  if (fora.length) throw new Error(`Arquivos de src/ que não estão em CAMADAS (scripts/colar.mjs): ${fora.join(', ')}.`);
  const inexistentes = [...todos.keys()].filter((m) => !existentes.includes(m));
  if (inexistentes.length) throw new Error(`CAMADAS cita arquivos que não existem em src/: ${inexistentes.join(', ')}.`);
  for (const m of todos.keys()) lidos.set(m, lerModulo(m, fs.readFileSync(path.join(raiz, 'src', `${m}.js`), 'utf8')));

  const site = lerSite(pastaDoSite);
  const modulosDoSite = montarSite(site);

  const arquivos = new Map();
  arquivos.set('worker.js', textoDoWorker(modulosDoSite));
  CAMADAS.forEach((c, i) => arquivos.set(c.arquivo, montarCamada(c, i, lidos, camadaDe, todos).texto));
  for (const m of modulosDoSite) arquivos.set(m.arquivo, m.texto);

  // a ordem de colagem sugerida: o principal primeiro, depois o código, depois o site
  const ordemFinal = ['worker.js', ...CAMADAS.map((c) => c.arquivo), ...modulosDoSite.map((m) => m.arquivo)];
  const ordenados = new Map(ordemFinal.map((n) => [n, arquivos.get(n)]));

  if (conferir) {
    conferirArquivos(ordenados);
    await conferirRodando(ordenados, site);
  }
  const resumo = [...ordenados].map(([arquivo, texto]) => ({ arquivo, linhas: texto.split('\n').length - 1, bytes: Buffer.byteLength(texto) }));
  return { arquivos: ordenados, site, resumo };
}

/**
 * Grava o kit em `saida`. Se a pasta já tinha um kit antigo (reconhece pelo worker.js), apaga antes os .js dele que não
 * fazem mais parte (por exemplo, arquivos de versões anteriores), para não sobrar nada velho para colar por engano.
 */
export function gravarKit(arquivos, saida) {
  fs.mkdirSync(saida, { recursive: true });
  if (fs.existsSync(path.join(saida, 'worker.js'))) {
    for (const velho of fs.readdirSync(saida)) {
      const caminho = path.join(saida, velho);
      if (/^[a-z0-9-]+\.js$/.test(velho) && fs.statSync(caminho).isFile()) fs.rmSync(caminho);
    }
  }
  for (const [nome, texto] of arquivos) fs.writeFileSync(path.join(saida, nome), texto);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const saida = process.env.SAIDA || path.join(raizDoProjeto, 'para-colar');
  if (!process.env.SEM_SITE) await construirSite();
  const { arquivos, resumo } = await montarKit();
  gravarKit(arquivos, saida);
  const kb = (n) => `${(n / 1024).toFixed(1)} KB`.padStart(9);
  console.log(`\nArquivos para colar prontos em: ${saida}\n`);
  resumo.forEach(({ arquivo, linhas, bytes }, i) => console.log(`  ${String(i + 1).padStart(2)}. ${arquivo.padEnd(20)} ${String(linhas).padStart(6)} linhas ${kb(bytes)}`));
  console.log(`\n  ${resumo.length} arquivos. Cole na ordem da lista (o worker.js primeiro).`);
}
