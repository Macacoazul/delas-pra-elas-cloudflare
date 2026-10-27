import React, { useState } from 'react';
import { S, t } from './base.js';

/* Janela que sobe de baixo, igual às do app da live. */
export function Folha({ titulo, onClose, children }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={titulo}>
        <div style={S.sheetHead}>
          <span style={S.sheetTitle}>{titulo}</span>
          <button style={S.linkBtn} onClick={onClose}>
            Fechar
          </button>
        </div>
        <div style={S.sheetBody}>{children}</div>
      </div>
    </div>
  );
}

/* Copia um texto; se o navegador não deixar, seleciona para a pessoa copiar. */
export async function copiarTexto(texto) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    /* cai para o método antigo */
  }
  try {
    const a = document.createElement('textarea');
    a.value = texto;
    a.setAttribute('readonly', '');
    a.style.position = 'fixed';
    a.style.opacity = '0';
    document.body.appendChild(a);
    a.select();
    const ok = document.execCommand('copy');
    a.remove();
    return ok;
  } catch {
    return false;
  }
}

/* Linha com um texto longo (link, código) e o botão de copiar. */
export function LinhaCopiavel({ texto, rotulo = 'Copiar', onCopiado }) {
  return (
    <div style={S.codigoLinha}>
      <span style={S.codigoTxt}>{texto}</span>
      <button
        style={S.linkRose}
        onClick={async () => onCopiado(await copiarTexto(texto))}
      >
        {rotulo}
      </button>
    </div>
  );
}

/* Chip de status colorido. */
export function ChipStatus({ cor, children }) {
  const cores = {
    amber: { background: t.amberSoft, color: t.amber },
    green: { background: t.greenSoft, color: t.green },
    rose: { background: t.roseSoft, color: t.rose },
    neutral: { background: '#F2EDEF', color: t.inkSoft },
  };
  return <span style={{ ...S.chipStatus, ...(cores[cor] || cores.neutral) }}>{children}</span>;
}

/* Botão que mostra "Aguarde…" enquanto a ação roda e não deixa clicar duas vezes. */
export function BotaoAcao({ estilo = S.cta, ocupado, rotulo, rotuloOcupado, onClick, desabilitado }) {
  return (
    <button
      style={{ ...estilo, opacity: ocupado || desabilitado ? 0.6 : 1 }}
      disabled={ocupado || desabilitado}
      onClick={onClick}
    >
      {ocupado ? rotuloOcupado || 'Aguarde…' : rotulo}
    </button>
  );
}

/* Dois toques para confirmar uma ação sem volta (ex.: cancelar o link). */
export function ConfirmarDuplo({ rotulo, rotuloConfirma, onConfirma, ocupado }) {
  const [pedindo, setPedindo] = useState(false);
  if (!pedindo) {
    return (
      <button style={S.ctaGhost} onClick={() => setPedindo(true)}>
        {rotulo}
      </button>
    );
  }
  return (
    <div style={S.caixaErro}>
      <div style={{ marginBottom: 10 }}>{rotuloConfirma}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{ ...S.ctaGhost, marginTop: 0, flex: 1, background: t.surface }} onClick={() => setPedindo(false)} disabled={ocupado}>
          Voltar
        </button>
        <button style={{ ...S.cta, flex: 1, padding: '13px 10px', fontSize: 15, opacity: ocupado ? 0.6 : 1 }} disabled={ocupado} onClick={onConfirma}>
          {ocupado ? 'Aguarde…' : 'Sim, cancelar'}
        </button>
      </div>
    </div>
  );
}
