/**
 * Acesso tipado a shared/data/profissoes.json.
 * O site só lê; quem edita os dados é o arquivo JSON.
 */
import dados from "@shared/data/profissoes.json";

export interface ItemSugerido {
  descricao: string;
  unidade: string;
  precoSugerido: number;
}

export interface Faq {
  pergunta: string;
  resposta: string;
}

export interface Profissao {
  slug: string;
  nome: string;
  plural: string;
  seo: { titulo: string; h1: string; descricao: string };
  itens: ItemSugerido[];
  observacoesPadrao: string;
  validadeDiasPadrao: number;
  faq: Faq[];
  comoPreencher?: string[];
}

export const profissoes: Profissao[] = (dados as { profissoes: Profissao[] }).profissoes;

export function porSlug(slug: string): Profissao | undefined {
  return profissoes.find((p) => p.slug === slug);
}

/** As 3 profissões seguintes na lista (circular), para links internos. */
export function relacionadas(slug: string, quantidade = 3): Profissao[] {
  const i = profissoes.findIndex((p) => p.slug === slug);
  const lista: Profissao[] = [];
  for (let k = 1; k <= quantidade && k < profissoes.length; k++) {
    const p = profissoes[(i + k) % profissoes.length];
    if (p) lista.push(p);
  }
  return lista;
}

export function urlProfissao(slug: string): string {
  return `/modelo-de-orcamento/${slug}`;
}
