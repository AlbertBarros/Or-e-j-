/**
 * Datas: conversões entre Timestamp, Date e campos <input type="date">, sempre no fuso do aparelho.
 * Não importa a classe Timestamp de propósito: a página pública usa o Firestore "lite" e este arquivo
 * precisa funcionar nos dois mundos (duck typing em toDate()).
 */
interface ComToDate {
  toDate: () => Date;
}

export function paraDate(valor?: ComToDate | Date | null): Date | null {
  if (!valor) return null;
  return valor instanceof Date ? valor : typeof valor.toDate === "function" ? valor.toDate() : null;
}

export function inicioDoDia(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function somarDias(d: Date, dias: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + dias);
  return x;
}

/** Dias inteiros entre a data e hoje (0 se for hoje ou no futuro). */
export function diasDesde(data: Date, hoje: Date = new Date()): number {
  const ms = inicioDoDia(hoje).getTime() - inicioDoDia(data).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export function textoHaDias(dias: number): string {
  if (dias === 0) return "hoje";
  if (dias === 1) return "há 1 dia";
  return `há ${dias} dias`;
}

/** Date → "AAAA-MM-DD" (valor de <input type="date">), no fuso local. */
export function dataParaInput(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** "AAAA-MM-DD" → Date à meia-noite local; null se vazio ou inválido. */
export function inputParaData(texto: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "AAAA-MM" do mês de uma data, para comparar com uso.mes e com pagoEm. */
export function mesDe(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
