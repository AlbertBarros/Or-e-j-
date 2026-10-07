/** Leva o orçamento do gerador do site para o cadastro do app, codificado na URL (base64url). */
import { URL_APP } from "./planos";

export interface RascunhoParaApp {
  profissao: string;
  negocio?: string;
  cliente?: string;
  itens: { descricao: string; qtd: number; unidade: string; valorUnit: number }[];
  desconto?: number;
  observacoes?: string;
}

function textoParaBase64url(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function linkCadastroComRascunho(rascunho: RascunhoParaApp): string {
  const limpo: RascunhoParaApp = {
    profissao: rascunho.profissao,
    ...(rascunho.negocio ? { negocio: rascunho.negocio.slice(0, 60) } : {}),
    ...(rascunho.cliente ? { cliente: rascunho.cliente.slice(0, 60) } : {}),
    itens: rascunho.itens.slice(0, 30),
    ...(rascunho.desconto ? { desconto: rascunho.desconto } : {}),
    ...(rascunho.observacoes ? { observacoes: rascunho.observacoes.slice(0, 500) } : {}),
  };
  return `${URL_APP}/entrar?rascunho=${textoParaBase64url(JSON.stringify(limpo))}`;
}
