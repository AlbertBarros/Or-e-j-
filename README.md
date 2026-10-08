# Preço Fechado — kit de partida para o Claude Code

Este pacote tem tudo o que o Claude Code precisa para construir o MVP: a especificação do produto, a arquitetura, o design, o roadmap em fases, regras de segurança do Firebase e o código mais delicado (Pix) já escrito e testado.

## O que tem aqui

| Arquivo | Para quê |
|---|---|
| `CLAUDE.md` | Instruções permanentes, que o Claude Code lê sozinho ao abrir a pasta |
| `docs/PRD.md` | O produto: telas, fluxos, critérios de aceite, planos |
| `docs/ARQUITETURA.md` | Rotas, tipos, operações críticas, deploy |
| `docs/DESIGN.md` | Cores, tipografia, componentes, textos da interface |
| `docs/SEO.md` | Site de páginas "modelo de orçamento para X" |
| `docs/ROADMAP.md` | 6 fases (0 a 5) com checklist e "pronto quando" |
| `docs/LANCAMENTO.md` | Guia de lançamento e operação: tudo o que o dono do projeto precisa fazer |
| `docs/PROMPTS.md` | Prompts prontos para colar em cada etapa |
| `shared/src/pix.ts` | Gerador de Pix copia-e-cola (validado com o exemplo oficial do Banco Central) |
| `shared/src/mensagens.ts` | Cálculos, links do WhatsApp e mensagens de cobrança |
| `shared/data/profissoes.json` | 10 profissões com itens, preços de referência, SEO e FAQ |
| `firebase/*.rules` | Regras de segurança do Firestore e Storage |
| `.claude/commands/` | Atalhos `/fase` e `/revisar` dentro do Claude Code |

## Passo a passo (Windows + PowerShell)

### 1. Pré-requisitos (uma vez)

```powershell
node --version            # precisa ser 20 ou mais
npm install -g firebase-tools
npm install -g @anthropic-ai/claude-code
firebase login
```

Se você já usa o Claude Code pelo app desktop, pode abrir a pasta por lá em vez do terminal.

### 2. Criar o projeto no Firebase

1. No Console do Firebase, crie o projeto `orca-ja`.
2. Ative o **Authentication** com os provedores Google e E-mail (link sem senha).
3. Crie o **Firestore** em modo produção, região `southamerica-east1` (São Paulo).
4. Ative o **Storage**.
5. Em Configurações do projeto → Seus apps, adicione um app Web e copie as chaves. Você vai colar em `app/.env.local` na Fase 1 (modelo em `.env.example`).

### 3. Colocar o kit no GitHub

```powershell
cd C:\projetos            # ou a pasta onde você guarda seus projetos
# extraia o zip aqui, gerando a pasta orca-ja
cd orca-ja
git init
git add .
git commit -m "chore: kit inicial do Preço Fechado"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/orca-ja.git
git push -u origin main
```

### 4. Abrir no Claude Code e começar

```powershell
cd C:\projetos\orca-ja
claude
```

Dentro do Claude Code, cole o **Prompt 1** de `docs/PROMPTS.md`. Depois disso, cada fase começa com:

```
/fase 0
```

e, ao final de cada fase:

```
/revisar
```

### 5. Ritmo recomendado

Uma fase por sessão. Sempre leia o plano que o Claude Code propõe antes de dizer "pode seguir". Teste o "Pronto quando" no seu celular de verdade. Faça `git push` ao fim de cada fase. Se o contexto da conversa ficar longo, use `/clear` e recomece com `/fase N`. O `CLAUDE.md` e o ROADMAP marcado guardam o progresso.

## Antes de lançar, decisões que são suas

- Nome e domínio: verificar se `orcaja.com.br` está disponível no Registro.br.
- Preço do Pro: definido em R$ 29,90/mês ou R$ 19,90/mês no anual (6 out 2026). Gateway sugerido: Mercado Pago (link de assinatura).
- Revisar os preços de referência em `profissoes.json` para a sua região.
- Termos de uso e política de privacidade (LGPD).
