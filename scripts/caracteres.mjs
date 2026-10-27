/**
 * Caracteres que não se enxergam (ou se enxergam mal) e que podem se perder ao copiar e colar um arquivo: controles,
 * separadores de linha, espaços de largura zero, marcas de direção de texto (usadas em ataques de "código enganoso"),
 * a marca de ordem de bytes e os "não-caracteres" do Unicode. Dentro do código eles só podem aparecer escritos como
 * \uXXXX; o gerador do site faz essa troca e o gerador do kit recusa o que sobrar.
 */
// eslint-disable-next-line no-control-regex -- é justamente a lista de caracteres de controle que se quer achar
export const INVISIVEIS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD\u200B-\u200F\u2028-\u202E\u2060-\u2064\u2066-\u206F\uFDD0-\uFDEF\uFEFF\uFFF0-\uFFFF]/g;

export const comoEscape = (caractere) => `\\u${caractere.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;

/** Troca cada caractere invisível por sua forma escrita (\uXXXX). Seguro dentro de textos, modelos (`...`) e expressões regulares. */
export const escreverInvisiveis = (texto) => texto.replace(INVISIVEIS, comoEscape);
