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

**Pronto quando:** um usuário novo entra pelo celular, completa o onboarding em menos de 2 min, o perfil aparece no Firestore com `plano: "free"`, `proximoNumero: 1`, e os testes de regras passam.

---

## Fase 2 — Orçamentos e painel (semana 2–3)

- [ ] `lib/orcamentos.ts`: criar (transação de número), atualizar, excluir, listar paginado, buscar por ID
- [ ] Tela Novo/Editar (T4) com sugestões da profissão, barra de total fixa e autocomplete de clientes
- [ ] Painel (T3) com totais "A receber" e "Recebido no mês", filtros, estado vazio e paginação
- [ ] Detalhe (T5) com o layout de documento e ações por status (por enquanto só rascunho)

**Pronto quando:** um orçamento de 5 itens fica pronto em menos de 60 s no celular, a numeração não repete (testar dois cliques rápidos) e o painel lista e filtra corretamente.

---

## Fase 3 — Enviar, página pública e aprovação (semana 3)

- [ ] Ação **Enviar no WhatsApp**: snapshot `negocio`, status, `uso` e abertura do `wa.me` (ARQUITETURA.md → Enviar)
- [ ] Rota pública `/o/:id` em chunk separado, sem Auth (T6)
- [ ] Aprovar / Recusar, com o carimbo animado do DESIGN.md
- [ ] Estados: expirado, aprovado, recusado, pago e não encontrado
- [ ] Rodapé "Feito com Orça Já" quando `mostrarMarca`
- [ ] Meta tags Open Graph na página pública (título: "Orçamento nº X — {negócio}"), para a prévia do link no WhatsApp ficar boa
- [ ] Ações do detalhe para "enviado": Reenviar, Copiar link, Editar

**Pronto quando:** o fluxo completo funciona em dois celulares diferentes (profissional envia, cliente aprova, painel mostra Aprovado) e um teste confirma que o anônimo não altera o total.

> Atenção: o Open Graph numa SPA não é lido pelo WhatsApp. Se a prévia for importante, a alternativa é uma Cloudflare Pages Function em `/o/:id` que injeta as meta tags. Proponha antes de implementar.

---

## Fase 4 — Dinheiro: Pix, cobrança, pago, recibo (semana 4)

- [ ] Bloco Pix na página pública: QR Code (`qrcode`), botão **Copiar código Pix** e aviso de "Copiado"
- [ ] Testar o código gerado em pelo menos 3 apps de banco (anotar no PR quais)
- [ ] Cálculo de "Atrasado" e selo "Atrasado há X dias"
- [ ] Tela Cobrar (T7) com tom sugerido por dias de atraso
- [ ] **Marcar como pago** (com data editável) e totais do painel atualizados
- [ ] `shared/src/extenso.ts` + testes
- [ ] PDFs: `OrcamentoPDF` e `ReciboPDF` com lazy load, e "Enviar recibo" pelo WhatsApp

**Pronto quando:** um orçamento vai de aprovado a pago com recibo gerado, o Pix é lido corretamente por 3 bancos e o valor por extenso passa nos testes.

---

## Fase 5 — Planos, métricas e lançamento (semana 5)

- [ ] Limite do grátis no momento de enviar, com tela de upgrade (rascunho preservado)
- [ ] Tela Conta/Plano (T8) com uso do mês e link de pagamento externo
- [ ] `scripts/ativar-pro.ts` (Admin SDK, uso local)
- [ ] Logo só no Pro; marca só no grátis
- [ ] Métricas do PRD (decidir entre GA4 e coleção `eventos`)
- [ ] Integrar o site ao app: "Salvar e enviar" leva ao cadastro com o orçamento preenchido
- [ ] Revisão de acessibilidade e de 360px em todas as telas
- [ ] Deploy de produção: domínios, domínios autorizados no Auth, regras e índices
- [ ] Página de termos de uso e privacidade (LGPD: quais dados guardamos e por quê)

**Pronto quando:** um usuário real, de fora, consegue se cadastrar pelo Google, enviar, receber aprovação, cobrar e assinar o Pro sem ajuda.
