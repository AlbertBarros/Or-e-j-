import type { MetodoPagamento, PagamentoOrcamento } from "@/tipos";

export const METODOS: { valor: MetodoPagamento; rotulo: string }[] = [
  { valor: "pix", rotulo: "Pix" },
  { valor: "dinheiro", rotulo: "Dinheiro" },
  { valor: "debito", rotulo: "Débito" },
  { valor: "credito", rotulo: "Crédito" },
  { valor: "transferencia", rotulo: "Transferência" },
  { valor: "outro", rotulo: "Outro" },
];

export function rotuloMetodo(m: MetodoPagamento): string {
  return METODOS.find((x) => x.valor === m)?.rotulo ?? m;
}

/** "Pix, dinheiro ou cartão de crédito" */
export function descreverPagamento(p?: PagamentoOrcamento): string {
  if (!p) return "";
  if (p.aCombinar) return "A combinar";
  const nomes = p.metodos.map(rotuloMetodo);
  if (nomes.length === 0) return "";
  if (nomes.length === 1) return nomes[0]!;
  return `${nomes.slice(0, -1).join(", ")} ou ${nomes[nomes.length - 1]}`;
}

export const MODELOS_DOCUMENTO: { modelo: 1 | 2 | 3; nome: string; descricao: string }[] = [
  { modelo: 1, nome: "Simples", descricao: "Só o essencial: itens, total e validade. Direto ao ponto." },
  { modelo: 2, nome: "Detalhado", descricao: "Quantidades, valores unitários, condições e observações." },
  { modelo: 3, nome: "Completo", descricao: "Faixa colorida, logo em destaque, formas de pagamento, frete e dados completos." },
];
