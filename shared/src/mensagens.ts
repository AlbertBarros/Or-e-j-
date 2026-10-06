/**
 * Orça Já — cálculos de orçamento, formatação e mensagens de WhatsApp.
 * Funções puras: usadas no app, na página pública e no site de SEO.
 */

export interface Item {
  descricao: string;
  qtd: number;
  valorUnit: number; // em reais
}

export type TomCobranca = "gentil" | "firme" | "final";

/** Arredonda para centavos evitando erros de ponto flutuante. */
const centavos = (v: number) => Math.round(v * 100) / 100;

export function subtotal(itens: Item[]): number {
  return centavos(itens.reduce((soma, i) => soma + i.qtd * i.valorUnit, 0));
}

export function total(itens: Item[], desconto = 0): number {
  return Math.max(0, centavos(subtotal(itens) - desconto));
}

export function formatarReais(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarData(data: Date): string {
  return data.toLocaleDateString("pt-BR");
}

/** Converte WhatsApp digitado em formato wa.me (somente dígitos, com 55). */
export function normalizarWhatsapp(numero: string): string {
  const d = numero.replace(/\D/g, "");
  return d.startsWith("55") && d.length >= 12 ? d : `55${d}`;
}

export function linkWhatsapp(numero: string, texto: string): string {
  return `https://wa.me/${normalizarWhatsapp(numero)}?text=${encodeURIComponent(texto)}`;
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

export function mensagemEnvioOrcamento(p: {
  cliente: string;
  negocio: string;
  numero: number;
  total: number;
  link: string;
}): string {
  return (
    `Olá, ${primeiroNome(p.cliente)}! Aqui é da ${p.negocio}.\n\n` +
    `Segue o orçamento nº ${p.numero}, no valor de ${formatarReais(p.total)}:\n${p.link}\n\n` +
    `Você pode ver os detalhes e aprovar por esse link. Qualquer dúvida, é só chamar!`
  );
}

export function mensagemCobranca(
  tom: TomCobranca,
  p: { cliente: string; negocio: string; numero: number; total: number; vencimento: Date; link: string }
): string {
  const nome = primeiroNome(p.cliente);
  const valor = formatarReais(p.total);
  const venc = formatarData(p.vencimento);
  switch (tom) {
    case "gentil":
      return (
        `Oi, ${nome}, tudo bem? Passando só para lembrar do pagamento do serviço (orçamento nº ${p.numero}), ` +
        `no valor de ${valor}, com vencimento em ${venc}.\n\nO Pix está aqui: ${p.link}\n\nObrigado!`
      );
    case "firme":
      return (
        `Olá, ${nome}. O pagamento de ${valor} referente ao orçamento nº ${p.numero} venceu em ${venc} ` +
        `e ainda não identifiquei o recebimento.\n\nPode fazer pelo Pix neste link: ${p.link}\n\n` +
        `Se já pagou, me envie o comprovante, por favor.`
      );
    case "final":
      return (
        `${nome}, este é um último lembrete sobre o valor de ${valor} (orçamento nº ${p.numero}), vencido em ${venc}.\n\n` +
        `Preciso que o pagamento seja feito até amanhã pelo link: ${p.link}\n\n` +
        `Caso tenha alguma dificuldade, me avise para combinarmos uma solução.`
      );
  }
}

/** Dias em atraso (0 se não venceu). */
export function diasEmAtraso(vencimento: Date, hoje = new Date()): number {
  const ms = hoje.setHours(0, 0, 0, 0) - new Date(vencimento).setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor(ms / 86_400_000));
}
