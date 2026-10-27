# Guia das integrações — Melhor Envio, Mercado Pago e ViaCEP

O que fazer **nos painéis dos serviços** e onde colar cada dado na tela **Fretes → Conexões**. Foi escrito a partir da documentação oficial dos provedores (consultada em outubro de 2026) e do código do servidor de fretes.

> Leia a seção 6 ("O que foi e o que não foi testado"). Nenhuma chamada foi feita aos servidores reais dos provedores, porque isso exige as suas credenciais. O primeiro teste de verdade é o seu, e o `PASSO-A-PASSO.md` (parte "Primeiro teste") mostra como fazê-lo sem risco.

## Visão geral

| Serviço | Para quê | Credencial | Onde colar |
|---|---|---|---|
| **Melhor Envio** | Calcular o frete (Correios, Jadlog…), criar/pagar/gerar a etiqueta e acompanhar o rastreio | Token de acesso | Fretes → Conexões → Melhor Envio |
| **Mercado Pago** | Cobrar o frete por Pix e **avisar quando for pago** | Access Token de produção + assinatura secreta do webhook | Fretes → Conexões → Mercado Pago |
| **ViaCEP** | Preencher rua, bairro e cidade a partir do CEP da cliente | nenhuma | — |

Os tokens ficam guardados **só no servidor** (banco D1, **criptografados** com AES-GCM por uma chave derivada do `SEGREDO`; nenhum navegador consegue ler). Depois de salvar, a tela nunca os recebe de volta: mostra apenas "salvo", os 4 últimos caracteres, a validade e as permissões que faltam.

## 1. Como o frete funciona (o caminho de uma remessa)

1. A administradora cria o frete: escolhe a cliente, uma **caixa** de medidas fixas (altura, largura, comprimento), digita o **peso** e confere o valor declarado. O servidor gera um link secreto.
2. A cliente abre o link e digita o **CEP**. O servidor consulta o ViaCEP (endereço) e o Melhor Envio (`POST /api/v2/me/shipment/calculate`) com o CEP de **origem** configurado em Ajustes e as medidas/peso do pacote. Aparecem só as transportadoras escolhidas (por padrão, Correios e Jadlog) com preço e prazo.
3. Ela escolhe, informa nome, WhatsApp, e-mail, **CPF** (o Pix exige) e número da casa. O servidor cria o **Pix** no Mercado Pago (`POST /v1/payments`) com o valor **do servidor** (a página nunca define preço) e mostra QR Code e "copia e cola".
4. Quando o Pix é pago, o Mercado Pago avisa o servidor (webhook assinado). O servidor **consulta o pagamento de novo** no Mercado Pago, confere valor e referência e marca o frete como **pago**. A tela da administradora mostra o aviso verde na hora e a página da cliente muda sozinha.
5. A administradora toca em **Gerar etiqueta**. O servidor coloca o envio no carrinho (`POST /api/v2/me/cart`), **compra** com o saldo da carteira do Melhor Envio (`POST /api/v2/me/shipment/checkout`), gera (`…/generate`) e busca o link de impressão (`…/print`). Ela toca em **Abrir etiqueta para imprimir**.
6. O rastreio (`POST /api/v2/me/shipment/tracking`) é conferido: pela página da cliente (no máximo a cada 10 minutos enquanto ela estiver aberta), pela administradora (*Atualizar rastreio*) e por uma rotina a cada 30 minutos. A cliente vê o código e o andamento no **mesmo link** que recebeu.

Segurança do caminho: o preço sai do servidor; só Pix criados por ele são aceitos; valor e referência são conferidos; toques repetidos não geram dois Pix nem duas etiquetas; links da cliente são códigos aleatórios de 32 caracteres; a resposta pública nunca traz CPF, endereço completo, token ou dados internos.

## 2. Mercado Pago — Pix e aviso de pagamento

### 2.1 Pré-requisitos

- Conta de vendedor verificada, a que vai **receber** o dinheiro.
- **Chave Pix cadastrada** na conta. Sem ela o Mercado Pago recusa o Pix com o erro *"Collector user without key enabled for QR render"*; o servidor mostra uma mensagem explicando.

### 2.2 Pegar o Access Token

1. <https://www.mercadopago.com.br/developers/panel/app> → **Criar aplicação** (pagamentos online por API / Checkout Transparente; os nomes das opções mudam com o tempo).
2. Abra a aplicação → **Credenciais** → copie o **Access Token de produção** (começa com `APP_USR-`). Não use a *Public Key*.
3. Cole em **Fretes → Conexões → Mercado Pago → Access Token**.

> Se aparecer *"Unauthorized use of live credentials"*, a conta/aplicação ainda não está habilitada para credenciais de produção: conclua a ativação no painel do Mercado Pago.
> Credenciais de **teste** criam pagamentos de teste que **não geram aviso de webhook**; por isso o teste completo usa a de produção com um frete barato.

### 2.3 Webhook (o aviso automático)

1. Em **Ajustes**, preencha **Endereço do seu site** com o endereço do seu Worker (ex.: `https://delas-pra-elas.seu-usuario.workers.dev`).
2. Em **Conexões**, copie o endereço que aparece embaixo de *Assinatura secreta* (`https://SEU-SITE/api/mp/webhook`).
3. No painel do Mercado Pago: sua aplicação → **Webhooks** → **Configurar notificações** → aba **Modo produtivo** → cole o endereço → marque o evento **Pagamentos** → salvar. O painel mostra a **assinatura secreta**: copie.
4. Cole a assinatura em **Conexões → Assinatura secreta do aviso** e salve.

Sem a assinatura secreta o servidor **recusa** todo aviso (resposta 503): é de propósito, para ninguém conseguir "avisar" um pagamento falso. Mesmo sem webhook o pagamento é percebido: a página da cliente confere a cada poucos segundos, a administradora tem o botão *Conferir o pagamento agora*, e uma rotina confere a cada 30 minutos.

### 2.4 Aviso sobre a API usada

O Mercado Pago classifica a API de **Pagamentos** (`/v1/payments`), usada aqui, como "legado" e recomenda a **API Orders** para integrações novas, informando que a de Pagamentos continua funcionando e recebendo correções, sem data de desligamento. Se isso mudar, será preciso migrar.

### 2.5 Erros comuns

| Mensagem | Causa | O que fazer |
|---|---|---|
| "Unauthorized use of live credentials" | Aplicação ainda sem produção ativada | Ative as credenciais de produção no painel |
| "Collector user without key enabled for QR render" | Conta sem chave Pix | Cadastre uma chave Pix na conta |
| "O Mercado Pago recusou o token" | Token errado ou de outra conta/modo | Copie de novo o Access Token de produção |
| Pagamento caiu, frete não ficou "pago" | Webhook não chegou | *Conferir o pagamento agora*; confira a URL e a assinatura secreta |
| Alerta "Pix … aprovado, mas não confere com o frete escolhido" | Valor pago ≠ frete | Veja o pagamento no Mercado Pago; o servidor **não** marca como pago |
| Alerta "Pagamento em duplicidade" | A cliente pagou dois Pix do mesmo frete | Devolva um deles pelo Mercado Pago |

## 3. Melhor Envio — cotação, etiqueta e rastreio

### 3.1 Sandbox ou produção

- **Produção** (`melhorenvio.com.br`): preços e etiquetas valem.
- **Sandbox** (`sandbox.melhorenvio.com.br`): ambiente de teste **separado**, com cadastro e token próprios. Um token não funciona no outro. Em **Conexões** o campo *Ambiente* escolhe qual usar. **Comece pelo sandbox.**

### 3.2 Gerar o token

1. Entre no painel (produção ou sandbox) → **Integrações** → área de desenvolvedor → **Cadastrar aplicativo** (nome, site, e-mails, URL de callback, descrição).
2. Gere o **token de acesso** da sua conta marcando **todas** estas permissões:

   `shipping-calculate`, `cart-read`, `cart-write`, `shipping-checkout`, `shipping-generate`, `shipping-print`, `shipping-tracking`, `orders-read`

   (Sem `shipping-calculate` não há cotação; sem as outras não há etiqueta. A janela *Conexões* lê o token e avisa quais permissões faltam.)
3. Cole em **Conexões → Melhor Envio → Token de acesso**. O campo aceita token longo (até 4096 caracteres) e tolera "Bearer " e quebras de linha coladas junto.
4. Informe o **e-mail de contato**: o Melhor Envio exige um contato no cabeçalho `User-Agent` de toda chamada.

> **Validade.** O Melhor Envio documenta o `access_token` com validade de **30 dias** (OAuth 2.0). O servidor **não renova sozinho**: usa o token que você colar. A janela *Conexões* mostra a data em que ele vence e avisa quando faltar menos de 7 dias. Quando vencer, gere e cole outro.

### 3.3 Saldo

A etiqueta é **paga com o saldo da carteira do Melhor Envio** (`shipment/checkout`). O Pix da cliente cai no **Mercado Pago**, não na carteira do Melhor Envio: você precisa manter saldo lá (recarregue pelo painel). Sem saldo, *Gerar etiqueta* mostra o erro do Melhor Envio e você tenta de novo depois de recarregar; nada é cobrado em duplicidade.

Se o preço do carrinho ficar **maior** do que a cliente pagou, o servidor **pergunta antes** de comprar: a diferença sai do seu saldo.

### 3.4 Dados que a etiqueta exige

Em **Ajustes → Quem envia**: nome, WhatsApp com DDD, e-mail, CEP, rua, número, bairro, cidade e UF. Em **Conexões**: CPF ou CNPJ de quem envia. Se algo faltar, *Gerar etiqueta* diz o que é. A cliente informa o CPF dela no link (o Pix e a etiqueta exigem).

### 3.5 Pontos de atenção

- **Etiqueta cancelada no painel do Melhor Envio:** o servidor percebe na próxima conferência e devolve o frete ao estado "pago", com um alerta, para você gerar outra.
- **Cancelar/estornar** etiqueta e **devolver o Pix** são feitos nos painéis do Melhor Envio e do Mercado Pago; esta tela não faz isso.
- **Rastreio:** o Melhor Envio só envia notificações automáticas a aplicativos OAuth; por isso o servidor **consulta** (polling). O código de rastreio existe assim que a etiqueta é gerada, mas só mostra movimento depois da postagem.
- CEPs que Correios/Jadlog não atendem: a cliente vê as opções que existirem, com um aviso; se não houver nenhuma, vê "sem atendimento" e você resolve pelo WhatsApp.

## 4. ViaCEP

Sem configuração. Quando a cliente digita o CEP, o **servidor** consulta `https://viacep.com.br`, mostra rua/bairro/cidade/UF e usa a cidade e a UF do CEP (o Melhor Envio confere o estado contra o CEP). Se o ViaCEP estiver fora do ar, a cliente digita os dados à mão.

## 5. Onde cada dado fica

Tudo fica no banco D1 do seu Cloudflare, na tabela de documentos.

| Dado | Coleção | Quem lê |
|---|---|---|
| Tokens, assinatura do webhook, CPF/CNPJ de quem envia | `privado` (criptografada) | **Só o servidor** |
| CPF, e-mail, endereço da cliente, Pix (QR/copia e cola), cotação | `fretes_privado` (criptografada) | **Só o servidor** |
| Situação do frete (status, caixa, peso, serviço, preço, pagamento, rastreio, link) | `fretes` | **Só a dona**, pela API |
| Ajustes da loja (CEP de origem, caixas, transportadoras, remetente) | `config` | A dona lê e grava |

Os registros do servidor (Cloudflare → seu Worker → Logs) mascaram tokens, CPF e chaves. O código do link da cliente nunca é gravado nos registros.

**LGPD:** o CPF e o endereço da cliente ficam guardados (criptografados) sem prazo de exclusão automática. Defina por quanto tempo manter (por exemplo, apagar fretes entregues há mais de 90 dias); a exclusão automática não foi implementada.

## 6. O que foi e o que não foi testado

**Testado (automático, tudo na máquina de desenvolvimento):**

- **230 testes de unidade e de servidor**, rodados duas vezes (banco em memória e banco D1 simulado sobre SQLite), com simuladores do ViaCEP, do Melhor Envio e do Mercado Pago que seguem a documentação: cotação, escolha de opção, Pix (valor, expiração, idempotência), webhook assinado (certo, errado, ausente, repetido, simultâneo), Pix de valor diferente ou duplicado, Pix vencido, etiqueta em etapas com retomada, diferença de preço, saldo insuficiente, etiqueta cancelada, rastreio, limites de tentativas, login (senha, sessão, bloqueio, papéis), tamanho dos pedidos, cabeçalhos de segurança e que nenhuma resposta pública ou registro vaza token, CPF ou segredo.
- **14 testes de API no motor do Cloudflare (workerd)** com D1 local, usando os próprios arquivos de `para-colar/` copiados para uma pasta vazia, e **6 testes de navegador** (Chromium) contra esse mesmo Worker.
- **55 passos de navegador (Chromium)** nas telas do app, dos Fretes e da cliente: criar link → cliente digita CEP, escolhe e recebe o Pix → webhook assinado → aviso na tela da dona → etiqueta → postado → entregue; cancelar; Pix vencido; link inválido; sem login; Ajustes e Conexões; política de segurança da página (CSP) sem violações.
- **63 alterações de propósito** no código de segurança (login, sessão, CSRF, webhook, criptografia, limites, permissões de cada rota…) e os testes denunciaram todas.

**NÃO testado, e por quê:**

- **Nenhuma chamada aos servidores reais** do Melhor Envio, Mercado Pago ou ViaCEP: exige suas credenciais e, no Pix, dinheiro. Só a prática confirma: campos exatos do carrinho do Melhor Envio na sua conta (documento de quem envia, `non_commercial`, seguro), permissões do seu token, se o Mercado Pago aceita o `notification_url` do seu site, e o tempo que o Melhor Envio leva para liberar a etiqueta.
- **Cloudflare e D1 de verdade:** o motor (workerd) e o D1 local são os mesmos de lá, mas o painel, o domínio `workers.dev`, o agendamento real e o **limite de 10 ms de CPU por pedido do plano grátis** só aparecem depois de publicar (não dá para medir localmente). Se o painel mostrar erro de limite de CPU, avise.
- **Limite de chamadas:** o plano grátis permite 50 chamadas externas por execução; a documentação do Cloudflare de fev/2026 fala em 1.000 chamadas a serviços do próprio Cloudflare (como o D1), mas a página de limites do D1 ainda cita 50. O servidor trabalha com folga (orçamento de 44) e a rotina automática para sozinha ao chegar perto: se o limite menor valer, ela só confere menos fretes por vez.
- Impressão física da etiqueta, outros navegadores além do Chromium, leitores de tela.

O frete **nunca** é marcado como pago sem que o servidor tenha consultado o pagamento direto no Mercado Pago.
