/* Prepara a foto da peça: reduz e comprime no celular antes de guardar, para ela ocupar pouco espaço e subir rápido.
   O servidor só aceita foto de até 600 mil caracteres; aqui a gente já garante que cabe. */

const LIMITE_DE_CARACTERES = 500_000;
/** Tamanhos tentados em ordem: o primeiro quase sempre basta. */
const TENTATIVAS = [
  { lado: 720, qualidade: 0.62 },
  { lado: 560, qualidade: 0.5 },
  { lado: 420, qualidade: 0.45 },
];

function lerArquivo(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error('Não deu para ler a imagem'));
    leitor.onload = () => resolve(leitor.result);
    leitor.readAsDataURL(arquivo);
  });
}

function abrirImagem(endereco) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('Arquivo não é uma imagem'));
    img.onload = () => resolve(img);
    img.src = endereco;
  });
}

function desenhar(img, lado, qualidade) {
  const escala = Math.min(1, lado / Math.max(img.width, img.height));
  const largura = Math.max(1, Math.round(img.width * escala));
  const altura = Math.max(1, Math.round(img.height * escala));
  const tela = document.createElement('canvas');
  tela.width = largura;
  tela.height = altura;
  tela.getContext('2d').drawImage(img, 0, 0, largura, altura);
  return tela.toDataURL('image/jpeg', qualidade);
}

/** @param {File} arquivo  @returns {Promise<string>} "data:image/jpeg;base64,..." */
export async function comprimirImagem(arquivo) {
  const img = await abrirImagem(await lerArquivo(arquivo));
  let resultado = '';
  for (const { lado, qualidade } of TENTATIVAS) {
    resultado = desenhar(img, lado, qualidade);
    if (resultado.length <= LIMITE_DE_CARACTERES) return resultado;
  }
  throw new Error('A foto ficou grande demais');
}
