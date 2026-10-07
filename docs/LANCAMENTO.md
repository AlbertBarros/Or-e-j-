# Orça Já — guia de lançamento e operação (passo a passo)

Tudo o que depende de você, na ordem. Comandos são para o **PowerShell**, dentro da pasta do projeto:

```powershell
cd "C:\Users\Jonathan Raulino\Projetos\orca-ja"
```

Endereços atuais: site https://orca-ja-6cz.pages.dev · app https://orca-ja-app.pages.dev · código https://github.com/AlbertBarros/Or-e-j-

---

## 1. Chave da conta de serviço do Firebase (para liberar o Pro)

1. Abra https://console.firebase.google.com/project/orca-ja-aaf65/settings/serviceaccounts/adminsdk
2. Clique em **Gerar nova chave privada** → **Gerar chave**. Um arquivo `.json` é baixado.
3. Renomeie para `service-account.json` e mova para a **raiz** do projeto (`C:\Users\Jonathan Raulino\Projetos\orca-ja\service-account.json`).
   O Git ignora esse arquivo: ele nunca sobe para o GitHub. **Não compartilhe com ninguém**: ele dá acesso total ao banco.

## 2. Liberar o Pro de um cliente (manual)

Quando alguém pagar, o Mercado Pago mostra o e-mail do pagador. Rode:

```powershell
node scripts/ativar-pro.cjs email@cliente.com 12
```

- `12` = meses (anual). Para mensal, use `1`. Para voltar ao grátis: `node scripts/ativar-pro.cjs email@cliente.com --free`.
- A pessoa precisa ter criado a conta no app **com o mesmo e-mail**. Se o script disser que não achou, peça o e-mail certo.

## 3. Liberação automática (webhook do Mercado Pago) — opcional, recomendado após os primeiros clientes

Passo a passo completo em `worker-pagamentos/README.md`. Resumo:

```powershell
cd worker-pagamentos
npx wrangler login
npx wrangler deploy
npx wrangler secret put MP_ACCESS_TOKEN
npx wrangler secret put WEBHOOK_SEGREDO
Get-Content ..\service-account.json -Raw | npx wrangler secret put FIREBASE_SERVICE_ACCOUNT
cd ..
```

- `MP_ACCESS_TOKEN`: Mercado Pago → https://www.mercadopago.com.br/developers → Suas integrações → sua aplicação → **Credenciais de produção** → Access Token.
- `WEBHOOK_SEGREDO`: invente um texto longo (30 letras e números) e guarde.
- Depois, na mesma aplicação do Mercado Pago → **Webhooks** → URL de produção:
  `https://orca-ja-pagamentos.SEU-USUARIO.workers.dev/?s=SEU_WEBHOOK_SEGREDO` (o `wrangler deploy` mostra a URL), eventos **Pagamentos** e **Planos e assinaturas**.

## 4. Testes reais no celular (antes de divulgar)

1. Abra o app, entre com Google, complete o cadastro.
2. Crie um orçamento com os itens sugeridos e toque em **Enviar no WhatsApp** para o seu segundo número (ou de alguém de confiança).
3. Confira a **prévia do link** na conversa: deve mostrar "Orçamento nº 0001 — Seu negócio".
4. No outro celular, abra o link e toque em **Aprovar orçamento**. No seu, o painel deve mostrar "Aprovado".
5. Libere o Pro na sua própria conta (`node scripts/ativar-pro.cjs seu@email.com 12`) e abra o link de novo: o **Pix** aparece. Pague R$ 1 de teste lendo o QR em **3 bancos diferentes** (Nubank, Itaú, Caixa, Inter…). Anote quais funcionaram.
6. Toque em **Marcar como pago**, depois **Gerar recibo**, preencha a garantia e envie o PDF pelo WhatsApp.
7. Instale o app pela tela inicial (botão **Baixar o app**) e repita um envio pelo ícone.

## 5. Revisar textos

- **"Como preencher" das 10 profissões**: arquivo `shared/data/profissoes.json`, campo `comoPreencher` de cada profissão (4 parágrafos). Edite o texto e me peça para publicar, ou rode os comandos do item 9.
- **Preços de referência** dos itens sugeridos: mesmo arquivo, campo `precoSugerido`.
- **Termos de uso e privacidade**: `site/src/pages/termos.astro` e `site/src/pages/privacidade.astro`. Mostre a um advogado antes do lançamento oficial.

## 6. Google Search Console (para o site aparecer no Google)

1. https://search.google.com/search-console → **Adicionar propriedade** → **Prefixo do URL** → `https://orca-ja-6cz.pages.dev`.
2. Verificação por **tag HTML**: copie o código que o Google mostrar e me envie; eu coloco no site.
3. Depois de verificado: **Sitemaps** → enviar `sitemap-index.xml`.

## 7. Domínio próprio (quando decidir, ex.: orcaja.com.br)

1. Registre em https://registro.br (R$ 40/ano) e, no Cloudflare, adicione o domínio (**Websites → Add a domain**) e troque os servidores DNS no Registro.br pelos que o Cloudflare indicar.
2. Cloudflare → **Workers & Pages** → `orca-ja` → **Custom domains** → `orcaja.com.br` e `www.orcaja.com.br`. Em `orca-ja-app` → **Custom domains** → `app.orcaja.com.br`.
3. Firebase → Authentication → Settings → **Domínios autorizados** → adicionar `app.orcaja.com.br`.
4. Cloudflare, projeto `orca-ja` → Settings → Variables: `SITE_URL=https://orcaja.com.br` e `PUBLIC_APP_URL=https://app.orcaja.com.br`. Projeto `orca-ja-app`: `VITE_APP_URL=https://app.orcaja.com.br`. Depois **Retry deployment** nos dois.
5. Me avise: eu troco os endereços fixos no código (robots, prévia do link, textos) e reenvio o sitemap.

## 8. Acompanhar o dia a dia

- **Leads do site** (lista de espera) e **métricas**: https://console.firebase.google.com/project/orca-ja-aaf65/firestore → coleções `leads` e `eventos`.
- **Usuários e orçamentos**: mesma tela, coleções `users` e `orcamentos`. Não edite à mão; use o app ou o script.
- **Pagamentos**: painel do Mercado Pago → Assinaturas / Vendas.
- **Site e app fora do ar?** Cloudflare → Workers & Pages → projeto → **Deployments** (último build verde?). Qualquer `git push` publica sozinho em 1 a 2 minutos.

## 9. Mexer no código e publicar

Pré-requisitos já instalados: Node 24, Git, Firebase CLI, Java 21.

```powershell
npm install                 # só na primeira vez ou quando mudar dependências
npm run typecheck           # confere os tipos
npm test                    # testes do código (shared + app)
npm run test:regras         # testes das regras de segurança (sobe o emulador sozinho)
npm run build               # gera site/dist e app/dist
git add -A
git commit -m "descreva a mudança"
git push                    # publica site e app no Cloudflare automaticamente
```

Rodar localmente:

```powershell
npm run dev:site            # site em http://localhost:4321
npm run dev:app             # app em http://localhost:5173 (dados reais)
npm run emuladores          # em outro terminal: banco e login de mentira
npm run dev:app:emulador    # app usando os emuladores (teste sem medo)
```

Publicar regras do banco depois de mudar `firebase/firestore.rules`:

```powershell
firebase deploy --only firestore:rules,firestore:indexes
```

## 10. Onde está cada coisa

| Pasta/arquivo | O que é |
|---|---|
| `site/` | Site de vendas e modelos grátis (Astro). Páginas em `site/src/pages`, preços em `site/src/lib/planos.ts` |
| `app/` | App do profissional (React). Telas em `app/src/paginas`, acesso ao banco em `app/src/lib`, PDFs em `app/src/pdf`, página pública em `app/src/publico` |
| `shared/` | Código comum: Pix (`pix.ts`), cálculos e mensagens (`mensagens.ts`), extenso, números, e `data/profissoes.json` |
| `firebase/` | Regras de segurança, índices e testes das regras |
| `functions/o/[id].js` | Prévia do link do orçamento no WhatsApp (roda no Cloudflare) |
| `scripts/ativar-pro.cjs` | Libera/retira o Pro de um cliente |
| `worker-pagamentos/` | Webhook do Mercado Pago (liberação automática) |
| `docs/` | PRD, arquitetura, design, SEO, roadmap e este guia |
| `.env.example`, `site/.env.example` | Modelos das variáveis; os valores reais ficam em `app/.env.local` e `site/.env.local` (fora do Git) e no painel do Cloudflare |

## 11. Pendências conhecidas (pequenas, para depois)

- Recibo avulso (sem orçamento) e cancelamento automático da assinatura (hoje o Pro expira pela data `planoAte`).
- Página de recibo e de cobrança no site de SEO (previstas na expansão do SEO.md).
- Depoimentos reais na home quando houver clientes.
