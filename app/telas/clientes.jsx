/* A aba Clientes: lista, busca, cadastro, edição e junção de cadastros duplicados. */
import React, { useState, useMemo } from 'react';
import { t, S, display } from '../estilos.js';
import { norm, brl, dateLabel, dataCurta } from '../util.js';

/* ── clientes ───────────────────────────────────────────── */
function Clientes({ data, dia, onSave, onFlash, onExport, onExportTudo, onMesclar, onEditarMensagem }) {
  const [busca, setBusca] = useState('');
  const [escopo, setEscopo] = useState('dia');
  const [form, setForm] = useState(null);

  const vazio = { total: 0, pecas: 0, totalDia: 0, pecasDia: 0, pendenteDia: 0, ultima: '', fila: 0 };

  const enriquecidas = useMemo(() => {
    const st = {};
    const pega = (id) => {
      if (!st[id]) st[id] = { ...vazio };
      return st[id];
    };
    data.vendas.forEach((v) => {
      const s = pega(v.clienteId);
      s.total += v.valor;
      s.pecas += 1;
      if (v.data > s.ultima) s.ultima = v.data;
      if (v.data === dia) {
        s.totalDia += v.valor;
        s.pecasDia += 1;
        if (!v.pago) s.pendenteDia += v.valor;
      }
      (v.fila || []).forEach((f) => {
        if (f.clienteId) pega(f.clienteId).fila += 1;
      });
    });
    const q = norm(busca);
    return data.clientes
      .map((c) => ({ ...c, ...(st[c.id] || vazio) }))
      .filter((c) => !q || norm(c.nome).includes(q))
      .filter((c) => (escopo === 'dia' ? c.pecasDia > 0 : true))
      .sort((a, b) =>
        escopo === 'dia' ? b.totalDia - a.totalDia : b.total - a.total || b.fila - a.fila
      );
  }, [data, busca, escopo, dia]);

  const ehNova = (c) => !c.preExistente && c.primeiraCompra === dia;

  const legenda = (c) => {
    if (escopo === 'dia') return `${c.pecasDia} ${c.pecasDia === 1 ? 'peça' : 'peças'} nesse dia`;
    if (c.pecas > 0) return `${c.pecas} ${c.pecas === 1 ? 'peça' : 'peças'} no total`;
    if (c.fila > 0) return `esperando ${c.fila} ${c.fila === 1 ? 'peça' : 'peças'} na fila`;
    if (c.preExistente) return 'cliente antiga, sem compras no app';
    return 'sem compras ainda';
  };

  const somaDia = enriquecidas.reduce((s, c) => s + c.totalDia, 0);

  return (
    <>
      <div style={{ padding: '14px 20px 0' }}>
        <div style={S.segmento}>
          <button
            style={{ ...S.segBtn, ...(escopo === 'dia' ? S.segOnEscopo : {}) }}
            onClick={() => setEscopo('dia')}
          >
            Do dia
          </button>
          <button
            style={{ ...S.segBtn, ...(escopo === 'sempre' ? S.segOnEscopo : {}) }}
            onClick={() => setEscopo('sempre')}
          >
            Todas
          </button>
        </div>

        <div style={S.escopoInfo}>
          {escopo === 'dia'
            ? `${dateLabel(dia)} · ${brl(somaDia)}`
            : `${data.clientes.length} ${data.clientes.length === 1 ? 'cliente cadastrada' : 'clientes cadastradas'}`}
        </div>

        <input
          style={S.input}
          value={busca}
          placeholder="Buscar cliente"
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <main style={{ ...S.list, paddingTop: 14 }}>
        {enriquecidas.length === 0 ? (
          <div style={S.empty}>
            <p style={S.emptyTitle}>
              {busca
                ? 'Nenhuma cliente com esse nome.'
                : escopo === 'dia'
                ? 'Ninguém comprou nesse dia.'
                : 'Nenhuma cliente cadastrada ainda.'}
            </p>
            <p style={S.emptyTxt}>
              {escopo === 'dia'
                ? 'Troque o dia pelo calendário ou veja todas as clientes.'
                : 'Cadastre aqui quem já comprava com você antes do app, para ela não entrar como nova.'}
            </p>
          </div>
        ) : (
          enriquecidas.map((c) => (
            <button key={c.id} style={S.cliRow} onClick={() => setForm(c)}>
              <div style={{ minWidth: 0, textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                  <span style={S.cliNome}>{c.nome}</span>
                  {escopo === 'dia' && (
                    <span style={{ ...(ehNova(c) ? S.badgeNova : S.badgeAntiga), marginTop: 0 }}>
                      {ehNova(c) ? 'nova' : 'antiga'}
                    </span>
                  )}
                </div>
                <div style={S.cliSub}>{legenda(c)}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={S.cliTotal}>{brl(escopo === 'dia' ? c.totalDia : c.total)}</div>
                {escopo === 'dia' ? (
                  <div style={S.cliSub}>{brl(c.total)} no total</div>
                ) : c.whatsapp ? (
                  <div style={S.cliSub}>{c.whatsapp}</div>
                ) : null}
              </div>
            </button>
          ))
        )}

        {escopo === 'sempre' && (
          <button style={{ ...S.ctaGhost, marginTop: 18 }} onClick={onExportTudo}>
            Exportar histórico completo
          </button>
        )}
        <button
          style={{ ...S.ctaGhost, marginTop: escopo === 'sempre' ? 10 : 18 }}
          onClick={onEditarMensagem}
        >
          Mensagem do WhatsApp
        </button>
        <button style={{ ...S.ctaGhost, marginTop: 10 }} onClick={onExport}>
          Baixar backup dos dados
        </button>
        <div style={{ height: 96 }} />
      </main>

      <div style={S.dock}>
        <button
          style={S.cta}
          onClick={() => setForm({ nome: '', whatsapp: '', preExistente: true })}
        >
          Cadastrar cliente
        </button>
      </div>

      {form && (
        <FormCliente
          c={form}
          clientes={data.clientes}
          onMesclar={onMesclar}
          onClose={() => setForm(null)}
          onSave={async (x) => {
            await onSave(x);
            onFlash(x.id ? 'Cliente atualizada' : 'Cliente cadastrada');
            setForm(null);
          }}
        />
      )}
    </>
  );
}

function FormCliente({ c, clientes, onClose, onSave, onMesclar }) {
  const [nome, setNome] = useState(c.nome || '');
  const [wpp, setWpp] = useState(c.whatsapp || '');
  const [pre, setPre] = useState(c.preExistente !== false);
  const [mesclando, setMesclando] = useState(false);
  const [buscaM, setBuscaM] = useState('');
  const [alvo, setAlvo] = useState(null);
  const editando = !!c.id;

  const candidatas = useMemo(() => {
    if (!clientes) return [];
    const q = norm(buscaM);
    return clientes
      .filter((x) => x.id !== c.id && (!q || norm(x.nome).includes(q)))
      .slice(0, 6);
  }, [clientes, buscaM, c.id]);

  if (mesclando) {
    return (
      <div style={S.overlay} onClick={onClose}>
        <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
          <div style={S.sheetHead}>
            <span style={S.sheetTitle}>Juntar cadastros</span>
            <button style={S.linkBtn} onClick={() => setMesclando(false)}>
              Voltar
            </button>
          </div>
          <div style={{ padding: '4px 20px 20px', overflowY: 'auto' }}>
            {alvo ? (
              <>
                <p style={{ fontSize: 15, color: t.ink, lineHeight: 1.55, margin: '4px 0 0' }}>
                  Tudo que está em <strong>{c.nome}</strong> passa para{' '}
                  <strong>{alvo.nome}</strong>: as compras, o histórico e as filas.
                </p>
                <p style={{ fontSize: 14, color: t.inkSoft, lineHeight: 1.5, marginTop: 12 }}>
                  O cadastro <strong>{c.nome}</strong> deixa de existir. O nome que fica é{' '}
                  <strong>{alvo.nome}</strong>. Nenhuma venda é perdida, e isso não tem como
                  desfazer.
                </p>
                <button
                  style={{ ...S.cta, marginTop: 20 }}
                  onClick={() => {
                    onMesclar(c.id, alvo.id);
                    onClose();
                  }}
                >
                  Juntar em {alvo.nome}
                </button>
                <button style={S.ctaGhost} onClick={() => setAlvo(null)}>
                  Escolher outra
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 14, color: t.inkSoft, lineHeight: 1.5, margin: '4px 0 12px' }}>
                  Qual cadastro é a mesma pessoa que {c.nome}?
                </p>
                <input
                  style={S.input}
                  value={buscaM}
                  placeholder="Buscar cliente"
                  onChange={(e) => setBuscaM(e.target.value)}
                />
                <div style={{ marginTop: 10 }}>
                  {candidatas.map((x) => (
                    <button key={x.id} style={S.cliRow} onClick={() => setAlvo(x)}>
                      <span style={S.cliNome}>{x.nome}</span>
                      <span style={S.cliSub}>{x.whatsapp || ''}</span>
                    </button>
                  ))}
                  {candidatas.length === 0 && (
                    <p style={{ fontSize: 14, color: t.inkSoft, padding: '10px 2px' }}>
                      Nenhuma outra cliente com esse nome.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={S.sheetHead}>
          <span style={S.sheetTitle}>{editando ? 'Editar cliente' : 'Cadastrar cliente'}</span>
          <button style={S.linkBtn} onClick={onClose}>
            Fechar
          </button>
        </div>
        <div style={{ padding: '4px 20px 20px', overflowY: 'auto' }}>
          {editando && (c.pecas > 0 || c.fila > 0) && (
            <div style={S.histBox}>
              <div style={{ fontFamily: display, fontSize: 26, color: t.ink }}>{brl(c.total)}</div>
              <div style={{ fontSize: 13, color: t.inkSoft, marginTop: 4, lineHeight: 1.5 }}>
                {c.pecas} {c.pecas === 1 ? 'peça' : 'peças'} desde sempre
                {c.ultima ? ` · última em ${dataCurta(c.ultima)}` : ''}
                {c.fila > 0 ? ` · ${c.fila} na fila` : ''}
              </div>
            </div>
          )}

          <label style={S.label}>Nome</label>
          <input style={S.input} value={nome} onChange={(e) => setNome(e.target.value)} />

          <label style={{ ...S.label, marginTop: 16 }}>WhatsApp</label>
          <input
            style={S.input}
            value={wpp}
            inputMode="tel"
            placeholder="(55) 99999-9999"
            onChange={(e) => setWpp(e.target.value)}
          />
          <p style={{ fontSize: 13, color: t.inkSoft, margin: '7px 2px 0', lineHeight: 1.45 }}>
            Com o número salvo, a lista dela vai direto pra conversa dela.
          </p>

          <button style={S.checkRow} onClick={() => setPre(!pre)}>
            <span style={{ ...S.checkBox, ...(pre ? S.checkOn : {}) }}>{pre ? '✓' : ''}</span>
            <span style={{ textAlign: 'left' }}>
              Já era minha cliente antes do app
              <span style={S.checkHelp}>Marcada assim, ela nunca entra na contagem de novas.</span>
            </span>
          </button>

          <button
            style={{ ...S.cta, marginTop: 20 }}
            onClick={() =>
              nome.trim() &&
              onSave({ ...c, nome: nome.trim(), whatsapp: wpp.trim(), preExistente: pre })
            }
          >
            {editando ? 'Salvar alterações' : 'Cadastrar'}
          </button>

          {editando && onMesclar && (
            <button style={S.ctaGhost} onClick={() => setMesclando(true)}>
              Essa cliente está duplicada
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export { Clientes };
