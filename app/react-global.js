/* O código das telas usa a interface do React; quem de fato desenha é a biblioteca Preact (site/biblioteca.js),
   carregada antes. Este arquivo só liga uma coisa à outra, para o app não carregar a biblioteca duas vezes. */
const R = window.React;

export default R;
/* O esbuild transforma o JSX (<div>…</div>) em chamadas h("div", …): é a função que o React/Preact usa para criar cada elemento da tela. */
export const h = R.createElement;
export const { useState, useEffect, useMemo, useRef, useCallback, useReducer, useLayoutEffect, useContext, Fragment, Component } = R;
