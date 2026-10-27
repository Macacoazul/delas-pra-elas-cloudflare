/**
 * Delas pra Elas — o app da live.
 *
 * Lançar peças, ver o dia, o calendário e as clientes; mandar a lista de cada cliente pelo WhatsApp.
 * Os dados ficam no servidor (veja api.js); aqui ficam só as telas e as ações.
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { criarCliente, novoId } from './api.js';
import { criarArmazem } from './armazem.js';
import { t, S, sans, carregarFontes } from './estilos.js';
import {
  norm, brl, todayKey, shiftKey, dateLabel, parseMoney, preencher, CONFIG_PADRAO, calcResumo, dataCurta, arquivoNome, itemLinha, csvVendas,
} from './util.js';
import { planilhaDoDia } from './planilha.js';
import { Barreira } from './telas/erro.jsx';
import { Entrada } from './telas/entrada.jsx';
import { Resumo, GrupoCliente } from './telas/resumo.jsx';
import { SheetVenda } from './telas/venda.jsx';
import { Clientes } from './telas/clientes.jsx';
import { Calendario } from './telas/calendario.jsx';
import { SheetMensagem, SheetExport, SheetBackup } from './telas/exportar.jsx';
import { SheetConta, SheetTrocarSenha, SheetEquipe, SheetRestaurar } from './telas/conta.jsx';

/* ── avisos de conexão ──────────────────────────────────── */
const alteracoes = (n) => `${n} ${n === 1 ? 'alteração guardada' : 'alterações guardadas'}`;

function FaixaDeConexao({ conexao, pendentes }) {
  if (conexao === 'ok' && !pendentes) return null;
  let texto;
  if (conexao === 'sem-rede') {
    texto = pendentes
      ? `Sem internet. ${alteracoes(pendentes)} no celular; ${pendentes === 1 ? 'sobe sozinha' : 'sobem sozinhas'} quando a conexão voltar.`
      : 'Sem internet. O que você lançar fica guardado no celular e sobe sozinho quando a conexão voltar.';
  } else if (conexao === 'erro') {
    texto = `O servidor não respondeu agora. Tentando de novo. ${pendentes ? `${alteracoes(pendentes)} no celular.` : ''}`;
  } else {
    texto = `Enviando ${pendentes} ${pendentes === 1 ? 'alteração' : 'alterações'}…`;
  }
  return (
    <div style={{ ...S.faixa, ...(conexao === 'erro' ? S.faixaErro : {}) }} role="status">
      {texto}
    </div>
  );
}

function TelaSimples({ children }) {
  return (
    <div style={{ ...S.screen, alignItems: 'center', justifyContent: 'center', display: 'flex', padding: 24 }}>
      <div style={{ textAlign: 'center', fontFamily: sans, color: t.inkSoft, maxWidth: 340, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

/* ── cliente de venda ───────────────────────────────────── */
/* Encontra a cliente pelo id, ou pelo nome já cadastrado.
   Se não existir, devolve uma ficha nova para ser gravada. */
function resolverCliente(clientes, clienteId, nome) {
  if (clienteId) return { id: clienteId, nova: null };
  const existente = clientes.find((c) => norm(c.nome) === norm(nome));
  if (existente) return { id: existente.id, nova: null };
  const id = novoId();
  return { id, nova: { id, nome: (nome || '').trim(), whatsapp: '', preExistente: false, criadaEm: todayKey() } };
}

/** A alteração que cria uma ficha de cliente nova. */
const gravarNova = ({ id, ...dados }) => ({ col: 'clientes', id, op: 'set', dados });

const DIA_VALIDO = /^\d{4}-\d{2}-\d{2}$/;

/** O estado do cliente (api.js) como o React gosta: a tela refaz sempre que ele muda. */
function useEstado(cliente) {
  const [estado, setEstado] = useState(cliente.estado());
  useEffect(() => {
    setEstado(cliente.estado());
    return cliente.assinar(setEstado);
  }, [cliente]);
  return estado;
}

/* ── app ────────────────────────────────────────────────── */
function App({ cliente }) {
  const estado = useEstado(cliente);
  const [tab, setTab] = useState('hoje');
  const [dia, setDia] = useState(todayKey());
  const [sheet, setSheet] = useState(null); // null | {mode:'new'} | {mode:'edit', venda}
  const [backup, setBackup] = useState(null);
  const [exportar, setExportar] = useState(null);
  const [msg, setMsg] = useState(false);
  const [conta, setConta] = useState(null); // null | 'menu' | 'senha' | 'equipe' | 'restaurar'
  const [toast, setToast] = useState('');
  const relogioDoAviso = useRef(null);

  const flash = (texto) => {
    setToast(texto);
    clearTimeout(relogioDoAviso.current);
    relogioDoAviso.current = setTimeout(() => setToast(''), Math.max(2200, Math.min(7000, texto.length * 70)));
  };

  /* Avisos do próprio cliente (por exemplo, uma alteração que o servidor recusou). */
  const numeroDoAviso = estado.aviso ? estado.aviso.n : 0;
  useEffect(() => {
    if (estado.aviso) flash(estado.aviso.texto);
  }, [numeroDoAviso]);

  /* Quem está mexendo no app confere o servidor com mais frequência. */
  useEffect(() => {
    const marcar = () => cliente.marcarAtividade();
    window.addEventListener('pointerdown', marcar, { passive: true });
    window.addEventListener('keydown', marcar);
    return () => {
      window.removeEventListener('pointerdown', marcar);
      window.removeEventListener('keydown', marcar);
    };
  }, [cliente]);

  const config = useMemo(() => ({ ...CONFIG_PADRAO, ...estado.config }), [estado.config]);

  /* A primeira compra de cada cliente é sempre calculada a partir das
     vendas, nunca guardada solta. Assim editar, excluir ou passar peça
     para a fila corrige a marcação nova/antiga sozinho. */
  const data = useMemo(() => {
    const primeira = {};
    estado.vendas.forEach((v) => {
      if (!primeira[v.clienteId] || v.data < primeira[v.clienteId]) primeira[v.clienteId] = v.data;
    });
    return {
      clientes: estado.clientes.map((c) => ({ ...c, primeiraCompra: primeira[c.id] || null })),
      vendas: estado.vendas,
      config,
    };
  }, [estado.clientes, estado.vendas, config]);

  const avisarErro = (e) => {
    console.error(e);
    flash('Não deu para salvar. Tente de novo.');
  };

  /** Registra as alterações: aparecem na tela na hora e sobem para o servidor assim que houver internet. */
  const gravar = async (ops) => {
    try {
      await cliente.gravar(ops);
      return true;
    } catch (e) {
      avisarErro(e);
      return false;
    }
  };

  /* derivados do dia */
  const vendasDoDia = useMemo(
    () => data.vendas.filter((v) => v.data === dia),
    [data.vendas, dia]
  );

  const clientePorId = useMemo(() => {
    const m = {};
    data.clientes.forEach((c) => (m[c.id] = c));
    return m;
  }, [data.clientes]);

  const resumo = useMemo(
    () => calcResumo(data.vendas, data.clientes, dia),
    [data.vendas, data.clientes, dia]
  );

  const grupos = useMemo(() => {
    const map = new Map();
    vendasDoDia.forEach((v) => {
      if (!map.has(v.clienteId)) map.set(v.clienteId, []);
      map.get(v.clienteId).push(v);
    });
    return [...map.entries()]
      .map(([id, vs]) => ({
        cliente: clientePorId[id],
        vendas: [...vs].sort((a, b) => b.criadaEm - a.criadaEm),
        total: vs.reduce((s, v) => s + v.valor, 0),
        ultima: Math.max(...vs.map((v) => v.criadaEm)),
      }))
      .sort((a, b) => b.ultima - a.ultima);
  }, [vendasDoDia, clientePorId]);
  /* ações */
  const salvarVenda = async (form, vendaEditada) => {
    const novas = [];
    const lista = [...data.clientes];

    const r = resolverCliente(lista, form.clienteId, form.clienteNome);
    if (r.nova) {
      novas.push(r.nova);
      lista.push(r.nova);
    }

    // Cada pessoa da fila também vira uma cliente de verdade aqui.
    // Sem isso a fila guardaria só um nome solto, e transferir a peça
    // depois poderia criar uma segunda ficha para a mesma pessoa.
    const fila = (form.fila || []).map((f) => {
      const rf = resolverCliente(lista, f.clienteId, f.nome);
      if (rf.nova) {
        novas.push(rf.nova);
        lista.push(rf.nova);
      }
      const c = lista.find((x) => x.id === rf.id);
      return { nome: c ? c.nome : f.nome, clienteId: rf.id };
    });

    const id = vendaEditada ? vendaEditada.id : novoId();
    let temFoto = vendaEditada ? !!vendaEditada.temFoto : false;
    const ops = [];
    if (form.fotoMudou) {
      // A foto vai no mesmo pacote da venda: ou sobem as duas, ou nenhuma.
      if (form.foto) {
        ops.push({ col: 'fotos', id, op: 'set', dados: { imagem: form.foto } });
        temFoto = true;
      } else {
        ops.push({ col: 'fotos', id, op: 'apagar' });
        temFoto = false;
      }
    }
    novas.forEach((c) => ops.push(gravarNova(c)));
    ops.push({
      col: 'vendas',
      id,
      op: 'set',
      dados: {
        data: vendaEditada ? vendaEditada.data : dia,
        criadaEm: vendaEditada ? vendaEditada.criadaEm : Date.now(),
        clienteId: r.id,
        codigo: form.codigo.trim(),
        peca: form.peca.trim(),
        valor: parseMoney(form.valor),
        pago: form.pago,
        fila,
        temFoto,
      },
    });
    await gravar(ops);
    return r.id;
  };

  const passarFila = async (venda) => {
    const fila = venda.fila || [];
    if (fila.length === 0) return;
    const [proxima, ...resto] = fila;
    const r = resolverCliente(data.clientes, proxima.clienteId, proxima.nome);
    const ops = [];
    if (r.nova) ops.push(gravarNova(r.nova));
    ops.push({ col: 'vendas', id: venda.id, op: 'mesclar', dados: { clienteId: r.id, fila: resto, pago: false } });
    if (await gravar(ops)) flash(`Peça passou para ${proxima.nome}`);
  };

  const excluirVenda = async (id) => {
    if (await gravar([{ col: 'vendas', id, op: 'apagar' }, { col: 'fotos', id, op: 'apagar' }])) flash('Peça excluída');
  };

  const mesclarClientes = async (deId, paraId) => {
    const de = data.clientes.find((c) => c.id === deId);
    const para = data.clientes.find((c) => c.id === paraId);
    if (!de || !para) return;

    const ops = [];
    data.vendas.forEach((v) => {
      const naFila = (v.fila || []).some((f) => f.clienteId === deId);
      if (v.clienteId !== deId && !naFila) return;

      const fila = [];
      (v.fila || []).forEach((f) => {
        const id = f.clienteId === deId ? paraId : f.clienteId;
        if (fila.some((x) => x.clienteId === id)) return; // a mesma pessoa não fica duas vezes na fila
        fila.push({ nome: id === paraId ? para.nome : f.nome, clienteId: id });
      });
      ops.push({ col: 'vendas', id: v.id, op: 'mesclar', dados: { clienteId: v.clienteId === deId ? paraId : v.clienteId, fila } });
    });
    ops.push({
      col: 'clientes',
      id: paraId,
      op: 'mesclar',
      dados: { whatsapp: para.whatsapp || de.whatsapp || '', preExistente: !!(para.preExistente || de.preExistente) },
    });
    // O cadastro antigo só é apagado no último pacote: se algo parar no meio, dá para juntar de novo.
    ops.push({ col: 'clientes', id: deId, op: 'apagar' });
    if (await gravar(ops)) flash(`${de.nome} foi juntada em ${para.nome}`);
  };

  const togglePago = (id, pago) => gravar([{ col: 'vendas', id, op: 'mesclar', dados: { pago: !pago } }]);

  const carregarFoto = (idVenda) => cliente.foto(idVenda);

  /* exportações */
  const exportarCliente = (g) => {
    const c = g.cliente;
    const cfg = data.config || CONFIG_PADRAO;

    // desta live
    const ordem = [...g.vendas].reverse();
    const pagoDia = ordem.filter((v) => v.pago).reduce((s, v) => s + v.valor, 0);
    const vals = {
      nome: c.nome,
      data: dataCurta(dia),
      total: brl(g.total),
      apagar: brl(g.total - pagoDia),
    };
    const corpo =
      ordem.map((v) => itemLinha(v, false)).join('\n') +
      `\n\n*Valor total: ${brl(g.total)}*` +
      `\n*Valor a pagar: ${brl(g.total - pagoDia)}*`;

    const abertura = preencher(cfg.abertura, vals).trim();
    const fechamento = preencher(cfg.fechamento, vals).trim();
    const txtDia = [abertura, corpo, fechamento].filter(Boolean).join('\n\n');

    // histórico dela, live por live
    const todas = data.vendas
      .filter((v) => v.clienteId === c.id)
      .sort((a, b) => a.data.localeCompare(b.data) || a.criadaEm - b.criadaEm);
    const totalGeral = todas.reduce((s, v) => s + v.valor, 0);
    const pagoGeral = todas.filter((v) => v.pago).reduce((s, v) => s + v.valor, 0);
    const porData = [];
    todas.forEach((v) => {
      const bloco = porData.find((b) => b.data === v.data);
      if (bloco) bloco.itens.push(v);
      else porData.push({ data: v.data, itens: [v] });
    });
    let txtTudo = `*Delas pra Elas*\n*${c.nome}* — histórico\n\n`;
    txtTudo += porData
      .map((b) => `${dataCurta(b.data)}\n${b.itens.map((v) => itemLinha(v, false)).join('\n')}`)
      .join('\n\n');
    txtTudo += `\n\n*Valor total: ${brl(totalGeral)}*`;
    txtTudo += `\n*Valor a pagar: ${brl(totalGeral - pagoGeral)}*`;

    setExportar({
      titulo: c.nome,
      whatsapp: c.whatsapp,
      opcoes: [
        {
          rotulo: 'Desta live',
          texto: txtDia,
          csv: csvVendas(g.vendas, data.clientes),
          arquivo: `${arquivoNome(c.nome)}-${dia}.csv`,
        },
        {
          rotulo: 'Histórico dela',
          texto: txtTudo,
          csv: csvVendas(todas, data.clientes),
          arquivo: `${arquivoNome(c.nome)}-historico.csv`,
        },
      ],
    });
  };

  const exportarDia = () => {
    const blocos = [...grupos].reverse().map((g) => {
      const itens = [...g.vendas].reverse().map((v) => `   ${itemLinha(v, true)}`).join('\n');
      const qtd = `${g.vendas.length} ${g.vendas.length === 1 ? 'peça' : 'peças'}`;
      const pago = g.vendas.filter((v) => v.pago).reduce((s, v) => s + v.valor, 0);
      let bloco = `*${g.cliente.nome}* — ${brl(g.total)} (${qtd})\n${itens}`;
      if (g.total - pago > 0) bloco += `\n   A pagar: ${brl(g.total - pago)}`;
      return bloco;
    });
    let txt = `*Delas pra Elas*\nLive de ${dataCurta(dia)}\n\n${blocos.join('\n\n')}`;
    txt += `\n\n──────────\n*Valor total: ${brl(resumo.total)}*`;
    txt += `\n*Valor a pagar: ${brl(resumo.pendente)}*`;
    txt += `\nPeças: ${resumo.pecas}`;
    txt += `\nClientes: ${resumo.clientes}`;
    if (resumo.novas > 0)
      txt += ` (${resumo.novas} ${resumo.novas === 1 ? 'nova' : 'novas'})`;
    setExportar({
      titulo: `Live de ${dataCurta(dia)}`,
      opcoes: [
        {
          rotulo: 'Live do dia',
          texto: txt,
          arquivo: `live-${dia}.xlsx`,
          rotuloArquivo: 'Baixar planilha da live (.xlsx)',
          gerarArquivo: () =>
            new Blob([planilhaDoDia(grupos, dataCurta(dia).replace(/\//g, '-'))], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            }),
        },
      ],
    });
  };

  const exportarTudo = () => {
    const dias = [...new Set(data.vendas.map((v) => v.data))].sort();
    const linhas = dias.map((d) => {
      const r = calcResumo(data.vendas, data.clientes, d);
      let l = `${dataCurta(d)} — ${brl(r.total)} · ${r.pecas} ${r.pecas === 1 ? 'peça' : 'peças'} · ${r.clientes} ${r.clientes === 1 ? 'cliente' : 'clientes'}`;
      if (r.novas > 0) l += ` (${r.novas} ${r.novas === 1 ? 'nova' : 'novas'})`;
      return l;
    });
    const total = data.vendas.reduce((s, v) => s + v.valor, 0);
    const pago = data.vendas.filter((v) => v.pago).reduce((s, v) => s + v.valor, 0);
    let txt = `*Delas pra Elas* — histórico completo\n\n${linhas.join('\n')}`;
    txt += `\n\n──────────\n*Valor total: ${brl(total)}*`;
    txt += `\n*Valor a pagar: ${brl(total - pago)}*`;
    txt += `\nLives: ${dias.length}\nPeças: ${data.vendas.length}`;
    setExportar({
      titulo: 'Histórico completo',
      opcoes: [
        {
          rotulo: 'Tudo',
          texto: txt,
          csv: csvVendas(data.vendas, data.clientes),
          arquivo: 'historico-delas-pra-elas.csv',
        },
      ],
    });
  };
  const salvarCliente = async (c) => {
    const dados = { nome: c.nome, whatsapp: c.whatsapp || '', preExistente: !!c.preExistente };
    if (DIA_VALIDO.test(c.criadaEm || '')) dados.criadaEm = c.criadaEm;
    else if (!c.id) dados.criadaEm = todayKey();
    await gravar([{ col: 'clientes', id: c.id || novoId(), op: 'mesclar', dados }]);
  };

  const salvarConfig = (cfg) => gravar([{ col: 'config', id: 'geral', op: 'mesclar', dados: cfg }]);

  if (estado.tela === 'abrindo') return <TelaSimples>Abrindo…</TelaSimples>;

  if (estado.tela === 'falha') {
    return (
      <TelaSimples>
        <p style={{ margin: '0 0 16px' }}>{estado.falhaInicial}</p>
        <button style={S.cta} onClick={() => cliente.tentarDeNovo()}>
          Tentar de novo
        </button>
      </TelaSimples>
    );
  }

  if (estado.tela === 'entrada') {
    return <Entrada primeiroAcesso={estado.primeiroAcesso} sessaoPerdida={estado.sessaoPerdida} aoEntrar={cliente.entrar} aoCriar={cliente.criarPrimeiraConta} />;
  }

  if (estado.tela === 'carregando') {
    return (
      <TelaSimples>
        <p style={{ margin: 0 }}>{estado.conexao === 'ok' ? 'Carregando os dados…' : 'Sem conexão com o servidor. Tentando de novo…'}</p>
      </TelaSimples>
    );
  }

  return (
    <div style={S.screen}>
      <div style={S.frame}>
        <header style={S.header}>
          <div style={S.brandRow}>
            <span style={S.brand}>Delas pra Elas</span>
            <button style={S.linkBtn} onClick={() => setConta('menu')}>
              Conta
            </button>
          </div>
          <div style={S.tabs}>
            <button
              style={{ ...S.tab, ...(tab === 'hoje' ? S.tabOn : {}) }}
              onClick={() => setTab('hoje')}
            >
              Live
            </button>
            <button
              style={{ ...S.tab, ...(tab === 'calendario' ? S.tabOn : {}) }}
              onClick={() => setTab('calendario')}
            >
              Calendário
            </button>
            <button
              style={{ ...S.tab, ...(tab === 'clientes' ? S.tabOn : {}) }}
              onClick={() => setTab('clientes')}
            >
              Clientes
            </button>
          </div>
        </header>

        <FaixaDeConexao conexao={estado.conexao} pendentes={estado.pendentes} />

        {tab === 'hoje' ? (
          <>
            <div style={S.dateRow}>
              <button style={S.arrow} onClick={() => setDia(shiftKey(dia, -1))} aria-label="Dia anterior">
                ‹
              </button>
              <div style={{ textAlign: 'center' }}>
                <button style={S.dateTxt} onClick={() => setTab('calendario')}>
                  {dateLabel(dia)}
                </button>
                {dia !== todayKey() && (
                  <button style={S.todayBtn} onClick={() => setDia(todayKey())}>
                    voltar para hoje
                  </button>
                )}
              </div>
              <button
                style={{ ...S.arrow, opacity: dia >= todayKey() ? 0.25 : 1 }}
                disabled={dia >= todayKey()}
                onClick={() => setDia(shiftKey(dia, 1))}
                aria-label="Próximo dia"
              >
                ›
              </button>
            </div>

            <Resumo r={resumo} />

            <main style={S.list}>
              {grupos.length === 0 ? (
                <div style={S.empty}>
                  <p style={S.emptyTitle}>Nenhuma peça lançada neste dia.</p>
                  <p style={S.emptyTxt}>
                    Toque em <strong>Lançar peça</strong> assim que a primeira venda sair.
                  </p>
                </div>
              ) : (
                grupos.map((g) => (
                  <GrupoCliente
                    key={g.cliente?.id || 'x'}
                    g={g}
                    dia={dia}
                    onToggle={togglePago}
                    onEdit={(v) => setSheet({ mode: 'edit', venda: v })}
                    onExportar={() => exportarCliente(g)}
                  />
                ))
              )}
              {grupos.length > 0 && (
                <button style={{ ...S.ctaGhost, marginTop: 8 }} onClick={exportarDia}>
                  Exportar relatório do dia
                </button>
              )}
              <div style={{ height: 96 }} />
            </main>

            <div style={S.dock}>
              <button style={S.cta} onClick={() => setSheet({ mode: 'new' })}>
                Lançar peça
              </button>
            </div>
          </>
        ) : tab === 'calendario' ? (
          <Calendario
            data={data}
            dia={dia}
            onEscolher={(d) => {
              setDia(d);
              setTab('hoje');
            }}
          />
        ) : (
          <Clientes
            data={data}
            dia={dia}
            onSave={salvarCliente}
            onFlash={flash}
            onExport={() => setBackup(JSON.stringify(data, null, 2))}
            onExportTudo={exportarTudo}
            onMesclar={mesclarClientes}
            onEditarMensagem={() => setMsg(true)}
          />
        )}
      </div>

      {sheet && (
        <SheetVenda
          mode={sheet.mode}
          venda={sheet.venda}
          clientes={data.clientes}
          vendasDoDia={vendasDoDia}
          onClose={() => setSheet(null)}
          onSave={salvarVenda}
          onDelete={excluirVenda}
          onPassar={passarFila}
          onFlash={flash}
          carregarFoto={carregarFoto}
        />
      )}

      {exportar && (
        <SheetExport dados={exportar} onClose={() => setExportar(null)} onFlash={flash} />
      )}

      {msg && (
        <SheetMensagem
          config={data.config || CONFIG_PADRAO}
          onClose={() => setMsg(false)}
          onFlash={flash}
          onSave={salvarConfig}
        />
      )}

      {backup && <SheetBackup texto={backup} onClose={() => setBackup(null)} onFlash={flash} />}

      {conta === 'menu' && (
        <SheetConta
          usuario={estado.usuario}
          pendentes={estado.pendentes}
          aoFechar={() => setConta(null)}
          aoAbrir={setConta}
          aoSair={cliente.sair}
        />
      )}
      {conta === 'senha' && <SheetTrocarSenha aoFechar={() => setConta(null)} aoTrocar={cliente.trocarSenha} aoAvisar={flash} />}
      {conta === 'equipe' && <SheetEquipe aoFechar={() => setConta(null)} equipe={cliente.equipe} meuEmail={estado.usuario.email} aoAvisar={flash} />}
      {conta === 'restaurar' && <SheetRestaurar aoFechar={() => setConta(null)} aoImportar={cliente.importarBackup} aoAvisar={flash} />}

      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  );
}

/* ── ponto de entrada ───────────────────────────────────── */
async function abrir() {
  carregarFontes();
  const cliente = criarCliente({ armazem: await criarArmazem() });
  createRoot(document.getElementById('app')).render(
    <Barreira>
      <App cliente={cliente} />
    </Barreira>,
  );
  cliente.iniciar();
}

abrir();
