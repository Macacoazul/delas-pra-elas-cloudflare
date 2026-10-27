/* A "folha" que sobe de baixo da tela: título, botão de fechar e o conteúdo. As telas novas (conta, equipe, backup) usam esta. */
import React from 'react';
import { S } from '../estilos.js';

export function Folha({ titulo, aoFechar, rotuloFechar = 'Fechar', children }) {
  return (
    <div style={S.overlay} onClick={aoFechar}>
      <div style={S.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={titulo}>
        <div style={S.sheetHead}>
          <span style={S.sheetTitle}>{titulo}</span>
          <button style={S.linkBtn} onClick={aoFechar}>
            {rotuloFechar}
          </button>
        </div>
        <div style={{ padding: '4px 20px 20px', overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}
