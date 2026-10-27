/* A aba Calendário: o mês com as lives marcadas e o resumo do dia escolhido. */
import React, { useState, useMemo } from 'react';
import { t, S } from '../estilos.js';
import { brl, dateLabel, todayKey, calcResumo } from '../util.js';
import { Meta } from './resumo.jsx';

/* ── calendário ─────────────────────────────────────────── */
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function Calendario({ data, dia, onEscolher }) {
  const [ano, setAno] = useState(() => Number(dia.split('-')[0]));
  const [mes, setMes] = useState(() => Number(dia.split('-')[1]) - 1);
  const [sel, setSel] = useState(dia);
  const hoje = todayKey();

  const porDia = useMemo(() => {
    const m = {};
    data.vendas.forEach((v) => {
      if (!m[v.data]) m[v.data] = { total: 0, pecas: 0 };
      m[v.data].total += v.valor;
      m[v.data].pecas += 1;
    });
    return m;
  }, [data.vendas]);

  const chave = (d) =>
    `${ano}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const celulas = useMemo(() => {
    const inicio = new Date(ano, mes, 1).getDay();
    const qtd = new Date(ano, mes + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < inicio; i++) arr.push(null);
    for (let d = 1; d <= qtd; d++) arr.push(d);
    return arr;
  }, [ano, mes]);

  const doMes = useMemo(() => {
    let total = 0;
    let lives = 0;
    Object.keys(porDia).forEach((k) => {
      const [y, m] = k.split('-').map(Number);
      if (y === ano && m === mes + 1) {
        total += porDia[k].total;
        lives += 1;
      }
    });
    return { total, lives };
  }, [porDia, ano, mes]);

  const resumoSel = useMemo(
    () => calcResumo(data.vendas, data.clientes, sel),
    [data.vendas, data.clientes, sel]
  );

  const andar = (n) => {
    const d = new Date(ano, mes + n, 1);
    setAno(d.getFullYear());
    setMes(d.getMonth());
  };

  const nomeMes = new Date(ano, mes, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <div style={S.mesRow}>
        <button style={S.arrow} onClick={() => andar(-1)} aria-label="Mês anterior">
          ‹
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={S.mesNome}>{nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}</div>
          <div style={S.mesSub}>
            {doMes.lives === 0
              ? 'nenhuma live'
              : `${doMes.lives} ${doMes.lives === 1 ? 'live' : 'lives'} · ${brl(doMes.total)}`}
          </div>
        </div>
        <button style={S.arrow} onClick={() => andar(1)} aria-label="Próximo mês">
          ›
        </button>
      </div>

      <div style={S.calGrid}>
        {SEMANA.map((s) => (
          <div key={s} style={S.calSemana}>
            {s}
          </div>
        ))}
        {celulas.map((d, i) => {
          if (!d) return <div key={`v${i}`} />;
          const k = chave(d);
          const teve = !!porDia[k];
          const futuro = k > hoje;
          const escolhido = k === sel;
          return (
            <button
              key={k}
              disabled={futuro}
              onClick={() => setSel(k)}
              style={{
                ...S.calDia,
                ...(teve ? S.calDiaLive : {}),
                ...(escolhido ? S.calDiaSel : {}),
                ...(futuro ? S.calDiaFuturo : {}),
                ...(k === hoje && !escolhido ? S.calDiaHoje : {}),
              }}
            >
              {d}
              {teve && <span style={{ ...S.calPonto, background: escolhido ? '#fff' : t.rose }} />}
            </button>
          );
        })}
      </div>

      <div style={S.calDetalhe}>
        <div style={S.calDataSel}>{dateLabel(sel)}</div>
        {resumoSel.pecas > 0 ? (
          <>
            <div style={{ ...S.totalNum, fontSize: 34, marginTop: 4 }}>{brl(resumoSel.total)}</div>
            <div style={S.metaRow}>
              <Meta n={resumoSel.pecas} l={resumoSel.pecas === 1 ? 'peça' : 'peças'} />
              <Meta n={resumoSel.clientes} l={resumoSel.clientes === 1 ? 'cliente' : 'clientes'} />
              <Meta n={resumoSel.novas} l={resumoSel.novas === 1 ? 'nova' : 'novas'} destaque />
            </div>
            {resumoSel.pendente > 0 && (
              <div style={S.pendBar}>
                <span style={{ fontWeight: 500 }}>{brl(resumoSel.pendente)}</span> ainda a receber
              </div>
            )}
            <button style={{ ...S.cta, marginTop: 16 }} onClick={() => onEscolher(sel)}>
              Abrir esse dia
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 15, color: t.inkSoft, margin: '8px 0 0', lineHeight: 1.5 }}>
              Nenhuma peça registrada nesse dia.
            </p>
            <button style={{ ...S.ctaGhost, marginTop: 14 }} onClick={() => onEscolher(sel)}>
              Lançar peça nesse dia
            </button>
          </>
        )}
        <div style={{ height: 40 }} />
      </div>
    </>
  );
}

export { Calendario };
