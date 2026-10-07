/** Planos e preços do Orça Já. Fonte da verdade para o site (docs/PRD.md espelha estes valores). */
import { formatarReais } from "@shared/src/mensagens";

export const LIMITE_FREE = 3;
export const PRECO_MENSAL = 29.9;
export const PRECO_ANUAL_POR_MES = 19.9;
export const PRECO_ANUAL_TOTAL = Math.round(PRECO_ANUAL_POR_MES * 12 * 100) / 100; // 238,80
export const ECONOMIA_ANUAL = Math.round((PRECO_MENSAL * 12 - PRECO_ANUAL_TOTAL) * 100) / 100; // 120,00

export const textoMensal = formatarReais(PRECO_MENSAL);
export const textoAnualPorMes = formatarReais(PRECO_ANUAL_POR_MES);
export const textoAnualTotal = formatarReais(PRECO_ANUAL_TOTAL);
export const textoEconomia = formatarReais(ECONOMIA_ANUAL);

/** Links de assinatura do Mercado Pago (cartão de crédito). A variável de ambiente, se existir, tem prioridade. */
export const CHECKOUT_MENSAL = import.meta.env.PUBLIC_CHECKOUT_URL_MENSAL || ""; // aguardando o link do plano mensal
export const CHECKOUT_ANUAL = import.meta.env.PUBLIC_CHECKOUT_URL_ANUAL || "https://mpago.la/1qdLoPa"; // Orça Já Pro anual (12 meses)

/** O app está publicado desde 6 out 2026; PUBLIC_APP_PRONTO=false volta os botões para a lista de espera. */
export const APP_PRONTO = import.meta.env.PUBLIC_APP_PRONTO !== "false";

/** Endereço do app. Ignora o valor-placeholder antigo (app.orcaja.com.br) que ficou nas variáveis do Cloudflare. */
function urlApp(): string {
  const env = import.meta.env.PUBLIC_APP_URL;
  if (!env || env.includes("app.orcaja.com.br")) return "https://orca-ja-app.pages.dev";
  return env.endsWith("/") ? env.slice(0, -1) : env;
}
export const URL_APP = urlApp();
export const URL_CADASTRO = `${URL_APP}/entrar`;
