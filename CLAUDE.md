# Preço Fechado — instruções para o Claude Code

Leia este arquivo inteiro antes de qualquer tarefa. Ele é a fonte da verdade do projeto.
Detalhes ficam em `docs/`: PRD.md (produto), ARQUITETURA.md (técnico), DESIGN.md (visual), SEO.md (site), ROADMAP.md (fases e tarefas).

## O que é

Micro-SaaS para autônomos e MEIs brasileiros (eletricista, pintor, diarista, técnico de ar etc.):
**orçar → cliente aprova por link → cobrar via Pix → recibo**, tudo pensado para o WhatsApp e para o celular.
A aquisição vem do Google: páginas "modelo de orçamento para {profissão}" com gerador grátis embutido.

## Regra de ouro do MVP

Se não serve ao ciclo **orçar → aprovar → cobrar → recibo**, não entra. Ver lista "Fora do MVP" no PRD.
Antes de adicionar dependência, tela ou coleção nova, pergunte ao Jonathan.

## Stack (não trocar sem pedir)

- **App** (`app/`): React 18 + TypeScript (strict) + Vite + Tailwind CSS + React Router.
- **Backend**: Firebase — Authentication (Google + e-mail/link mágico) e Firestore. **Sem Storage** no MVP (exige plano Blaze): a logo fica comprimida (≤ 100 KB) em `logos/{uid}`. Sem Cloud Functions, exceto se a fase pedir.
- **Site de SEO** (`site/`): Astro (estático), consumindo `shared/data/profissoes.json`. Deploy no Cloudflare Pages.
- **Código compartilhado** (`shared/`): funções puras em TS (Pix, cálculos, mensagens) + dados. Testes com Vitest.
- **PDF**: `@react-pdf/renderer`, gerado no navegador.
- **Hospedagem do app**: Cloudflare Pages (SPA, com fallback de rotas para `index.html`).

## Ambiente do desenvolvedor

- Windows + **PowerShell**. Todo comando sugerido deve funcionar no PowerShell (sem `&&` em PowerShell 5; use `;` ou comandos separados; sem `rm -rf`, use `Remove-Item -Recurse -Force`).
- Node 20+ e npm. Git + GitHub.
- Fuso: America/Sao_Paulo. Moeda BRL, datas dd/mm/aaaa, tudo em pt-BR.

## Estrutura do repositório

```
orca-ja/
  CLAUDE.md
  docs/                 PRD, ARQUITETURA, DESIGN, SEO, ROADMAP
  shared/
    src/pix.ts          BR Code (testado contra o exemplo oficial do BCB) — NÃO reescrever sem rodar os testes
    src/mensagens.ts    cálculos, formatação, links wa.me e textos de cobrança
    data/profissoes.json  itens, preços de referência, SEO e FAQ por profissão
  app/                  Vite + React: src/lib (firebase, auth, usuario, logo, validacao), hooks, rotas, paginas
  site/                 (criado na Fase 0)
  firebase/             firestore.rules, storage.rules, firestore.indexes.json
  firebase.json         (criado na Fase 1, apontando para firebase/)
```

O `app/` e o `site/` importam de `shared/` por caminho relativo ou alias `@shared` (configurar no Vite e no Astro). Não duplicar lógica de Pix, cálculo ou mensagens.

## Convenções de código

- Código, nomes de variáveis de domínio e textos da interface em **português** (orcamento, cliente, itens, valorUnit). Termos técnicos genéricos podem ficar em inglês (hooks, utils).
- Componentes funcionais, um por arquivo, `PascalCase.tsx`. Hooks em `useAlgo.ts`.
- Acesso ao Firestore só via `app/src/lib/` (ex.: `orcamentos.ts`, `usuario.ts`). Componentes não chamam `firebase/firestore` diretamente.
- Tipos de domínio em `app/src/tipos.ts`, espelhando o modelo de dados de `docs/ARQUITETURA.md`.
- Dinheiro sempre em reais como `number` com 2 casas (usar funções de `shared/src/mensagens.ts`); nunca formatar à mão.
- Datas no Firestore como `Timestamp`; converter na camada `lib/`.
- Sem `any`. Sem bibliotecas de UI pesadas (MUI, Ant). Tailwind + componentes próprios.
- Formulários: controle com estado React; validar no envio com mensagens claras em pt-BR.

## Modelo de dados (resumo — detalhe em ARQUITETURA.md)

- `users/{uid}`: perfil do negócio (nomeNegocio, nomeResponsavel, nomePix, whatsapp, cidade), chave Pix (normalizada), `temLogo`, `plano` ("free"|"pro", só o servidor altera), `proximoNumero`, `uso: { mes: "AAAA-MM", enviados: number }`.
- `logos/{uid}`: `dataUrl` da logo (≤ 100 KB, `data:image/*`), leitura pública, escrita só do dono.
- V2: `users/{uid}/catalogo/{id}` (produtos e serviços), `clientes/{uid}_{whats}` (só dono), `contratos/{id}` (get público; cliente só assina enviado→assinado), `cartoes/{uid}` (público). Páginas públicas: `/o/`, `/c/`, `/v/` (pacote separado em `app/src/publico`). Navegação por abas (`BarraAbas`).
- V3: orçamento tem `pagamento` (métodos, aCombinar, valorCartao, observacao), `frete` (endereco, km, fixo, porKm, valor) e `modelo` (1 simples, 2 detalhado, 3 completo); `total` = itens − desconto + frete. Perfil tem `frete` padrão e `modeloDocumento`. Distância via `lib/frete.ts` (Nominatim + OSRM). Notificações derivadas dos dados em `hooks/useNotificacoes.ts`.
- `eventos/{id}`: métricas (nome, uid?, orcamentoId?, origem, criadoEm), só criação. `leads/{id}`: lista de espera do site, só criação.
- Recibo (Pro) fica dentro do orçamento em `recibo` (numeração própria em `users.proximoRecibo`). Pro com `planoAte` vencido é tratado como grátis (`comPlanoEfetivo`).
- `orcamentos/{id}`: `ownerId`, `numero`, `cliente {nome, whatsapp}`, `itens[]`, `desconto`, `total`, `validadeAte`, `vencimentoPagamento`, `observacoes`, `status`, timestamps e **snapshot `negocio`** (nome, nomePix, whatsapp, chavePix, cidade, mostrarMarca, mostrarLogo, mostrarPix) para a página pública não ler `users/`. Pix na página de aprovação só no Pro.
- `leads/{id}`: lista de espera do site (só criação).
- Status: `rascunho → enviado → aprovado | recusado → pago`. "Atrasado" é **calculado** (aprovado + vencimento passado), não salvo.

## Segurança (inegociável)

- Regras em `firebase/firestore.rules`. Toda mudança no modelo de dados exige revisar as regras **e** testá-las no Emulator.
- A página pública `/o/:id` só faz `get` do documento e só pode mudar `status` de "enviado" para "aprovado"/"recusado" + `respondidoEm`.
- Nunca expor dados de `users/` na página pública. Nunca guardar CPF do cliente final no MVP.
- `.env.local` nunca vai para o Git.

## Design e texto da interface

Siga `docs/DESIGN.md`. Mobile-first de verdade (testar em 360px). Botões grandes (mín. 44px), uma ação principal por tela.
Textos curtos, voz ativa, linguagem do profissional ("Enviar no WhatsApp", não "Compartilhar"). Uma ação mantém o mesmo nome no fluxo todo.

## Como trabalhar neste projeto

1. Trabalhe **uma fase do `docs/ROADMAP.md` por vez**. Antes de codar, leia a fase, liste o plano em passos curtos e espere o "ok" se a fase tiver decisões abertas.
2. Faça commits pequenos e descritivos em português (`feat: página pública do orçamento`, `fix: arredondamento do total`).
3. Ao terminar uma tarefa, marque `[x]` no ROADMAP e rode a verificação.
4. Nunca declare algo pronto sem rodar a verificação abaixo.

## Verificação ("definição de pronto")

```powershell
npm run typecheck
npm run test
npm run build
```
Além disso: abrir no navegador em largura de celular e percorrer o fluxo da tarefa. Para regras do Firestore, testar no Emulator (`firebase emulators:start`).

## Comandos úteis (preencher conforme forem criados)

- `npm run dev:site` — site de SEO local (http://localhost:4321)
- `npm run dev:app` — app local (a partir da Fase 1)
- `npm run test` / `npm run typecheck` / `npm run build` — rodam em todos os workspaces
- `npm run emuladores` + `npm run dev:app:emulador` — app local contra os emuladores de Auth e Firestore (login por link: pegue o link em http://127.0.0.1:9099/emulator/v1/projects/orca-ja-aaf65/oobCodes)
- `npm run test:regras` — testes das regras do Firestore no emulador (precisa de Java: `winget install Microsoft.OpenJDK.21`; o script ajusta a pasta temporária do Java, ver `firebase/testar-regras.cjs`)
- `firebase deploy --only firestore:rules,firestore:indexes` — regras e índices (Storage entra na Fase 1, quando for ativado)
- `node scripts/gerar-marca.cjs` — regenera logo/ícones (SVG + PNG) da marca Preço Fechado
- `node scripts/semear-demo.cjs` — dados de demonstração no EMULADOR (para telas do site)
- `node scripts/ativar-pro.cjs <email> [meses|--free]` — libera/retira o Pro (precisa de `service-account.json` na raiz, ignorado pelo Git)
- `functions/api/` — servidor no próprio app (Cloudflare Pages Functions): `avisar` (Web Push na hora), `rotina` (de hora em hora, via `.github/workflows/rotina.yml`) e `mercadopago` (webhook que libera o Pro)
- `servidor/` — código usado pelas funções: `firestore.js` (REST com conta de serviço; aceita o emulador), `webpush.js` (VAPID + aes128gcm só com WebCrypto) e `avisos.js`; teste de ponta a ponta: `npm run test:avisos`
- Projeto Firebase: `orca-ja-aaf65` (Firestore em `southamerica-east1`). Chaves públicas do site em `site/.env.local` (modelo em `site/.env.example`).
