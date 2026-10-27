# Segurança — o que protege o app, o que você decide e o que sobra

## 1. O que está implementado

| Assunto | Como é |
|---|---|
| Senhas | Nunca guardadas. O banco guarda uma assinatura HMAC-SHA256 da senha, com um sal de cada conta e uma chave que só existe no segredo `SEGREDO` (fora do banco). Quem copiar o banco não consegue testar senhas. Mínimo 8 caracteres. |
| Sessão | Cookie assinado `dpe_sessao`: `HttpOnly` (o JavaScript da página não lê), `SameSite=Strict` e `Secure` em https. Dura 14 dias. Trocar a senha ou remover uma pessoa derruba na hora todas as sessões dela. |
| Tentativas de senha | Bloqueio de 15 minutos após erros repetidos, contado por e-mail e por endereço de internet. A mensagem de erro é a mesma para e-mail inexistente e senha errada. |
| Papéis | `dono` (tudo, inclusive Fretes e equipe) e `equipe` (só o app da live). A lista de rotas e do nível de acesso de cada uma é conferida por um teste automático: se alguém abrir uma rota sem querer, o teste falha. |
| Primeira conta | Só se cria com o segredo `ADMIN_SENHA`; depois de existir uma conta, a tela é recusada (409). |
| CSRF | Rotas com cookie só aceitam pedidos do próprio site (cabeçalhos `Origin`/`Sec-Fetch-Site`) e corpo JSON. |
| Dados sensíveis | Tokens, assinatura do webhook, CPF, e-mail e endereço da cliente e dados do Pix ficam **criptografados** (AES-GCM) no D1, com chave derivada do `SEGREDO`. |
| Link da cliente | Código aleatório de 32 caracteres; código com formato inválido é recusado sem nem consultar o banco. A resposta pública nunca traz CPF, endereço completo, token ou dados internos. Limites por link: CEP 20/h e Pix 10/h. |
| Webhook do Mercado Pago | Formato da assinatura checado primeiro; depois HMAC com a assinatura secreta; por fim o pagamento é **consultado de novo** no Mercado Pago (valor e referência). Sem a assinatura secreta cadastrada, todo aviso é recusado (503). |
| Tamanho dos pedidos | 64 KB (1 MB só para a restauração do backup), lido por partes. |
| Cabeçalhos | HSTS, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, e política de conteúdo (CSP) sem `unsafe-inline` nas páginas. |
| Registro (log) | Toda linha passa por limpeza de Bearer, chaves do Mercado Pago e CPF. `/api/saude` devolve só sim/não. |
| Endereços de teste | Uma única variável, que só aceita endereços da própria máquina. |
| Segredos | Os 12 arquivos de `para-colar/` e o ZIP não têm nenhuma chave nem senha (um teste varre cada arquivo). `SEGREDO` e `ADMIN_SENHA` só existem no painel do Cloudflare. |
| Código | Só Cloudflare Workers + JavaScript, sem dependências no servidor; ESLint sem erros. |

63 alterações de propósito no código de segurança foram feitas para provar que os testes as denunciam; todas foram denunciadas.

## 2. Decisões que são suas

1. **Quem é equipe.** Cadastre em *Conta → Equipe do app* só quem realmente usa o app. A equipe **não** vê Fretes, tokens nem clientes de frete, mas vê clientes e vendas da live. Remova quem sair.
2. **Guardar o `SEGREDO`.** Ele assina o login e deriva a chave de criptografia. Guarde num gerenciador de senhas. Trocar o `SEGREDO` desloga todos e torna ilegíveis os tokens e dados de Fretes já salvos (cole os tokens de novo).

## 3. O que continua sendo risco

- **Sua conta do Cloudflare** controla o Worker, o D1 e os segredos. Ative a verificação em duas etapas.
- **Cota do plano grátis:** 100 mil pedidos por dia. Quem ficar batendo no endereço pode esgotá-la. No `workers.dev` não há regra de proteção; com domínio próprio dá para criar uma regra de limite por IP (*Segurança → WAF*). Os limites por link protegem Pix e Melhor Envio, mas não a cota.
- **Tokens do Melhor Envio e do Mercado Pago:** quem tiver acesso à sua conta do Cloudflare e ao `SEGREDO` pode abrir o banco e descriptografá-los. Gere tokens só com as permissões necessárias e troque-os em caso de suspeita.
- **Token do Melhor Envio já exposto:** o token colado antes numa conversa deve ser **revogado e gerado de novo**, com a verificação em duas etapas ligada na conta do Melhor Envio.
- **LGPD:** CPF e endereço da cliente não têm exclusão automática.
- **Não medido:** o limite de 10 ms de CPU por pedido do plano grátis (login e criptografia usam só HMAC e AES, sem derivação lenta de senha, para caber nele), e o limite de chamadas por execução têm uma incerteza descrita em `GUIA-INTEGRACAO-APIS.md`, seção 6.
- **Nada foi testado** contra o Cloudflare, o D1, o Melhor Envio, o Mercado Pago ou o ViaCEP de verdade; só contra simuladores, o motor workerd local com D1 local e um navegador local.

## 4. Dependências

- **Servidor (o que roda no Cloudflare):** nenhuma. Os arquivos colados só importam uns aos outros.
- **Telas:** o app usa Preact (embutido em `site-biblioteca.js`).
- **Ferramentas de montagem e teste** (`npm install`): wrangler, esbuild, prettier, acorn, eslint e Preact. Não vão para os arquivos colados. Rode `npm audit` quando for recompilar.
