# Delas pra Elas — app da live + Fretes, só em JavaScript no Cloudflare

O app da live (clientes, peças, vendas) e a tela de **Fretes** rodam inteiros no **Cloudflare Workers** (plano grátis, sem cartão), com o banco **D1** do próprio Cloudflare. Não há nenhum outro serviço de login ou de banco: as contas são e-mail + senha, criadas dentro do app.

## O que colar onde

Abra **`docs/PASSO-A-PASSO.md`** e siga. Em resumo: crie o Worker, crie o banco D1 (nome `delas-pra-elas`, ligado como `DB`), cadastre os segredos `SEGREDO` e `ADMIN_SENHA` e cole os **12 arquivos da pasta `para-colar`**, nesta ordem e com estes nomes:

1. `worker.js`  2. `base.js`  3. `servicos.js`  4. `negocio.js`  5. `servidor.js`
6. `site-paginas.js`  7. `site-biblioteca.js`
8. `site-live-1.js`  9. `site-live-2.js`  10. `site-live-3.js`
11. `site-fretes-1.js`  12. `site-fretes-2.js`

Nenhum arquivo precisa de edição: não há chave nem senha dentro deles.

## Leia também

- `docs/PASSO-A-PASSO.md` — instalação e primeiro acesso (sem terminal).
- `docs/COMO-USAR.md` — o dia a dia dos Fretes.
- `docs/GUIA-INTEGRACAO-APIS.md` — Melhor Envio, Mercado Pago e ViaCEP, e o que foi (e não foi) testado.
- `docs/SEGURANCA.md` — o que protege o app, o que sobra de risco e suas decisões.

## Para quem mexe no código

```
app/             fonte das telas (JSX): app da live, Fretes e página da cliente
src/             servidor em módulos legíveis (rotas, login, banco D1, fretes, Melhor Envio, Mercado Pago)
site/            páginas geradas + HTML/CSS escritos à mão
scripts/         colar.mjs (gera para-colar/), construir-site.mjs (gera site/)
test/            testes (unidade, banco D1 simulado, workerd, navegador)
wrangler.toml    opcional: só para publicar pelo terminal (npx wrangler deploy) e para o npm run dev
```

```
npm install            uma vez
npm run site           recompila as telas (app/ -> site/)
npm run colar          gera os 12 arquivos de para-colar/
npm test               230 testes (unidade e servidor); npm run test:d1 repete com o banco D1 simulado
npm run test:workerd   14 testes de API + 6 de navegador, com os arquivos de para-colar/ no motor do Cloudflare (workerd) e D1 local
npm run test:e2e       55 passos no navegador (Playwright)
npm run lint           ESLint
```

Depois de mexer em `app/` ou `src/`, rode `npm run site && npm run colar` e cole no Cloudflare os arquivos que mudaram.
