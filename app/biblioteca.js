/**
 * Biblioteca de telas do app: Preact 10 (licença MIT, https://preactjs.com), na versão que imita a interface do React.
 * É só isto que este arquivo faz: carrega a biblioteca e a deixa disponível para app.js e fretes.js.
 * O arquivo gerado (site/biblioteca.js) é a versão "minificada" oficial da biblioteca; não precisa ler nem editar.
 */
import React from 'preact/compat';
import { createRoot } from 'preact/compat/client';

window.React = React;
window.ReactDOM = { createRoot };
