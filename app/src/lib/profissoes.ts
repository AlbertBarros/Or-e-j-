/** Acesso aos dados de profissões (itens sugeridos, observações e validade padrão). */
import dados from "@shared/data/profissoes.json";

export interface ItemSugerido {
  descricao: string;
  unidade: string;
  precoSugerido: number;
}

interface Profissao {
  slug: string;
  nome: string;
  itens: ItemSugerido[];
  observacoesPadrao: string;
  validadeDiasPadrao: number;
}

const lista = (dados as { profissoes: Profissao[] }).profissoes;

export function profissaoPorSlug(slug: string): Profissao | undefined {
  return lista.find((p) => p.slug === slug);
}

export function nomeProfissao(slug: string): string {
  return profissaoPorSlug(slug)?.nome ?? "Outra";
}

export function itensSugeridos(slug: string): ItemSugerido[] {
  return profissaoPorSlug(slug)?.itens ?? [];
}

export function observacoesPadrao(slug: string): string {
  return profissaoPorSlug(slug)?.observacoesPadrao ?? "";
}

export function validadeDiasPadrao(slug: string): number {
  return profissaoPorSlug(slug)?.validadeDiasPadrao ?? 15;
}
