/**
 * Delas pra Elas — negocio.js
 * O que a loja faz: os fretes (cotação, Pix, etiqueta, rastreio), o login da equipe e a sincronia do app da live.
 *
 * Arquivo gerado por "npm run colar" (o texto de verdade fica nas pastas src/, app/ e site/ do projeto).
 * Cole o arquivo INTEIRO, num arquivo com o nome negocio.js no editor do Cloudflare. Não precisa mudar nada nele.
 *
 * Dentro, nesta ordem: fretes.js, acesso.js, app-api.js.
 * Cada bloco é um arquivo de src/ (o mesmo código, com os comentários); o que um arquivo exporta, o bloco entrega
 * no "return" do fim; o que um arquivo importa, o bloco pega do bloco de origem no começo.
 */
import { melhor_envio_js, mercado_pago_js, viacep_js } from './servicos.js';
import { banco_d1_js, cripto_js, dados_js, util_js } from './base.js';

/* ────────────────────────────────────────────────────────────────────────────────────────────────────
 * fretes_js  —  o arquivo src/fretes.js (o código abaixo é o do arquivo, sem alteração)
 * ──────────────────────────────────────────────────────────────────────────────────────────────────── */
export const fretes_js = (() => {
/**
 * Regras do frete: criar o link, cotar pelo CEP, cobrar o frete por Pix, conferir o pagamento,
 * emitir a etiqueta e acompanhar o rastreio.
 *
 * Estados do frete (campo `status`):
 *   criado -> aguardando_pagamento -> pago -> etiqueta -> postado -> entregue      (cancelado a qualquer momento antes de pagar)
 *
 * Tudo que mexe em dinheiro ou em estado usa transação, e cada passo é seguro de repetir:
 * se a função cair no meio de uma etiqueta, tocar em "Gerar etiqueta" de novo continua de onde parou.
 */
const ME = melhor_envio_js;
const MP = mercado_pago_js;
const ViaCep = viacep_js;
const U = util_js;
const Cripto = cripto_js;
const { ErroNegocio, numeroEntre, lerConfig, lerCredenciais, refFrete, refPriv, acharPorToken } = dados_js;

const ANTES_DO_PAGAMENTO = ['criado', 'aguardando_pagamento'];
const JA_PAGOS = ['pago', 'etiqueta', 'postado', 'entregue'];
const REF_PIX = /^DPE-([A-Za-z0-9]{20})$/;

/* ------------------------------------------------------------------ Criar */

/**
 * @param {{email:string}} admin
 * @param {{clienteId?:string,clienteNome:string,whatsapp?:string,caixaId:string,pesoKg:number|string,valorDeclarado?:number|string,conteudo?:string,observacao?:string}} e
 */
async function criarFrete(ctx, admin, e) {
  const cfg = await lerConfig(ctx);
  if (!cfg.origemCep) throw new ErroNegocio('sem_origem', 'Antes de criar links, informe o CEP de origem em Fretes → Ajustes.');

  const caixa = cfg.caixas.find((c) => c.id === (e && e.caixaId));
  if (!caixa) throw new ErroNegocio('caixa_invalida', 'Escolha uma das caixas da lista.');

  const pesoKg = numeroEntre(e.pesoKg, 0.01, 30, null);
  if (pesoKg === null) throw new ErroNegocio('peso_invalido', 'Informe o peso em kg (entre 0,01 e 30).');

  const clienteNome = U.texto(e.clienteNome, 80);
  if (clienteNome.length < 2) throw new ErroNegocio('sem_nome', 'Falta o nome da cliente.');

  let declaradoCentavos = e.valorDeclarado === undefined || e.valorDeclarado === '' ? Math.round(cfg.valorDeclaradoPadrao * 100) : U.paraCentavos(e.valorDeclarado);
  if (declaradoCentavos === null || declaradoCentavos < 100 || declaradoCentavos > 1000000) {
    throw new ErroNegocio('declarado_invalido', 'O valor declarado deve ficar entre R$ 1,00 e R$ 10.000,00.');
  }
  declaradoCentavos = Math.round(declaradoCentavos);

  const id = ctx.db.collection('fretes').doc().id;
  const agora = ctx.now();
  const token = Cripto.novoToken();
  const frete = {
    token,
    status: 'criado',
    criadoEm: agora,
    atualizadoEm: agora,
    criadoPor: U.texto(admin && admin.email, 120),
    clienteId: U.texto(e.clienteId, 40),
    clienteNome,
    whatsapp: U.digitos(e.whatsapp).slice(0, 15),
    caixa: { id: caixa.id, nome: caixa.nome, altura: caixa.altura, largura: caixa.largura, comprimento: caixa.comprimento },
    pesoKg,
    declaradoCentavos,
    conteudo: U.texto(e.conteudo, 80) || cfg.conteudoPadrao,
    observacao: U.texto(e.observacao, 200),
  };
  await refFrete(ctx, id).set(frete);
  await refPriv(ctx, id).set({ criadoEm: agora });
  return { id, token };
}

/* --------------------------------------------------------- Visão da cliente */

async function carregar(ctx, token) {
  if (!Cripto.tokenValido(token)) throw new ErroNegocio('link_invalido', 'Este link não é válido. Peça um novo para a loja.', 404);
  const achado = await acharPorToken(ctx, token);
  if (!achado) throw new ErroNegocio('link_invalido', 'Este link não é válido. Peça um novo para a loja.', 404);
  return achado;
}

function paraMs(s) {
  if (!s || typeof s !== 'string') return null;
  const base = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s) ? `${s.replace(' ', 'T')}-03:00` : s;
  const ms = Date.parse(base);
  return Number.isFinite(ms) ? ms : null;
}

function urlRastreio(codigo) {
  return codigo ? `https://www.melhorrastreio.com.br/rastreio/${encodeURIComponent(codigo)}` : '';
}

/** O que a cliente pode ver. Nunca devolve CPF, endereço completo, token ou dados internos. */
function visaoPublica(ctx, frete, priv) {
  const agora = ctx.now();
  const pag = frete.pagamento || null;
  const pixAtivo = !!(pag && pag.status === 'pending' && pag.expiraEm > agora && priv && priv.pix && priv.pix.qrCode);
  const rastreio = frete.rastreio || null;
  return {
    loja: 'Delas pra Elas',
    nome: U.texto(frete.clienteNome, 80).split(' ')[0] || '',
    status: frete.status,
    pacote: frete.caixa ? { altura: frete.caixa.altura, largura: frete.caixa.largura, comprimento: frete.caixa.comprimento, pesoKg: frete.pesoKg } : null,
    cep: frete.cep || '',
    cidade: frete.cidade || '',
    uf: frete.uf || '',
    servico: frete.servico
      ? { empresa: frete.servico.empresa, nome: frete.servico.nome, precoCentavos: frete.servico.precoCentavos, prazoDias: frete.servico.prazoDias }
      : null,
    pagamento: pag
      ? { status: pag.status, valorCentavos: pag.valorCentavos, expiraEm: pag.expiraEm || 0, pagoEm: pag.pagoEm || 0 }
      : null,
    pix: pixAtivo
      ? {
          copiaECola: priv.pix.qrCode,
          qrImagem: priv.pix.qrImagem || '',
          mime: priv.pix.qrImagem ? MP.mimeDaImagem(priv.pix.qrImagem) : '',
          expiraEm: pag.expiraEm,
          valorCentavos: pag.valorCentavos,
        }
      : null,
    rastreio:
      rastreio && (rastreio.codigo || rastreio.status)
        ? { codigo: rastreio.codigo || '', url: rastreio.url || '', status: rastreio.status || '', postadoEm: rastreio.postadoEm || 0, entregueEm: rastreio.entregueEm || 0 }
        : null,
    etiquetaPronta: !!(frete.etiqueta && frete.etiqueta.etapa === 'gerada'),
  };
}

async function lerPriv(ctx, id) {
  const s = await refPriv(ctx, id).get();
  return s.exists ? s.data() : {};
}

async function infoPublica(ctx, token) {
  const { id, frete } = await carregar(ctx, token);
  const priv = frete.status === 'aguardando_pagamento' ? await lerPriv(ctx, id) : {};
  return visaoPublica(ctx, frete, priv);
}

/** Limite simples de tentativas por frete (protege as chamadas públicas que acionam serviços externos). */
async function limitar(ctx, id, nome, max, janelaMs) {
  await ctx.db.runTransaction(async (tx) => {
    const ref = refPriv(ctx, id);
    const s = await tx.get(ref);
    const d = s.exists ? s.data() : {};
    const limites = d.limites || {};
    const atual = limites[nome] || { desde: 0, n: 0 };
    const agora = ctx.now();
    const novo = agora - atual.desde > janelaMs ? { desde: agora, n: 1 } : { desde: atual.desde, n: atual.n + 1 };
    if (novo.n > max) throw new ErroNegocio('muitas_tentativas', 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.', 429);
    tx.set(ref, { limites: { ...limites, [nome]: novo } }, { merge: true });
  });
}

/* ------------------------------------------------------------------- Cotar */

async function cotar(ctx, token, cepBruto) {
  const { id, frete } = await carregar(ctx, token);
  if (!ANTES_DO_PAGAMENTO.includes(frete.status)) {
    throw new ErroNegocio('encerrado', frete.status === 'cancelado' ? 'Este link foi cancelado pela loja.' : 'O frete deste link já foi pago.', 409);
  }
  const cep = U.limparCep(cepBruto);
  if (!cep) throw new ErroNegocio('cep_invalido', 'CEP inválido. Confira os 8 números.', 400);

  await limitar(ctx, id, 'cotacoes', 20, 60 * 60 * 1000);

  const cfg = await lerConfig(ctx);
  const cred = await lerCredenciais(ctx);

  const via = await ViaCep.consultar(ctx, cep);
  if (!via.ok && via.naoEncontrado) throw new ErroNegocio('cep_nao_encontrado', via.erro, 404);
  const endereco = via.ok ? via.endereco : null;

  const q = await ME.cotar(ctx, cred.me, {
    origemCep: cfg.origemCep,
    destinoCep: cep,
    caixa: { alturaCm: frete.caixa.altura, larguraCm: frete.caixa.largura, comprimentoCm: frete.caixa.comprimento },
    pesoKg: frete.pesoKg,
    seguroCentavos: frete.declaradoCentavos,
  });
  if (!q.ok) {
    // A cliente não vê detalhes técnicos (token, permissões); a loja vê o motivo no cartão do frete.
    await refFrete(ctx, id).update({ alerta: { texto: `Cotação: ${q.erro}`, em: ctx.now() } });
    const semAtendimento = /nenhuma transportadora|CEP inválido/i.test(q.erro);
    throw new ErroNegocio(
      semAtendimento ? 'sem_atendimento' : 'cotacao_indisponivel',
      semAtendimento ? q.erro : 'Não conseguimos calcular o frete agora. Tente de novo em alguns minutos ou avise a loja.',
      semAtendimento ? 422 : 502,
    );
  }

  let opcoes = ME.filtrarTransportadoras(q.opcoes, cfg.transportadoras, cfg.mostrarOutras);
  let foraDoPadrao = false;
  if (!opcoes.length) {
    opcoes = q.opcoes;
    foraDoPadrao = true;
  }
  opcoes = opcoes.map((o, i) => ({ id: `o${i + 1}`, ...o }));

  const agora = ctx.now();
  await refPriv(ctx, id).set(
    {
      cotacao: {
        cep,
        criadaEm: agora,
        endereco: endereco ? { rua: endereco.rua, bairro: endereco.bairro, cidade: endereco.cidade, uf: endereco.uf } : null,
        opcoes,
      },
    },
    { merge: true },
  );
  await refFrete(ctx, id).update({
    cep,
    cidade: endereco ? endereco.cidade : '',
    uf: endereco ? endereco.uf : '',
    alerta: null,
    atualizadoEm: agora,
  });

  return {
    cep,
    endereco: endereco ? { rua: endereco.rua, bairro: endereco.bairro, cidade: endereco.cidade, uf: endereco.uf } : null,
    foraDoPadrao,
    opcoes: opcoes.map((o) => ({ id: o.id, empresa: o.empresa, nome: o.nome, precoCentavos: o.precoCentavos, prazoDias: o.prazoDias })),
  };
}

/* ------------------------------------------------------------------- Pagar */

const VALIDADE_COTACAO_MS = 3 * 60 * 60 * 1000;

function validarDestinatario(entrada, cotacao) {
  const nome = U.texto(entrada.nome, 80);
  if (nome.split(' ').filter(Boolean).length < 2) throw new ErroNegocio('nome_invalido', 'Digite seu nome completo (nome e sobrenome).');
  const telefone = U.limparTelefone(entrada.telefone);
  if (!telefone) throw new ErroNegocio('telefone_invalido', 'Digite seu WhatsApp com DDD. Exemplo: 47 99999-9999.');
  const email = U.texto(entrada.email, 120);
  if (!U.emailValido(email)) throw new ErroNegocio('email_invalido', 'Digite um e-mail válido. O Pix precisa dele.');
  const cpf = U.digitos(entrada.cpf);
  if (!U.cpfValido(cpf)) throw new ErroNegocio('cpf_invalido', 'CPF inválido. Confira os números.');
  const numero = U.texto(entrada.numero, 20);
  if (!numero) throw new ErroNegocio('numero_invalido', 'Falta o número da casa (ou digite S/N).');

  const viacep = cotacao.endereco || null;
  const rua = U.texto(entrada.rua, 120) || (viacep && viacep.rua) || '';
  const bairro = U.texto(entrada.bairro, 60) || (viacep && viacep.bairro) || '';
  // Cidade e estado do CEP consultado têm prioridade: o Melhor Envio confere o estado contra o CEP.
  const cidade = (viacep && viacep.cidade) || U.texto(entrada.cidade, 60);
  const uf = (viacep && viacep.uf) || U.ufValida(entrada.uf);
  if (!rua) throw new ErroNegocio('rua_invalida', 'Falta o nome da rua.');
  if (!bairro) throw new ErroNegocio('bairro_invalido', 'Falta o bairro.');
  if (!cidade || !uf) throw new ErroNegocio('cidade_invalida', 'Falta a cidade e o estado.');

  return {
    nome,
    telefone,
    email,
    cpf,
    cep: cotacao.cep,
    rua,
    numero,
    complemento: U.texto(entrada.complemento, 60),
    bairro,
    cidade,
    uf,
  };
}

async function cancelarPixSilencioso(ctx, cred, idPix) {
  try {
    const r = await MP.cancelarPagamento(ctx, cred.mp, idPix);
    if (!r.ok) ctx.log.warn('Não foi possível cancelar o Pix antigo', { motivo: r.erro });
  } catch (e) {
    ctx.log.warn('Erro ao cancelar o Pix antigo', { motivo: U.limparParaLog(e && e.message) });
  }
}

/**
 * A cliente escolheu a opção de frete e informou os dados: cria o Pix do frete (ou devolve o que já existe).
 */
async function pagar(ctx, token, entrada) {
  const { id } = await carregar(ctx, token);
  await limitar(ctx, id, 'pagamentos', 10, 60 * 60 * 1000);
  const cfg = await lerConfig(ctx);
  const cred = await lerCredenciais(ctx);
  const agora = ctx.now();
  const fr = refFrete(ctx, id);
  const pr = refPriv(ctx, id);

  // Fase 1 — valida e reserva (evita Pix duplicado por duplo clique).
  const reserva = await ctx.db.runTransaction(async (tx) => {
    const sf = await tx.get(fr);
    if (!sf.exists) throw new ErroNegocio('link_invalido', 'Este link não é válido.', 404);
    const f = sf.data();
    if (!ANTES_DO_PAGAMENTO.includes(f.status)) {
      throw new ErroNegocio('encerrado', f.status === 'cancelado' ? 'Este link foi cancelado pela loja.' : 'O frete deste link já foi pago.', 409);
    }
    const sp = await tx.get(pr);
    const p = sp.exists ? sp.data() : {};
    const cot = p.cotacao;
    if (!cot || !Array.isArray(cot.opcoes) || !cot.opcoes.length) throw new ErroNegocio('sem_cotacao', 'Digite o CEP e escolha o frete antes de pagar.', 409);
    if (agora - cot.criadaEm > VALIDADE_COTACAO_MS) throw new ErroNegocio('cotacao_vencida', 'Os valores do frete venceram. Digite o CEP de novo para recalcular.', 409);
    const opcao = cot.opcoes.find((o) => o.id === (entrada && entrada.opcaoId));
    if (!opcao) throw new ErroNegocio('opcao_invalida', 'Escolha uma das opções de frete.', 400);
    const dest = validarDestinatario(entrada || {}, cot);

    const pag = f.pagamento;
    if (pag && pag.status === 'pending' && pag.expiraEm > agora && f.servico && f.servico.opcaoId === opcao.id && f.servico.precoCentavos === opcao.precoCentavos && p.pix && p.pix.qrCode) {
      return { reaproveitar: true };
    }
    if (f.pagando && agora - f.pagando < 45000) {
      throw new ErroNegocio('em_andamento', 'Já estamos gerando o seu Pix. Aguarde alguns segundos.', 409);
    }
    tx.update(fr, { pagando: agora });
    return {
      reaproveitar: false,
      opcao,
      dest,
      pixAntigo: pag && pag.status === 'pending' ? pag.id : null,
      tentativas: f.tentativasPix || 0,
      clienteNome: f.clienteNome,
    };
  });

  if (reserva.reaproveitar) return infoPublica(ctx, token);

  const liberar = () => fr.update({ pagando: null }).catch(() => {});

  // Fase 2 — fora da transação (chamadas de rede).
  if (reserva.pixAntigo) await cancelarPixSilencioso(ctx, cred, reserva.pixAntigo);

  const partes = reserva.dest.nome.split(' ');
  const minutos = Math.min(43200, Math.max(30, cfg.pixValidadeMin));
  const expiraEmMs = agora + minutos * 60000 + 60000 - (minutos >= 43200 ? 180000 : 0);
  const chave = await Cripto.uuidDeSemente(
    ['dpe-pix', id, reserva.opcao.id, reserva.opcao.precoCentavos, await Cripto.sha256Hex(reserva.dest.cpf), Math.floor(agora / 600000), reserva.tentativas].join('|'),
  );

  let r;
  try {
    r = await MP.criarPix(ctx, cred.mp, {
      valorCentavos: reserva.opcao.precoCentavos,
      descricao: `Frete ${reserva.opcao.empresa} ${reserva.opcao.nome} - Delas pra Elas`,
      referencia: `DPE-${id}`,
      email: reserva.dest.email,
      nome: partes[0],
      sobrenome: partes.slice(1).join(' '),
      cpf: reserva.dest.cpf,
      expiraEmMs,
      chaveIdempotencia: chave,
      notificationUrl: cfg.siteUrl ? `${cfg.siteUrl}/api/mp/webhook` : '',
    });
  } catch (e) {
    await liberar();
    throw e;
  }

  if (!r.ok) {
    await liberar();
    await fr.update({ alerta: { texto: `Pix: ${r.erro}`, em: ctx.now() } }).catch(() => {});
    throw new ErroNegocio('pix_indisponivel', 'Não conseguimos gerar o Pix agora. Tente de novo em instantes ou avise a loja.', 502);
  }

  const pix = r.pagamento;
  if (pix.valorCentavos !== reserva.opcao.precoCentavos) {
    await cancelarPixSilencioso(ctx, cred, pix.id);
    await liberar();
    ctx.log.error('Valor do Pix divergente do frete', { frete: id });
    throw new ErroNegocio('pix_divergente', 'O valor do Pix não confere com o frete. Nada foi cobrado; tente de novo.', 502);
  }

  // Fase 3 — grava o resultado.
  await ctx.db.runTransaction(async (tx) => {
    const sf = await tx.get(fr);
    const f = sf.data();
    const sp = await tx.get(pr);
    const p = sp.exists ? sp.data() : {};
    tx.update(fr, {
      status: ANTES_DO_PAGAMENTO.includes(f.status) ? 'aguardando_pagamento' : f.status,
      servico: {
        opcaoId: reserva.opcao.id,
        servicoId: reserva.opcao.servicoId,
        empresa: reserva.opcao.empresa,
        nome: reserva.opcao.nome,
        precoCentavos: reserva.opcao.precoCentavos,
        prazoDias: reserva.opcao.prazoDias,
      },
      destinatarioNome: reserva.dest.nome,
      cep: reserva.dest.cep,
      cidade: reserva.dest.cidade,
      uf: reserva.dest.uf,
      pagamento: {
        provedor: 'mercadopago',
        id: pix.id,
        status: pix.status === 'approved' ? 'pending' : pix.status, // aprovação só entra pela conferência
        valorCentavos: pix.valorCentavos,
        criadoEm: agora,
        expiraEm: pix.expiraEmMs || expiraEmMs,
        pagoEm: 0,
      },
      pagando: null,
      tentativasPix: (f.tentativasPix || 0) + 1,
      alerta: null,
      atualizadoEm: agora,
    });
    tx.set(
      pr,
      {
        destinatario: reserva.dest,
        pix: { qrCode: pix.qrCode, qrImagem: pix.qrImagem, ticketUrl: pix.ticketUrl },
        pagamentos: [...(p.pagamentos || []), pix.id],
      },
      { merge: true },
    );
  });

  ctx.log.info('Pix do frete criado', { frete: id });
  return infoPublica(ctx, token);
}

/* ------------------------------------------------------------- Conciliação */

/**
 * Aplica o estado verdadeiro de um pagamento (já consultado na API do Mercado Pago) ao frete.
 * Idempotente: pode ser chamada pelo webhook, pela página da cliente, pela rotina e pela administradora.
 */
async function aplicarPagamentoRemoto(ctx, remoto) {
  const m = REF_PIX.exec(remoto.referencia || '');
  if (!m) return { tratado: false, motivo: 'sem_referencia' };
  const id = m[1];
  const fr = refFrete(ctx, id);
  const pr = refPriv(ctx, id);

  return ctx.db.runTransaction(async (tx) => {
    const sf = await tx.get(fr);
    if (!sf.exists) return { tratado: false, motivo: 'frete_desconhecido' };
    const sp = await tx.get(pr);
    const p = sp.exists ? sp.data() : {};
    // Só reconhece pagamentos que NÓS criamos para este frete.
    if (!(p.pagamentos || []).includes(remoto.id)) return { tratado: false, motivo: 'pagamento_desconhecido' };

    const f = sf.data();
    const atual = f.pagamento || {};
    const agora = ctx.now();

    if (remoto.status === 'approved') {
      if (JA_PAGOS.includes(f.status)) {
        if (atual.id === remoto.id) return { tratado: true, mudou: false };
        // Segundo Pix aprovado para o mesmo frete: dinheiro em duplicidade — a loja precisa saber.
        tx.update(fr, { alerta: { texto: `Pagamento em duplicidade: o Pix ${remoto.id} também foi aprovado. Devolva um deles no Mercado Pago.`, em: agora } });
        return { tratado: true, mudou: true, motivo: 'duplicado' };
      }
      if (f.status === 'aguardando_pagamento' && f.servico && remoto.valorCentavos === f.servico.precoCentavos) {
        tx.update(fr, {
          status: 'pago',
          pagamento: { ...atual, id: remoto.id, status: 'approved', valorCentavos: remoto.valorCentavos, pagoEm: agora },
          alerta: null,
          atualizadoEm: agora,
        });
        return { tratado: true, mudou: true, motivo: 'pago' };
      }
      tx.update(fr, {
        alerta: {
          texto: `O Pix ${remoto.id} foi aprovado (${U.reais(remoto.valorCentavos)}), mas não confere com o frete escolhido${f.servico ? ` (${U.reais(f.servico.precoCentavos)})` : ''}. Confira no Mercado Pago.`,
          em: agora,
        },
      });
      return { tratado: true, mudou: true, motivo: 'valor_divergente' };
    }

    if (atual.id !== remoto.id) return { tratado: true, mudou: false };

    if (remoto.status === 'refunded' && atual.status === 'approved') {
      tx.update(fr, {
        pagamento: { ...atual, status: 'refunded' },
        alerta: { texto: 'Este pagamento foi estornado ou contestado no Mercado Pago.', em: agora },
        atualizadoEm: agora,
      });
      return { tratado: true, mudou: true, motivo: 'estornado' };
    }
    if (['expired', 'cancelled', 'rejected'].includes(remoto.status) && atual.status === 'pending') {
      tx.update(fr, { pagamento: { ...atual, status: remoto.status }, atualizadoEm: agora });
      return { tratado: true, mudou: true, motivo: remoto.status };
    }
    return { tratado: true, mudou: false };
  });
}

async function sincronizarPagamento(ctx, id, { minIntervaloMs = 0 } = {}) {
  const s = await refFrete(ctx, id).get();
  if (!s.exists) return { mudou: false };
  const f = s.data();
  if (!f.pagamento || f.pagamento.status !== 'pending') return { mudou: false };
  if (minIntervaloMs && ctx.now() - (f.pagamentoVerificadoEm || 0) < minIntervaloMs) return { mudou: false };

  const cred = await lerCredenciais(ctx);
  await refFrete(ctx, id).update({ pagamentoVerificadoEm: ctx.now() });
  const r = await MP.consultarPagamento(ctx, cred.mp, f.pagamento.id);
  if (!r.ok) return { mudou: false, erro: r.erro, retentavel: r.retentavel };
  return aplicarPagamentoRemoto(ctx, r.pagamento);
}

/** A cliente está olhando a página: confere o Pix e o rastreio (com intervalos mínimos) e devolve a visão. */
async function consultarStatus(ctx, token) {
  const { id, frete } = await carregar(ctx, token);
  if (frete.status === 'aguardando_pagamento') {
    await sincronizarPagamento(ctx, id, { minIntervaloMs: 4000 }).catch((e) => ctx.log.warn('Falha ao conferir o Pix', { motivo: U.limparParaLog(e && e.message) }));
  } else if (frete.status === 'etiqueta' || frete.status === 'postado') {
    await atualizarRastreio(ctx, id, { minIntervaloMs: 10 * 60 * 1000 }).catch((e) => ctx.log.warn('Falha ao conferir o rastreio', { motivo: U.limparParaLog(e && e.message) }));
  }
  return infoPublica(ctx, token);
}

/**
 * Webhook do Mercado Pago. Pública por necessidade, então:
 *  1. exige a assinatura secreta configurada (sem ela recusa tudo com 503);
 *  2. valida o x-signature (HMAC-SHA256) em tempo constante;
 *  3. não confia no corpo: reconsulta o pagamento na API com o token da loja;
 *  4. é idempotente (a conciliação só aplica transições condicionais).
 */
async function tratarWebhookMp(ctx, { headers, query, body }) {
  // Sem cabeçalho de assinatura no formato certo não vale nem abrir o banco.
  if (!MP.temFormatoDeAssinatura(String(headers['x-signature'] || ''))) {
    ctx.log.warn('Notificação sem assinatura recusada');
    return { http: 401, corpo: { status: 'assinatura_invalida' } };
  }
  const cred = await lerCredenciais(ctx);
  if (!cred.mp.webhookSecret) return { http: 503, corpo: { status: 'webhook_nao_configurado' } };

  const dataId = String((query && query['data.id']) || '').slice(0, 64);
  const valido = await MP.verificarAssinatura(String(headers['x-signature'] || ''), String(headers['x-request-id'] || ''), dataId, cred.mp.webhookSecret);
  if (!valido) {
    ctx.log.warn('Notificação com assinatura inválida recusada');
    return { http: 401, corpo: { status: 'assinatura_invalida' } };
  }

  const tipo = (body && typeof body.type === 'string' ? body.type : String((query && query.type) || '')) || '';
  if (tipo !== 'payment') return { http: 200, corpo: { status: 'ignorado' } };

  const idPag = body && body.data && body.data.id !== undefined ? String(body.data.id) : dataId;
  if (!/^\d{1,20}$/.test(idPag) || (dataId && dataId !== idPag)) return { http: 400, corpo: { status: 'id_invalido' } };

  const r = await MP.consultarPagamento(ctx, cred.mp, idPag);
  if (!r.ok) {
    ctx.log.warn('Não foi possível consultar o pagamento notificado');
    return { http: r.retentavel ? 503 : 200, corpo: { status: 'consulta_falhou' } };
  }
  const res = await aplicarPagamentoRemoto(ctx, r.pagamento);
  return { http: 200, corpo: { status: res.motivo || 'ok' } };
}

/* ---------------------------------------------------------------- Cancelar */

async function cancelarFrete(ctx, freteId) {
  const cred = await lerCredenciais(ctx);
  const fr = refFrete(ctx, freteId);
  const antes = await ctx.db.runTransaction(async (tx) => {
    const sf = await tx.get(fr);
    if (!sf.exists) throw new ErroNegocio('nao_existe', 'Frete não encontrado.', 404);
    const f = sf.data();
    if (!ANTES_DO_PAGAMENTO.includes(f.status)) {
      throw new ErroNegocio('nao_cancela', f.status === 'cancelado' ? 'Este frete já está cancelado.' : 'Este frete já foi pago e não pode ser cancelado por aqui. Devolva o valor pelo Mercado Pago, se for o caso.');
    }
    tx.update(fr, { status: 'cancelado', canceladoEm: ctx.now(), atualizadoEm: ctx.now() });
    return f;
  });
  if (antes.pagamento && antes.pagamento.status === 'pending') await cancelarPixSilencioso(ctx, cred, antes.pagamento.id);
  return { ok: true };
}

/* ---------------------------------------------------------------- Etiqueta */

const TOLERANCIA_CENTAVOS = 0;

function exigirRemetente(cfg, cred) {
  const r = cfg.remetente;
  const faltas = [];
  if (!r.nome) faltas.push('nome');
  if (!r.telefone) faltas.push('telefone com DDD');
  if (!r.email) faltas.push('e-mail');
  if (!r.cep) faltas.push('CEP');
  if (!r.endereco) faltas.push('rua');
  if (!r.numero) faltas.push('número');
  if (!r.bairro) faltas.push('bairro');
  if (!r.cidade) faltas.push('cidade');
  if (!r.uf) faltas.push('estado');
  if (!(U.cpfValido(cred.remetenteDocumento) || U.cnpjValido(cred.remetenteDocumento))) faltas.push('CPF ou CNPJ');
  if (faltas.length) {
    throw new ErroNegocio('sem_remetente', `Complete os dados de quem envia em Fretes → Ajustes: falta ${faltas.join(', ')}.`);
  }
}

/**
 * Cria, paga e gera a etiqueta no Melhor Envio. Cada etapa é gravada; repetir a chamada continua de onde parou.
 * @returns {Promise<{ok:true,url:string,codigo:string}|{precisaConfirmar:true,precoCentavos:number,pagoCentavos:number}>}
 */
async function gerarEtiqueta(ctx, freteId, { confirmarDiferenca = false } = {}) {
  const cfg = await lerConfig(ctx);
  const cred = await lerCredenciais(ctx);
  const fr = refFrete(ctx, freteId);
  const agora = ctx.now();

  const f = await ctx.db.runTransaction(async (tx) => {
    const sf = await tx.get(fr);
    if (!sf.exists) throw new ErroNegocio('nao_existe', 'Frete não encontrado.', 404);
    const x = sf.data();
    if (!['pago', 'etiqueta'].includes(x.status) || !x.pagamento || x.pagamento.status !== 'approved') {
      throw new ErroNegocio('nao_pago', 'O pagamento deste frete ainda não foi confirmado.');
    }
    if (x.etiqueta && x.etiqueta.trava && agora - x.etiqueta.trava < 120000) {
      throw new ErroNegocio('em_andamento', 'A etiqueta já está sendo gerada. Aguarde um minuto.');
    }
    tx.update(fr, { etiqueta: { ...(x.etiqueta || {}), trava: agora } });
    return x;
  });

  let et = { ...(f.etiqueta || {}), trava: agora };
  const gravar = async (extra) => {
    et = { ...et, ...extra };
    await fr.update({ etiqueta: et, atualizadoEm: ctx.now() });
  };
  const falhar = async (mensagem) => {
    await gravar({ trava: null, erro: mensagem, erroEm: ctx.now() });
    throw new ErroNegocio('etiqueta_falhou', mensagem);
  };

  try {
    if (et.etapa === 'gerada') {
      await gravar({ trava: null });
      return { ok: true, ...(await montarResultadoEtiqueta(ctx, cfg, cred, freteId)) };
    }

    // 1) carrinho
    if (!et.meId) {
      exigirRemetente(cfg, cred);
      const priv = await lerPriv(ctx, freteId);
      const dest = priv.destinatario;
      if (!dest) await falhar('Faltam os dados de entrega da cliente.');
      const corpo = ME.montarCarrinho({
        servicoId: f.servico.servicoId,
        remetente: { ...cfg.remetente, documento: cred.remetenteDocumento },
        destinatario: { nome: dest.nome, telefone: dest.telefone, email: dest.email, documento: dest.cpf, cep: dest.cep, endereco: dest.rua, numero: dest.numero, complemento: dest.complemento, bairro: dest.bairro, cidade: dest.cidade, uf: dest.uf },
        caixa: { alturaCm: f.caixa.altura, larguraCm: f.caixa.largura, comprimentoCm: f.caixa.comprimento },
        pesoKg: f.pesoKg,
        declaradoCentavos: f.declaradoCentavos,
        conteudo: f.conteudo,
        naoComercial: cfg.naoComercial,
        tag: `frete:${freteId}`,
      });
      const r = await ME.inserirNoCarrinho(ctx, cred.me, corpo);
      if (!r.ok) await falhar(r.erro);
      await gravar({ etapa: 'carrinho', meId: r.id, protocolo: r.protocolo, precoCentavos: r.precoCentavos, erro: null });
    }

    // 2) compra (usa o saldo da carteira do Melhor Envio)
    if (et.etapa === 'carrinho') {
      const pago = f.servico.precoCentavos;
      if (et.precoCentavos !== null && et.precoCentavos !== undefined && et.precoCentavos > pago + TOLERANCIA_CENTAVOS && !confirmarDiferenca) {
        await gravar({ trava: null });
        return { precisaConfirmar: true, precoCentavos: et.precoCentavos, pagoCentavos: pago };
      }
      const r = await ME.comprar(ctx, cred.me, [et.meId]);
      if (!r.ok) await falhar(r.erro);
      await gravar({ etapa: 'comprada', erro: null });
    }

    // 3) geração (pode levar um instante para o Melhor Envio liberar a etiqueta paga)
    if (et.etapa === 'comprada') {
      let r = await ME.gerar(ctx, cred.me, [et.meId]);
      for (let tentativa = 1; !r.ok && tentativa < 3 && /liberad|released|pag|paid|pending/i.test(r.erro); tentativa += 1) {
        await ctx.dormir(1500);
        r = await ME.gerar(ctx, cred.me, [et.meId]);
      }
      if (!r.ok) await falhar(r.erro);
      await gravar({ etapa: 'gerada', geradaEm: ctx.now(), erro: null });
    }

    // 4) código de rastreio e link de impressão
    const info = await ME.consultarEtiqueta(ctx, cred.me, et.meId);
    const agoraFim = ctx.now();
    await fr.update({
      status: 'etiqueta',
      etiqueta: { ...et, trava: null },
      rastreio: {
        codigo: info.ok ? info.codigo : '',
        url: info.ok ? urlRastreio(info.codigo) : '',
        status: 'generated',
        postadoEm: 0,
        entregueEm: 0,
        atualizadoEm: agoraFim,
      },
      alerta: null,
      atualizadoEm: agoraFim,
    });
    return { ok: true, ...(await montarResultadoEtiqueta(ctx, cfg, cred, freteId)) };
  } catch (e) {
    // Qualquer saída por erro solta a trava, senão a próxima tentativa esbarraria nela por 2 minutos.
    if (!(e instanceof ErroNegocio)) {
      await gravar({ trava: null, erro: 'Erro inesperado ao gerar a etiqueta. Tente de novo.', erroEm: ctx.now() }).catch(() => {});
      ctx.log.error('Erro inesperado na etiqueta', { frete: freteId, motivo: U.limparParaLog(e && e.message) });
    } else if (et.trava) {
      await gravar({ trava: null, erro: e.message, erroEm: ctx.now() }).catch(() => {});
    }
    throw e;
  }
}

async function montarResultadoEtiqueta(ctx, cfg, cred, freteId) {
  const f = (await refFrete(ctx, freteId).get()).data();
  const impressao = await ME.imprimir(ctx, cred.me, [f.etiqueta.meId], cfg.etiquetaPublica ? 'public' : 'private');
  return {
    url: impressao.ok ? impressao.url : '',
    avisoImpressao: impressao.ok ? '' : impressao.erro,
    codigo: (f.rastreio && f.rastreio.codigo) || '',
  };
}

/** Link novo para imprimir de novo uma etiqueta já gerada. */
async function urlEtiqueta(ctx, freteId) {
  const f = await (async () => {
    const s = await refFrete(ctx, freteId).get();
    return s.exists ? s.data() : null;
  })();
  if (!f || !f.etiqueta || f.etiqueta.etapa !== 'gerada') throw new ErroNegocio('sem_etiqueta', 'Este frete ainda não tem etiqueta gerada.');
  const cfg = await lerConfig(ctx);
  const cred = await lerCredenciais(ctx);
  const r = await ME.imprimir(ctx, cred.me, [f.etiqueta.meId], cfg.etiquetaPublica ? 'public' : 'private');
  if (!r.ok) throw new ErroNegocio('impressao_falhou', r.erro);
  return { url: r.url };
}

/* ----------------------------------------------------------------- Rastreio */

function statusDoFrete(me) {
  if (me.entregueEm || me.status === 'delivered') return 'entregue';
  if (me.postadoEm || me.status === 'posted' || me.status === 'received') return 'postado';
  return 'etiqueta';
}

async function atualizarRastreio(ctx, freteId, { minIntervaloMs = 0 } = {}) {
  const fr = refFrete(ctx, freteId);
  const s = await fr.get();
  if (!s.exists) return { mudou: false };
  const f = s.data();
  if (!['etiqueta', 'postado'].includes(f.status) || !f.etiqueta || !f.etiqueta.meId) return { mudou: false };
  if (minIntervaloMs && f.rastreio && ctx.now() - (f.rastreio.atualizadoEm || 0) < minIntervaloMs) return { mudou: false };

  const cred = await lerCredenciais(ctx);
  const r = await ME.rastrear(ctx, cred.me, [f.etiqueta.meId]);
  if (!r.ok) return { mudou: false, erro: r.erro };
  const item = r.itens[f.etiqueta.meId];
  if (!item) return { mudou: false };

  const agora = ctx.now();

  if (item.canceladaEm || item.status === 'cancelled') {
    await ctx.db.runTransaction(async (tx) => {
      const sf = await tx.get(fr);
      const x = sf.data();
      if (!x.etiqueta || x.etiqueta.meId !== f.etiqueta.meId) return;
      tx.update(fr, {
        status: 'pago',
        etiquetasAnteriores: [...(x.etiquetasAnteriores || []), { ...x.etiqueta, canceladaEm: agora }],
        etiqueta: null,
        rastreio: null,
        alerta: { texto: 'A etiqueta foi cancelada no Melhor Envio. Toque em "Gerar etiqueta" para emitir outra.', em: agora },
        atualizadoEm: agora,
      });
    });
    return { mudou: true, motivo: 'cancelada' };
  }

  let codigo = item.codigo || (f.rastreio && f.rastreio.codigo) || '';
  if (!codigo) {
    const info = await ME.consultarEtiqueta(ctx, cred.me, f.etiqueta.meId);
    if (info.ok) codigo = info.codigo;
  }

  const novoStatus = statusDoFrete(item);
  const anterior = f.rastreio || {};
  const novo = {
    codigo,
    url: urlRastreio(codigo),
    status: item.status || anterior.status || '',
    postadoEm: paraMs(item.postadoEm) || anterior.postadoEm || 0,
    entregueEm: paraMs(item.entregueEm) || anterior.entregueEm || 0,
    atualizadoEm: agora,
  };
  const mudou = novoStatus !== f.status || novo.codigo !== anterior.codigo || novo.postadoEm !== anterior.postadoEm || novo.entregueEm !== anterior.entregueEm;
  await fr.update({ status: novoStatus, rastreio: novo, ...(mudou ? { atualizadoEm: agora } : {}) });
  return { mudou, status: novoStatus };
}

/* ------------------------------------------------------------------ Rotina */

// Quantas chamadas externas conferir UM frete pode gastar, no pior caso (Pix: 1 no Mercado Pago; rastreio: 2 no Melhor Envio).
// O banco não entra nesta conta: o plano grátis conta as chamadas ao D1 à parte (limite de 1000 por execução).
const CUSTO_MAXIMO_POR_FRETE = 4;

async function rotina(ctx) {
  const resumo = { pagamentos: 0, rastreios: 0, erros: 0, adiados: 0 };
  // Cada fila entra com no máximo `limite` fretes. No Cloudflare grátis cada execução também tem um orçamento de chamadas
  // (ctx.chamadasRestantes): os fretes de todas as filas vão numa lista só, do conferido há mais tempo para o mais recente,
  // e a rotina para quando o orçamento não comporta mais um frete — quem ficou de fora é o primeiro da próxima rodada.
  const limite = Math.max(1, Math.floor(Number(ctx.limiteRotina)) || 200);
  const maisAntigosPrimeiro = (docs, quando) => docs.slice().sort((a, b) => (quando(a.data()) || 0) - (quando(b.data()) || 0));
  const fila = [];

  const pend = await ctx.db.collection('fretes').where('status', '==', 'aguardando_pagamento').get();
  for (const d of maisAntigosPrimeiro(pend.docs, (f) => f.pagamentoVerificadoEm).slice(0, limite)) {
    fila.push({ quando: d.data().pagamentoVerificadoEm || 0, ordem: 0, conferir: () => conferirPagamentoDaRotina(ctx, d.id, resumo) });
  }
  for (const status of ['etiqueta', 'postado']) {
    const q = await ctx.db.collection('fretes').where('status', '==', status).get();
    for (const d of maisAntigosPrimeiro(q.docs, (f) => f.rastreio && f.rastreio.atualizadoEm).slice(0, limite)) {
      fila.push({ quando: (d.data().rastreio && d.data().rastreio.atualizadoEm) || 0, ordem: 1, conferir: () => conferirRastreioDaRotina(ctx, d.id, resumo) });
    }
  }

  fila.sort((a, b) => a.quando - b.quando || a.ordem - b.ordem);
  for (let i = 0; i < fila.length; i += 1) {
    if (typeof ctx.chamadasRestantes === 'function' && ctx.chamadasRestantes() < CUSTO_MAXIMO_POR_FRETE) {
      resumo.adiados = fila.length - i;
      break;
    }
    await fila[i].conferir();
  }
  return resumo;
}

async function conferirPagamentoDaRotina(ctx, id, resumo) {
  try {
    const r = await sincronizarPagamento(ctx, id, {});
    if (r.mudou) resumo.pagamentos += 1;
  } catch (e) {
    resumo.erros += 1;
    ctx.log.warn('Rotina: falha ao conferir pagamento', { motivo: U.limparParaLog(e && e.message) });
  }
}

async function conferirRastreioDaRotina(ctx, id, resumo) {
  try {
    const r = await atualizarRastreio(ctx, id, { minIntervaloMs: 3 * 60 * 60 * 1000 });
    if (r.mudou) resumo.rastreios += 1;
  } catch (e) {
    resumo.erros += 1;
    ctx.log.warn('Rotina: falha ao conferir rastreio', { motivo: U.limparParaLog(e && e.message) });
  }
}

/** Botão "Conferir agora" da administradora: força a conferência do Pix e do rastreio. */
async function atualizarAgora(ctx, freteId) {
  const a = await sincronizarPagamento(ctx, freteId, {});
  const b = await atualizarRastreio(ctx, freteId, {});
  return { pagamento: a, rastreio: b };
}

return { criarFrete, infoPublica, cotar, pagar, consultarStatus, tratarWebhookMp, sincronizarPagamento, cancelarFrete, gerarEtiqueta, urlEtiqueta, atualizarRastreio, atualizarAgora, rotina };
})();

/* ────────────────────────────────────────────────────────────────────────────────────────────────────
 * acesso_js  —  o arquivo src/acesso.js (o código abaixo é o do arquivo, sem alteração)
 * ──────────────────────────────────────────────────────────────────────────────────────────────────── */
export const acesso_js = (() => {
/**
 * Quem pode entrar: contas (e-mail + senha), sessão por cookie e proteção contra tentativa de adivinhar senha.
 *
 *  - Senhas NUNCA são guardadas: o banco guarda uma assinatura HMAC-SHA256 da senha, feita com uma chave que só existe no
 *    SEGREDO do Worker (fora do banco) e com um "sal" próprio de cada conta. Quem copiar o banco não consegue testar senhas.
 *  - A sessão é um cookie assinado com outra chave do mesmo SEGREDO: HttpOnly (o JavaScript da página não lê),
 *    Secure (só por https) e SameSite=Strict (outros sites não conseguem usá-lo).
 *  - Trocar a senha ou remover a pessoa invalida na hora todas as sessões dela (campo `sv` da conta).
 *  - Errou a senha demais? Fica bloqueado por 15 minutos (por e-mail e por endereço de internet).
 *
 * Papéis: "dono" (tudo, inclusive Fretes e cadastro da equipe) e "equipe" (o app da live).
 */
const { assinar, assinaturaConfere, bytesAleatorios, chaveDerivada, paraBase64Url, deBase64UrlEstrito, sha256Hex, textosIguais } = cripto_js;
const { ErroNegocio } = dados_js;
const { emailValido } = util_js;

const COOKIE_DA_SESSAO = 'dpe_sessao';
const DURACAO_DA_SESSAO_S = 14 * 24 * 3600;
const JANELA_MS = 15 * 60 * 1000;
const MAX_FALHAS_POR_EMAIL = 6;
const MAX_FALHAS_POR_IP = 40;
const SENHA_MIN = 8;
const SENHA_MAX = 200;
const MAX_PESSOAS = 20;
const SAL_FALSO = 'AAAAAAAAAAAAAAAAAAAAAA';

/** Versão inicial de uma conta nova: sorteada, para que uma sessão antiga nunca "volte a valer" se alguém for removida e recriada. */
const novaVersao = () => 1 + (bytesAleatorios(4).reduce((total, byte) => total * 256 + byte, 0) % 1_000_000_000);

const SEM_ACESSO = () => new ErroNegocio('credenciais_invalidas', 'E-mail ou senha não confere.', 401);

/** E-mail limpo e em minúsculas. Só aceita texto: lista, objeto ou número viram '' (e-mail inválido). */
const normalizarEmail = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');

function exigirSenhaBoa(senha, email) {
  if (typeof senha !== 'string' || senha.length < SENHA_MIN) throw new ErroNegocio('senha_curta', `A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`, 400);
  if (senha.length > SENHA_MAX) throw new ErroNegocio('senha_longa', 'A senha é grande demais.', 400);
  if (email && senha.toLowerCase() === email) throw new ErroNegocio('senha_fraca', 'A senha não pode ser igual ao e-mail.', 400);
}

function exigirEmail(v) {
  const e = normalizarEmail(v);
  if (!emailValido(e)) throw new ErroNegocio('email_invalido', 'Esse e-mail não parece válido.', 400);
  return e;
}

async function assinaturaDaSenha(ctx, sal, senha) {
  return assinar(await chaveDerivada(ctx.segredo, 'senha-v1'), `${sal}\u0000${senha}`);
}

/* ── limite de tentativas ─────────────────────────────────── */
async function estaBloqueado(ctx, chave, maximo) {
  const l = await ctx.d1.prepare('SELECT n, ate FROM limites WHERE chave = ?').bind(chave).first();
  return Boolean(l && l.ate > ctx.now() && l.n >= maximo);
}

async function registrarFalha(ctx, chave) {
  const agora = ctx.now();
  await ctx.d1
    .prepare(
      `INSERT INTO limites (chave, n, ate) VALUES (?1, 1, ?2 + ?3)
       ON CONFLICT (chave) DO UPDATE SET
         n = CASE WHEN limites.ate <= ?2 THEN 1 ELSE limites.n + 1 END,
         ate = CASE WHEN limites.ate <= ?2 THEN ?2 + ?3 ELSE limites.ate END`,
    )
    .bind(chave, agora, JANELA_MS)
    .run();
}

async function zerarFalhas(ctx, chave) {
  await ctx.d1.prepare('DELETE FROM limites WHERE chave = ?').bind(chave).run();
}

async function chavesDeLimite(email, ip) {
  return { porEmail: `login:e:${(await sha256Hex(email)).slice(0, 32)}`, porIp: `login:i:${String(ip || 'sem-ip').slice(0, 64)}` };
}

async function exigirSemBloqueio(ctx, chaves) {
  if ((await estaBloqueado(ctx, chaves.porEmail, MAX_FALHAS_POR_EMAIL)) || (await estaBloqueado(ctx, chaves.porIp, MAX_FALHAS_POR_IP))) {
    throw new ErroNegocio('muitas_tentativas', 'Muitas tentativas. Espere uns 15 minutos e tente de novo.', 429);
  }
}

/* ── sessão ───────────────────────────────────────────────── */
async function criarSessao(ctx, usuario) {
  const corpo = paraBase64Url(new TextEncoder().encode(JSON.stringify({ e: usuario.email, x: Math.floor(ctx.now() / 1000) + DURACAO_DA_SESSAO_S, v: usuario.sv })));
  const sessao = `v1.${corpo}`;
  return `${sessao}.${await assinar(await chaveDerivada(ctx.segredo, 'sessao-v1'), sessao)}`;
}

function valorDoCookie(cabecalho, nome) {
  for (const parte of String(cabecalho || '').split(';')) {
    const i = parte.indexOf('=');
    if (i > 0 && parte.slice(0, i).trim() === nome) return parte.slice(i + 1).trim();
  }
  return '';
}

/** Quem está logado neste pedido (ou null). Confere assinatura, validade e se a conta ainda existe com a mesma versão.
 *  Devolve também `sv` (versão da conta) e `expira` (segundos desde 1970), usados para renovar a sessão. */
async function usuarioDaSessao(ctx, cabecalhoCookie) {
  const m = /^(v1\.[A-Za-z0-9_-]{10,400})\.([A-Za-z0-9_-]{40,50})$/.exec(valorDoCookie(cabecalhoCookie, COOKIE_DA_SESSAO));
  if (!m) return null;
  if (!(await assinaturaConfere(await chaveDerivada(ctx.segredo, 'sessao-v1'), m[1], m[2]))) return null;
  let p;
  try {
    p = JSON.parse(new TextDecoder().decode(deBase64UrlEstrito(m[1].slice(3))));
  } catch {
    return null;
  }
  if (!p || typeof p.e !== 'string' || !Number.isFinite(p.x) || p.x * 1000 < ctx.now()) return null;
  const u = await ctx.d1.prepare('SELECT email, papel, sv FROM usuarios WHERE email = ?').bind(p.e).first();
  if (!u || u.sv !== p.v) return null;
  return { email: u.email, papel: u.papel, sv: u.sv, expira: p.x };
}

/** Cabeçalho Set-Cookie. `seguro`: só false em teste local (http). */
function cookieDeSessao(token, seguro) {
  return `${COOKIE_DA_SESSAO}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${DURACAO_DA_SESSAO_S}${seguro ? '; Secure' : ''}`;
}
function cookieDeSaida(seguro) {
  return `${COOKIE_DA_SESSAO}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${seguro ? '; Secure' : ''}`;
}

/* ── entrar / primeiro acesso ─────────────────────────────── */
async function quantasPessoas(ctx) {
  const r = await ctx.d1.prepare('SELECT COUNT(*) AS n FROM usuarios').first();
  return Number(r && r.n) || 0;
}

async function entrar(ctx, { email, senha, ip }) {
  const e = normalizarEmail(email);
  if (!emailValido(e) || typeof senha !== 'string' || !senha || senha.length > SENHA_MAX) throw SEM_ACESSO();
  const chaves = await chavesDeLimite(e, ip);
  await exigirSemBloqueio(ctx, chaves);

  const u = await ctx.d1.prepare('SELECT email, papel, sal, hash, sv FROM usuarios WHERE email = ?').bind(e).first();
  const calculada = await assinaturaDaSenha(ctx, u ? u.sal : SAL_FALSO, senha);
  // Conta que não existe leva o mesmo trabalho que conta que existe (não dá para descobrir quem tem cadastro pelo tempo de resposta).
  const confere = await textosIguais(calculada, u ? u.hash : `${calculada}x`);
  if (!u || !confere) {
    await registrarFalha(ctx, chaves.porEmail);
    await registrarFalha(ctx, chaves.porIp);
    throw SEM_ACESSO();
  }
  await zerarFalhas(ctx, chaves.porEmail);
  return { usuario: { email: u.email, papel: u.papel }, token: await criarSessao(ctx, u) };
}

async function primeiroAcesso(ctx, { email, senha, chave, ip }) {
  if (!ctx.senhaDeInstalacao) throw new ErroNegocio('sem_senha_de_instalacao', 'O servidor ainda não tem a senha de instalação. Siga o passo do guia sobre os segredos.', 503);
  const chaves = await chavesDeLimite('primeiro-acesso', ip);
  await exigirSemBloqueio(ctx, chaves);
  if ((await quantasPessoas(ctx)) > 0) throw new ErroNegocio('ja_configurado', 'Este app já tem uma conta. Entre com o seu e-mail e senha.', 409);
  if (typeof chave !== 'string' || !(await textosIguais(chave, ctx.senhaDeInstalacao))) {
    await registrarFalha(ctx, chaves.porEmail);
    await registrarFalha(ctx, chaves.porIp);
    throw new ErroNegocio('chave_errada', 'A senha de instalação não confere.', 403);
  }
  const e = exigirEmail(email);
  exigirSenhaBoa(senha, e);
  const sal = paraBase64Url(bytesAleatorios(16));
  const sv = novaVersao();
  const r = await ctx.d1
    .prepare("INSERT INTO usuarios (email, papel, sal, hash, sv, criado) SELECT ?, 'dono', ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM usuarios)")
    .bind(e, sal, await assinaturaDaSenha(ctx, sal, senha), sv, ctx.now())
    .run();
  if (!r.meta || r.meta.changes !== 1) throw new ErroNegocio('ja_configurado', 'Este app já tem uma conta. Entre com o seu e-mail e senha.', 409);
  await zerarFalhas(ctx, chaves.porEmail);
  return { usuario: { email: e, papel: 'dono' }, token: await criarSessao(ctx, { email: e, sv }) };
}

/* ── conta própria e equipe ───────────────────────────────── */
async function trocarSenha(ctx, eu, { atual, nova, ip }) {
  const chaves = await chavesDeLimite(eu.email, ip);
  await exigirSemBloqueio(ctx, chaves);
  const u = await ctx.d1.prepare('SELECT email, sal, hash FROM usuarios WHERE email = ?').bind(eu.email).first();
  if (!u || typeof atual !== 'string' || !(await textosIguais(await assinaturaDaSenha(ctx, u.sal, atual), u.hash))) {
    await registrarFalha(ctx, chaves.porEmail);
    throw new ErroNegocio('senha_atual_errada', 'A senha atual não confere.', 403);
  }
  exigirSenhaBoa(nova, eu.email);
  const sal = paraBase64Url(bytesAleatorios(16));
  await ctx.d1.prepare('UPDATE usuarios SET sal = ?, hash = ?, sv = sv + 1 WHERE email = ?').bind(sal, await assinaturaDaSenha(ctx, sal, nova), eu.email).run();
  const novo = await ctx.d1.prepare('SELECT email, sv FROM usuarios WHERE email = ?').bind(eu.email).first();
  await zerarFalhas(ctx, chaves.porEmail);
  return { token: await criarSessao(ctx, novo) };
}

async function listarEquipe(ctx) {
  const r = await ctx.d1.prepare("SELECT email, papel, criado FROM usuarios ORDER BY papel = 'dono' DESC, criado, email").all();
  return (r.results || []).map((u) => ({ email: u.email, papel: u.papel, criado: u.criado }));
}

async function adicionarPessoa(ctx, { email, senha }) {
  const e = exigirEmail(email);
  exigirSenhaBoa(senha, e);
  if ((await quantasPessoas(ctx)) >= MAX_PESSOAS) throw new ErroNegocio('equipe_cheia', `A equipe pode ter até ${MAX_PESSOAS} pessoas.`, 400);
  const sal = paraBase64Url(bytesAleatorios(16));
  const r = await ctx.d1
    .prepare("INSERT INTO usuarios (email, papel, sal, hash, sv, criado) VALUES (?, 'equipe', ?, ?, ?, ?) ON CONFLICT (email) DO NOTHING")
    .bind(e, sal, await assinaturaDaSenha(ctx, sal, senha), novaVersao(), ctx.now())
    .run();
  if (!r.meta || r.meta.changes !== 1) throw new ErroNegocio('ja_existe', 'Já existe uma conta com esse e-mail.', 409);
  return { email: e, papel: 'equipe' };
}

async function removerPessoa(ctx, eu, { email }) {
  const e = normalizarEmail(email);
  if (e === eu.email) throw new ErroNegocio('nao_remover_a_si', 'Você não pode remover a própria conta.', 400);
  const alvo = await ctx.d1.prepare('SELECT papel FROM usuarios WHERE email = ?').bind(e).first();
  if (!alvo) throw new ErroNegocio('nao_encontrada', 'Essa conta não existe.', 404);
  if (alvo.papel === 'dono') throw new ErroNegocio('nao_remover_dono', 'A conta da dona não pode ser removida.', 400);
  await ctx.d1.prepare('DELETE FROM usuarios WHERE email = ?').bind(e).run();
  return { email: e };
}

async function redefinirSenha(ctx, { email, senha }) {
  const e = normalizarEmail(email);
  exigirSenhaBoa(senha, e);
  const sal = paraBase64Url(bytesAleatorios(16));
  const r = await ctx.d1.prepare('UPDATE usuarios SET sal = ?, hash = ?, sv = sv + 1 WHERE email = ?').bind(sal, await assinaturaDaSenha(ctx, sal, senha), e).run();
  if (!r.meta || r.meta.changes !== 1) throw new ErroNegocio('nao_encontrada', 'Essa conta não existe.', 404);
  return { email: e };
}

/** Limpeza barata, chamada pela rotina agendada: esquece bloqueios que já venceram. */
async function limparLimites(ctx) {
  await ctx.d1.prepare('DELETE FROM limites WHERE ate < ?').bind(ctx.now() - JANELA_MS).run();
}

return { COOKIE_DA_SESSAO, DURACAO_DA_SESSAO_S, normalizarEmail, entrar, primeiroAcesso, usuarioDaSessao, cookieDeSessao, cookieDeSaida, trocarSenha, listarEquipe, adicionarPessoa, removerPessoa, redefinirSenha, limparLimites, quantasPessoas, criarSessao, valorDoCookie };
})();

/* ────────────────────────────────────────────────────────────────────────────────────────────────────
 * app_api_js  —  o arquivo src/app-api.js (o código abaixo é o do arquivo, sem alteração)
 * ──────────────────────────────────────────────────────────────────────────────────────────────────── */
export const app_api_js = (() => {
/**
 * Dados do app da live: clientes, vendas, fotos das peças e as mensagens do WhatsApp.
 *
 * O app não fala com o banco: ele pede "o que mudou desde o número tal?" (estado) e manda lotes de alterações (gravar).
 * Tudo que chega é conferido e limpo aqui antes de ir para o banco: tipos, tamanhos, datas, ids. Campo desconhecido é recusado.
 *
 *   GET  /api/app/estado?desde=N&c=clientes,vendas,config   -> o que mudou (ver mudancasEmJson em banco-d1.js)
 *   POST /api/app/gravar   { ops: [ { col, id, op: 'set'|'mesclar'|'apagar', dados } ] }   -> tudo-ou-nada
 *   GET  /api/app/foto/<id>                                  -> { imagem }
 */
const { ErroNegocio } = dados_js;
const { mudancasEmJson } = banco_d1_js;
const { texto, textoLongo } = util_js;

const COLECOES_DO_ESTADO = ['clientes', 'vendas', 'config'];
const MAX_OPERACOES = 100;
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const DIA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const FOTO = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const TAMANHO_MAX_FOTO = 600_000;

const invalido = (msg) => new ErroNegocio('dados_invalidos', msg, 400);

function exigirBool(v, campo) {
  if (typeof v !== 'boolean') throw invalido(`${campo} precisa ser verdadeiro ou falso.`);
  return v;
}
function exigirId(v, campo) {
  if (typeof v !== 'string' || !ID.test(v)) throw invalido(`${campo} inválido.`);
  return v;
}
function exigirDia(v, campo) {
  if (typeof v !== 'string' || !DIA.test(v)) throw invalido(`${campo} precisa ser uma data (AAAA-MM-DD).`);
  return v;
}

/** Cada campo conhecido tem a sua conferência. Devolve o valor limpo ou lança um erro em português. */
const CAMPOS = {
  clientes: {
    nome: (v) => {
      const n = texto(v, 80);
      if (!n) throw invalido('A cliente precisa ter um nome.');
      return n;
    },
    whatsapp: (v) => texto(v, 30),
    preExistente: (v) => exigirBool(v, 'preExistente'),
    criadaEm: (v) => exigirDia(v, 'criadaEm'),
  },
  vendas: {
    data: (v) => exigirDia(v, 'data'),
    criadaEm: (v) => {
      if (!Number.isFinite(v) || v <= 0 || v > 4e12) throw invalido('criadaEm inválido.');
      return Math.round(v);
    },
    clienteId: (v) => exigirId(v, 'clienteId'),
    codigo: (v) => texto(v, 40),
    peca: (v) => {
      const p = texto(v, 160);
      if (!p) throw invalido('A peça precisa ter um nome.');
      return p;
    },
    valor: (v) => {
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 10_000_000) throw invalido('Valor inválido.');
      return Math.round(v * 100) / 100;
    },
    pago: (v) => exigirBool(v, 'pago'),
    fila: (v) => {
      if (!Array.isArray(v) || v.length > 30) throw invalido('Fila inválida.');
      return v.map((f) => {
        if (!f || typeof f !== 'object') throw invalido('Fila inválida.');
        return { nome: texto(f.nome, 80), clienteId: exigirId(f.clienteId, 'clienteId da fila') };
      });
    },
    temFoto: (v) => exigirBool(v, 'temFoto'),
  },
  fotos: {
    imagem: (v) => {
      if (typeof v !== 'string' || v.length > TAMANHO_MAX_FOTO || !FOTO.test(v)) throw invalido('Foto inválida ou grande demais.');
      return v;
    },
  },
  config: {
    abertura: (v) => textoLongo(v, 4000),
    fechamento: (v) => textoLongo(v, 4000),
  },
};

/** Campos que um documento COMPLETO precisa ter. */
const OBRIGATORIOS = {
  clientes: ['nome'],
  vendas: ['data', 'criadaEm', 'clienteId', 'peca', 'valor', 'pago'],
  fotos: ['imagem'],
  config: [],
};
/** Valores de partida quando o campo não vem. */
const PADROES = {
  clientes: { whatsapp: '', preExistente: false },
  vendas: { codigo: '', fila: [], temFoto: false },
  fotos: {},
  config: {},
};

/** Confere os campos que vieram. Campo que não existe para a coleção é recusado (nada de lixo no banco). */
function conferirCampos(col, dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw invalido('Dados inválidos.');
  const conferidos = {};
  for (const [campo, valor] of Object.entries(dados)) {
    if (campo === 'id' || campo === 'primeiraCompra') continue; // vêm no backup antigo; o app recalcula
    if (!Object.prototype.hasOwnProperty.call(CAMPOS[col], campo)) throw invalido(`Campo desconhecido: ${campo}.`);
    conferidos[campo] = CAMPOS[col][campo](valor);
  }
  return conferidos;
}

function completar(col, dados) {
  const completo = { ...PADROES[col], ...dados };
  for (const campo of OBRIGATORIOS[col]) {
    if (completo[campo] === undefined) throw invalido(`Falta o campo ${campo}.`);
  }
  return completo;
}

/** Valida o pedido inteiro ANTES de tocar no banco. */
function conferirOperacoes(ops) {
  if (!Array.isArray(ops) || !ops.length) throw invalido('Nenhuma alteração para gravar.');
  if (ops.length > MAX_OPERACOES) throw invalido(`No máximo ${MAX_OPERACOES} alterações por vez.`);
  return ops.map((o) => {
    if (!o || typeof o !== 'object') throw invalido('Alteração inválida.');
    if (!Object.prototype.hasOwnProperty.call(CAMPOS, o.col)) throw invalido('Coleção desconhecida.');
    if (!['set', 'mesclar', 'apagar'].includes(o.op)) throw invalido('Tipo de alteração desconhecido.');
    const id = exigirId(o.id, 'id');
    if (o.col === 'config' && id !== 'geral') throw invalido('Configuração desconhecida.');
    const dados = o.op === 'apagar' ? null : conferirCampos(o.col, o.dados);
    if (o.op === 'apagar' && o.col === 'config') throw invalido('A configuração não pode ser apagada.');
    if (o.op === 'set' && o.col !== 'config') completar(o.col, dados); // já recusa se faltar campo
    return { col: o.col, id, op: o.op, dados };
  });
}

async function gravar(ctx, corpo) {
  const ops = conferirOperacoes(corpo && corpo.ops);
  await ctx.db.runTransaction(async (tx) => {
    const precisaLer = ops.filter((o) => o.op === 'mesclar').map((o) => ctx.db.doc(`${o.col}/${o.id}`));
    const lidos = precisaLer.length ? await tx.getAll(precisaLer) : [];
    const atual = new Map(lidos.map((s) => [s.ref.path, s.data()]));
    for (const o of ops) {
      const ref = ctx.db.doc(`${o.col}/${o.id}`);
      if (o.op === 'apagar') tx.delete(ref);
      else if (o.op === 'set') tx.set(ref, o.col === 'config' ? { ...PADROES.config, ...o.dados } : completar(o.col, o.dados));
      else {
        const base = atual.get(ref.path);
        const mesclado = completar(o.col, { ...(base || {}), ...o.dados });
        tx.set(ref, mesclado);
        atual.set(ref.path, mesclado); // duas mesclagens no mesmo documento, no mesmo lote, somam
      }
    }
  });
  const r = await ctx.d1.prepare('SELECT COALESCE(MAX(seq), 0) AS seq FROM documentos').first();
  return { ok: true, seq: Number(r.seq) || 0 };
}

/** @returns {Promise<string>} texto JSON pronto (ver mudancasEmJson) */
async function estado(ctx, consulta) {
  const pedidas = String(consulta.c || '').split(',').map((s) => s.trim()).filter(Boolean);
  const colecoes = pedidas.length ? pedidas : COLECOES_DO_ESTADO;
  if (colecoes.some((c) => !COLECOES_DO_ESTADO.includes(c))) throw invalido('Coleção desconhecida.');
  return mudancasEmJson(ctx.db, [...new Set(colecoes)], consulta.desde);
}

/** A foto vai como o banco guarda ({"imagem":"data:…"}): sem abrir e refazer o texto. */
async function foto(ctx, id) {
  if (!ID.test(id)) throw new ErroNegocio('nao_encontrada', 'Foto não encontrada.', 404);
  const r = await ctx.d1.prepare("SELECT dados FROM documentos WHERE colecao = 'fotos' AND id = ? AND apagado = 0").bind(id).first();
  if (!r) throw new ErroNegocio('nao_encontrada', 'Foto não encontrada.', 404);
  return r.dados;
}

return { gravar, estado, foto, conferirOperacoes, CAMPOS };
})();
