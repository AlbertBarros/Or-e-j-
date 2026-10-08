/**
 * Orça Fácil — conversão entre números e texto digitado em pt-BR ("1.250,50", "90,5", "150").
 * Usado nos campos de quantidade e valor do site e do app.
 */

export function paraNumero(texto: string): number {
  const t = texto.trim();
  if (!t) return 0;
  let normalizado: string;
  if (t.includes(",")) {
    normalizado = t.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+\.\d{1,2}$/.test(t)) {
    normalizado = t; // "90.5" digitado com ponto como decimal
  } else {
    normalizado = t.replace(/\./g, "");
  }
  const n = Number(normalizado.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Formata número para edição em campo de texto (sem R$): 90 → "90", 90.5 → "90,50". */
export function paraTexto(valor: number): string {
  if (!Number.isFinite(valor)) return "";
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(2).replace(".", ",");
}
