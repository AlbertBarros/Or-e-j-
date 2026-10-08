# Orça Já — Roadmap do MVP

Uma fase por vez. Marque `[x]` ao concluir cada item. Cada fase só termina quando o "Pronto quando" for verificado.

---

## Fase 0 — Fundação e site de validação (semana 1)

- [x] Inicializar Git, `.gitignore` (node_modules, dist, .env*, .firebase, *.log) e npm workspaces na raiz (`app`, `site`, `shared`)
- [x] `shared/package.json` + `tsconfig` + Vitest; rodar os testes que já existem (`pix.test.ts`, `mensagens.test.ts`) e confirmar que passam
- [x] Criar `site/` com Astro + Tailwind (tokens do DESIGN.md, fonte Archivo)
- [x] Alias `@shared` funcionando no Astro
- [x] Página de profissão via `getStaticPaths` a partir de `profissoes.json`, com a anatomia do SEO.md
- [x] Gerador (ilha React): editar itens, total ao vivo e **Baixar PDF** (com marca)
- [x] Botão "Salvar e enviar pelo WhatsApp" → por enquanto abre o formulário da lista de espera
- [x] Formulário de lista de espera gravando em `leads` (Firestore, regras já prontas)
- [x] Hub `/modelo-de-orcamento` e home simples
- [x] Schema JSON-LD, sitemap, robots, canonical
- [x] Escrever o bloco "Como preencher" das 10 profissões (rascunho do Claude, revisão do Jonathan)
- [x] Deploy no Cloudflare Pages (https://orca-ja-6cz.pages.dev)
- [x] Extra: logo, home de vendas, página /precos (Grátis, Pro mensal R$ 29,90, Pro anual R$ 19,90/mês) e botões "Começar grátis" / "Assinar o Pro" prontos para o app e o checkout (variáveis PUBLIC_APP_PRONTO e PUBLIC_CHECKOUT_URL_*)

**Pronto quando:** as 10 páginas estão no ar, o PDF baixa no celular, o lead é gravado no Firestore, o Lighthouse mobile dá ≥ 90 em Performance e SEO e o sitemap foi enviado ao Search Console.

---

## Fase 1 — App base: login e onboarding (semana 2)

- [x] Criar `app/` (Vite + React + TS strict + Tailwind + React Router), com tokens e fonte do DESIGN.md
- [x] `app/src/lib/firebase.ts` (init + emuladores em dev), `firebase.json` na raiz
- [x] `tipos.ts` conforme ARQUITETURA.md
- [x] Login Google + link mágico por e-mail (T1)
- [x] Guardas de rota: sem login → `/entrar`; sem perfil → `/comecar`
- [x] Onboarding em 3 passos (T2), com detecção e normalização da chave Pix e logo comprimida no navegador (≤ 100 KB) gravada em `logos/{uid}` (sem Storage: exige Blaze)
- [x] Testes das regras do Firestore (`firebase/regras.test.ts`) com os casos da ARQUITETURA.md — 13 testes passando no emulador (`npm run test:regras`)
- [x] Publicar o app no Cloudflare Pages (https://orca-ja-app.pages.dev), autorizar o domínio no Firebase Auth e ligar o site
- [x] Extra: PWA instalável (manifest, ícones, service worker) com botão "Baixar o app" (Android instala; iPhone mostra o passo a passo do Safari)

**Pronto quando:** um usuário novo entra pelo celular, completa o onboarding em menos de 2 min, o perfil aparece no Firestore com `plano: "free"`, `proximoNumero: 1`, e os testes de regras passam.

---

## Fase 2 — Orçamentos e painel (semana 2–3)

- [x] `lib/orcamentos.ts`: criar (transação de número), atualizar, excluir, listar paginado, buscar por ID
- [x] Tela Novo/Editar (T4) com sugestões da profissão, barra de total fixa e autocomplete de clientes
- [x] Painel (T3) com totais "A receber" e "Recebido no mês", filtros, estado vazio e paginação
- [x] Detalhe (T5) com o layout de documento e ações por status (por enquanto só rascunho)
- [x] Extra: modo emulador para testar sem dados reais (`npm run emuladores` + `npm run dev:app:emulador`); fluxo completo testado em 7 out 2026

**Pronto quando:** um orçamento de 5 itens fica pronto em menos de 60 s no celular, a numeração não repete (testar dois cliques rápidos) e o painel lista e filtra corretamente.

---

## Fase 3 — Enviar, página pública e aprovação (semana 3)

- [x] Ação **Enviar no WhatsApp**: snapshot `negocio`, status, `uso` e abertura do `wa.me` (ARQUITETURA.md → Enviar)
- [x] Rota pública `/o/:id` em chunk separado, sem Auth (T6)
- [x] Aprovar / Recusar, com o carimbo animado do DESIGN.md
- [x] Estados: expirado, aprovado, recusado, pago e não encontrado
- [x] Rodapé "Feito com Orça Já" quando `mostrarMarca`
- [x] Meta tags Open Graph na página pública (título: "Orçamento nº X — {negócio}"), para a prévia do link no WhatsApp ficar boa
- [x] Ações do detalhe para "enviado": Reenviar, Copiar link, Editar

**Pronto quando:** o fluxo completo funciona em dois celulares diferentes (profissional envia, cliente aprova, painel mostra Aprovado) e um teste confirma que o anônimo não altera o total.

> Feito em 7 out 2026 com uma Cloudflare Pages Function (`app/functions/o/[id].js`) que lê o orçamento pela REST do Firestore e injeta as meta tags no index.html. Também já existe o bloqueio básico do limite do grátis no envio (tela completa de upgrade fica para a Fase 5).

---

## Fase 4 — Dinheiro: Pix, cobrança, pago, recibo (semana 4)

- [x] Bloco Pix na página pública: QR Code (`qrcode`), botão **Copiar código Pix** e aviso de "Copiado"
- [ ] Testar o código Pix gerado em pelo menos 3 apps de banco (Jonathan, no celular, com um orçamento Pro real)
- [x] Cálculo de "Atrasado" e selo "Atrasado há X dias"
- [x] Tela Cobrar (T7) com tom sugerido por dias de atraso
- [x] **Marcar como pago** (com data editável) e totais do painel atualizados
- [x] `shared/src/extenso.ts` + testes
- [x] Dados do recibo no perfil (CPF/CNPJ, endereço, e-mail), preenchidos na emissão e salvos para a próxima (tela Conta na Fase 5)
- [x] Tela "Emitir recibo" (Pro): a partir de orçamento pago (avulso fica para depois), com garantia (período à escolha), observações e numeração própria
- [x] PDFs: `OrcamentoPDF` e `ReciboPDF` (elegante, com logo) com lazy load
- [x] "Enviar recibo" pelo WhatsApp: Web Share com o PDF anexado; fallback: baixar + wa.me com mensagem pronta

**Pronto quando:** um orçamento vai de aprovado a pago com recibo gerado, o Pix é lido corretamente por 3 bancos e o valor por extenso passa nos testes.

---

## Fase 5 — Planos, métricas e lançamento (semana 5)

- [x] Limite do grátis no momento de enviar, com tela de upgrade (rascunho preservado) — caixa com link para Conta → plano
- [x] Tela Conta/Plano (T8) com uso do mês, links de assinatura (mensal, anual cartão, anual Pix), dados do negócio, Pix, logo e dados do recibo
- [x] `scripts/ativar-pro.cjs` (REST do Firestore com conta de serviço, sem dependências) + `worker-pagamentos/` (webhook do Mercado Pago em Cloudflare Worker, liberação automática; publicação pelo Jonathan, ver README)
- [x] Logo só no Pro; marca só no grátis; Pro vencido (planoAte) tratado como grátis
- [x] Métricas do PRD: coleção `eventos` (só criação, sem dados pessoais); eventos de cadastro, criação, envio, aprovação/recusa, pago, recibo, limite e clique em assinar
- [x] Integrar o site ao app: "Salvar e enviar" leva ao cadastro com o orçamento preenchido (?rascunho= em base64url → sessionStorage → Novo orçamento)
- [ ] Revisão de acessibilidade e de 360px em todas as telas
- [ ] Deploy de produção: domínios, domínios autorizados no Auth, regras e índices
- [x] Página de termos de uso e privacidade (LGPD) no site, com links no app (Entrar e Conta) — revisar com advogado antes do lançamento oficial

**Pronto quando:** um usuário real, de fora, consegue se cadastrar pelo Google, enviar, receber aprovação, cobrar e assinar o Pro sem ajuda.

---

## V2 (7 out 2026) — navegação por abas, clientes, contratos, catálogo e cartão

Pedido do Jonathan após o MVP: sistema mais elegante e interativo, painel com gráficos, cadastro completo no
primeiro acesso (empresa, endereço, contato, logo, produtos e serviços), contrato sugerido ao aprovar com
assinatura simples pelo link, aba de contratos assinados com busca, banco de clientes com mensagem em fila,
cartão de visita virtual (3 modelos) e cards em imagem (3 modelos).

- [x] Barra de abas (Início, Orçamentos, Clientes, Contratos, Mais) e visual novo (`cartao`, `chip`, animações)
- [x] Início: resumo financeiro, gráficos SVG (barras mensais + rosca de aprovação), pendências e atalhos
- [x] Onboarding em 6 passos (endereço, logo e catálogo puláveis) — `Comecar.tsx`
- [x] Catálogo `users/{uid}/catalogo` com sugestões da profissão; "+ Do catálogo" no orçamento
- [x] Clientes `clientes/{uid}_{whats}`: automático a partir dos orçamentos, busca, filtros, ficha, seleção múltipla
- [x] Mensagem em fila (uma conversa por vez; WhatsApp não permite envio em massa por site), com card anexo
- [x] Contratos `contratos/{id}`: texto de 10 cláusulas (`shared/src/contrato.ts`), edição, envio, página pública `/c/:id`
      com assinatura desenhada (assinatura eletrônica simples, MP 2.200-2/2001), PDF com assinatura, aba com busca
- [x] Cartão virtual `cartoes/{uid}` público em `/v/:uid` (3 modelos) e cards PNG gerados no navegador (3 modelos)
- [x] Prévia Open Graph para /c/ e /v/ (Pages Functions)
- [ ] Depois: recibo avulso, cancelamento automático da assinatura Pro, depoimentos reais
