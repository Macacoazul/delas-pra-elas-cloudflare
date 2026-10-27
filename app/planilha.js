/* Planilha da live (.xlsx), montada à mão: o XML da planilha e o ZIP que o embrulha (sem nenhuma biblioteca).
   O desenho segue a planilha já usada no brechó: oito clientes por faixa, cada uma numa caixa de duas colunas
   com o valor a pagar embaixo. */

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABELA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const bytesDe = (txt) => new TextEncoder().encode(txt);

function zipar(arquivos) {
  const partes = [];
  const central = [];
  let deslocamento = 0;

  arquivos.forEach((a) => {
    const nome = bytesDe(a.nome);
    const crc = crc32(a.dados);
    const local = new Uint8Array(30 + nome.length);
    const dv = new DataView(local.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(8, 0, true);
    dv.setUint16(12, 0x21, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, a.dados.length, true);
    dv.setUint32(22, a.dados.length, true);
    dv.setUint16(26, nome.length, true);
    local.set(nome, 30);
    partes.push(local, a.dados);

    const c = new Uint8Array(46 + nome.length);
    const cv = new DataView(c.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(14, 0x21, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, a.dados.length, true);
    cv.setUint32(24, a.dados.length, true);
    cv.setUint16(28, nome.length, true);
    cv.setUint32(42, deslocamento, true);
    c.set(nome, 46);
    central.push(c);

    deslocamento += local.length + a.dados.length;
  });

  const tamCentral = central.reduce((s, x) => s + x.length, 0);
  const fim = new Uint8Array(22);
  const fv = new DataView(fim.buffer);
  fv.setUint32(0, 0x06054b50, true);
  fv.setUint16(8, arquivos.length, true);
  fv.setUint16(10, arquivos.length, true);
  fv.setUint32(12, tamCentral, true);
  fv.setUint32(16, deslocamento, true);

  const total = [...partes, ...central, fim];
  const tamanho = total.reduce((s, x) => s + x.length, 0);
  const saida = new Uint8Array(tamanho);
  let p = 0;
  total.forEach((x) => {
    saida.set(x, p);
    p += x.length;
  });
  return saida;
}

const escapar = (s) =>
  String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const letraColuna = (n) => {
  let s = '';
  n += 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

/* Catálogo de estilos: bordas e formatos são criados sob demanda
   e reaproveitados, para o styles.xml não crescer à toa. */
function criarEstilos() {
  const bordas = ['<border><left/><right/><top/><bottom/><diagonal/></border>'];
  const chavesBorda = { '': 0 };
  const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
  const chavesXf = { '0|0|0|0' : 0 };

  const borda = (l, r, t, b) => {
    const chave = `${l ? 1 : 0}${r ? 1 : 0}${t ? 1 : 0}${b ? 1 : 0}`;
    if (chave === '0000') return 0;
    if (chavesBorda[chave] !== undefined) return chavesBorda[chave];
    const lado = (nome, tem) =>
      tem ? `<${nome} style="medium"><color rgb="FF000000"/></${nome}>` : `<${nome}/>`;
    bordas.push(
      `<border>${lado('left', l)}${lado('right', r)}${lado('top', t)}${lado('bottom', b)}<diagonal/></border>`
    );
    chavesBorda[chave] = bordas.length - 1;
    return bordas.length - 1;
  };

  // fontId: 0 normal, 1 negrito · numFmtId: 0 texto, 164 moeda · alinhamento: 0 nenhum, 1 centro
  const xf = (fonte, formato, idBorda, centro) => {
    const chave = `${fonte}|${formato}|${idBorda}|${centro}`;
    if (chavesXf[chave] !== undefined) return chavesXf[chave];
    const alinha = centro ? '<alignment horizontal="center" vertical="center"/>' : '';
    xfs.push(
      `<xf numFmtId="${formato}" fontId="${fonte}" fillId="0" borderId="${idBorda}" xfId="0" applyFont="1" applyBorder="1" applyNumberFormat="1"${centro ? ' applyAlignment="1"' : ''}>${alinha}</xf>`
    );
    chavesXf[chave] = xfs.length - 1;
    return xfs.length - 1;
  };

  const xml = () =>
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<numFmts count="1"><numFmt numFmtId="164" formatCode="_-&quot;R$&quot;\\ * #,##0.00_-;\\-&quot;R$&quot;\\ * #,##0.00_-;_-&quot;R$&quot;\\ * &quot;-&quot;??_-;_-@_-"/></numFmts>` +
    `<fonts count="2">` +
    `<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>` +
    `<font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font>` +
    `</fonts>` +
    `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
    `<borders count="${bordas.length}">${bordas.join('')}</borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>` +
    `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
    `</styleSheet>`;

  return { borda, xf, xml };
}

const COLUNAS_BLOCO = [0, 3, 6, 9, 12, 15, 18, 21];
const LINHAS_ENTRE_FAIXAS = 3;

function planilhaDoDia(grupos, nomeAba) {
  const est = criarEstilos();
  const celulas = {}; // "linha,coluna" -> xml da célula
  let ultimaLinha = 0;
  let ultimaColuna = 0;

  const por = (r, c, conteudo) => {
    celulas[`${r},${c}`] = conteudo;
    if (r > ultimaLinha) ultimaLinha = r;
    if (c > ultimaColuna) ultimaColuna = c;
  };

  const texto = (r, c, valor, estilo) =>
    por(r, c, `<c r="${letraColuna(c)}${r + 1}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${escapar(valor)}</t></is></c>`);
  const numero = (r, c, valor, estilo) =>
    por(r, c, `<c r="${letraColuna(c)}${r + 1}" s="${estilo}"><v>${valor}</v></c>`);
  const formula = (r, c, f, valor, estilo) =>
    por(r, c, `<c r="${letraColuna(c)}${r + 1}" s="${estilo}"><f>${escapar(f)}</f><v>${valor}</v></c>`);
  const vazia = (r, c, estilo) =>
    por(r, c, `<c r="${letraColuna(c)}${r + 1}" s="${estilo}"/>`);

  const emOrdem = [...grupos].reverse();
  let linhaBase = 0;

  for (let i = 0; i < emOrdem.length; i += COLUNAS_BLOCO.length) {
    const faixa = emOrdem.slice(i, i + COLUNAS_BLOCO.length);
    let altura = 0;

    faixa.forEach((g, j) => {
      const c = COLUNAS_BLOCO[j];
      const itens = [...g.vendas].reverse();
      const linhaNome = linhaBase;
      const temPago = itens.some((v) => v.pago);
      const tudoPago = itens.length > 0 && itens.every((v) => v.pago);

      // a caixa só ganha a terceira coluna quando existe PG para caber dentro
      const colFim = temPago ? c + 2 : c + 1;
      // com tudo pago não há linha de fecho: a caixa termina na última peça
      const linhaFim = tudoPago ? linhaNome + itens.length : linhaNome + itens.length + 1;

      // nome da cliente: negrito, centralizado, topo da caixa
      texto(linhaNome, c, (g.cliente.nome || '').toUpperCase(), est.xf(1, 0, est.borda(1, colFim === c, 1, 0), 1));
      for (let col = c + 1; col <= colFim; col++) {
        vazia(linhaNome, col, est.xf(1, 0, est.borda(0, col === colFim, 1, 0), 0));
      }

      itens.forEach((v, k) => {
        const r = linhaNome + 1 + k;
        const base = tudoPago && k === itens.length - 1 ? 1 : 0;
        texto(r, c, (v.peca || '').toUpperCase(), est.xf(0, 0, est.borda(1, 0, 0, base), 1));
        numero(r, c + 1, v.valor, est.xf(0, 164, est.borda(0, colFim === c + 1, 0, base), 0));
        if (colFim === c + 2) {
          const estilo = est.xf(1, 0, est.borda(0, 1, 0, base), 1);
          if (v.pago) texto(r, c + 2, 'PG', estilo);
          else vazia(r, c + 2, estilo);
        }
      });

      if (!tudoPago) {
        const colValor = letraColuna(c + 1);
        const colPago = letraColuna(c + 2);
        const primeira = linhaNome + 2;
        const ultima = linhaFim;
        const soma = itens.reduce((s, v) => s + v.valor, 0);
        const aPagar = itens.filter((v) => !v.pago).reduce((s, v) => s + v.valor, 0);

        // sem nada pago o fecho é só o número, sem rótulo, como na planilha usada hoje
        let rotulo = '';
        let f = `SUM(${colValor}${primeira}:${colValor}${ultima})`;
        let valor = soma;
        if (temPago) {
          rotulo = 'A PAGAR';
          f = `SUMIF(${colPago}${primeira}:${colPago}${ultima},"",${colValor}${primeira}:${colValor}${ultima})`;
          valor = aPagar;
        }
        texto(linhaFim, c, rotulo, est.xf(1, 0, est.borda(1, colFim === c, 0, 1), 1));
        formula(linhaFim, c + 1, f, Math.round(valor * 100) / 100, est.xf(1, 164, est.borda(0, colFim === c + 1, 0, 1), 0));
        if (colFim === c + 2) vazia(linhaFim, c + 2, est.xf(1, 0, est.borda(0, 1, 0, 1), 0));
      }

      altura = Math.max(altura, linhaFim - linhaBase + 1);
    });

    linhaBase += altura + LINHAS_ENTRE_FAIXAS;
  }

  // monta as linhas do XML
  const porLinha = {};
  Object.keys(celulas).forEach((k) => {
    const [r, c] = k.split(',').map(Number);
    if (!porLinha[r]) porLinha[r] = [];
    porLinha[r].push([c, celulas[k]]);
  });
  const linhasXml = Object.keys(porLinha)
    .map(Number)
    .sort((a, b) => a - b)
    .map((r) => {
      const cs = porLinha[r].sort((a, b) => a[0] - b[0]).map((x) => x[1]).join('');
      return `<row r="${r + 1}">${cs}</row>`;
    })
    .join('');

  const colunasXml = Array.from({ length: 24 }, (_, n) => {
    const dentro = n % 3;
    const largura = dentro === 0 ? 32 : dentro === 1 ? 13 : 4;
    return `<col min="${n + 1}" max="${n + 1}" width="${largura}" customWidth="1"/>`;
  }).join('');

  const ref = `A1:${letraColuna(Math.max(ultimaColuna, 23))}${Math.max(ultimaLinha, 0) + 1}`;
  const folha =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<dimension ref="${ref}"/>` +
    `<sheetFormatPr defaultRowHeight="15"/>` +
    `<cols>${colunasXml}</cols>` +
    `<sheetData>${linhasXml}</sheetData>` +
    `<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>` +
    `<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>` +
    `</worksheet>`;

  const arquivos = [
    {
      nome: '[Content_Types].xml',
      dados: bytesDe(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
          `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
          `<Default Extension="xml" ContentType="application/xml"/>` +
          `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
          `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
          `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
          `</Types>`
      ),
    },
    {
      nome: '_rels/.rels',
      dados: bytesDe(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
          `</Relationships>`
      ),
    },
    {
      nome: 'xl/workbook.xml',
      dados: bytesDe(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
          `<sheets><sheet name="${escapar(nomeAba)}" sheetId="1" r:id="rId1"/></sheets>` +
          `<calcPr fullCalcOnLoad="1"/>` +
          `</workbook>`
      ),
    },
    {
      nome: 'xl/_rels/workbook.xml.rels',
      dados: bytesDe(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
          `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
          `</Relationships>`
      ),
    },
    { nome: 'xl/styles.xml', dados: bytesDe(est.xml()) },
    { nome: 'xl/worksheets/sheet1.xml', dados: bytesDe(folha) },
  ];

  return zipar(arquivos);
}

export { planilhaDoDia, crc32, zipar };
