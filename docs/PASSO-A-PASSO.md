# Passo a passo: colocar o app no ar (sem terminal)

Tempo: cerca de 30 minutos, tudo no navegador, só no **Cloudflare** (conta grátis, sem cartão). Os nomes dos botões mudam de vez em quando; procure o mais parecido.

## 1. Criar o Worker

Cloudflare → **Workers & Pages** → **Create** → **Create Worker** → nome `delas-pra-elas` → **Deploy** (pode publicar o "Hello World"; vamos trocar o código).

## 2. Criar o banco D1 e ligar ao Worker

1. **Storage & Databases → D1 SQL Database → Create** → nome `delas-pra-elas`.
2. No Worker: **Settings → Bindings → Add → D1 database** → *Variable name* **`DB`** (exatamente assim, maiúsculas) → escolha o banco `delas-pra-elas`.

As tabelas são criadas sozinhas no primeiro acesso.

## 3. Cadastrar os dois segredos

Worker → **Settings → Variables and Secrets → Add** (tipo **Secret**, não "Text"):

| Nome | O que colocar |
|---|---|
| `SEGREDO` | uma frase longa e aleatória, **pelo menos 20 caracteres** (assina o login e criptografa os dados sensíveis). Guarde num gerenciador de senhas. **Se perder ou trocar, os tokens e dados criptografados deixam de abrir** (você cola os tokens de novo em Fretes → Conexões) e todos precisam entrar de novo. |
| `ADMIN_SENHA` | uma senha só para criar a **primeira conta** (passo 6). Depois dela criada você pode apagar este segredo. |

## 4. Colar os 12 arquivos

Worker → **Edit code**. Crie um arquivo para cada item abaixo, **com exatamente este nome**, e cole o conteúdo do arquivo de mesmo nome da pasta `para-colar`. Faça na ordem; o `worker.js` é o principal (já existe, é só trocar o conteúdo).

`worker.js` · `base.js` · `servicos.js` · `negocio.js` · `servidor.js` · `site-paginas.js` · `site-biblioteca.js` · `site-live-1.js` · `site-live-2.js` · `site-live-3.js` · `site-fretes-1.js` · `site-fretes-2.js`

Clique em **Deploy**. Se o painel reclamar de algum arquivo, quase sempre foi um trecho colado pela metade: apague o conteúdo e cole de novo, inteiro.

## 5. Agendar a rotina automática

Worker → **Settings → Trigger Events → Cron Triggers → Add** → `*/30 * * * *` (a cada 30 minutos). Ela confere Pix pendentes e o rastreio.

## 6. Primeiro acesso

1. Abra o endereço do Worker (`https://delas-pra-elas.SEU-USUARIO.workers.dev`).
2. Na tela **Primeiro acesso**, informe a chave de instalação (o `ADMIN_SENHA`), seu e-mail e a senha da dona (mínimo 8 caracteres).
3. Depois do primeiro acesso, apague o segredo `ADMIN_SENHA` (opcional, mas recomendado).
4. Em **Conta → Equipe do app** cadastre as outras pessoas (e-mail + senha provisória). Elas usam o app da live; **Fretes só aparece para a dona**.

## 7. Trazer os dados do app antigo

No app antigo: **Baixar backup dos dados** (tela de clientes). No novo: **Conta → Restaurar backup antigo**, escolha o arquivo e toque em **Conferir** e depois **Restaurar agora**.

- Se uma cliente ou venda do backup já existir aqui, a do backup substitui a daqui.
- Se o envio parar no meio, restaure de novo: nada é duplicado.
- **As fotos das peças não vêm no backup antigo.**

## 8. Conferir se está tudo certo

Abra `https://SEU-ENDERECO/api/saude`. Devem aparecer quatro `true`: `ok`, `banco`, `segredo`, `site`.

| Apareceu `false` em | Significa | O que fazer |
|---|---|---|
| `banco` | O D1 não está ligado como `DB` | Refaça o passo 2 |
| `segredo` | `SEGREDO` ausente ou com menos de 20 caracteres | Refaça o passo 3 |
| `site` | Falta ou ficou truncado algum arquivo `site-*.js` | Cole de novo os 7 arquivos do site |

Para qualquer erro, veja Worker → **Logs** (Observability): lá aparece qual página ou etapa falhou, sem tokens nem CPF.

## 9. Ligar os Fretes

Tudo em **Fretes** (aba, só para a dona):

1. **Ajustes**: preencha CEP de origem, caixas, remetente e **Endereço do seu site** (o endereço do Worker).
2. **Conexões**: cole o token do Melhor Envio, o Access Token do Mercado Pago e a assinatura secreta do webhook. Veja `GUIA-INTEGRACAO-APIS.md`.
3. No painel do Mercado Pago, cadastre o webhook `https://SEU-ENDERECO/api/mp/webhook` (evento *Pagamentos*).
4. **Primeiro teste** sem risco: use o ambiente **sandbox** do Melhor Envio e, no Mercado Pago, um frete de valor baixo.

## 10. Atualizar depois

Quando receber arquivos novos, cole só os que mudaram (mesmo nome) e clique em **Deploy**. Os dados no D1 não são mexidos.

## Plano B: pelo terminal

Com Node instalado: `npm install`, `npx wrangler login`, `npx wrangler d1 create delas-pra-elas` (copie o `database_id` para o `wrangler.toml`), `npx wrangler secret put SEGREDO`, `npx wrangler secret put ADMIN_SENHA`, `npx wrangler deploy`.
