# Orça Já — PRD do MVP

## Problema

Autônomos e MEIs de serviço fazem orçamento em papel, Word ou mensagem solta no WhatsApp. O resultado parece amador, o cliente demora a responder, não existe registro do que foi combinado e cobrar quem atrasou é constrangedor. Toda semana essas pessoas pesquisam no Google "modelo de orçamento", "modelo de recibo" e "como cobrar cliente".

## Para quem

**Profissional (usuário pagante).** Eletricista, encanador, pintor, pedreiro, diarista, técnico de ar-condicionado, montador de móveis, jardineiro, fotógrafo, marido de aluguel. Usa celular Android, vive no WhatsApp, tem pouca paciência para sistemas. Muitas vezes faz o orçamento em pé, na casa do cliente.

**Cliente final (não paga, não cria conta).** Recebe o link pelo WhatsApp, vê o orçamento, aprova e paga via Pix.

## Proposta de valor

"Mande um orçamento com cara de empresa em 1 minuto, receba a aprovação pelo WhatsApp e cobre sem constrangimento."

## Fluxo principal

1. O profissional entra (Google ou e-mail) e faz o onboarding em 3 passos: profissão, negócio e Pix.
2. Ele cria um orçamento: escolhe o cliente, adiciona itens (com sugestões da profissão) e salva.
3. Toca em **Enviar no WhatsApp**. O app abre o WhatsApp com a mensagem e o link `/o/{id}` prontos, e o status vira "enviado".
4. O cliente abre o link, vê o orçamento e toca em **Aprovar orçamento** (ou "Recusar").
5. Depois da aprovação, a mesma página mostra o **Pix copia-e-cola** e o QR Code.
6. O profissional vê "Aprovado" no painel. Se o vencimento passar, o orçamento aparece como **Atrasado**, com o botão **Cobrar**.
7. Quando o dinheiro cai, ele toca em **Marcar como pago** e gera o **recibo em PDF**, que pode enviar no WhatsApp.

## Telas e critérios de aceite

### T1. Entrar
- Login com Google e com link mágico por e-mail.
- Aceite: um usuário novo vai para o onboarding; um usuário que já existe vai para o painel.

### T2. Onboarding (3 passos com barra de progresso)
1. **Profissão**: grade com as 10 profissões de `profissoes.json` + "Outra".
2. **Seu negócio**: nome do negócio, seu WhatsApp, cidade e logo (opcional).
3. **Seu Pix**: chave Pix com tipo detectado automaticamente e confirmação do tipo; nome que aparece no Pix.
- Aceite: a chave é salva normalizada (`normalizarChave`). É possível pular a logo. O usuário consegue terminar em menos de 2 minutos no celular.

### T3. Painel
- Topo: "A receber: R$ X" (soma de aprovados não pagos) e "Recebido no mês: R$ Y".
- Abas ou filtros: Todos, Enviados, Aprovados, Atrasados, Pagos.
- Cada card mostra cliente, número, valor, status e há quantos dias.
- Botão fixo **Novo orçamento**.
- Estado vazio: "Seu primeiro orçamento leva 1 minuto", com um botão.
- Aceite: carrega em menos de 2 s em 4G e a lista é paginada em lotes de 20.

### T4. Novo orçamento / Editar
- Cliente: nome e WhatsApp, com autocomplete de clientes de orçamentos anteriores.
- Itens: descrição, quantidade, unidade e valor unitário. Botão "Adicionar dos sugeridos", que abre a lista da profissão.
- Desconto em R$, validade (padrão de 15 dias), vencimento do pagamento (opcional) e observações (pré-preenchidas com `observacoesPadrao`).
- Total sempre visível, fixo no rodapé.
- Ações: **Salvar rascunho** e **Enviar no WhatsApp**.
- Aceite: um orçamento de 5 itens fica pronto em menos de 60 s no celular. O número é sequencial por usuário (transação em `proximoNumero`).

### T5. Detalhe do orçamento (visão do profissional)
- Mostra o mesmo layout que o cliente vê, mais as ações por status:
  - rascunho: Editar, Enviar no WhatsApp, Excluir
  - enviado: Reenviar, Copiar link, Editar (volta para rascunho)
  - aprovado: Cobrar, Marcar como pago, Copiar Pix
  - pago: Gerar recibo, Enviar recibo
- Também tem **Baixar PDF do orçamento**.

### T6. Página pública `/o/:id` (cliente final, sem login)
- Mostra logo e nome do negócio, número, data, itens, total, validade e observações.
- Se o status for "enviado", aparecem os botões **Aprovar orçamento** e "Recusar".
- Se for "aprovado", aparece o bloco de pagamento: QR Code, botão **Copiar código Pix** e valor.
- Se for "pago", aparece o selo "Pago em dd/mm".
- Se a validade expirou e ainda está "enviado", o aviso diz "Orçamento expirado — fale com {negócio}", com link para o WhatsApp do profissional.
- Rodapé discreto: "Feito com Orça Já — crie o seu grátis" (aquisição viral).
- Aceite: funciona sem login, carrega rápido em 3G e as regras impedem qualquer alteração além de aprovar ou recusar.

### T7. Cobrar
- Três mensagens (gentil, firme, final), geradas por `mensagemCobranca`, com prévia do texto.
- O tom é sugerido pelos dias de atraso: de 1 a 3, gentil; de 4 a 10, firme; mais de 10, final.
- Botão **Enviar no WhatsApp**.

### T8. Configurações e plano
- Edição dos dados do onboarding.
- Plano atual, uso do mês ("3 de 5 orçamentos") e botão **Assinar o Pro**, que abre o link de pagamento.

### Recibo (PDF)
- Contém dados do negócio, cliente, descrição resumida dos itens, valor por extenso, data do pagamento e a frase "Recebi de {cliente} a importância de...".

## Planos

| | Grátis | Pro (R$ 29,90/mês ou R$ 19,90/mês no plano anual, R$ 238,80/ano) |
|---|---|---|
| Orçamentos enviados/mês | 5 | Ilimitados |
| Link de aprovação | Sim | Sim |
| Pix (copia-e-cola + QR) na página de aprovação | Não | Sim |
| Logo no orçamento | Não | Sim |
| Marca "Feito com Orça Já" no PDF | Sim | Não |
| Mensagens de cobrança | Sim | Sim |
| Recibo PDF | Sim | Sim |

Ao bater o limite, o app mostra a tela de upgrade no momento de enviar, e o rascunho fica salvo.

## Fora do MVP (não fazer agora)

WhatsApp API oficial e envio automático, confirmação automática de Pix (Pix dinâmico/gateway), nota fiscal, agenda, estoque, multiusuário/equipe, app nativo, assinatura com cartão dentro do app, relatórios avançados, cadastro de clientes separado, parcelamento.

## Métricas

- **Ativação**: % que envia o 1º orçamento em até 24 h após o cadastro.
- **Taxa de aprovação**: aprovados ÷ enviados.
- **Valor marcado como pago** (total acumulado).
- **Conversão para Pro** de quem atinge o limite.
- **SEO**: cliques orgânicos por página de profissão e conversão de visitante para cadastro.

Registre eventos simples numa coleção `eventos` ou com Google Analytics 4 (decidir na Fase 5).
