# Orça Já — Arquitetura

## Visão geral

```
                 Google (busca)
                       │
          ┌────────────▼────────────┐
          │  site/ (Astro estático) │  Cloudflare Pages — orcaja.com.br
          │  /modelo-de-orcamento/  │  gerador grátis sem login
          │     {profissao}         │──► leads (lista de espera) / cadastro
          └────────────┬────────────┘
                       │ "Salvar e enviar"
          ┌────────────▼────────────┐
          │  app/ (React SPA)       │  Cloudflare Pages — app.orcaja.com.br
          │  painel, orçamentos,    │
          │  /o/:id (público)       │
          └────────────┬────────────┘
                       │ Firebase JS SDK
          ┌────────────▼────────────┐
          │ Firebase: Auth,         │
          │ Firestore (sem Storage) │
          └─────────────────────────┘
```

Os domínios são sugestão. Verifique a disponibilidade de `orcaja.com.br` (ou alternativa) antes de imprimir em qualquer lugar.

## Monorepo (npm workspaces)

```
package.json            { "workspaces": ["app", "site", "shared"] }
shared/package.json     nome "@orcaja/shared", exporta src/*
app/                    Vite + React + TS + Tailwind
site/                   Astro + Tailwind
```

Scripts na raiz: `dev:app`, `dev:site`, `test` (Vitest em shared e app), `typecheck`, `build`.

## Rotas do app

| Rota | Acesso | Tela |
|---|---|---|
| `/entrar` | público | T1 |
| `/comecar` | logado sem perfil | T2 onboarding |
| `/` | logado | T3 painel |
| `/orcamentos/novo` | logado | T4 |
| `/orcamentos/:id` | logado (dono) | T5 |
| `/orcamentos/:id/editar` | logado (dono) | T4 |
| `/orcamentos/:id/cobrar` | logado (dono) | T7 |
| `/conta` | logado | T8 |
| `/o/:id` | **público** | T6 |

A rota `/o/:id` deve ser um chunk separado (lazy) e leve: sem carregar Auth nem o painel.
Cloudflare Pages: arquivo `app/public/_redirects` com `/* /index.html 200`.

## Tipos de domínio (`app/src/tipos.ts`)

```ts
import type { Timestamp } from "firebase/firestore";

export type Plano = "free" | "pro";
export type StatusOrcamento = "rascunho" | "enviado" | "aprovado" | "recusado" | "pago";

export interface Usuario {
  nomeNegocio: string;
  nomeResponsavel: string;    // nome da pessoa
  nomePix: string;            // nome do recebedor no BR Code
  profissao: string;          // slug de profissoes.json ou "outra"
  whatsapp: string;           // só dígitos com 55
  cidade: string;
  chavePix: string;           // normalizada
  tipoChavePix: "cpf" | "cnpj" | "telefone" | "email" | "aleatoria";
  temLogo: boolean;           // a imagem fica em logos/{uid}
  plano: Plano;               // alterado só pelo servidor
  planoAte?: Timestamp;
  proximoNumero: number;      // começa em 1
  uso: { mes: string; enviados: number }; // mes = "AAAA-MM"
  criadoEm: Timestamp;
}

/** logos/{uid}: logo comprimida no navegador (WebP/JPEG, até 100 KB), leitura pública */
export interface Logo {
  dataUrl: string;
  atualizadoEm: Timestamp;
}

export interface ItemOrcamento {
  descricao: string;
  qtd: number;
  unidade: string;
  valorUnit: number;
}

export interface Orcamento {
  id: string;
  ownerId: string;
  numero: number;
  cliente: { nome: string; whatsapp: string };
  itens: ItemOrcamento[];
  desconto: number;
  total: number;
  validadeAte: Timestamp;
  vencimentoPagamento?: Timestamp;
  observacoes: string;
  status: StatusOrcamento;
  negocio: {                  // snapshot gravado ao ENVIAR
    nome: string; nomePix: string;
    whatsapp: string; chavePix: string; cidade: string;
    mostrarMarca: boolean;    // true no plano free
    mostrarLogo: boolean;     // true no Pro com logo (imagem vem de logos/{ownerId})
    mostrarPix: boolean;      // true no Pro (Pix na página de aprovação é exclusivo do Pro)
  };
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
  enviadoEm?: Timestamp;
  respondidoEm?: Timestamp;   // aprovação ou recusa do cliente
  pagoEm?: Timestamp;
}
```

## Operações críticas

**Criar orçamento (numeração sequencial).** Use `runTransaction`: ler `users/{uid}.proximoNumero`, criar o orçamento com esse número e incrementar o contador. O ID do documento vem de `doc(collection(db, "orcamentos"))` (20 caracteres aleatórios), que é suficiente para link não adivinhável.

**Enviar.**
1. Checar o limite: se `plano == "free"` e `uso.mes == mesAtual` e `uso.enviados >= LIMITE`, mostrar a tela de upgrade.
2. Na transação: gravar o snapshot `negocio`, `status = "enviado"`, `enviadoEm` e incrementar `uso` (zerar se o mês mudou).
3. Abrir `linkWhatsapp(cliente.whatsapp, mensagemEnvioOrcamento(...))` com `window.open` (no celular, abre o app).

O limite é verificado no front no MVP. A verificação no servidor (Cloud Function) entra quando houver abuso real.

**Aprovar (página pública).** `updateDoc(ref, { status: "aprovado", respondidoEm: serverTimestamp() })`. As regras garantem o restante.

**Atrasado.** É calculado no front: `status == "aprovado" && vencimentoPagamento < hoje`. Use `diasEmAtraso` de `shared`.

**Pix.** `gerarPixCopiaECola({ chave: negocio.chavePix, nomeRecebedor: negocio.nomePix, cidade: negocio.cidade, valor: total, txid: "ORC" + numero })`. QR Code com a lib `qrcode` (gera data URL no navegador).

## Logo sem Storage (decisão de 6 out 2026)

O Firebase passou a exigir o plano Blaze (cartão) para ativar o Storage. Para o MVP, a logo é redimensionada
(máx. 512 px) e comprimida no navegador até **100 KB** (`app/src/lib/logo.ts`) e gravada como data URL em
`logos/{uid}`, coleção de leitura pública e escrita só do dono (regras limitam a 140.000 caracteres e a
`data:image/*`). `users/{uid}.temLogo` evita uma leitura extra no painel. A página pública lê `logos/{ownerId}`
quando `negocio.mostrarLogo` for true. Se um dia o volume justificar, migra-se para Storage/R2 sem mudar o modelo.

## PDF

`@react-pdf/renderer` com dois documentos: `OrcamentoPDF` e `ReciboPDF`. Use lazy import, porque a lib é pesada e só deve carregar ao clicar em "Baixar PDF". O valor por extenso no recibo usa uma função própria em `shared/src/extenso.ts` (escrever com testes, cobrindo de R$ 0,01 a R$ 999.999,99).

## Regras e índices

Os arquivos ficam em `firebase/`. Exemplo de `firebase.json` na raiz:

```json
{
  "firestore": { "rules": "firebase/firestore.rules", "indexes": "firebase/firestore.indexes.json" },
  "storage": { "rules": "firebase/storage.rules" },
  "emulators": { "auth": { "port": 9099 }, "firestore": { "port": 8080 }, "storage": { "port": 9199 }, "ui": { "enabled": true } }
}
```

O app deve se conectar aos emuladores quando `import.meta.env.DEV` e `VITE_USAR_EMULADOR=true`.

Teste das regras em `firebase/regras.test.ts` com `@firebase/rules-unit-testing`. Casos obrigatórios:
- Anônimo lê um orçamento por ID, mas não lista.
- Anônimo aprova um orçamento "enviado", mas não altera o `total` nem aprova um "rascunho".
- Usuário A não lê nem edita orçamentos do B.
- Usuário não altera o próprio `plano`.
- Logo: dono grava, qualquer um lê, outro usuário não grava, data URL grande demais ou que não é imagem é rejeitada.

Rodar com `npm run test:regras` (sobe o emulador do Firestore, que precisa de Java instalado).

## Ativação do plano Pro (MVP)

O Pro é ativado por link de pagamento recorrente (Asaas, Mercado Pago ou Stripe). No começo, a ativação é **manual**: um script `scripts/ativar-pro.ts` com Admin SDK, rodado localmente, define `plano: "pro"` e `planoAte`. Depois dos primeiros 20 assinantes, isso vira um webhook numa Cloud Function.

## Deploy

- **App**: Cloudflare Pages, build `npm run build --workspace app`, saída `app/dist`, variáveis `VITE_*` no painel.
- **Site**: Cloudflare Pages, build `npm run build --workspace site`, saída `site/dist`.
- **Firebase**: `firebase deploy --only firestore:rules,firestore:indexes` (Storage não é usado no MVP).
- Adicionar o domínio do app em Firebase Auth → Domínios autorizados.
