# Preço Fechado — Site de SEO (`site/`)

## Objetivo

Capturar quem pesquisa "modelo de orçamento para {profissão}", "modelo de recibo" e "mensagem de cobrança", entregando uma **ferramenta funcionando na própria página** (não só um PDF para baixar), e converter para cadastro.

## Famílias de páginas (geradas a partir de `shared/data/profissoes.json`)

| Família | URL | Exemplo de busca alvo |
|---|---|---|
| Orçamento por profissão | `/modelo-de-orcamento/{slug}` | modelo de orçamento para eletricista |
| Recibo por profissão | `/modelo-de-recibo/{slug}` | recibo de prestação de serviço diarista |
| Cobrança | `/mensagem-de-cobranca` | mensagem de cobrança educada whatsapp |
| Hub | `/modelo-de-orcamento` | modelo de orçamento simples |
| Home | `/` | (marca) |

Fase 0 = 10 páginas de orçamento + hub + home. As de recibo e cobrança vêm depois.

## Anatomia da página de profissão

1. **H1**: `seo.h1` (ex.: "Modelo de orçamento para eletricista"). Abaixo, uma linha: "Preencha, baixe em PDF ou envie pelo WhatsApp. Grátis, sem cadastro."
2. **Gerador** (ilha React no Astro, `client:visible`): já vem com os itens da profissão e é editável. Os botões são **Baixar PDF** (grátis, com a marca "Feito com Preço Fechado") e **Salvar e enviar pelo WhatsApp**, que leva ao cadastro no app com o orçamento preenchido via `localStorage` ou parâmetro.
3. **Como preencher** (3 a 4 parágrafos únicos por profissão): o que incluir, como cobrar (por m², por peça, visita técnica). Texto de verdade, escrito por profissão, nunca só com a variável trocada.
4. **Prévia do documento** (imagem leve ou HTML estático), para o Google ver conteúdo.
5. **FAQ** a partir de `faq` com schema `FAQPage`.
6. **CTA final** e links internos para 3 profissões relacionadas.

## Técnico

- Astro com `getStaticPaths` lendo `profissoes.json`. Saída 100% estática.
- `<title>` e `<meta name="description">` vindos de `seo`. Canonical absoluto.
- Schema JSON-LD: `FAQPage` + `SoftwareApplication` (oferta grátis) + `BreadcrumbList`.
- `sitemap.xml` (`@astrojs/sitemap`) e `robots.txt`.
- Core Web Vitals: a ilha do gerador só hidrata ao entrar na tela, fontes com `display=swap` e nenhuma imagem acima da dobra sem dimensões.
- Google Search Console configurado no dia do primeiro deploy, com o sitemap enviado.
- Lista de espera (enquanto o app não existe): formulário com e-mail, WhatsApp e profissão gravando em `leads` no Firestore.

## Regra de qualidade

Cada página precisa ser útil mesmo para quem nunca vai se cadastrar. Página fina ou duplicada prejudica o site inteiro. Por isso, escreva o bloco "Como preencher" de cada profissão com cuidado e revise os preços de referência.

## Expansão (depois do MVP)

Mais profissões (manicure, personal trainer, costureira, dedetizador, vidraceiro, serralheiro, gesseiro, chaveiro, técnico de informática, designer, social media...), recibos, "como calcular orçamento de {serviço}" e calculadoras (m² de pintura, BTUs de ar-condicionado), que trazem tráfego e levam ao gerador.
