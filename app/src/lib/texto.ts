/** Utilidades de texto: busca sem acento, iniciais. */
export function normalizar(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Verdadeiro se todos os termos da busca aparecem em algum dos campos (ignora acentos e maiúsculas). */
export function combina(busca: string, ...campos: (string | undefined)[]): boolean {
  const termos = normalizar(busca).split(/\s+/).filter(Boolean);
  if (termos.length === 0) return true;
  const alvo = campos.map((c) => normalizar(c ?? "")).join(" ");
  const digitos = campos.map((c) => (c ?? "").replace(/\D/g, "")).join(" ");
  return termos.every((t) => alvo.includes(t) || (/^\d+$/.test(t) && digitos.includes(t)));
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}
