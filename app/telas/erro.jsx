/* Se uma tela quebrar, mostra um aviso com o botão Voltar em vez de deixar a página em branco. */
import React from 'react';
import { t, S, display } from '../estilos.js';

/* ── barreira de erro ───────────────────────────────────── */
class Barreira extends React.Component {
  constructor(p) {
    super(p);
    this.state = { erro: null };
  }
  static getDerivedStateFromError(e) {
    return { erro: e };
  }
  render() {
    if (this.state.erro) {
      return (
        <div style={{ ...S.screen, padding: 28 }}>
          <div style={{ maxWidth: 380, margin: '60px auto' }}>
            <div style={{ fontFamily: display, fontSize: 24, color: t.ink, marginBottom: 10 }}>
              Algo travou nesta tela
            </div>
            <p style={{ fontSize: 15, color: t.inkSoft, lineHeight: 1.5 }}>
              Nada do que você registrou foi perdido. Toque abaixo para voltar.
            </p>
            <button style={{ ...S.cta, marginTop: 20 }} onClick={() => this.setState({ erro: null })}>
              Voltar
            </button>
            <p style={{ fontSize: 12, color: t.inkFaint, marginTop: 20, wordBreak: 'break-word' }}>
              {String(this.state.erro && this.state.erro.message)}
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export { Barreira };
