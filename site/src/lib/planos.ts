/** Planos e preços do Orça Já. Fonte da verdade para o site (docs/PRD.md espelha estes valores). */
import { formatarReais } from "@shared/src/mensagens";

export const LIMITE_FREE = 5;
export const PRECO_MENSAL = 29.9;
export const PRECO_ANUAL_POR_MES = 19.9;
export const PRECO_ANUAL_TOTAL = Math.round(PRECO_ANUAL_POR_MES * 12 * 100) / 100; // 238,80
export const ECONOMIA_ANUAL = Math.round((PRECO_MENSAL * 12 - PRECO_ANUAL_TOTAL) * 100) / 100; // 120,00

export const textoMensal = formatarReais(PRECO_MENSAL);
export const textoAnualPorMes = formatarReais(PRECO_ANUAL_POR_MES);
export const textoAnualTotal = formatarReais(PRECO_ANUAL_TOTAL);
export const textoEconomia = formatarReais(ECONOMIA_ANUAL);

/** Links de checkout da plataforma de pagamento (Mercado Pago, Asaas...). Vazios até existirem. */
export const CHECKOUT_MENSAL = import.meta.env.PUBLIC_CHECKOUT_URL_MENSAL || "";
export const CHECKOUT_ANUAL = import.meta.env.PUBLIC_CHECKOUT_URL_ANUAL || "";

/** Quando o app estiver no ar, os botões passam a levar ao cadastro em vez da lista de espera. */
export const APP_PRONTO = import.meta.env.PUBLIC_APP_PRONTO === "true";
export const URL_CADASTRO = `${import.meta.env.PUBLIC_APP_URL || "https://app.orcaja.com.br"}/entrar`;
