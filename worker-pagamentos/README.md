# Liberação automática do Pro (webhook do Mercado Pago)

Um Cloudflare Worker (grátis) recebe os avisos do Mercado Pago, confirma o pagamento na API deles e grava
`plano: "pro"` e `planoAte` no perfil do usuário que tem o **mesmo e-mail do pagador**.

Enquanto o Worker não estiver publicado, a liberação é manual: `node scripts/ativar-pro.cjs email@cliente.com 12`.

## Publicar (uma vez, no PowerShell, na pasta `worker-pagamentos`)

1. Baixe a chave da conta de serviço do Firebase: Console → Configurações do projeto → Contas de serviço →
   **Gerar nova chave privada**. Salve como `service-account.json` na raiz do repositório (o Git ignora esse arquivo).
2. Pegue o **Access Token de produção** do Mercado Pago: mercadopago.com.br/developers → Suas integrações →
   (crie uma aplicação se não tiver) → Credenciais de produção.
3. Entre no Cloudflare e publique:

   ```powershell
   cd worker-pagamentos
   npx wrangler login
   npx wrangler deploy
   ```

   Anote a URL que aparece (algo como `https://orca-ja-pagamentos.SEU-USUARIO.workers.dev`).

4. Cadastre os segredos (cada comando pede o valor; cole e dê Enter):

   ```powershell
   npx wrangler secret put MP_ACCESS_TOKEN
   npx wrangler secret put WEBHOOK_SEGREDO
   Get-Content ..\service-account.json -Raw | npx wrangler secret put FIREBASE_SERVICE_ACCOUNT
   ```

   Para `WEBHOOK_SEGREDO`, invente um texto longo e aleatório (ex.: 30 letras e números). Guarde-o.

5. No Mercado Pago (Suas integrações → sua aplicação → **Webhooks**), configure a URL de produção:

   `https://orca-ja-pagamentos.SEU-USUARIO.workers.dev/?s=SEU_WEBHOOK_SEGREDO`

   e marque os eventos **Pagamentos** e **Planos e assinaturas**.

## Como testar

- Faça uma assinatura de teste com o seu próprio cartão e cancele depois.
- Em até 1 minuto, abra o app: a conta com o mesmo e-mail do pagamento deve aparecer como Pro.
- Os logs ficam em Cloudflare → Workers & Pages → orca-ja-pagamentos → Logs.

## Limites conhecidos

- Casa o pagamento pelo **e-mail**. Se a pessoa pagar com um e-mail diferente do login, não acha o usuário:
  o log mostra "nenhum usuário com e-mail ..." e você libera manualmente com o script.
- Não trata cancelamento: quando a assinatura termina, `planoAte` passa e o app volta a tratar como grátis
  (a checagem de `planoAte` no app entra na próxima revisão; hoje `plano` só muda de volta pelo script).
