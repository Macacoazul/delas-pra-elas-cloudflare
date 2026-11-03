# Como usar os Fretes (para a administradora)

Tudo acontece dentro do app da live. Toque na aba **Fretes** (só aparece para a dona).

## O dia a dia

**1. Criar o frete de uma cliente**
Toque em **Novo frete**.

- Escreva o nome da cliente. Se ela já estiver cadastrada, toque no nome que aparece: o WhatsApp vem junto.
- Escolha a **caixa** (as medidas já estão prontas).
- Digite o **peso** em kg (ou toque num dos atalhos: 300 g, 500 g, 1 kg…).
- Se a cliente já está cadastrada e tem **peças ainda não pagas**, aparece a lista **“Peças neste link”**: já vêm marcadas as da live mais recente. Marque ou desmarque o que vai ser cobrado agora. Sem peças marcadas, o link cobra só o frete.
- O **valor declarado** é o seguro do envio (não é cobrado da cliente). Se a cliente comprou na live, aparece um botão com o total dela naquele dia: toque para usar.
- Toque em **Gerar link**.

**2. Mandar o link**
Na tela seguinte toque em **Enviar pelo WhatsApp**: abre a conversa com a mensagem pronta. Se preferir, **Copiar** o link.

**3. A cliente faz o resto**
Ela abre o link e vê as peças dela, digita o CEP, vê as opções de frete (Correios e Jadlog) com preço e prazo, escolhe e preenche os dados. Aí toca em **Ir para o pagamento** e é levada à página segura do Mercado Pago, onde paga **peças + frete de uma vez** por **Pix, cartão de crédito (à vista ou parcelado) ou cartão de débito**. Os dados do cartão são digitados lá: o seu app não vê nem guarda. Boleto não é oferecido.

*Parcelas:* a página oferece até o limite que você definiu em Ajustes (padrão 3x) e só quando o total passa do valor mínimo (padrão R$ 120). Para o parcelamento ser **sem acréscimo para a cliente**, ative o “parcelamento sem juros” na sua conta do Mercado Pago; acima disso, o acréscimo é o da operadora, que o próprio Mercado Pago mostra à cliente antes de pagar.

**4. Você é avisada**
Quando o pagamento é aprovado, aparece um aviso verde na tela (**"Maria pagou!"**), o frete fica verde na lista como **Pago · gerar etiqueta**, **as peças incluídas no link são marcadas como pagas no app da live** e o nome da aba do navegador mostra quantos estão esperando etiqueta. A cliente vê a confirmação sozinha, sem recarregar.

**5. Gerar e imprimir a etiqueta**
Toque no frete → **Gerar etiqueta**. Pode levar até um minuto. Depois, **Abrir etiqueta para imprimir**. O valor sai do saldo da sua carteira no Melhor Envio.

**6. Rastreio**
O código aparece no frete assim que a etiqueta é gerada. A cliente vê o código e o andamento **no mesmo link que recebeu** (ele se atualiza sozinho). Quando o pacote for postado, toque em **Avisar o rastreio pelo WhatsApp** para mandar o código a ela com um toque. **Atualizar rastreio** força a conferência agora.

## O que cada situação significa

| Na lista | Significa | O que fazer |
|---|---|---|
| Aguardando a cliente abrir o link | Link criado, ela ainda não digitou o CEP | Esperar ou reenviar |
| Cliente escolhendo o frete | Ela já digitou o CEP | Esperar |
| Aguardando o pagamento (ou o Pix) | Ela abriu a página de pagamento e não pagou | Esperar; **Conferir o pagamento agora** se ela disser que pagou |
| Link de pagamento venceu (ou Pix venceu) | O prazo passou | A cliente gera outro pagamento pelo mesmo link |
| **Pago · gerar etiqueta** | Frete pago | **Gerar etiqueta** |
| Etiqueta pronta · falta postar | Etiqueta feita | Imprimir, colar e postar |
| Postado · a caminho | Transportadora já está com o pacote | Acompanhar |
| Entregue | Fim | — |
| Cancelado | Você cancelou o link | — |

Faixas vermelhas dentro do frete são **alertas**: valor diferente, pagamento em duplicidade, etiqueta cancelada no Melhor Envio, falta de saldo, etc. A mensagem diz o que fazer.

## Ajustes e Conexões

- **Ajustes**: CEP de onde você envia, as **caixas** (altura, largura, comprimento), quem envia (vai na etiqueta), transportadoras, **como a cliente paga** (Pix, crédito e débito, ou só Pix com cobrança só do frete), **até quantas parcelas** e **a partir de quanto parcelar**, quanto tempo o link de pagamento vale e o texto da mensagem do link. Mude as medidas aqui quando mudar de embalagem.
- **Conexões**: onde ficam o Melhor Envio e o Mercado Pago. Mostra se estão ligados, quando o token do Melhor Envio vence e o resultado do teste. Os tokens ficam guardados criptografados e nunca voltam para a tela.
- **Conta** (menu do app): trocar a senha, cadastrar/remover a equipe, restaurar o backup antigo e sair.

## Dicas

- **Peso certo**: o frete é calculado com o peso e as medidas que você informar. Se a transportadora medir diferente, pode cobrar a diferença.
- **Cancelar um link** só é possível antes de a cliente pagar. Depois de pago, devolva o valor pelo Mercado Pago (a etiqueta e o status das peças você ajusta à mão). Se um pagamento chegar de um link cancelado, aparece um alerta.
- **Uma cobrança por peça:** evite criar dois links com as mesmas peças; as peças só são marcadas como pagas quando um deles é pago, e o outro ainda poderia ser pago.
- Se a cliente errar o CEP, ela pode tocar em **Trocar CEP** no próprio link.
- O link é de uma única remessa e é secreto: quem tem o link vê o nome, o pacote e o andamento (nunca o CPF).

## Sem internet

No app da live, vendas e cadastros feitos sem internet entram numa fila no aparelho e são enviados sozinhos quando a conexão volta. Com o app fechado e sem internet não dá para reabrir, mas o que está na fila continua guardado. Fretes exigem internet.
