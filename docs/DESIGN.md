# Preço Fechado — Design

## Conceito: o talão em azul-carbono

O mundo do nosso usuário é o **talão de orçamento** de papelaria: folha pautada, número impresso no canto, cópia em carbono azul e carimbo. O app traz esse objeto para o digital sem fazer imitação literal: o orçamento sempre aparece como um **documento** (folha branca, linhas de item, número em destaque), e o resto da interface é quieto e utilitário.

O elemento memorável é **a barra de total**: fixa no rodapé, com o valor grande em algarismos tabulares, que atualiza conforme os itens mudam. Todo o resto fica disciplinado.

## Cores (tokens Tailwind)

| Token | Hex | Uso |
|---|---|---|
| `carbono` | `#1E3A8A` | Cor da marca, ações principais, número do orçamento (o azul da cópia carbono) |
| `carbono-claro` | `#DCE4F7` | Fundos de seleção, foco |
| `tinta` | `#1A1D23` | Texto principal |
| `grafite` | `#5B6270` | Texto secundário, rótulos |
| `pauta` | `#E4E7EC` | Linhas de item, divisores, bordas |
| `folha` | `#FFFFFF` | Fundo do documento; o app usa `#F6F7F9` em volta |
| `pago` | `#15803D` | Status pago, confirmação |
| `atraso` | `#B45309` | Status atrasado (âmbar, sem vermelho alarmista) |
| `recusado` | `#9F1239` | Recusado, erros |

Modo escuro fica fora do MVP. A página pública é sempre clara (é um documento).

## Tipografia

- Família única: **Archivo** (Google Fonts), pesos 400, 500, 600 e 700. Ela tem desenho industrial e honesto e combina com o público de serviços.
- Valores monetários: `font-variant-numeric: tabular-nums` sempre.
- Escala (mobile): 14 / 16 (base) / 20 / 28 / 40 (só o total e o número do orçamento).
- Fallback: `Archivo, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.

## Layout

- Mobile-first, base de 360px. Desktop é a mesma coluna centralizada (máx. 560px) para o app e 720px para o documento.
- Alinhamento à esquerda. Valores alinhados à direita nas linhas de item.
- Área de toque de pelo menos 44px. A ação principal fica no rodapé, ao alcance do polegar.

```
┌────────────────────────────┐
│ ← Orçamento                │
├────────────────────────────┤
│ Cliente  [Maria Silva    ] │
│ WhatsApp [(61) 9....     ] │
│────────────────────────────│
│ Troca de disjuntor         │
│ 2 un × R$ 90,00   R$ 180,00│
│────────────────────────────│
│ + Adicionar item           │
│ + Dos sugeridos            │
├────────────────────────────┤
│ Total          R$ 1.240,00 │  ← barra fixa, valor 28–40px
│ [ Enviar no WhatsApp     ] │
└────────────────────────────┘
```

## Componentes

- **Documento** (orçamento e recibo): folha branca com borda `pauta`, número `Nº 0012` em `carbono` no canto superior direito, linhas de item separadas por fios de 1px e total no pé com fio duplo acima.
- **Selo de status**: texto e cor juntos (nunca só cor). Os rótulos são: Rascunho, Enviado, Aprovado, Atrasado há X dias, Pago, Recusado.
- **Botão primário**: fundo `carbono`, texto branco, raio 10px. Um por tela.
- **Botão WhatsApp**: mesmo estilo do primário, com o ícone do WhatsApp à esquerda. Não usamos o verde do WhatsApp, para não parecer o app dele.
- Cards do painel: lista simples com divisores. Nada de grade de cards com sombra.

## Movimento

O único momento orquestrado é **a aprovação**. Quando o cliente aprova, o "carimbo" APROVADO aparece sobre o documento (escala de 1.2 para 1, levemente girado) e o bloco do Pix desliza. O resto não tem animação de entrada. Respeitar `prefers-reduced-motion`.

## Texto da interface

- Voz ativa e verbos diretos: "Enviar no WhatsApp", "Marcar como pago", "Gerar recibo", "Copiar código Pix".
- A ação mantém o nome do botão até o aviso de confirmação: o botão "Marcar como pago" gera o aviso "Marcado como pago".
- Erros dizem o que houve e o que fazer: "Chave Pix inválida. Confira se digitou o CPF completo, com 11 números."
- Estados vazios convidam à ação: "Nenhum orçamento atrasado. Bom sinal."
- Sem jargão de sistema: "link do orçamento", nunca "URL pública".
- Sem rótulos em CAIXA ALTA, exceto o carimbo APROVADO / PAGO, que é um objeto e não um rótulo.

## Acessibilidade (piso de qualidade)

Contraste AA, foco visível (anel `carbono` de 2px), `aria-live` no total, inputs com `inputmode` correto (`decimal` para valores, `tel` para WhatsApp) e rótulos sempre visíveis (não só placeholder).
