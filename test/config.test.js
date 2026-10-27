/** Configuração: o que o painel do Cloudflare entrega (banco, segredos) e a trava dos endereços de teste. */
import test from 'node:test';
import assert from 'node:assert/strict';

import { lerConfiguracao, enderecoLocal } from '../src/config.js';

const BANCO = { prepare() {} };
const SEGREDO = 'uma-frase-longa-e-aleatoria-de-teste';
const base = (extra = {}) => ({ DB: BANCO, SEGREDO, ...extra });

test('configuração: com o banco e um segredo de 20+ letras está tudo pronto', () => {
  const c = lerConfiguracao(base({ ADMIN_SENHA: 'senha-de-instalacao' }));
  assert.deepEqual(c.problemas, []);
  assert.equal(c.d1, BANCO);
  assert.equal(c.segredo, SEGREDO);
  assert.equal(c.senhaDeInstalacao, 'senha-de-instalacao');
});

test('configuração: sem o banco ou com segredo curto/ausente o servidor se declara não configurado', () => {
  assert.deepEqual(lerConfiguracao({ SEGREDO }).problemas, ['DB']);
  assert.deepEqual(lerConfiguracao({ DB: BANCO }).problemas, ['SEGREDO']);
  assert.deepEqual(lerConfiguracao({ DB: BANCO, SEGREDO: 'curto' }).problemas, ['SEGREDO']);
  assert.deepEqual(lerConfiguracao({ DB: BANCO, SEGREDO: 'x'.repeat(19) }).problemas, ['SEGREDO']);
  assert.deepEqual(lerConfiguracao({ DB: BANCO, SEGREDO: 'x'.repeat(20) }).problemas, []);
  assert.deepEqual(lerConfiguracao({}).problemas, ['DB', 'SEGREDO']);
  assert.deepEqual(lerConfiguracao().problemas, ['DB', 'SEGREDO']);
});

test('configuração: segredo e senha de instalação só valem se forem texto', () => {
  for (const ruim of [1e20, { toString: () => SEGREDO }, [SEGREDO], true, null]) {
    assert.deepEqual(lerConfiguracao({ DB: BANCO, SEGREDO: ruim }).problemas, ['SEGREDO'], String(ruim));
  }
  assert.equal(lerConfiguracao(base({ ADMIN_SENHA: 123 })).senhaDeInstalacao, '');
  assert.equal(lerConfiguracao(base()).senhaDeInstalacao, '', 'sem a senha de instalação ninguém cria a primeira conta');
});

test('configuração: o problema só diz o NOME do que falta, nunca o valor', () => {
  const c = lerConfiguracao({ DB: BANCO, SEGREDO: 'segredo-curto' });
  assert.ok(!JSON.stringify(c.problemas).includes('segredo-curto'));
});

test('configuração: endereços de teste só valem na própria máquina (nunca apontam para a internet)', () => {
  for (const ruim of ['https://127.0.0.1:9', 'http://evil.example', 'http://127.0.0.1.evil.example', 'http://localhost@evil.example', 'http://evil.example#@127.0.0.1', 'ftp://127.0.0.1', 'javascript:1', '', null, 12, 'http://[::2]']) {
    assert.equal(enderecoLocal(ruim), '', String(ruim));
  }
  assert.equal(enderecoLocal('http://127.0.0.1:8787/viacep/'), 'http://127.0.0.1:8787/viacep');
  assert.equal(enderecoLocal('http://localhost:1234'), 'http://localhost:1234');
  assert.equal(enderecoLocal('http://[::1]:1234'), 'http://[::1]:1234');

  const c = lerConfiguracao(
    base({ ENDERECOS_DE_TESTE: JSON.stringify({ viacep: 'http://127.0.0.1:1/v', mp: 'https://api.mercadopago.com.evil.example', meSandbox: 'http://evil.example', outro: 'http://127.0.0.1:2' }) }),
  );
  assert.deepEqual(c.enderecos, { viacep: 'http://127.0.0.1:1/v' }, 'só o que é local e conhecido passa');
  assert.deepEqual(lerConfiguracao(base({ ENDERECOS_DE_TESTE: 'não é json' })).enderecos, {});
  assert.deepEqual(lerConfiguracao(base({ ENDERECOS_DE_TESTE: '[1,2]' })).enderecos, {});
  assert.deepEqual(lerConfiguracao(base()).enderecos, {});
});

test('configuração: limite da rotina fica entre 1 e 40', () => {
  assert.equal(lerConfiguracao(base()).limiteDaRotina, 20);
  assert.equal(lerConfiguracao(base({ ROTINA_LIMITE: '500' })).limiteDaRotina, 40);
  assert.equal(lerConfiguracao(base({ ROTINA_LIMITE: '-3' })).limiteDaRotina, 1);
  assert.equal(lerConfiguracao(base({ ROTINA_LIMITE: 'abc' })).limiteDaRotina, 20);
});
