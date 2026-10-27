/**
 * Simuladores do ViaCEP, do Melhor Envio e do Mercado Pago, num servidor HTTP local.
 *
 * Seguem os formatos descritos na documentação oficial (campos obrigatórios, códigos de erro, ids em UUID,
 * valores decimais). NÃO são os serviços reais: servem para provar que o nosso código monta as chamadas
 * certas e reage direito às respostas e aos erros. A prova final é sempre no sandbox/produção de verdade.
 */
import http from 'node:http';
import crypto from 'node:crypto';

const PNG_1X1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const CEPS = {
  '89201001': { logradouro: 'Rua Dr. Abdon Batista', bairro: 'Centro', localidade: 'Joinville', uf: 'SC' },
  '01310100': { logradouro: 'Avenida Paulista', bairro: 'Bela Vista', localidade: 'São Paulo', uf: 'SP' },
  '30140071': { logradouro: 'Avenida Afonso Pena', bairro: 'Centro', localidade: 'Belo Horizonte', uf: 'MG' },
  '88010400': { logradouro: '', bairro: '', localidade: 'Florianópolis', uf: 'SC' }, // CEP "geral": sem rua/bairro
};

class Mocks {
  constructor() {
    this.meToken = 'ME-TOKEN-DE-TESTE-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    this.mpToken = 'APP_USR-1234567890123456-101010-abcdefabcdefabcdefabcdefabcdefab-123456789';
    this.mpSecret = 'segredo-do-webhook-de-teste-0123456789abcdef';
    this.saldo = 1000000; // centavos
    this.orders = new Map();
    this.pagamentos = new Map();
    this.idempotencia = new Map();
    this.proximoPagamento = 90000001;
    this.chamadas = [];
    this.falhas = {}; // chave -> contador de falhas a injetar
    this.precoCarrinhoExtra = 0; // centavos somados ao preço do carrinho (para testar diferença)
    this.semChavePix = false;
    this.mpValorErrado = false;
    this.viacepForaDoAr = false;
    this.cotacaoVazia = false;
    this.porta = 0;
  }

  get base() {
    return `http://127.0.0.1:${this.porta}`;
  }

  get urls() {
    return { viacep: `${this.base}/viacep`, meSandbox: `${this.base}/me`, meProducao: `${this.base}/me`, mp: `${this.base}/mp` };
  }

  async iniciar() {
    this.servidor = http.createServer((req, res) => this._rotear(req, res));
    await new Promise((ok) => this.servidor.listen(0, '127.0.0.1', ok));
    this.porta = this.servidor.address().port;
    return this;
  }

  async parar() {
    await new Promise((ok) => this.servidor.close(ok));
  }

  /* ----- controles dos testes ----- */
  aprovar(idPagamento) {
    this.pagamentos.get(String(idPagamento)).status = 'approved';
  }

  expirar(idPagamento) {
    const p = this.pagamentos.get(String(idPagamento));
    p.status = 'cancelled';
    p.status_detail = 'expired';
  }

  estornar(idPagamento) {
    this.pagamentos.get(String(idPagamento)).status = 'refunded';
  }

  ultimoPagamento() {
    return [...this.pagamentos.values()].pop();
  }

  ultimaEtiqueta() {
    return [...this.orders.values()].pop();
  }

  postar(id) {
    const o = this.orders.get(id);
    o.status = 'posted';
    o.posted_at = '2026-10-14 10:30:00';
    o.tracking = o.tracking || 'ME26001XYZBR';
  }

  entregar(id) {
    const o = this.orders.get(id);
    o.status = 'delivered';
    o.delivered_at = '2026-10-18 15:00:00';
  }

  cancelarEtiqueta(id) {
    const o = this.orders.get(id);
    o.status = 'cancelled';
    o.canceled_at = '2026-10-13 09:00:00';
  }

  contar(servico, metodo, caminho) {
    return this.chamadas.filter((c) => c.servico === servico && c.metodo === metodo && c.caminho === caminho).length;
  }

  /** Assinatura x-signature no formato do Mercado Pago. */
  assinar(dataId, requestId = 'req-teste-1', ts = '1760000000', segredo = this.mpSecret) {
    let manifesto = '';
    if (dataId) manifesto += `id:${String(dataId).toLowerCase()};`;
    if (requestId) manifesto += `request-id:${requestId};`;
    manifesto += `ts:${ts};`;
    const v1 = crypto.createHmac('sha256', segredo).update(manifesto).digest('hex');
    return { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': requestId };
  }

  /* ----- servidor ----- */
  _rotear(req, res) {
    const partes = [];
    req.on('data', (c) => partes.push(c));
    req.on('end', () => {
      const bruto = Buffer.concat(partes).toString('utf8');
      let corpo = null;
      try {
        corpo = bruto ? JSON.parse(bruto) : null;
      } catch {
        corpo = null;
      }
      const url = new URL(req.url, this.base);
      const caminho = url.pathname;
      const servico = caminho.startsWith('/viacep') ? 'viacep' : caminho.startsWith('/me') ? 'melhorenvio' : caminho.startsWith('/mp') ? 'mercadopago' : 'outro';
      this.chamadas.push({ servico, metodo: req.method, caminho, headers: req.headers, corpo });
      const responder = (status, obj) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(obj));
      };
      try {
        if (servico === 'viacep') return this._viacep(caminho, responder);
        if (servico === 'melhorenvio') return this._me(req, caminho.slice(3), corpo, responder);
        if (servico === 'mercadopago') return this._mp(req, caminho.slice(3), corpo, responder);
        return responder(404, { message: 'rota desconhecida' });
      } catch (e) {
        return responder(500, { message: `erro no simulador: ${e.message}` });
      }
    });
  }

  _falhar(chave) {
    if ((this.falhas[chave] || 0) > 0) {
      this.falhas[chave] -= 1;
      return true;
    }
    return false;
  }

  _viacep(caminho, responder) {
    if (this.viacepForaDoAr) return responder(503, { message: 'indisponível' });
    const m = caminho.match(/^\/viacep\/ws\/(\d{8})\/json\/$/);
    if (!m) return responder(400, {});
    const c = CEPS[m[1]];
    if (!c) return responder(200, { erro: true });
    return responder(200, { cep: m[1], ...c });
  }

  /* ----- Melhor Envio ----- */
  _autenticarME(req, responder) {
    if (req.headers.authorization !== `Bearer ${this.meToken}`) {
      responder(401, { message: 'Unauthenticated.' });
      return false;
    }
    if (!/\([^)]+@[^)]+\)/.test(String(req.headers['user-agent'] || ''))) {
      responder(403, { message: 'User-Agent com e-mail de contato é obrigatório.' });
      return false;
    }
    return true;
  }

  _me(req, caminho, corpo, responder) {
    if (!this._autenticarME(req, responder)) return undefined;
    const metodo = req.method;

    if (metodo === 'POST' && caminho === '/api/v2/me/shipment/calculate') {
      if (this._falhar('calculate')) return responder(500, { message: 'erro interno' });
      const erros = {};
      if (!corpo || !corpo.from || !/^\d{8}$/.test(String(corpo.from.postal_code))) erros['from.postal_code'] = ['inválido'];
      if (!corpo || !corpo.to || !/^\d{8}$/.test(String(corpo.to.postal_code))) erros['to.postal_code'] = ['inválido'];
      const p = corpo && Array.isArray(corpo.products) ? corpo.products[0] : null;
      if (!p) erros.products = ['obrigatório'];
      else {
        for (const k of ['width', 'height', 'length', 'weight']) if (!(typeof p[k] === 'number' && p[k] > 0)) erros[`products.0.${k}`] = ['inválido'];
        if (typeof p.insurance_value !== 'number') erros['products.0.insurance_value'] = ['inválido'];
        if (p.quantity !== 1) erros['products.0.quantity'] = ['inválido'];
      }
      if (Object.keys(erros).length) return responder(422, { message: 'The given data was invalid.', errors: erros });
      if (this.cotacaoVazia || corpo.to.postal_code === '99999999') {
        return responder(200, [{ id: 1, name: 'PAC', error: 'Serviço indisponível para o CEP' }]);
      }
      const peso = p.weight;
      const extra = Math.round(peso * 3 * 100) / 100;
      return responder(200, [
        { id: 1, name: 'PAC', price: (21.9 + extra).toFixed(2), custom_price: (19.9 + extra).toFixed(2), delivery_time: 9, custom_delivery_time: 8, company: { id: 1, name: 'Correios' } },
        { id: 2, name: 'SEDEX', price: (39.9 + extra).toFixed(2), custom_price: (37.5 + extra).toFixed(2), delivery_time: 3, custom_delivery_time: 3, company: { id: 1, name: 'Correios' } },
        { id: 3, name: '.Package', price: (24.5 + extra).toFixed(2), custom_price: (18.75 + extra).toFixed(2), delivery_time: 6, custom_delivery_time: 6, company: { id: 2, name: 'Jadlog' } },
        { id: 4, name: '.Com', price: (31.0 + extra).toFixed(2), delivery_time: 4, company: { id: 2, name: 'Jadlog' } },
        { id: 31, name: 'Loggi Express', price: (15.0 + extra).toFixed(2), custom_price: (14.0 + extra).toFixed(2), delivery_time: 5, company: { id: 14, name: 'Loggi' } },
        { id: 15, name: 'Azul Cargo', error: 'Dimensões acima do limite' },
      ]);
    }

    if (metodo === 'GET' && caminho === '/api/v2/me/cart') return responder(200, { data: [], total: 0 });

    if (metodo === 'POST' && caminho === '/api/v2/me/cart') return this._meCarrinho(corpo, responder);

    if (metodo === 'POST' && caminho === '/api/v2/me/shipment/checkout') {
      if (this._falhar('checkout')) return responder(500, { message: 'erro interno' });
      const ids = corpo && Array.isArray(corpo.orders) ? corpo.orders : [];
      if (!ids.length) return responder(422, { message: 'The given data was invalid.', errors: { orders: ['O campo orders é obrigatório.'] } });
      const lista = ids.map((i) => this.orders.get(i));
      if (lista.some((o) => !o)) return responder(422, { message: 'The given data was invalid.', errors: { orders: ['Etiqueta não encontrada.'] } });
      if (lista.some((o) => o.status !== 'pending')) return responder(422, { message: 'The given data was invalid.', errors: { orders: ['Existe uma ou mais orders que já foram pagas.'] } });
      const total = lista.reduce((s, o) => s + Math.round(o.price * 100), 0);
      if (this.saldo < total) return responder(422, { message: 'Saldo insuficiente para concluir a compra.' });
      this.saldo -= total;
      for (const o of lista) {
        o.status = 'released';
        o.paid_at = '2026-10-13 08:00:00';
      }
      return responder(200, {
        purchase: { id: crypto.randomUUID(), protocol: 'PUR-1', total: total / 100, status: 'paid', orders: lista.map((o) => ({ id: o.id, protocol: o.protocol, status: o.status, tracking: null })) },
        digitable: null,
        redirect: null,
        message: null,
        token: null,
        payment_id: null,
      });
    }

    if (metodo === 'POST' && caminho === '/api/v2/me/shipment/generate') {
      const ids = corpo && Array.isArray(corpo.orders) ? corpo.orders : [];
      const saida = {};
      for (const i of ids) {
        const o = this.orders.get(i);
        if (!o) saida[i] = { status: false, message: 'Etiqueta não encontrada' };
        else if (this._falhar('generate')) saida[i] = { status: false, message: 'A etiqueta ainda não foi liberada (pagamento em processamento)' };
        else if (o.status === 'pending') saida[i] = { status: false, message: 'Etiqueta não paga' };
        else {
          o.status = 'generated';
          o.generated_at = '2026-10-13 08:01:00';
          o.tracking = `ME${String(this.orders.size).padStart(4, '0')}ABCBR`;
          o.self_tracking = 'AB123456789BR';
          saida[i] = { status: true, message: 'Envio gerado com sucesso' };
        }
      }
      return responder(200, saida);
    }

    if (metodo === 'POST' && caminho === '/api/v2/me/shipment/print') {
      const ids = corpo && Array.isArray(corpo.orders) ? corpo.orders : [];
      const o = this.orders.get(ids[0]);
      if (!o || !['generated', 'posted', 'delivered'].includes(o.status)) return responder(422, { message: 'As etiquetas devem ser geradas antes de imprimir.' });
      return responder(200, { url: `${this.baseImpressao || this.base}/me/imprimir/${corpo.mode === 'public' ? 'pub' : 'priv'}${ids[0].slice(0, 8)}` });
    }

    if (metodo === 'POST' && caminho === '/api/v2/me/shipment/tracking') {
      if (this._falhar('tracking')) return responder(500, { message: 'erro interno' });
      const ids = corpo && Array.isArray(corpo.orders) ? corpo.orders : [];
      const saida = {};
      for (const i of ids) {
        const o = this.orders.get(i);
        if (!o) continue;
        saida[i] = {
          id: o.id,
          protocol: o.protocol,
          status: o.status,
          tracking: o.status === 'generated' || o.status === 'released' ? null : o.tracking,
          melhorenvio_tracking: o.tracking,
          created_at: o.created_at,
          paid_at: o.paid_at,
          generated_at: o.generated_at,
          posted_at: o.posted_at,
          delivered_at: o.delivered_at,
          canceled_at: o.canceled_at,
          expired_at: null,
        };
      }
      return responder(200, saida);
    }

    const m = caminho.match(/^\/api\/v2\/me\/orders\/([A-Za-z0-9-]+)$/);
    if (metodo === 'GET' && m) {
      const o = this.orders.get(m[1]);
      if (!o) return responder(404, { message: 'No query results for model [App\\Order].' });
      return responder(200, o);
    }

    return responder(404, { message: 'rota desconhecida do Melhor Envio' });
  }

  _meCarrinho(corpo, responder) {
    if (this._falhar('cart')) return responder(500, { message: 'erro interno' });
    const erros = {};
    const b = corpo || {};
    if (!Number.isInteger(b.service)) erros.service = ['O campo service é obrigatório.'];
    for (const lado of ['from', 'to']) {
      const x = b[lado] || {};
      for (const k of ['name', 'phone', 'email', 'address', 'number', 'district', 'city', 'postal_code', 'state_abbr']) {
        if (!x[k]) erros[`${lado}.${k}`] = [`O campo ${lado}.${k} é obrigatório.`];
      }
      if (!x.document && !x.company_document) erros[`${lado}.document`] = ['Informe document (CPF) ou company_document (CNPJ).'];
      if (x.phone && !/^\d{10,11}$/.test(String(x.phone))) erros[`${lado}.phone`] = ['Telefone inválido.'];
      if (x.postal_code && !/^\d{8}$/.test(String(x.postal_code))) erros[`${lado}.postal_code`] = ['CEP inválido.'];
    }
    if (!Array.isArray(b.products) || !b.products.length) erros.products = ['obrigatório'];
    else if (!(b.products[0].name && b.products[0].quantity >= 1 && b.products[0].unitary_value > 0)) erros['products.0'] = ['produto inválido'];
    if (!Array.isArray(b.volumes) || b.volumes.length !== 1) erros.volumes = ['envie um volume'];
    else for (const k of ['height', 'width', 'length', 'weight']) if (!(b.volumes[0][k] > 0)) erros[`volumes.0.${k}`] = ['inválido'];
    if (b.options && b.options.non_commercial !== true && !(b.options.invoice && b.options.invoice.key)) {
      erros['options.invoice.key'] = ['Envio comercial exige a chave da nota fiscal.'];
    }
    if (Object.keys(erros).length) return responder(422, { message: 'The given data was invalid.', errors: erros });

    const tabela = { 1: 19.9, 2: 37.5, 3: 18.75, 4: 31.0, 31: 14.0 };
    const peso = b.volumes[0].weight;
    const preco = Math.round(((tabela[b.service] || 20) + Math.round(peso * 3 * 100) / 100) * 100) + this.precoCarrinhoExtra;
    const id = crypto.randomUUID();
    const agora = '2026-10-13 07:50:00';
    const ordem = {
      id,
      protocol: `ORD-2026${String(this.orders.size + 1).padStart(8, '0')}`,
      service_id: b.service,
      price: preco / 100,
      quote: preco / 100,
      status: 'pending',
      insurance_value: b.options ? b.options.insurance_value : 0,
      non_commercial: !!(b.options && b.options.non_commercial),
      tracking: null,
      self_tracking: null,
      paid_at: null,
      generated_at: null,
      posted_at: null,
      delivered_at: null,
      canceled_at: null,
      created_at: agora,
      updated_at: agora,
      from: b.from,
      to: b.to,
      products: b.products,
      volumes: b.volumes,
      tags: (b.options && b.options.tags) || [],
    };
    this.orders.set(id, ordem);
    return responder(201, ordem);
  }

  /* ----- Mercado Pago ----- */
  _mp(req, caminho, corpo, responder) {
    const aut = req.headers.authorization;
    if (aut === 'Bearer APP_USR-NAO-ATIVADO') {
      return responder(401, { message: 'Unauthorized use of live credentials', error: 'unauthorized', status: 401 });
    }
    if (aut !== `Bearer ${this.mpToken}`) return responder(401, { message: 'invalid access token', error: 'unauthorized', status: 401 });

    if (req.method === 'GET' && caminho === '/users/me') return responder(200, { id: 123456789, nickname: 'LOJA' });

    if (req.method === 'POST' && caminho === '/v1/payments') {
      if (this._falhar('pix')) return responder(500, { message: 'internal_error' });
      const chave = req.headers['x-idempotency-key'];
      if (!chave) return responder(400, { message: 'header X-Idempotency-Key can not be null', error: 'bad_request', status: 400 });
      if (this.idempotencia.has(chave)) return responder(201, this.idempotencia.get(chave));
      const b = corpo || {};
      const erros = [];
      if (!(typeof b.transaction_amount === 'number' && b.transaction_amount > 0)) erros.push('transaction_amount inválido');
      if (b.payment_method_id !== 'pix') erros.push('payment_method_id deve ser pix');
      if (!b.payer || !/^[^\s@]+@[^\s@]+$/.test(String(b.payer.email))) erros.push('payer.email inválido');
      if (!b.payer || !b.payer.identification || !/^\d{11}$/.test(String(b.payer.identification.number))) erros.push('payer.identification inválido');
      if (!/^DPE-[A-Za-z0-9]{20}$/.test(String(b.external_reference))) erros.push('external_reference inesperada');
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/.test(String(b.date_of_expiration))) erros.push('date_of_expiration em formato inválido');
      const dif = Date.parse(b.date_of_expiration) - Date.now();
      if (!(dif >= 30 * 60 * 1000)) erros.push('date_of_expiration deve ser de no mínimo 30 minutos');
      if (erros.length) return responder(400, { message: erros.join('; '), error: 'bad_request', status: 400, cause: erros.map((d) => ({ description: d })) });
      if (this.semChavePix) {
        return responder(400, { message: 'Collector user without key enabled for QR render', error: 'bad_request', status: 400, cause: [{ code: 13253, description: 'Collector user without key enabled for QR render' }] });
      }
      const id = String(this.proximoPagamento);
      this.proximoPagamento += 1;
      const pag = {
        id: Number(id),
        status: 'pending',
        status_detail: 'pending_waiting_transfer',
        transaction_amount: b.transaction_amount + (this.mpValorErrado ? 1 : 0),
        external_reference: b.external_reference,
        date_of_expiration: b.date_of_expiration,
        payment_method_id: 'pix',
        notification_url: b.notification_url,
        point_of_interaction: {
          transaction_data: {
            qr_code: `00020126580014br.gov.bcb.pix0136${crypto.randomUUID()}5204000053039865406${b.transaction_amount.toFixed(2).replace('.', '')}5802BR6009SAO PAULO62070503***6304ABCD`,
            qr_code_base64: PNG_1X1,
            ticket_url: `https://www.mercadopago.com.br/payments/${id}/ticket?caller_id=1&hash=abc`,
          },
        },
      };
      this.pagamentos.set(id, pag);
      this.idempotencia.set(chave, pag);
      return responder(201, pag);
    }

    const m = caminho.match(/^\/v1\/payments\/(\d+)$/);
    if (m) {
      const p = this.pagamentos.get(m[1]);
      if (!p) return responder(404, { message: 'Payment not found', error: 'not_found', status: 404 });
      if (req.method === 'GET') {
        if (this._falhar('consulta')) return responder(503, { message: 'indisponível' });
        return responder(200, p);
      }
      if (req.method === 'PUT') {
        if (p.status === 'pending') {
          p.status = (corpo && corpo.status) || p.status;
          p.status_detail = 'by_collector';
        }
        return responder(200, p);
      }
    }
    return responder(404, { message: 'rota desconhecida do Mercado Pago' });
  }
}

export { Mocks, CEPS, PNG_1X1 };
