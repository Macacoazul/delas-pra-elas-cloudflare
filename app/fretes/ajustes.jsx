import React, { useState, useEffect, useRef } from 'react';
import { t, S, lerNumero, soDigitos, MENSAGEM_LINK_PADRAO, CAIXAS_PADRAO } from './base.js';
import { chamar } from './dados.js';
import { Folha, LinhaCopiavel, BotaoAcao } from './componentes.jsx';

const mascaraCep = (v) => {
  const d = soDigitos(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};
const paraCampo = (n) => String(n === undefined || n === null ? '' : n).replace('.', ',');

const HORAS_PIX = [
  [60, '1 hora'],
  [360, '6 horas'],
  [720, '12 horas'],
  [1440, '24 horas (recomendado)'],
  [2880, '2 dias'],
  [4320, '3 dias'],
];

/* https em qualquer domínio; http só para teste no próprio computador (localhost) ou na rede local. */
const SITE_OK = /^(https:\/\/[A-Za-z0-9.-]+|http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}))(:\d+)?$/;

function Campo({ rotulo, ajuda, children }) {
  return (
    <>
      <label style={S.label}>{rotulo}</label>
      {children}
      {ajuda && <p style={S.ajuda}>{ajuda}</p>}
    </>
  );
}

function Interruptor({ ligado, onMudar, titulo, ajuda }) {
  return (
    <button
      style={{ display: 'flex', gap: 11, alignItems: 'flex-start', width: '100%', background: 'none', border: 'none', padding: '16px 0 0', fontSize: 15, color: t.ink, textAlign: 'left', fontFamily: 'inherit' }}
      onClick={() => onMudar(!ligado)}
      role="switch"
      aria-checked={ligado}
    >
      <span
        style={{
          width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${ligado ? t.rose : t.line}`, background: ligado ? t.rose : t.surface,
          color: '#fff', fontSize: 13, lineHeight: '20px', textAlign: 'center', flexShrink: 0,
        }}
      >
        {ligado ? '✓' : ''}
      </span>
      <span>
        {titulo}
        {ajuda && <span style={{ display: 'block', fontSize: 13, color: t.inkSoft, marginTop: 3, lineHeight: 1.4 }}>{ajuda}</span>}
      </span>
    </button>
  );
}

/* ── Ajustes: caixas, CEP de origem, quem envia ──────────── */
export function SheetAjustes({ config, onClose, onFlash, onSalvo, aoPerderLogin }) {
  const [d, setD] = useState(() => ({
    origemCep: mascaraCep(config.origemCep),
    caixas: config.caixas.map((c) => ({ id: c.id, nome: c.nome, altura: paraCampo(c.altura), largura: paraCampo(c.largura), comprimento: paraCampo(c.comprimento) })),
    transportadoras: config.transportadoras.join(', '),
    mostrarOutras: !!config.mostrarOutras,
    pixMin: config.pixValidadeMin,
    siteUrl: config.siteUrl || '',
    etiquetaPublica: config.etiquetaPublica !== false,
    naoComercial: config.naoComercial !== false,
    valorDeclaradoPadrao: paraCampo(config.valorDeclaradoPadrao),
    conteudoPadrao: config.conteudoPadrao || '',
    remetente: { ...config.remetente },
    mensagemLink: config.mensagemLink || MENSAGEM_LINK_PADRAO,
  }));
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const mudar = (campo, valor) => {
    setD((x) => ({ ...x, [campo]: valor }));
    setErro('');
  };
  const mudarRem = (campo, valor) => {
    setD((x) => ({ ...x, remetente: { ...x.remetente, [campo]: valor } }));
    setErro('');
  };
  const mudarCaixa = (i, campo, valor) => {
    setD((x) => ({ ...x, caixas: x.caixas.map((c, k) => (k === i ? { ...c, [campo]: valor } : c)) }));
    setErro('');
  };
  const novaCaixa = () => {
    setD((x) => ({
      ...x,
      caixas: [...x.caixas, { id: `c${Date.now().toString(36)}`, nome: `Caixa ${x.caixas.length + 1}`, altura: '', largura: '', comprimento: '' }],
    }));
  };
  const tirarCaixa = (i) => {
    setD((x) => (x.caixas.length <= 1 ? x : { ...x, caixas: x.caixas.filter((_, k) => k !== i) }));
  };

  const opcoesPix = HORAS_PIX.some((h) => h[0] === d.pixMin) ? HORAS_PIX : [...HORAS_PIX, [d.pixMin, `${Math.round(d.pixMin / 60)} horas`]].sort((a, b) => a[0] - b[0]);

  const faltaParaEtiqueta = [
    ['nome', 'nome'], ['telefone', 'telefone'], ['email', 'e-mail'], ['cep', 'CEP'], ['endereco', 'rua'], ['numero', 'número'], ['bairro', 'bairro'], ['cidade', 'cidade'], ['uf', 'estado'],
  ]
    .filter(([k]) => {
      const v = String(d.remetente[k] || '');
      if (k === 'cep') return soDigitos(v).length !== 8;
      if (k === 'telefone') return ![10, 11].includes(soDigitos(v).length);
      return !v.trim();
    })
    .map(([, nome]) => nome);

  const salvar = async () => {
    const cep = soDigitos(d.origemCep);
    if (cep && cep.length !== 8) return setErro('O CEP de origem precisa ter 8 números.');

    const caixas = [];
    for (let i = 0; i < d.caixas.length; i += 1) {
      const c = d.caixas[i];
      const altura = lerNumero(c.altura);
      const largura = lerNumero(c.largura);
      const comprimento = lerNumero(c.comprimento);
      const medidasOk = [altura, largura, comprimento].every((n) => Number.isFinite(n) && n >= 0.5 && n <= 105);
      if (!medidasOk) return setErro(`Caixa “${c.nome || i + 1}”: confira as medidas (cada uma entre 0,5 e 105 cm).`);
      caixas.push({ id: c.id, nome: (c.nome || '').trim() || `Caixa ${i + 1}`, altura, largura, comprimento });
    }

    const transportadoras = d.transportadoras.split(',').map((s) => s.trim()).filter(Boolean);
    if (!transportadoras.length) return setErro('Escreva ao menos uma transportadora (ex.: Correios, Jadlog).');

    const site = d.siteUrl.trim().replace(/\/+$/, '');
    if (site && !SITE_OK.test(site)) return setErro('O endereço do site deve começar com https:// e não ter nada depois do nome (ex.: https://delas-fretes.seu-usuario.workers.dev). Só para teste no seu computador vale http://localhost:8787.');

    const declarado = lerNumero(d.valorDeclaradoPadrao);
    if (!Number.isFinite(declarado) || declarado < 1 || declarado > 10000) return setErro('O valor declarado padrão deve ficar entre R$ 1 e R$ 10.000.');

    const r = d.remetente;
    const uf = String(r.uf || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
    const payload = {
      origemCep: cep,
      caixas,
      transportadoras,
      mostrarOutras: d.mostrarOutras,
      pixValidadeMin: d.pixMin,
      siteUrl: site,
      etiquetaPublica: d.etiquetaPublica,
      naoComercial: d.naoComercial,
      valorDeclaradoPadrao: declarado,
      conteudoPadrao: d.conteudoPadrao.trim() || 'Roupas',
      remetente: {
        nome: (r.nome || '').trim(),
        telefone: soDigitos(r.telefone),
        email: (r.email || '').trim(),
        cep: soDigitos(r.cep),
        endereco: (r.endereco || '').trim(),
        numero: (r.numero || '').trim(),
        complemento: (r.complemento || '').trim(),
        bairro: (r.bairro || '').trim(),
        cidade: (r.cidade || '').trim(),
        uf,
      },
      mensagemLink: d.mensagemLink.trim() || MENSAGEM_LINK_PADRAO,
    };

    setSalvando(true);
    try {
      onSalvo(await chamar('salvarAjustes', payload));
      onFlash('Ajustes salvos');
      onClose();
    } catch (e) {
      if (e.semLogin) return aoPerderLogin();
      setErro(e.message);
    }
    setSalvando(false);
  };

  return (
    <Folha titulo="Ajustes dos fretes" onClose={onClose}>
      <Campo rotulo="CEP de onde você envia" ajuda="O frete é calculado a partir deste CEP até o CEP da cliente.">
        <input style={S.input} inputMode="numeric" placeholder="00000-000" value={d.origemCep} onChange={(e) => mudar('origemCep', mascaraCep(e.target.value))} />
      </Campo>

      <div style={S.bloco}>
        <p style={S.blocoTitulo}>Caixas (medidas fixas)</p>
        <p style={{ ...S.ajuda, margin: '0 0 8px' }}>Na hora de criar o frete você escolhe uma destas e digita só o peso.</p>
        {d.caixas.map((c, i) => (
          <div key={c.id} style={{ borderTop: i ? `1px solid ${t.line}` : 'none', paddingTop: i ? 12 : 0, marginTop: i ? 12 : 0 }}>
            <input style={S.input} value={c.nome} placeholder="Nome da caixa" onChange={(e) => mudarCaixa(i, 'nome', e.target.value)} aria-label={`Nome da caixa ${i + 1}`} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {[['comprimento', 'Comprim. (cm)'], ['largura', 'Largura (cm)'], ['altura', 'Altura (cm)']].map(([campo, rot]) => (
                <div key={campo} style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: t.inkSoft, marginBottom: 4 }}>{rot}</div>
                  <input style={{ ...S.input, padding: '11px 10px' }} inputMode="decimal" value={c[campo]} onChange={(e) => mudarCaixa(i, campo, e.target.value)} aria-label={`${rot} da caixa ${i + 1}`} />
                </div>
              ))}
            </div>
            {d.caixas.length > 1 && (
              <button style={{ ...S.linkBtn, color: t.rose, paddingLeft: 0 }} onClick={() => tirarCaixa(i)}>
                Remover esta caixa
              </button>
            )}
          </div>
        ))}
        <button style={{ ...S.ctaGhost, marginTop: 14 }} onClick={novaCaixa}>
          Adicionar caixa
        </button>
        <button style={{ ...S.linkBtn, paddingLeft: 0 }} onClick={() => setD((x) => ({ ...x, caixas: CAIXAS_PADRAO.map((c) => ({ id: c.id, nome: c.nome, altura: paraCampo(c.altura), largura: paraCampo(c.largura), comprimento: paraCampo(c.comprimento) })) }))}>
          Voltar às caixas de exemplo
        </button>
      </div>

      <Campo rotulo="Transportadoras mostradas à cliente" ajuda="Separe por vírgula. Fica só o que você usa; normalmente Correios e Jadlog.">
        <input style={S.input} value={d.transportadoras} onChange={(e) => mudar('transportadoras', e.target.value)} />
      </Campo>
      <Interruptor ligado={d.mostrarOutras} onMudar={(v) => mudar('mostrarOutras', v)} titulo="Mostrar também outras transportadoras" ajuda="Se desligado, só aparecem as de cima." />

      <Campo rotulo="Quanto tempo o Pix fica valendo" ajuda="Depois disso a cliente pode gerar outro Pix pelo mesmo link.">
        <select style={S.input} value={d.pixMin} onChange={(e) => mudar('pixMin', Number(e.target.value))}>
          {opcoesPix.map(([min, nome]) => (
            <option key={min} value={min}>{nome}</option>
          ))}
        </select>
      </Campo>

      <Campo
        rotulo="Endereço do seu site"
        ajuda="Igual aparece no navegador, começando com https://. Vai nos links da cliente e é por ele que o Mercado Pago avisa quando o Pix cai."
      >
        <input style={S.input} inputMode="url" autoCapitalize="none" placeholder="https://delas-fretes.seu-usuario.workers.dev" value={d.siteUrl} onChange={(e) => mudar('siteUrl', e.target.value)} />
      </Campo>
      {window.location.protocol === 'https:' && d.siteUrl.trim().replace(/\/+$/, '') !== window.location.origin && (
        <button style={S.linkRose} onClick={() => mudar('siteUrl', window.location.origin)}>
          Usar {window.location.origin}
        </button>
      )}

      <div style={S.bloco}>
        <p style={S.blocoTitulo}>Quem envia (vai na etiqueta)</p>
        <p style={{ ...S.ajuda, margin: '0 0 4px' }}>O CPF ou CNPJ fica em Conexões, guardado só no servidor.</p>
        <label style={{ ...S.label, marginTop: 10 }}>Nome (ou loja)</label>
        <input style={S.input} value={d.remetente.nome || ''} onChange={(e) => mudarRem('nome', e.target.value)} />
        <label style={S.label}>WhatsApp com DDD</label>
        <input style={S.input} type="tel" inputMode="tel" value={d.remetente.telefone || ''} onChange={(e) => mudarRem('telefone', e.target.value)} />
        <label style={S.label}>E-mail</label>
        <input style={S.input} type="email" inputMode="email" autoCapitalize="none" value={d.remetente.email || ''} onChange={(e) => mudarRem('email', e.target.value)} />
        <label style={S.label}>CEP</label>
        <input style={S.input} inputMode="numeric" value={d.remetente.cep ? mascaraCep(d.remetente.cep) : ''} onChange={(e) => mudarRem('cep', mascaraCep(e.target.value))} />
        <label style={S.label}>Rua</label>
        <input style={S.input} value={d.remetente.endereco || ''} onChange={(e) => mudarRem('endereco', e.target.value)} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: '0 0 34%' }}>
            <label style={S.label}>Número</label>
            <input style={S.input} value={d.remetente.numero || ''} onChange={(e) => mudarRem('numero', e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={S.label}>Complemento</label>
            <input style={S.input} value={d.remetente.complemento || ''} onChange={(e) => mudarRem('complemento', e.target.value)} />
          </div>
        </div>
        <label style={S.label}>Bairro</label>
        <input style={S.input} value={d.remetente.bairro || ''} onChange={(e) => mudarRem('bairro', e.target.value)} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={S.label}>Cidade</label>
            <input style={S.input} value={d.remetente.cidade || ''} onChange={(e) => mudarRem('cidade', e.target.value)} />
          </div>
          <div style={{ flex: '0 0 26%' }}>
            <label style={S.label}>UF</label>
            <input style={S.input} maxLength={2} autoCapitalize="characters" value={d.remetente.uf || ''} onChange={(e) => mudarRem('uf', e.target.value.toUpperCase())} />
          </div>
        </div>
        {faltaParaEtiqueta.length > 0 && <div style={S.caixaAviso}>Para gerar etiquetas ainda falta: {faltaParaEtiqueta.join(', ')}.</div>}
      </div>

      <div style={S.bloco}>
        <p style={S.blocoTitulo}>Padrões do envio</p>
        <label style={{ ...S.label, marginTop: 4 }}>Valor declarado padrão (R$)</label>
        <input style={S.input} inputMode="decimal" value={d.valorDeclaradoPadrao} onChange={(e) => mudar('valorDeclaradoPadrao', e.target.value)} />
        <label style={S.label}>Conteúdo que aparece na etiqueta</label>
        <input style={S.input} value={d.conteudoPadrao} maxLength={80} onChange={(e) => mudar('conteudoPadrao', e.target.value)} />
        <Interruptor ligado={d.naoComercial} onMudar={(v) => mudar('naoComercial', v)} titulo="Enviar como remessa sem nota fiscal" ajuda="Para vendas de pessoa física (brechó). Desligue se você emite nota." />
        <Interruptor ligado={d.etiquetaPublica} onMudar={(v) => mudar('etiquetaPublica', v)} titulo="Link da etiqueta abre sem entrar no Melhor Envio" ajuda="Facilita imprimir pelo celular. Quem tiver o link consegue ver a etiqueta, então não compartilhe." />
      </div>

      <Campo rotulo="Mensagem que acompanha o link" ajuda="Use {nome} para o nome da cliente e {link} para o endereço do link.">
        <textarea style={{ ...S.textarea, height: 110 }} value={d.mensagemLink} onChange={(e) => mudar('mensagemLink', e.target.value)} />
      </Campo>
      <button style={{ ...S.linkBtn, paddingLeft: 0 }} onClick={() => mudar('mensagemLink', MENSAGEM_LINK_PADRAO)}>
        Voltar ao texto original
      </button>

      {erro && <p style={S.erro} role="alert">{erro}</p>}
      <BotaoAcao estilo={{ ...S.cta, marginTop: 18 }} ocupado={salvando} rotulo="Salvar ajustes" rotuloOcupado="Salvando…" onClick={salvar} />
    </Folha>
  );
}

/* ── Conexões: Melhor Envio e Mercado Pago ────────────────── */
function Selo({ ok, children }) {
  return (
    <span style={{ display: 'inline-block', fontSize: 12, padding: '3px 9px', borderRadius: 20, background: ok ? t.greenSoft : t.amberSoft, color: ok ? t.green : t.amber }}>
      {children}
    </span>
  );
}

export function SheetConexoes({ config, cred, onClose, onCred, onFlash }) {
  const [status, setStatus] = useState(cred);
  const [erro, setErro] = useState('');
  const [ambiente, setAmbiente] = useState(cred ? cred.melhorEnvio.ambiente : 'sandbox');
  const [meToken, setMeToken] = useState('');
  const [meEmail, setMeEmail] = useState(cred ? cred.melhorEnvio.emailContato || '' : '');
  const [mpToken, setMpToken] = useState('');
  const [mpSegredo, setMpSegredo] = useState('');
  const [documento, setDocumento] = useState('');
  const [ocupado, setOcupado] = useState('');
  const [teste, setTeste] = useState(null);
  const resultadoRef = useRef(null);

  // O resultado do teste aparece no fim da janela: leva a tela até ele.
  useEffect(() => {
    if (teste && resultadoRef.current && resultadoRef.current.scrollIntoView) resultadoRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [teste]);

  useEffect(() => {
    if (cred) return;
    chamar('statusCredenciais')
      .then((s) => {
        setStatus(s);
        onCred(s);
        setAmbiente(s.melhorEnvio.ambiente);
        setMeEmail(s.melhorEnvio.emailContato || '');
      })
      .catch((e) => setErro(e.message));
  }, []);

  const webhook = `${(config.siteUrl || window.location.origin).replace(/\/+$/, '')}/api/mp/webhook`;
  const me = status && status.melhorEnvio;
  const mp = status && status.mercadoPago;

  const salvar = async () => {
    const entrada = { melhorEnvio: { ambiente }, mercadoPago: {} };
    if (meToken.trim()) entrada.melhorEnvio.token = meToken;
    if (meEmail.trim()) entrada.melhorEnvio.emailContato = meEmail.trim();
    if (mpToken.trim()) entrada.mercadoPago.accessToken = mpToken;
    if (mpSegredo.trim()) entrada.mercadoPago.webhookSecret = mpSegredo;
    if (documento.trim()) entrada.remetenteDocumento = documento;
    const novo = await chamar('salvarCredenciais', entrada);
    // Os segredos digitados saem da tela assim que o servidor guarda.
    setMeToken('');
    setMpToken('');
    setMpSegredo('');
    setDocumento('');
    setStatus(novo);
    onCred(novo);
    return novo;
  };

  const rodar = async (qual, fn) => {
    if (ocupado) return;
    setOcupado(qual);
    setErro('');
    try {
      await fn();
    } catch (e) {
      setErro(e.message);
    }
    setOcupado('');
  };

  const salvarETestar = () =>
    rodar('salvar', async () => {
      await salvar();
      setTeste(await chamar('testarConexoes'));
      onFlash('Salvo');
    });
  const soTestar = () =>
    rodar('testar', async () => {
      setTeste(await chamar('testarConexoes'));
    });
  const remover = (chave, aviso) =>
    rodar('remover', async () => {
      const novo = await chamar('salvarCredenciais', { remover: [chave] });
      setStatus(novo);
      onCred(novo);
      setTeste(null);
      onFlash(aviso);
    });

  const venceLogo = me && me.expiraEm && me.expiraEm - Date.now() < 7 * 86400000;

  return (
    <Folha titulo="Conexões" onClose={onClose}>
      <p style={{ ...S.subtitulo, lineHeight: 1.5 }}>
        Aqui você liga o Melhor Envio (frete e etiqueta) e o Mercado Pago (Pix do frete). Os códigos ficam guardados só no servidor:
        depois de salvar, eles não voltam para a tela.
      </p>
      {!status && !erro && <p style={S.ajuda}>Carregando…</p>}

      <div style={S.bloco}>
        <p style={S.blocoTitulo}>Melhor Envio</p>
        {me && (
          <div style={{ marginBottom: 6 }}>
            <Selo ok={me.configurado}>{me.configurado ? `Token salvo ${me.final}` : 'Sem token'}</Selo>{' '}
            {me.expiraEm && <Selo ok={!venceLogo}>vence em {new Date(me.expiraEm).toLocaleDateString('pt-BR')}</Selo>}
          </div>
        )}
        {venceLogo && <div style={S.caixaAviso}>O token está perto de vencer. Gere outro no Melhor Envio e cole aqui.</div>}
        {me && me.escoposFaltando && me.escoposFaltando.length > 0 && (
          <div style={S.caixaErro}>
            Faltam permissões neste token: <strong>{me.escoposFaltando.join(', ')}</strong>. Gere um token novo marcando todas.
          </div>
        )}
        <label style={{ ...S.label, marginTop: 10 }}>Ambiente</label>
        <div style={S.segmento} role="group" aria-label="Ambiente do Melhor Envio">
          {[['sandbox', 'Teste (sandbox)'], ['producao', 'Produção (valendo)']].map(([v, nome]) => (
            <button key={v} style={{ ...S.segBtn, ...(ambiente === v ? S.segOn : {}) }} onClick={() => setAmbiente(v)} aria-pressed={ambiente === v}>
              {nome}
            </button>
          ))}
        </div>
        <p style={S.ajuda}>Comece no teste: o token do teste só funciona no teste e o de produção só na produção.</p>
        <label style={S.label}>Token de acesso {me && me.configurado ? '(deixe vazio para manter o atual)' : ''}</label>
        <textarea
          style={{ ...S.textarea, height: 84, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }}
          value={meToken}
          onChange={(e) => setMeToken(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Cole o token inteiro"
        />
        <label style={S.label}>E-mail de contato do aplicativo</label>
        <input style={S.input} type="email" inputMode="email" autoCapitalize="none" value={meEmail} onChange={(e) => setMeEmail(e.target.value)} placeholder="o mesmo e-mail do cadastro no Melhor Envio" />
        <p style={S.ajuda}>
          Permissões que o token precisa ter: {status ? status.escoposNecessarios.join(', ') : 'shipping-calculate, cart-read, cart-write, shipping-checkout, shipping-generate, shipping-print, shipping-tracking, orders-read'}.
          Para gerar etiqueta, ainda é preciso ter saldo na carteira do Melhor Envio.
        </p>
        {me && me.configurado && (
          <button style={{ ...S.linkBtn, paddingLeft: 0, color: t.rose }} onClick={() => remover('melhorEnvioToken', 'Token do Melhor Envio removido')}>
            Remover o token salvo
          </button>
        )}
      </div>

      <div style={S.bloco}>
        <p style={S.blocoTitulo}>Mercado Pago</p>
        {mp && (
          <div style={{ marginBottom: 6 }}>
            <Selo ok={mp.configurado}>{mp.configurado ? `Credencial salva ${mp.final}` : 'Sem credencial'}</Selo>{' '}
            {mp.configurado && <Selo ok={mp.producao}>{mp.producao ? 'produção' : 'teste'}</Selo>}{' '}
            <Selo ok={mp.webhookConfigurado}>{mp.webhookConfigurado ? 'aviso automático ligado' : 'sem aviso automático'}</Selo>
          </div>
        )}
        <label style={{ ...S.label, marginTop: 10 }}>Access Token {mp && mp.configurado ? '(deixe vazio para manter o atual)' : ''}</label>
        <input
          style={S.input}
          type="password"
          autoComplete="new-password"
          autoCapitalize="none"
          spellCheck={false}
          value={mpToken}
          onChange={(e) => setMpToken(e.target.value)}
          placeholder="APP_USR-…"
        />
        <p style={S.ajuda}>Fica em Mercado Pago → Suas integrações → sua aplicação → Credenciais de produção. Sua conta precisa ter uma chave Pix cadastrada.</p>

        <label style={S.label}>Assinatura secreta do aviso (webhook)</label>
        <input style={S.input} type="password" autoComplete="new-password" autoCapitalize="none" spellCheck={false} value={mpSegredo} onChange={(e) => setMpSegredo(e.target.value)} placeholder="Cole aqui a assinatura secreta" />
        <p style={S.ajuda}>
          No Mercado Pago, em Webhooks, coloque este endereço na URL de produção e marque o evento “Pagamentos”. Depois copie a assinatura secreta que ele mostrar:
        </p>
        <LinhaCopiavel texto={webhook} onCopiado={(ok) => onFlash(ok ? 'Endereço copiado' : 'Não consegui copiar')} />
        {!config.siteUrl && <p style={S.ajuda}>Dica: preencha “Endereço do seu site” em Ajustes para este endereço ficar definitivo.</p>}
        {mp && mp.webhookConfigurado && (
          <button style={{ ...S.linkBtn, paddingLeft: 0, color: t.rose }} onClick={() => remover('mercadoPagoWebhook', 'Assinatura removida')}>
            Remover a assinatura salva
          </button>
        )}
      </div>

      <div style={S.bloco}>
        <p style={S.blocoTitulo}>Quem envia</p>
        {status && <Selo ok={status.remetenteDocumentoConfigurado}>{status.remetenteDocumentoConfigurado ? 'CPF/CNPJ salvo' : 'Falta o CPF/CNPJ'}</Selo>}
        <label style={{ ...S.label, marginTop: 10 }}>CPF ou CNPJ de quem envia</label>
        <input style={S.input} inputMode="numeric" autoComplete="off" value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder={status && status.remetenteDocumentoConfigurado ? 'Já salvo — digite só para trocar' : 'Somente números'} />
        <p style={S.ajuda}>A etiqueta exige o documento de quem envia. Os demais dados (endereço, telefone) ficam em Ajustes.</p>
      </div>

      {teste && (
        <div style={{ marginTop: 14 }} ref={resultadoRef}>
          {[['Melhor Envio', teste.melhorEnvio], ['Mercado Pago', teste.mercadoPago]].map(([nome, r]) => (
            <div key={nome} style={r.ok ? S.caixaOk : S.caixaErro}>
              <strong>{r.ok ? '✓' : '✗'} {nome}:</strong> {r.mensagem}
            </div>
          ))}
        </div>
      )}

      {erro && <p style={S.erro} role="alert">{erro}</p>}
      <BotaoAcao estilo={{ ...S.cta, marginTop: 18 }} ocupado={ocupado === 'salvar'} rotulo="Salvar e testar" rotuloOcupado="Salvando e testando…" onClick={salvarETestar} />
      <BotaoAcao estilo={S.ctaGhost} ocupado={ocupado === 'testar'} rotulo="Só testar o que já está salvo" rotuloOcupado="Testando…" onClick={soTestar} />
    </Folha>
  );
}
