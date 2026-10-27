import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  t, S, sans, display, norm, brl, brlCentavos, lerNumero, soDigitos, num, pesoTexto,
  dataHora, diaMes, httpsOuVazio, waLink, preencher, configDoBanco, CONFIG_FRETE_PADRAO, linkDoFrete,
} from './base.js';
import { chamar, quemSou, listarClientes, acompanharFretes } from './dados.js';
import { carregarFontes } from '../estilos.js';
import { Folha, LinhaCopiavel, ChipStatus, BotaoAcao, ConfirmarDuplo } from './componentes.jsx';
import { SheetAjustes, SheetConexoes } from './ajustes.jsx';

const primeiroNome = (s) => String(s || '').trim().split(/\s+/)[0] || '';

/* ── como cada situação aparece na lista ────────────────── */
function situacao(f, agora) {
  const p = f.pagamento;
  switch (f.status) {
    case 'criado':
      return f.cep ? { txt: 'Cliente escolhendo o frete', cor: 'amber' } : { txt: 'Aguardando a cliente abrir o link', cor: 'amber' };
    case 'aguardando_pagamento':
      return p && p.status === 'pending' && p.expiraEm && p.expiraEm < agora
        ? { txt: 'Pix venceu sem pagamento', cor: 'amber' }
        : { txt: 'Aguardando o Pix', cor: 'amber' };
    case 'pago':
      return { txt: 'Pago · gerar etiqueta', cor: 'green' };
    case 'etiqueta':
      return { txt: 'Etiqueta pronta · falta postar', cor: 'green' };
    case 'postado':
      return { txt: 'Postado · a caminho', cor: 'neutral' };
    case 'entregue':
      return { txt: 'Entregue', cor: 'neutral' };
    case 'cancelado':
      return { txt: 'Cancelado', cor: 'neutral' };
    default:
      return { txt: f.status || '—', cor: 'neutral' };
  }
}

const FILTROS = [
  ['ativos', 'Ativos', (f) => f.status !== 'entregue' && f.status !== 'cancelado'],
  ['aguardando', 'Aguardando', (f) => f.status === 'criado' || f.status === 'aguardando_pagamento'],
  ['enviar', 'Para enviar', (f) => f.status === 'pago' || f.status === 'etiqueta'],
  ['caminho', 'A caminho', (f) => f.status === 'postado'],
  ['todos', 'Todos', () => true],
];

function textoPagamento(f, agora) {
  const p = f.pagamento;
  if (!p) return f.status === 'cancelado' ? '—' : 'A cliente ainda não escolheu o frete';
  if (p.status === 'approved') return `Pago em ${dataHora(p.pagoEm)}`;
  if (p.status === 'pending') {
    return p.expiraEm > agora ? `Aguardando o Pix (vale até ${dataHora(p.expiraEm)})` : 'Pix venceu sem pagamento';
  }
  if (p.status === 'refunded') return 'Pagamento estornado';
  return { expired: 'Pix venceu', cancelled: 'Pix cancelado', rejected: 'Pix recusado' }[p.status] || String(p.status);
}

/* ── lista ──────────────────────────────────────────────── */
function CartaoFrete({ f, agora, onAbrir }) {
  const s = situacao(f, agora);
  const preco = f.servico ? brlCentavos(f.servico.precoCentavos) : '';
  const pacote = f.caixa ? `${f.caixa.nome} · ${pesoTexto(f.pesoKg)}` : '';
  const destino = f.cidade ? `${f.cidade}/${f.uf}` : '';
  return (
    <button style={{ ...S.card, ...(f.status === 'pago' ? { borderColor: t.green } : {}) }} onClick={() => onAbrir(f.id)}>
      <div style={S.cardTop}>
        <div style={{ minWidth: 0 }}>
          <div style={S.cliNome}>{f.clienteNome}</div>
          <div style={S.cliSub}>
            {[pacote, destino, f.servico ? `${f.servico.empresa} ${f.servico.nome}` : ''].filter(Boolean).join(' · ')}
          </div>
        </div>
        {preco && <div style={S.preco}>{preco}</div>}
      </div>
      <ChipStatus cor={s.cor}>{s.txt}</ChipStatus>
      <span style={{ fontSize: 12, color: t.inkFaint, marginLeft: 8 }}>{dataHora(f.criadoEm)}</span>
      {f.alerta && f.alerta.texto && <div style={S.alertaLinha}>{f.alerta.texto}</div>}
    </button>
  );
}

/* ── novo frete ─────────────────────────────────────────── */
const PESOS_RAPIDOS = [0.3, 0.5, 1, 1.5, 2, 3];

function SheetNovo({ clientes, config, onClose, onFlash, aoMudar }) {
  const [nome, setNome] = useState('');
  const [cliente, setCliente] = useState(null);
  const [wpp, setWpp] = useState('');
  const [caixaId, setCaixaId] = useState(config.caixas[0].id);
  const [peso, setPeso] = useState('');
  const [declarado, setDeclarado] = useState(String(config.valorDeclaradoPadrao).replace('.', ','));
  const [conteudo, setConteudo] = useState(config.conteudoPadrao);
  const [obs, setObs] = useState('');
  const [mais, setMais] = useState(false);
  const [live, setLive] = useState(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [criado, setCriado] = useState(null);

  const sugestoes = useMemo(() => {
    const q = norm(nome);
    if (!q || cliente) return [];
    return clientes.filter((c) => norm(c.nome).includes(q)).slice(0, 6);
  }, [nome, cliente, clientes]);

  /* Total das peças da cliente na última live: ajuda a preencher o valor declarado (o seguro do envio). */
  useEffect(() => {
    setLive(null);
    if (!cliente || !cliente.id) return undefined;
    let vivo = true;
    chamar('vendasDaCliente', { clienteId: cliente.id })
      .then((vendas) => {
        if (!vivo || !Array.isArray(vendas) || !vendas.length) return;
        const ultima = vendas.reduce((m, v) => (v.data > m ? v.data : m), '');
        const total = vendas.filter((v) => v.data === ultima).reduce((x, v) => x + (Number(v.valor) || 0), 0);
        if (total > 0) setLive({ data: ultima, total });
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [cliente]);

  const escolher = (c) => {
    setCliente(c);
    setNome(c.nome);
    setWpp(c.whatsapp || '');
    setErro('');
  };

  const criar = async () => {
    const pesoNum = lerNumero(peso);
    const declNum = lerNumero(declarado);
    if (nome.trim().length < 2) return setErro('Escreva o nome da cliente.');
    if (!config.origemCep) return setErro('Antes de criar links, informe o CEP de origem em Ajustes.');
    if (!Number.isFinite(pesoNum) || pesoNum < 0.01 || pesoNum > 30) return setErro('Informe o peso em kg (entre 0,01 e 30).');
    if (!Number.isFinite(declNum) || declNum < 1 || declNum > 10000) return setErro('O valor declarado deve ficar entre R$ 1,00 e R$ 10.000,00.');
    setSalvando(true);
    setErro('');
    try {
      const r = await chamar('criarFrete', {
        clienteId: cliente ? cliente.id : '',
        clienteNome: nome.trim(),
        whatsapp: soDigitos(wpp),
        caixaId,
        pesoKg: pesoNum,
        valorDeclarado: declNum,
        conteudo: conteudo.trim(),
        observacao: obs.trim(),
      });
      aoMudar();
      setCriado({ ...r, nome: nome.trim(), whatsapp: wpp });
    } catch (e) {
      setErro(e.message);
    }
    setSalvando(false);
  };

  if (criado) {
    const link = linkDoFrete(config, criado.token);
    const mensagem = preencher(config.mensagemLink, { nome: primeiroNome(criado.nome), link });
    return (
      <Folha titulo="Link pronto" onClose={onClose}>
        <p style={{ ...S.subtitulo, lineHeight: 1.5 }}>
          Envie para <strong>{primeiroNome(criado.nome)}</strong>. Ela digita o CEP, escolhe o frete e paga o Pix.
          Você é avisada aqui quando cair.
        </p>
        <LinhaCopiavel texto={link} onCopiado={(ok) => onFlash(ok ? 'Link copiado' : 'Não consegui copiar')} />
        <a style={{ ...S.ctaVerde, marginTop: 14 }} href={waLink(criado.whatsapp, mensagem)} target="_blank" rel="noopener noreferrer">
          Enviar pelo WhatsApp
        </a>
        <button
          style={S.ctaGhost}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(mensagem);
              onFlash('Mensagem copiada');
            } catch {
              onFlash('Não consegui copiar');
            }
          }}
        >
          Copiar a mensagem pronta
        </button>
        <button style={{ ...S.ctaGhost, border: 'none' }} onClick={onClose}>
          Concluir
        </button>
      </Folha>
    );
  }

  return (
    <Folha titulo="Novo frete" onClose={onClose}>
      <label style={{ ...S.label, marginTop: 4 }}>Cliente</label>
      <input
        style={S.input}
        value={nome}
        placeholder="Nome da cliente"
        autoCapitalize="words"
        onChange={(e) => {
          setNome(e.target.value);
          setCliente(null);
          setErro('');
        }}
      />
      {sugestoes.length > 0 && (
        <div style={S.sugBox}>
          {sugestoes.map((c) => (
            <button key={c.id} style={S.sugItem} onClick={() => escolher(c)}>
              <span>{c.nome}</span>
              <span style={{ fontSize: 13, color: t.inkFaint }}>{c.whatsapp || ''}</span>
            </button>
          ))}
        </div>
      )}

      <label style={S.label}>WhatsApp da cliente</label>
      <input style={S.input} type="tel" inputMode="tel" placeholder="(47) 99999-9999" value={wpp} onChange={(e) => setWpp(e.target.value)} />

      <label style={S.label}>Caixa</label>
      <div style={S.segmento} role="group" aria-label="Caixa">
        {config.caixas.map((c) => (
          <button key={c.id} style={{ ...S.segBtn, ...(caixaId === c.id ? S.segOn : {}) }} onClick={() => setCaixaId(c.id)} aria-pressed={caixaId === c.id}>
            <div>{c.nome}</div>
            <div style={{ fontSize: 12, marginTop: 2, opacity: 0.85 }}>
              {num(c.comprimento)}×{num(c.largura)}×{num(c.altura)} cm
            </div>
          </button>
        ))}
      </div>
      <p style={S.ajuda}>Comprimento × largura × altura. Para mudar as caixas: Ajustes.</p>

      <label style={S.label}>Peso do pacote (kg)</label>
      <input style={S.input} inputMode="decimal" placeholder="Ex.: 0,8" value={peso} onChange={(e) => { setPeso(e.target.value); setErro(''); }} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        {PESOS_RAPIDOS.map((p) => (
          <button key={p} style={S.dica} onClick={() => { setPeso(String(p).replace('.', ',')); setErro(''); }}>
            {pesoTexto(p)}
          </button>
        ))}
      </div>

      <label style={S.label}>Valor declarado (seguro do envio)</label>
      <input style={S.input} inputMode="decimal" value={declarado} onChange={(e) => setDeclarado(e.target.value)} />
      {live && (
        <div style={{ marginTop: 8 }}>
          <button style={S.dica} onClick={() => setDeclarado(String(live.total.toFixed(2)).replace('.', ','))}>
            {brl(live.total)} · peças da live de {diaMes(live.data)}
          </button>
        </div>
      )}
      <p style={S.ajuda}>O valor das peças você já cobrou; aqui só entra o frete. Este valor serve para o seguro e para a etiqueta.</p>

      <button style={{ ...S.linkRose, marginTop: 14 }} onClick={() => setMais(!mais)}>
        {mais ? 'Ocultar' : 'Mais opções'}
      </button>
      {mais && (
        <>
          <label style={{ ...S.label, marginTop: 6 }}>Conteúdo (aparece na etiqueta)</label>
          <input style={S.input} value={conteudo} maxLength={80} onChange={(e) => setConteudo(e.target.value)} />
          <label style={S.label}>Observação só sua (a cliente não vê)</label>
          <input style={S.input} value={obs} maxLength={200} onChange={(e) => setObs(e.target.value)} />
        </>
      )}

      {erro && <p style={S.erro} role="alert">{erro}</p>}
      <BotaoAcao estilo={{ ...S.cta, marginTop: 20 }} ocupado={salvando} rotulo="Gerar link" rotuloOcupado="Gerando…" onClick={criar} />
    </Folha>
  );
}

/* ── detalhe do frete ───────────────────────────────────── */
function SheetDetalhe({ f, config, onClose, onFlash, aoMudar }) {
  const [ocupado, setOcupado] = useState('');
  const [erro, setErro] = useState('');
  const [etq, setEtq] = useState(null);
  const [confirmar, setConfirmar] = useState(null);
  const agora = Date.now();

  if (!f) {
    return (
      <Folha titulo="Frete" onClose={onClose}>
        <p style={S.subtitulo}>Este frete não está mais na lista.</p>
      </Folha>
    );
  }

  const nome = primeiroNome(f.clienteNome);
  const link = linkDoFrete(config, f.token);
  const s = situacao(f, agora);
  const r = f.rastreio && f.rastreio.codigo ? f.rastreio : null;
  const etiquetaPronta = f.etiqueta && f.etiqueta.etapa === 'gerada';
  const servicoTxt = f.servico ? `${f.servico.empresa} ${f.servico.nome}` : '';

  const rodar = async (qual, fn) => {
    if (ocupado) return;
    setOcupado(qual);
    setErro('');
    try {
      await fn();
      aoMudar();
    } catch (e) {
      setErro(e.message);
    }
    setOcupado('');
  };

  const conferir = () =>
    rodar('conferir', async () => {
      await chamar('atualizarFrete', { freteId: f.id });
      onFlash('Conferido agora');
    });

  const gerar = (confirmarDiferenca) =>
    rodar('gerar', async () => {
      const resp = await chamar('gerarEtiqueta', { freteId: f.id, confirmarDiferenca: !!confirmarDiferenca });
      if (resp.precisaConfirmar) {
        setConfirmar(resp);
        return;
      }
      setConfirmar(null);
      setEtq(resp);
      onFlash('Etiqueta pronta');
    });

  const abrirEtiqueta = () =>
    rodar('imprimir', async () => {
      const resp = await chamar('urlEtiqueta', { freteId: f.id });
      setEtq({ url: resp.url, avisoImpressao: '', codigo: r ? r.codigo : '' });
    });

  const cancelar = () =>
    rodar('cancelar', async () => {
      await chamar('cancelarFrete', { freteId: f.id });
      onFlash('Link cancelado');
      onClose();
    });

  const urlEtiqueta = httpsOuVazio(etq && etq.url);
  const urlRastreio = httpsOuVazio(r && r.url);
  const msgRastreio = r
    ? `Oi ${nome}! Seu pedido foi enviado 🎉\n${servicoTxt ? `${servicoTxt} · ` : ''}código de rastreio: ${r.codigo}\nAcompanhe aqui: ${link}`
    : '';
  const msgLink = preencher(config.mensagemLink, { nome, link });

  const linhas = (pares) =>
    pares
      .filter((p) => p[1])
      .map((p) => (
        <div key={p[0]} style={S.linha}>
          <span style={S.linhaRot}>{p[0]}</span>
          <span style={{ textAlign: 'right' }}>{p[1]}</span>
        </div>
      ));

  const jaPago = f.status === 'pago' || f.status === 'etiqueta' || f.status === 'postado' || f.status === 'entregue';

  const blocoLink = (
    <>
    {f.status !== 'cancelado' && (
      <div style={S.bloco}>
        <p style={S.blocoTitulo}>Link da cliente</p>
        <LinhaCopiavel texto={link} onCopiado={(ok) => onFlash(ok ? 'Link copiado' : 'Não consegui copiar')} />
        <a style={{ ...S.ctaGhost, marginTop: 10 }} href={waLink(f.whatsapp, r && f.status !== 'criado' ? msgRastreio : msgLink)} target="_blank" rel="noopener noreferrer">
          {r && f.status !== 'criado' ? 'Avisar o rastreio pelo WhatsApp' : 'Reenviar pelo WhatsApp'}
        </a>
      </div>
    )}
    </>
  );

  const blocoPacote = (
    <>
    <div style={S.bloco}>
      <p style={S.blocoTitulo}>Pacote</p>
      {linhas([
        ['Caixa', f.caixa ? `${f.caixa.nome} · ${num(f.caixa.comprimento)}×${num(f.caixa.largura)}×${num(f.caixa.altura)} cm` : ''],
        ['Peso', pesoTexto(f.pesoKg)],
        ['Valor declarado', f.declaradoCentavos ? brlCentavos(f.declaradoCentavos) : ''],
        ['Conteúdo', f.conteudo],
        ['Observação', f.observacao],
      ])}
    </div>
    </>
  );

  const blocoEntrega = (
    <>
    <div style={S.bloco}>
      <p style={S.blocoTitulo}>Entrega e pagamento</p>
      {linhas([
        ['Destino', f.cidade ? `${f.cidade}/${f.uf}${f.cep ? ` · CEP ${String(f.cep).replace(/^(\d{5})(\d{3})$/, '$1-$2')}` : ''}` : ''],
        ['Frete', servicoTxt],
        ['Prazo', f.servico && f.servico.prazoDias ? `até ${f.servico.prazoDias} dias úteis` : ''],
        ['Valor', f.servico ? brlCentavos(f.servico.precoCentavos) : ''],
        ['Pagamento', textoPagamento(f, agora)],
      ])}
      {f.status === 'aguardando_pagamento' && (
        <BotaoAcao estilo={S.ctaGhost} ocupado={ocupado === 'conferir'} rotulo="Conferir o pagamento agora" rotuloOcupado="Conferindo…" onClick={conferir} />
      )}
    </div>
    </>
  );

  const blocoGerar = (
    <>
    {confirmar && (
      <div style={S.caixaAviso} role="alert">
        O Melhor Envio vai cobrar <strong>{brlCentavos(confirmar.precoCentavos)}</strong>, mas a cliente pagou{' '}
        <strong>{brlCentavos(confirmar.pagoCentavos)}</strong>. A diferença sai do seu saldo. Gerar mesmo assim?
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button style={{ ...S.ctaGhost, marginTop: 0, flex: 1, background: t.surface }} onClick={() => setConfirmar(null)}>
            Agora não
          </button>
          <BotaoAcao estilo={{ ...S.cta, flex: 1, padding: '13px 10px', fontSize: 15 }} ocupado={ocupado === 'gerar'} rotulo="Gerar mesmo assim" onClick={() => gerar(true)} />
        </div>
      </div>
    )}

    {f.status === 'pago' && !confirmar && (
      <>
        <BotaoAcao estilo={{ ...S.cta, marginTop: 16 }} ocupado={ocupado === 'gerar'} rotulo="Gerar etiqueta" rotuloOcupado="Gerando a etiqueta… pode levar um minuto" onClick={() => gerar(false)} />
        <p style={S.ajuda}>Compra a etiqueta no Melhor Envio com o saldo da sua carteira de lá.</p>
      </>
    )}
    </>
  );

  const blocoEtiqueta = (
    <>
    {(f.status === 'etiqueta' || f.status === 'postado' || f.status === 'entregue') && (
      <div style={S.bloco}>
        <p style={S.blocoTitulo}>Etiqueta e rastreio</p>
        {r ? (
          <>
            <LinhaCopiavel texto={r.codigo} onCopiado={(ok) => onFlash(ok ? 'Código copiado' : 'Não consegui copiar')} />
            <p style={S.ajuda}>
              {f.status === 'entregue'
                ? `Entregue${r.entregueEm ? ` em ${dataHora(r.entregueEm)}` : ''}.`
                : f.status === 'postado'
                  ? `Postado${r.postadoEm ? ` em ${dataHora(r.postadoEm)}` : ''}.`
                  : 'O código só começa a andar depois da postagem.'}{' '}
              A cliente acompanha pelo mesmo link que recebeu.
            </p>
          </>
        ) : (
          <p style={S.ajuda}>O código de rastreio ainda não apareceu. Toque em “Atualizar rastreio”.</p>
        )}
        {urlEtiqueta ? (
          <>
            <a style={{ ...S.ctaVerde, marginTop: 12 }} href={urlEtiqueta} target="_blank" rel="noopener noreferrer">
              Abrir etiqueta para imprimir
            </a>
            {etq && etq.avisoImpressao && <p style={S.erro}>{etq.avisoImpressao}</p>}
          </>
        ) : (
          etiquetaPronta && (
            <BotaoAcao estilo={{ ...S.cta, marginTop: 12 }} ocupado={ocupado === 'imprimir'} rotulo="Imprimir etiqueta" rotuloOcupado="Buscando a etiqueta…" onClick={abrirEtiqueta} />
          )
        )}
        {f.status !== 'entregue' && (
          <BotaoAcao estilo={S.ctaGhost} ocupado={ocupado === 'conferir'} rotulo="Atualizar rastreio" rotuloOcupado="Atualizando…" onClick={conferir} />
        )}
        {urlRastreio && (
          <a style={{ ...S.ctaGhost, border: 'none' }} href={urlRastreio} target="_blank" rel="noopener noreferrer">
            Ver no Melhor Rastreio
          </a>
        )}
      </div>
    )}
    </>
  );

  const blocoErro = (
    <>
    {erro && <p style={S.erro} role="alert">{erro}</p>}
    </>
  );

  const blocoCancelar = (
    <>
    {(f.status === 'criado' || f.status === 'aguardando_pagamento') && (
      <div style={{ marginTop: 18 }}>
        <ConfirmarDuplo
          rotulo="Cancelar este link"
          rotuloConfirma="Cancelar o link? A cliente não vai mais conseguir pagar por ele."
          onConfirma={cancelar}
          ocupado={ocupado === 'cancelar'}
        />
      </div>
    )}
    </>
  );

  /* Para quem já pagou, o que importa primeiro é a etiqueta; antes do pagamento, é o link. */
  return (
    <Folha titulo={f.clienteNome} onClose={onClose}>
      <ChipStatus cor={s.cor}>{s.txt}</ChipStatus>

      {f.alerta && f.alerta.texto && <div style={S.caixaErro} role="alert">{f.alerta.texto}</div>}
      {f.etiqueta && f.etiqueta.erro && !etiquetaPronta && (
        <div style={S.caixaErro} role="alert">Última tentativa de etiqueta: {f.etiqueta.erro}</div>
      )}

      {jaPago ? (
        <>
          {blocoGerar}
          {blocoEtiqueta}
          {blocoErro}
          {blocoLink}
          {blocoEntrega}
          {blocoPacote}
        </>
      ) : (
        <>
          {blocoLink}
          {blocoEntrega}
          {blocoPacote}
          {blocoErro}
          {blocoCancelar}
        </>
      )}
    </Folha>
  );
}

/* ── aviso do que ainda falta configurar ─────────────────── */
function Pendencia({ cred, credErro, config, onAjustes, onConexoes }) {
  let texto = '';
  let acao = null;
  if (credErro) {
    texto = credErro;
    acao = ['Tentar de novo', onConexoes];
  } else if (!config.origemCep) {
    texto = 'Falta informar o CEP de onde você envia.';
    acao = ['Abrir Ajustes', onAjustes];
  } else if (cred && !cred.melhorEnvio.configurado) {
    texto = 'Falta conectar o Melhor Envio (calcula o frete e faz a etiqueta).';
    acao = ['Abrir Conexões', onConexoes];
  } else if (cred && !cred.mercadoPago.configurado) {
    texto = 'Falta conectar o Mercado Pago (cobra o frete no Pix).';
    acao = ['Abrir Conexões', onConexoes];
  } else if (cred && cred.melhorEnvio.escoposFaltando && cred.melhorEnvio.escoposFaltando.length) {
    texto = `O token do Melhor Envio não tem todas as permissões (faltam ${cred.melhorEnvio.escoposFaltando.length}).`;
    acao = ['Ver em Conexões', onConexoes];
  } else if (cred && !cred.mercadoPago.webhookConfigurado) {
    texto = 'Sem a assinatura do aviso do Mercado Pago, o Pix só é confirmado por consulta (pode demorar até 30 minutos).';
    acao = ['Abrir Conexões', onConexoes];
  } else if (cred && !cred.remetenteDocumentoConfigurado) {
    texto = 'Falta o CPF ou CNPJ de quem envia (a etiqueta exige).';
    acao = ['Abrir Conexões', onConexoes];
  }
  if (!texto) return null;
  return (
    <div style={{ padding: '14px 20px 0' }}>
      <div style={S.caixaAviso}>
        {texto}{' '}
        {acao && (
          <button style={{ ...S.linkRose, color: t.amber }} onClick={acao[1]}>
            {acao[0]}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── tela principal ─────────────────────────────────────── */
function Fretes({ aoPerderLogin }) {
  const [fretes, setFretes] = useState([]);
  const [carregou, setCarregou] = useState(false);
  const [semConexao, setSemConexao] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [config, setConfig] = useState(configDoBanco(CONFIG_FRETE_PADRAO));
  const [cred, setCred] = useState(null);
  const [credErro, setCredErro] = useState('');
  const [filtro, setFiltro] = useState('ativos');
  const [folha, setFolha] = useState(null); // { tipo, id? }
  const [toast, setToast] = useState(null);
  const [agora, setAgora] = useState(Date.now());
  const anterior = useRef(null);
  const timerToast = useRef(null);
  const acompanhamento = useRef(null);

  const flash = (texto, tipo) => {
    setToast({ texto, tipo });
    clearTimeout(timerToast.current);
    timerToast.current = setTimeout(() => setToast(null), tipo === 'pago' ? 6000 : 2400);
  };

  /* A lista de fretes: o servidor só conta o que mudou desde a última conferência (veja dados.js). */
  useEffect(() => {
    acompanhamento.current = acompanharFretes({
      aoAtualizar: (lista) => {
        const novo = {};
        lista.forEach((f) => {
          novo[f.id] = f.status;
        });
        if (anterior.current) {
          lista.forEach((f) => {
            const antes = anterior.current[f.id];
            if ((antes === 'criado' || antes === 'aguardando_pagamento') && f.status === 'pago') {
              flash(`${primeiroNome(f.clienteNome)} pagou o frete! Já dá para gerar a etiqueta.`, 'pago');
              if (navigator.vibrate) navigator.vibrate(200);
            }
          });
        }
        anterior.current = novo;
        setFretes(lista);
        setCarregou(true);
        setSemConexao(false);
      },
      aoFalhar: () => setSemConexao(true),
      aoPerderLogin,
    });
    return () => acompanhamento.current.parar();
  }, []);

  /* Depois de uma ação da própria dona (criar, gerar etiqueta, cancelar…), a lista é conferida na hora, sem esperar o relógio. */
  const aoMudar = () => acompanhamento.current && acompanhamento.current.conferirAgora();

  const carregarClientes = () => listarClientes().then(setClientes, (e) => e.semLogin && aoPerderLogin());

  useEffect(() => {
    carregarClientes();
    chamar('lerAjustes').then(
      (r) => setConfig(configDoBanco(r)),
      (e) => (e.semLogin ? aoPerderLogin() : flash('Não consegui abrir os ajustes agora.')),
    );
  }, []);

  const carregarCred = async () => {
    try {
      setCred(await chamar('statusCredenciais'));
      setCredErro('');
    } catch (e) {
      if (e.semLogin) aoPerderLogin();
      else setCredErro(e.message);
    }
  };
  useEffect(() => {
    carregarCred();
  }, []);

  /* Relógio da tela: faz "Pix venceu" aparecer sem recarregar. */
  useEffect(() => {
    const i = setInterval(() => setAgora(Date.now()), 30000);
    return () => clearInterval(i);
  }, []);

  const paraEnviar = fretes.filter((f) => f.status === 'pago').length;
  useEffect(() => {
    document.title = paraEnviar ? `(${paraEnviar}) Fretes · Delas pra Elas` : 'Fretes · Delas pra Elas';
  }, [paraEnviar]);

  const contagem = useMemo(() => {
    const m = {};
    FILTROS.forEach(([id, , fn]) => {
      m[id] = fretes.filter(fn).length;
    });
    return m;
  }, [fretes]);

  const visiveis = useMemo(() => {
    const fn = FILTROS.find((x) => x[0] === filtro)[2];
    return fretes.filter(fn);
  }, [fretes, filtro]);

  const aberto = folha && folha.tipo === 'detalhe' ? fretes.find((f) => f.id === folha.id) : null;

  return (
    <div style={S.screen}>
      <div style={S.frame}>
        <div style={S.header}>
          <div style={S.brandRow}>
            <span style={S.brand}>Delas pra Elas</span>
            <a style={{ ...S.linkBtn, textDecoration: 'none' }} href="/">
              ‹ Voltar ao app
            </a>
          </div>
          <h1 style={S.titulo}>Fretes</h1>
          <div style={{ display: 'flex', gap: 18 }}>
            <button style={{ ...S.linkRose, padding: '4px 0' }} onClick={() => setFolha({ tipo: 'ajustes' })}>
              Ajustes
            </button>
            <button style={{ ...S.linkRose, padding: '4px 0' }} onClick={() => setFolha({ tipo: 'conexoes' })}>
              Conexões
            </button>
          </div>
        </div>

        <Pendencia
          cred={cred}
          credErro={credErro}
          config={config}
          onAjustes={() => setFolha({ tipo: 'ajustes' })}
          onConexoes={() => (credErro ? carregarCred() : setFolha({ tipo: 'conexoes' }))}
        />

        {semConexao && (
          <div style={{ ...S.caixaAviso, margin: '12px 20px 0' }} role="status">
            Sem conexão com o servidor agora. Tentando de novo…
          </div>
        )}

        <div style={S.chips} role="tablist" aria-label="Filtro">
          {FILTROS.map(([id, nome]) => (
            <button key={id} style={{ ...S.chip, ...(filtro === id ? S.chipOn : {}) }} onClick={() => setFiltro(id)} aria-pressed={filtro === id}>
              {nome} {contagem[id] ? `· ${contagem[id]}` : ''}
            </button>
          ))}
        </div>

        <div style={S.list}>
          {!carregou ? (
            <div style={S.empty}><p style={S.emptyTxt}>Carregando…</p></div>
          ) : visiveis.length === 0 ? (
            <div style={S.empty}>
              <p style={S.emptyTitle}>{fretes.length === 0 ? 'Nenhum frete ainda' : 'Nada por aqui'}</p>
              <p style={S.emptyTxt}>
                {fretes.length === 0
                  ? 'Toque em “Novo frete”, escolha a cliente, a caixa e o peso. O link para ela pagar o frete aparece em seguida.'
                  : 'Nenhum frete nesta lista agora.'}
              </p>
            </div>
          ) : (
            visiveis.map((f) => <CartaoFrete key={f.id} f={f} agora={agora} onAbrir={(id) => setFolha({ tipo: 'detalhe', id })} />)
          )}
        </div>

        <div style={S.dock}>
          <button
            style={S.cta}
            onClick={() => {
              carregarClientes();
              setFolha({ tipo: 'novo' });
            }}
          >
            Novo frete
          </button>
        </div>

        {folha && folha.tipo === 'novo' && <SheetNovo clientes={clientes} config={config} onClose={() => setFolha(null)} onFlash={flash} aoMudar={aoMudar} />}
        {folha && folha.tipo === 'detalhe' && <SheetDetalhe f={aberto} config={config} onClose={() => setFolha(null)} onFlash={flash} aoMudar={aoMudar} />}
        {folha && folha.tipo === 'ajustes' && (
          <SheetAjustes config={config} onClose={() => setFolha(null)} onFlash={flash} onSalvo={(salvo) => setConfig(configDoBanco(salvo))} aoPerderLogin={aoPerderLogin} />
        )}
        {folha && folha.tipo === 'conexoes' && (
          <SheetConexoes
            config={config}
            cred={cred}
            onClose={() => {
              setFolha(null);
              carregarCred();
            }}
            onCred={setCred}
            onFlash={flash}
          />
        )}

        {toast && <div style={{ ...S.toast, ...(toast.tipo === 'pago' ? S.toastPago : {}) }} role="status">{toast.texto}</div>}
      </div>
    </div>
  );
}

/* ── entrada: só a dona, já logada no app da live, vê esta tela ── */
function TelaAviso({ titulo, children, acao }) {
  return (
    <div style={{ ...S.screen, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 340 }}>
        <div style={{ fontFamily: display, fontSize: 30, lineHeight: 1.1, color: t.ink, marginBottom: 8 }}>{titulo}</div>
        <p style={{ fontFamily: sans, fontSize: 15, color: t.inkSoft, lineHeight: 1.5, margin: '0 0 24px' }}>{children}</p>
        {acao || (
          <a style={S.cta} href="/">
            Ir para o app da live
          </a>
        )}
      </div>
    </div>
  );
}

function Root() {
  const [tela, setTela] = useState({ nome: 'abrindo' });

  const verificar = () => {
    setTela({ nome: 'abrindo' });
    quemSou().then(
      (r) => setTela({ nome: !r.usuario ? 'sem-login' : r.usuario.papel !== 'dono' ? 'so-dona' : 'ok' }),
      (e) => setTela({ nome: 'falha', mensagem: e.message }),
    );
  };
  useEffect(verificar, []);

  switch (tela.nome) {
    case 'abrindo':
      return (
        <div style={{ ...S.screen, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: t.inkSoft, fontSize: 15 }}>Abrindo…</p>
        </div>
      );
    case 'falha':
      return (
        <TelaAviso
          titulo="Fretes"
          acao={
            <button style={S.cta} onClick={verificar}>
              Tentar de novo
            </button>
          }
        >
          {tela.mensagem}
        </TelaAviso>
      );
    case 'sem-login':
      return (
        <TelaAviso titulo="Fretes">
          {tela.expirou ? 'Sua sessão acabou. Entre de novo no app da live e depois volte aqui.' : 'Para ver os fretes, entre primeiro no app da live. Depois é só voltar aqui.'}
        </TelaAviso>
      );
    case 'so-dona':
      return <TelaAviso titulo="Fretes">Só a dona do brechó abre esta tela. Quem é da equipe usa o app da live.</TelaAviso>;
    default:
      return <Fretes aoPerderLogin={() => setTela({ nome: 'sem-login', expirou: true })} />;
  }
}

carregarFontes();
createRoot(document.getElementById('app')).render(<Root />);
