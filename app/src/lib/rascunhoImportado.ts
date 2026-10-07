/**
 * Integração site → app: o gerador do site manda o orçamento preenchido em ?rascunho= (JSON em base64url).
 * Guardamos em sessionStorage até o login/cadastro terminar e a tela Novo orçamento abrir.
 */
export interface RascunhoImportado {
  profissao?: string;
  negocio?: string;
  cliente?: string;
  itens?: { descricao: string; qtd: number; unidade: string; valorUnit: number }[];
  desconto?: number;
  observacoes?: string;
}

const CHAVE = "orcaja:rascunhoImportado";

function base64urlParaTexto(b64: string): string {
  const normal = b64.replace(/-/g, "+").replace(/_/g, "/");
  const comPadding = normal + "=".repeat((4 - (normal.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(comPadding), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Lê ?rascunho= da URL atual, guarda e limpa o parâmetro. */
export function capturarRascunhoDaUrl(): void {
  try {
    const url = new URL(window.location.href);
    const bruto = url.searchParams.get("rascunho");
    if (!bruto) return;
    const dados = JSON.parse(base64urlParaTexto(bruto)) as RascunhoImportado;
    if (dados && typeof dados === "object") {
      sessionStorage.setItem(CHAVE, JSON.stringify(dados));
    }
    url.searchParams.delete("rascunho");
    window.history.replaceState({}, "", url.toString());
  } catch {
    /* parâmetro inválido: ignora */
  }
}

export function lerRascunhoImportado(): RascunhoImportado | null {
  try {
    const bruto = sessionStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as RascunhoImportado) : null;
  } catch {
    return null;
  }
}

export function limparRascunhoImportado(): void {
  try {
    sessionStorage.removeItem(CHAVE);
  } catch {
    /* ignora */
  }
}
