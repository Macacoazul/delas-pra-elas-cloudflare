/* A folha de lançar e editar uma peça: cliente, código, peça, valor, pagamento, foto e fila de espera. */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { t, S, display } from '../estilos.js';
import { norm, parseMoney } from '../util.js';
import { comprimirImagem } from '../foto.js';

/* ── folha de lançamento ────────────────────────────────── */
function SheetVenda({ mode, venda, clientes, vendasDoDia, onClose, onSave, onDelete, onPassar, onFlash, carregarFoto }) {
  const editando = mode === 'edit';
  const [clienteNome, setClienteNome] = useState('');
  const [clienteId, setClienteId] = useState(null);
  const [codigo, setCodigo] = useState('');
  const [peca, setPeca] = useState('');
  const [valor, setValor] = useState('');
  const [pago, setPago] = useState(false);
  const [fila, setFila] = useState([]);
  const [foto, setFoto] = useState(null);
  const [fotoMudou, setFotoMudou] = useState(false);
  const [fotoStatus, setFotoStatus] = useState('');
  const [filaNome, setFilaNome] = useState('');
  const [filaId, setFilaId] = useState(null);
  const [erro, setErro] = useState('');
  const [aberto, setAberto] = useState(false);
  const nomeRef = useRef(null);

  useEffect(() => {
    if (editando && venda) {
      const c = clientes.find((x) => x.id === venda.clienteId);
      setClienteNome(c ? c.nome : '');
      setClienteId(venda.clienteId);
      setCodigo(venda.codigo);
      setPeca(venda.peca);
      setValor(String(venda.valor).replace('.', ','));
      setPago(venda.pago);
      setFila(venda.fila || []);
      if (venda.temFoto && carregarFoto) {
        setFotoStatus('carregando');
        carregarFoto(venda.id)
          .then((img) => {
            setFoto(img || null);
            setFotoStatus('');
          })
          .catch(() => setFotoStatus(''));
      }
    } else {
      setTimeout(() => nomeRef.current && nomeRef.current.focus(), 120);
    }
  }, []);

  const filaSugestoes = useMemo(() => {
    const q = norm(filaNome);
    if (!q || filaId) return [];
    return clientes.filter((c) => norm(c.nome).includes(q) && c.id !== clienteId).slice(0, 4);
  }, [filaNome, filaId, clientes, clienteId]);

  const addFila = () => {
    const nome = filaNome.trim();
    if (!nome) return;
    if (norm(nome) === norm(clienteNome)) {
      setErro('Essa já é a cliente principal da peça.');
      return;
    }
    if (fila.some((f) => norm(f.nome) === norm(nome))) {
      setErro(`${nome} já está na fila.`);
      return;
    }
    setFila([...fila, { nome, clienteId: filaId }]);
    setFilaNome('');
    setFilaId(null);
    setErro('');
  };

  const sugestoes = useMemo(() => {
    const q = norm(clienteNome);
    if (!q || clienteId) return [];
    return clientes
      .filter((c) => norm(c.nome).includes(q))
      .slice(0, 5)
      .map((c) => ({
        ...c,
        compras: 0,
      }));
  }, [clienteNome, clienteId, clientes]);

  const exataExiste = clientes.some((c) => norm(c.nome) === norm(clienteNome));

  const salvar = async () => {
    if (!clienteNome.trim()) return setErro('Falta o nome da cliente.');
    if (!peca.trim()) return setErro('Falta o nome da peça.');
    if (parseMoney(valor) <= 0) return setErro('Falta o valor da peça.');

    const cod = codigo.trim();
    if (cod) {
      const conflito = vendasDoDia.find(
        (v) => norm(v.codigo) === norm(cod) && (!editando || v.id !== venda.id)
      );
      if (conflito) {
        return setErro(`O código ${cod} já foi usado hoje em "${conflito.peca}".`);
      }
    }

    await onSave(
      { clienteId, clienteNome, codigo, peca, valor, pago, fila, foto, fotoMudou },
      editando ? venda : null
    );
    onFlash(editando ? 'Peça atualizada' : 'Peça lançada');
    onClose();
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={S.sheetHead}>
          <span style={S.sheetTitle}>{editando ? 'Editar peça' : 'Lançar peça'}</span>
          <button style={S.linkBtn} onClick={onClose}>
            Fechar
          </button>
        </div>

        <div style={{ padding: '4px 20px 20px', overflowY: 'auto' }}>
          {editando && (venda.fila || []).length > 0 && (
            <div style={S.passaBox}>
              <div style={S.passaTxt}>
                {venda.fila.length === 1
                  ? `${venda.fila[0].nome} está esperando essa peça.`
                  : `${venda.fila.length} clientes esperando. A primeira é ${venda.fila[0].nome}.`}
              </div>
              <button
                style={S.passaBtn}
                onClick={() => {
                  onPassar(venda);
                  onClose();
                }}
              >
                Passar para {venda.fila[0].nome}
              </button>
            </div>
          )}

          <label style={S.label}>Cliente</label>
          <div style={{ position: 'relative' }}>
            <input
              ref={nomeRef}
              style={S.input}
              value={clienteNome}
              placeholder="Comece a digitar o nome"
              onChange={(e) => {
                setClienteNome(e.target.value);
                setClienteId(null);
                setErro('');
                setAberto(true);
              }}
              onFocus={() => setAberto(true)}
            />
            {clienteId && <span style={S.okMark}>✓</span>}
          </div>

          {aberto && sugestoes.length > 0 && (
            <div style={S.sugBox}>
              {sugestoes.map((c) => (
                <button
                  key={c.id}
                  style={S.sugItem}
                  onClick={() => {
                    setClienteNome(c.nome);
                    setClienteId(c.id);
                    setAberto(false);
                  }}
                >
                  <span>{c.nome}</span>
                  <span style={{ color: t.inkFaint, fontSize: 13 }}>já cadastrada</span>
                </button>
              ))}
            </div>
          )}

          {clienteNome.trim() && !clienteId && !exataExiste && (
            <p style={S.hintNova}>
              Ninguém com esse nome no cadastro. Vai entrar como cliente nova.
            </p>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <div style={{ width: 96, flexShrink: 0 }}>
              <label style={S.label}>Código</label>
              <input
                style={S.input}
                value={codigo}
                inputMode="numeric"
                placeholder="12"
                onChange={(e) => { setCodigo(e.target.value); setErro(''); }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={S.label}>Peça</label>
              <input
                style={S.input}
                value={peca}
                placeholder="Blusa jeans"
                onChange={(e) => { setPeca(e.target.value); setErro(''); }}
              />
            </div>
          </div>

          <label style={{ ...S.label, marginTop: 16 }}>Valor</label>
          <input
            style={{ ...S.input, fontFamily: display, fontSize: 20 }}
            value={valor}
            inputMode="decimal"
            placeholder="0,00"
            onChange={(e) => { setValor(e.target.value); setErro(''); }}
          />

          <label style={{ ...S.label, marginTop: 16 }}>Pagamento</label>
          <div style={S.segmento}>
            <button
              style={{ ...S.segBtn, ...(!pago ? S.segOnPend : {}) }}
              onClick={() => setPago(false)}
            >
              Pendente
            </button>
            <button
              style={{ ...S.segBtn, ...(pago ? S.segOnPago : {}) }}
              onClick={() => setPago(true)}
            >
              Pago
            </button>
          </div>

          <label style={{ ...S.label, marginTop: 18 }}>
            Foto da peça <span style={{ color: t.inkFaint }}>· opcional</span>
          </label>

          {fotoStatus === 'carregando' ? (
            <div style={S.fotoVazia}>Abrindo a foto…</div>
          ) : foto ? (
            <div>
              <img src={foto} alt={peca || 'Peça'} style={S.fotoImg} />
              <button
                style={{ ...S.ctaGhost, marginTop: 8 }}
                onClick={() => {
                  setFoto(null);
                  setFotoMudou(true);
                }}
              >
                Remover foto
              </button>
            </div>
          ) : (
            <label style={S.fotoAdd}>
              {fotoStatus === 'comprimindo' ? 'Preparando a foto…' : 'Tirar ou escolher foto'}
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const arq = e.target.files && e.target.files[0];
                  if (!arq) return;
                  setFotoStatus('comprimindo');
                  try {
                    const menor = await comprimirImagem(arq);
                    setFoto(menor);
                    setFotoMudou(true);
                    setFotoStatus('');
                  } catch (err) {
                    setFotoStatus('');
                    setErro('Não deu para usar essa imagem. Tente outra.');
                  }
                  e.target.value = '';
                }}
              />
            </label>
          )}

          <label style={{ ...S.label, marginTop: 18 }}>
            Fila de espera <span style={{ color: t.inkFaint }}>· opcional</span>
          </label>

          {fila.length > 0 && (
            <div style={S.filaBox}>
              {fila.map((f, i) => (
                <div key={i} style={S.filaItem}>
                  <span style={S.filaPos}>{i + 1}</span>
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.nome}
                  </span>
                  <button
                    style={S.linkBtn}
                    onClick={() => setFila(fila.filter((_, j) => j !== i))}
                  >
                    Tirar
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: fila.length ? 8 : 0 }}>
            <input
              style={{ ...S.input, flex: 1, minWidth: 0 }}
              value={filaNome}
              placeholder="Quem fica esperando"
              onChange={(e) => {
                setFilaNome(e.target.value);
                setFilaId(null);
                setErro('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addFila();
                }
              }}
            />
            <button
              style={{ ...S.addFila, opacity: filaNome.trim() ? 1 : 0.4 }}
              disabled={!filaNome.trim()}
              onClick={addFila}
            >
              Entrar na fila
            </button>
          </div>

          {filaSugestoes.length > 0 && (
            <div style={S.sugBox}>
              {filaSugestoes.map((c) => (
                <button
                  key={c.id}
                  style={S.sugItem}
                  onClick={() => {
                    setFilaNome(c.nome);
                    setFilaId(c.id);
                  }}
                >
                  <span>{c.nome}</span>
                  <span style={{ color: t.inkFaint, fontSize: 13 }}>já cadastrada</span>
                </button>
              ))}
            </div>
          )}

          {erro && <p style={S.erro}>{erro}</p>}

          <button style={{ ...S.cta, marginTop: 20 }} onClick={salvar}>
            {editando ? 'Salvar alterações' : 'Salvar'}
          </button>
          {editando && (
            <button
              style={{ ...S.ctaGhost, color: t.rose, borderColor: t.roseSoft }}
              onClick={() => {
                onDelete(venda.id);
                onClose();
              }}
            >
              Excluir peça
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export { SheetVenda };
