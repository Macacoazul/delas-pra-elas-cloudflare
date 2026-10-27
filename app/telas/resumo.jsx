/* O resumo do dia (total, peças, clientes) e o cartão de cada cliente na tela da Live. */
import React from 'react';
import { t, S, sans, display } from '../estilos.js';
import { brl } from '../util.js';

/* ── resumo do dia ──────────────────────────────────────── */
function Resumo({ r }) {
  return (
    <section style={S.resumo}>
      <div style={S.totalNum}>{brl(r.total)}</div>
      <div style={S.metaRow}>
        <Meta n={r.pecas} l={r.pecas === 1 ? 'peça' : 'peças'} />
        <Meta n={r.clientes} l={r.clientes === 1 ? 'cliente' : 'clientes'} />
        <Meta n={r.novas} l={r.novas === 1 ? 'nova' : 'novas'} destaque />
      </div>
      {r.pendente > 0 && (
        <div style={S.pendBar}>
          <span style={{ fontWeight: 500 }}>{brl(r.pendente)}</span> ainda a receber
        </div>
      )}
    </section>
  );
}

function Meta({ n, l, destaque }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
      <span
        style={{
          fontFamily: display,
          fontSize: 22,
          color: destaque && n > 0 ? t.rose : t.ink,
        }}
      >
        {n}
      </span>
      <span style={{ fontFamily: sans, fontSize: 14, color: t.inkSoft }}>{l}</span>
    </div>
  );
}

/* ── grupo por cliente ──────────────────────────────────── */
function GrupoCliente({ g, dia, onToggle, onEdit, onExportar }) {
  const c = g.cliente;
  if (!c) return null;
  const nova = !c.preExistente && c.primeiraCompra === dia;

  return (
    <article style={S.card}>
      <div style={S.cardHead}>
        <div style={{ minWidth: 0 }}>
          <div style={S.cliNome}>{c.nome}</div>
          <div style={S.cliSub}>
            {g.vendas.length} {g.vendas.length === 1 ? 'peça' : 'peças'}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={S.cliTotal}>{brl(g.total)}</div>
          <span style={nova ? S.badgeNova : S.badgeAntiga}>{nova ? 'nova' : 'antiga'}</span>
        </div>
      </div>
      <div>
        {g.vendas.map((v) => (
          <div key={v.id} style={S.row}>
            <button style={S.rowMain} onClick={() => onEdit(v)}>
              <span style={S.codigo}>{v.codigo || '—'}</span>
              <span style={S.peca}>{v.peca}</span>
              {v.temFoto && <span style={S.fotoTag}>foto</span>}
              {(v.fila || []).length > 0 && (
                <span style={S.filaTag}>
                  fila {v.fila.length}
                </span>
              )}
            </button>
            <span style={S.rowValor}>{brl(v.valor)}</span>
            <button
              style={v.pago ? S.chipPago : S.chipPend}
              onClick={() => onToggle(v.id, v.pago)}
              aria-label={v.pago ? 'Marcar como pendente' : 'Marcar como pago'}
            >
              {v.pago ? 'pago' : 'pendente'}
            </button>
          </div>
        ))}
      </div>
      <button style={S.cardExport} onClick={onExportar}>
        Exportar lista dela
      </button>
    </article>
  );
}

export { Resumo, Meta, GrupoCliente };
