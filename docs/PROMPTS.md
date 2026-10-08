# Prompts prontos para o Claude Code

Cole na ordem. Entre um prompt e outro, leia o que o Claude Code propôs e responda às perguntas dele.

---

## Prompt 1 — Primeira sessão (contexto e conferência)

```
Este repositório é o kit inicial do Preço Fechado. Leia CLAUDE.md e todos os arquivos em docs/.
Depois:
1. Resuma em 5 linhas o que vamos construir e a ordem das fases.
2. Aponte qualquer contradição ou lacuna entre PRD, ARQUITETURA, DESIGN, SEO e ROADMAP.
3. Liste as decisões que você precisa de mim antes da Fase 0.
Não crie nem altere nenhum arquivo ainda.
```

## Prompt 2 — Começar a Fase 0

```
/fase 0
```

Se preferir sem o atalho:

```
Vamos executar a Fase 0 do docs/ROADMAP.md. Primeiro me mostre o plano e as dependências
que vai instalar. Comece configurando os npm workspaces e garantindo que os testes de shared/
(pix.test.ts e mensagens.test.ts) passam antes de criar o site/.
```

## Prompt 3 — Textos únicos por profissão (dentro da Fase 0)

```
Escreva o bloco "Como preencher" (3 a 4 parágrafos, linguagem simples, voltada ao profissional)
para cada uma das 10 profissões de shared/data/profissoes.json. Cada texto deve ser realmente
diferente: fale de como aquela profissão costuma cobrar (m², peça, hora, visita técnica),
o que não esquecer no orçamento e um erro comum. Salve num campo novo "comoPreencher" (array de
parágrafos) em cada profissão. Não altere preços. Me mostre 2 exemplos antes de fazer os 10.
```

## Prompt 4 — Fases seguintes

```
/fase 1
```

(e assim por diante, até `/fase 5`)

## Prompt 5 — Revisão ao fim de cada fase

```
/revisar
```

## Prompts de apoio

**Quando algo quebrar:**
```
Ao fazer [ação] no celular, aconteceu [o que aconteceu]. Esperava [o que esperava].
Investigue a causa antes de mudar código: me diga a hipótese, como confirmar e só então corrija.
Adicione um teste que teria pegado esse erro.
```

**Testar o fluxo inteiro localmente:**
```
Suba os emuladores do Firebase e o app em modo dev, crie um usuário de teste com dados fictícios
e me passe o passo a passo (comandos PowerShell) para eu percorrer: onboarding → novo orçamento
→ enviar → aprovar em aba anônima → marcar como pago → recibo.
```

**Antes do deploy de produção:**
```
Prepare o deploy de produção: liste as variáveis de ambiente do Cloudflare Pages (app e site),
os domínios a autorizar no Firebase Auth, rode os testes de regras e faça o deploy de regras e
índices. Me dê um checklist final para eu conferir manualmente.
```

**Quando quiser adicionar algo fora do plano:**
```
Quero adicionar [ideia]. Isso está em "Fora do MVP" no PRD? Avalie o impacto no prazo e
se pode esperar. Se fizer sentido agora, proponha onde entra no ROADMAP antes de codar.
```
