/**
 * Orça Já — valor em reais por extenso, para o recibo.
 * Cobre de R$ 0,01 a R$ 999.999,99 (e um pouco além, até 999 milhões).
 * Ex.: 1250.5 → "mil duzentos e cinquenta reais e cinquenta centavos"
 */

const UNIDADES = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const DEZ_A_DEZENOVE = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

/** 1..999 por extenso. */
function ateNovecentos(n: number): string {
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];
  if (c > 0) partes.push(CENTENAS[c] ?? "");
  if (resto >= 10 && resto < 20) {
    partes.push(DEZ_A_DEZENOVE[resto - 10] ?? "");
  } else {
    const d = Math.floor(resto / 10);
    const u = resto % 10;
    if (d > 0) partes.push(DEZENAS[d] ?? "");
    if (u > 0) partes.push(UNIDADES[u] ?? "");
  }
  return partes.filter(Boolean).join(" e ");
}

/** Inteiro de 0 a 999.999.999 por extenso. */
export function numeroPorExtenso(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "";
  n = Math.floor(n);
  if (n === 0) return "zero";
  const milhoes = Math.floor(n / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1000);
  const centenas = n % 1000;
  // Cada grupo guarda o texto e o valor, para decidir o "e" de ligação.
  const grupos: { texto: string; valor: number }[] = [];
  if (milhoes > 0) grupos.push({ texto: milhoes === 1 ? "um milhão" : `${ateNovecentos(milhoes)} milhões`, valor: milhoes });
  if (milhares > 0) grupos.push({ texto: milhares === 1 ? "mil" : `${ateNovecentos(milhares)} mil`, valor: milhares });
  if (centenas > 0) grupos.push({ texto: ateNovecentos(centenas), valor: centenas });
  // Regra do português: "e" antes de um grupo "redondo" (menor que 100 ou múltiplo de 100): "mil e cem",
  // "dois milhões e quinhentos mil", "mil e um"; sem "e" nos demais: "mil duzentos e cinquenta".
  let texto = grupos[0]?.texto ?? "";
  for (let i = 1; i < grupos.length; i++) {
    const g = grupos[i]!;
    const redondo = g.valor < 100 || g.valor % 100 === 0;
    texto += (redondo ? " e " : " ") + g.texto;
  }
  return texto;
}

/** Valor em reais por extenso. */
export function valorPorExtenso(valor: number): string {
  if (!Number.isFinite(valor) || valor < 0) return "";
  const centavosTotais = Math.round(valor * 100);
  const reais = Math.floor(centavosTotais / 100);
  const centavos = centavosTotais % 100;
  const partes: string[] = [];
  if (reais > 0) {
    const r = numeroPorExtenso(reais);
    const palavra = reais === 1 ? "real" : "reais";
    // "um milhão de reais" / "dois milhões de reais" quando termina em milhão redondo
    const terminaEmMilhao = reais % 1_000_000 === 0;
    partes.push(`${r}${terminaEmMilhao ? " de" : ""} ${palavra}`);
  }
  if (centavos > 0) {
    partes.push(`${numeroPorExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`);
  }
  if (partes.length === 0) return "zero reais";
  return partes.join(" e ");
}
