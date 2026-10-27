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
import * as ME from './melhor-envio.js';
import * as MP from './mercado-pago.js';
import * as ViaCep from './viacep.js';
import * as U from './util.js';
import * as Cripto from './cripto.js';
import { ErroNegocio, numeroEntre, lerConfig, lerCredenciais, refFrete, refPriv, acharPorToken } from './dados.js';

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

export {
  criarFrete,
  infoPublica,
  cotar,
  pagar,
  consultarStatus,
  tratarWebhookMp,
  sincronizarPagamento,
  cancelarFrete,
  gerarEtiqueta,
  urlEtiqueta,
  atualizarRastreio,
  atualizarAgora,
  rotina,
};
