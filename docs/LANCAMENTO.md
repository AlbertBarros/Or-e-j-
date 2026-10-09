# Preço Fechado — guia de lançamento e operação (passo a passo)

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

## 3. Variáveis do servidor no Cloudflare (avisos no celular, Pro automático e rotina diária)

Tudo roda no próprio projeto do app (`orca-ja-app`), sem publicar nada à parte. Os valores secretos já foram gerados e estão no arquivo
`segredos-cloudflare.txt` na raiz do projeto (o Git ignora esse arquivo; não compartilhe).

1. Cloudflare → **Workers & Pages** → `orca-ja-app` → **Settings** → **Variables and Secrets** → **Add**. Cadastre como **Secret**:

   | Nome | Valor |
   |---|---|
   | `FIREBASE_SERVICE_ACCOUNT` | o conteúdo inteiro do `service-account.json` (abra no Bloco de Notas, Ctrl+A, Ctrl+C) |
   | `VAPID_PRIVADA` | a linha `VAPID_PRIVADA=` do `segredos-cloudflare.txt` (só o que vem depois do =) |
   | `ROTINA_SEGREDO` | a linha `ROTINA_SEGREDO=` do mesmo arquivo |
   | `WEBHOOK_SEGREDO` | a linha `WEBHOOK_SEGREDO=` do mesmo arquivo |
   | `MP_ACCESS_TOKEN` | Mercado Pago → https://www.mercadopago.com.br/developers → Suas integrações → sua aplicação → **Credenciais de produção** → Access Token |

   E como **Text** (aparecem na tela Ajuda do app; deixe em branco se ainda não tiver):

   | Nome | Exemplo |
   |---|---|
   | `VITE_SUPORTE_WHATSAPP` | `5561999998888` (só números, com 55) |
   | `VITE_SUPORTE_EMAIL` | `suporte@precofechado.com.br` |

   Depois: **Deployments** → no último → **Retry deployment**.

2. GitHub → https://github.com/AlbertBarros/Or-e-j-/settings/secrets/actions → **New repository secret**:
   nome `ROTINA_SEGREDO`, valor igual ao do Cloudflare. A rotina passa a rodar de hora em hora sozinha
   (aba **Actions** → "Rotina de avisos" → **Run workflow** para testar na hora).

3. Mercado Pago → sua aplicação → **Webhooks** → URL de produção:
   `https://orca-ja-app.pages.dev/api/mercadopago?s=SEU_WEBHOOK_SEGREDO` (o mesmo valor do passo 1),
   eventos **Pagamentos** e **Planos e assinaturas**. Pronto: quem paga com o mesmo e-mail da conta vira Pro sozinho.

Como conferir:
- Abra https://orca-ja-app.pages.dev/api/mercadopago no navegador: deve aparecer "webhook de pagamentos ativo".
- No app, **Ajuda → Avisos no celular → Ligar avisos**. Depois aprove um orçamento seu pelo link em outro aparelho:
  o aviso chega em segundos, mesmo com o app fechado (no iPhone, só com o app instalado na Tela de Início).

## 4. Testes reais no celular (antes de divulgar)

1. Abra o app, entre com Google, complete o cadastro.
2. Crie um orçamento com os itens sugeridos e toque em **Enviar no WhatsApp** para o seu segundo número (ou de alguém de confiança).
3. Confira a **prévia do link** na conversa: deve mostrar "Orçamento nº 0001 — Seu negócio".
4. No outro celular, abra o link e toque em **Aprovar orçamento**. No seu, o painel deve mostrar "Aprovado".
5. Libere o Pro na sua própria conta (`node scripts/ativar-pro.cjs seu@email.com 12`) e abra o link de novo: o **Pix** aparece. Pague R$ 1 de teste lendo o QR em **3 bancos diferentes** (Nubank, Itaú, Caixa, Inter…). Anote quais funcionaram.
6. Toque em **Marcar como pago**, depois **Gerar recibo**, preencha a garantia e envie o PDF pelo WhatsApp.
7. Instale o app pela tela inicial (botão **Baixar o app**) e repita um envio pelo ícone.
8. Em **Ajuda**, ligue os avisos no celular e faça o tour guiado uma vez para conferir as telas.

## 5. Revisar textos

- **"Como preencher" das 10 profissões**: arquivo `shared/data/profissoes.json`, campo `comoPreencher` de cada profissão (4 parágrafos). Edite o texto e me peça para publicar, ou rode os comandos do item 9.
- **Preços de referência** dos itens sugeridos: mesmo arquivo, campo `precoSugerido`.
- **Termos de uso e privacidade**: `site/src/pages/termos.astro` e `site/src/pages/privacidade.astro`. Mostre a um advogado antes do lançamento oficial.

## 6. Google Search Console (para o site aparecer no Google)

1. https://search.google.com/search-console → **Adicionar propriedade** → **Prefixo do URL** → `https://orca-ja-6cz.pages.dev`.
2. Verificação por **tag HTML**: copie o código que o Google mostrar e me envie; eu coloco no site.
3. Depois de verificado: **Sitemaps** → enviar `sitemap-index.xml`.

## 7. Domínio próprio (precofechado.com.br)

1. Registre em https://registro.br (R$ 40/ano) e, no Cloudflare, adicione o domínio (**Websites → Add a domain**) e troque os servidores DNS no Registro.br pelos que o Cloudflare indicar.
2. Cloudflare → **Workers & Pages** → `orca-ja` → **Custom domains** → `precofechado.com.br` e `www.precofechado.com.br`. Em `orca-ja-app` → **Custom domains** → `app.precofechado.com.br`.
3. Firebase → Authentication → Settings → **Domínios autorizados** → adicionar `app.precofechado.com.br`.
4. Cloudflare, projeto `orca-ja` → Settings → Variables: `SITE_URL=https://precofechado.com.br` e `PUBLIC_APP_URL=https://app.precofechado.com.br`. Projeto `orca-ja-app`: `VITE_APP_URL=https://app.precofechado.com.br`. Depois **Retry deployment** nos dois.
5. Me avise: eu troco os endereços fixos no código (robots, prévia do link, textos) e reenvio o sitemap.

## 8. Acompanhar o dia a dia

- **Painel administrativo** (só a sua conta vê): no app, **Mais → Painel administrativo**, ou https://orca-ja-app.pages.dev/admin.
  Tem visão geral com gráficos, lista de todas as contas (com planilha), mensagens em massa por WhatsApp ou e-mail para quem cancelou,
  não assinou ou parou de usar, relatórios em PDF/planilha por período, pedidos de suporte e depoimentos.
  Para dar acesso a outra pessoa (ou tirar): `node scripts/tornar-admin.mjs email@dela.com` (ou `--remover` no fim).

- **Leads do site** (lista de espera) e **métricas**: https://console.firebase.google.com/project/orca-ja-aaf65/firestore → coleções `leads` e `eventos`.
- **Usuários e orçamentos**: mesma tela, coleções `users` e `orcamentos`. Não edite à mão; use o app ou o script.
- **Pagamentos**: painel do Mercado Pago → Assinaturas / Vendas.
- **Mensagens de suporte** (formulário da tela Ajuda): mesma tela do Firestore, coleção `suporte` (nome, negócio, WhatsApp, e-mail e a mensagem). Responda pelo WhatsApp da pessoa.
- **Depoimentos**: coleção `depoimentos`. Para mostrar um no site, abra o documento e mude `publicado` para `true`. Ele aparece na home sozinho (se a pessoa editar depois, volta para `false` até você aprovar de novo).
- **Teste grátis do Pro**: toda conta nova ganha 14 dias. No perfil (`users`), `testeProAte` mostra até quando; se a pessoa assinar durante o teste, os dias que faltam continuam valendo.
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
| `functions/api/` | Servidor: avisos no celular (`avisar`), rotina de hora em hora (`rotina`) e webhook do Mercado Pago (`mercadopago`) |
| `servidor/` | Código do servidor usado pelas funções: Firestore com a conta de serviço, Web Push e regras dos avisos |
| `docs/` | PRD, arquitetura, design, SEO, roadmap e este guia |
| `.env.example`, `site/.env.example` | Modelos das variáveis; os valores reais ficam em `app/.env.local` e `site/.env.local` (fora do Git) e no painel do Cloudflare |

## 11. Pendências conhecidas (pequenas, para depois)

- Página de recibo e de cobrança no site de SEO (previstas na expansão do SEO.md).
- Depoimentos reais na home quando houver clientes.
