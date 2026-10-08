/**
 * Orça Já — texto do contrato simples de prestação de serviço.
 * Gera as cláusulas já preenchidas a partir do orçamento aprovado. É uma SUGESTÃO de modelo:
 * o profissional pode editar antes de enviar e deve revisar com um advogado para o seu caso.
 */
import { formatarReais, formatarData, formatarWhatsapp, type Item } from "./mensagens";
import { valorPorExtenso } from "./extenso";

export interface DadosContrato {
  numero: number;
  orcamentoNumero: number;
  contratante: { nome: string; whatsapp: string; documento?: string; endereco?: string };
  contratado: { nome: string; responsavel: string; whatsapp: string; documento?: string; endereco?: string; cidade: string };
  objeto: Item[];
  valor: number;
  formaPagamento: string;
  prazoExecucao: string;
  garantiaDias: number;
  data: Date;
}

function pessoa(p: { nome: string; whatsapp: string; documento?: string; endereco?: string }, papel: string): string {
  const partes = [p.nome];
  if (p.documento) partes.push(`inscrito(a) no CPF/CNPJ sob o nº ${p.documento}`);
  if (p.endereco) partes.push(`com endereço em ${p.endereco}`);
  partes.push(`WhatsApp ${formatarWhatsapp(p.whatsapp)}`);
  return `${papel}: ${partes.join(", ")}.`;
}

export function textoGarantiaContrato(dias: number): string {
  if (dias <= 0) return "Não há garantia sobre os serviços além da prevista em lei.";
  const periodo = dias % 365 === 0 ? `${dias / 365} ${dias === 365 ? "ano" : "anos"}` : `${dias} dias`;
  return `O CONTRATADO garante os serviços executados pelo prazo de ${periodo}, contados da conclusão, contra defeitos de execução. A garantia não cobre mau uso, intervenção de terceiros, desgaste natural nem materiais fornecidos pelo CONTRATANTE.`;
}

export function gerarTextoContrato(d: DadosContrato): string {
  const itens = d.objeto.map((i) => `- ${i.descricao} (${i.qtd} ${i.unidade} × ${formatarReais(i.valorUnit)})`).join("\n");
  const prestador = d.contratado;
  return [
    `CONTRATO DE PRESTAÇÃO DE SERVIÇOS Nº ${String(d.numero).padStart(4, "0")}`,
    ``,
    pessoa(d.contratante, "CONTRATANTE"),
    pessoa(
      { nome: `${prestador.nome}, representado(a) por ${prestador.responsavel}`, whatsapp: prestador.whatsapp, documento: prestador.documento, endereco: prestador.endereco },
      "CONTRATADO",
    ),
    ``,
    `As partes acima celebram este contrato, que se regerá pelas cláusulas a seguir.`,
    ``,
    `CLÁUSULA 1 — DO OBJETO`,
    `O CONTRATADO prestará ao CONTRATANTE os serviços descritos no orçamento nº ${String(d.orcamentoNumero).padStart(4, "0")}, aprovado pelo CONTRATANTE, a saber:`,
    itens,
    ``,
    `CLÁUSULA 2 — DO VALOR E DO PAGAMENTO`,
    `Pelos serviços, o CONTRATANTE pagará ao CONTRATADO o valor total de ${formatarReais(d.valor)} (${valorPorExtenso(d.valor)}). Forma de pagamento: ${d.formaPagamento}. O atraso no pagamento sujeita o CONTRATANTE a juros de 1% ao mês e correção monetária, sem prejuízo da suspensão dos serviços.`,
    ``,
    `CLÁUSULA 3 — DO PRAZO`,
    `Os serviços serão executados no prazo de ${d.prazoExecucao}, contado da assinatura deste contrato e da liberação do acesso ao local, podendo ser prorrogado por motivo justificado, comunicado ao CONTRATANTE.`,
    ``,
    `CLÁUSULA 4 — DAS OBRIGAÇÕES DO CONTRATADO`,
    `a) Executar os serviços com qualidade, técnica adequada e dentro do prazo combinado;`,
    `b) Utilizar materiais conforme especificado no orçamento, salvo acordo diferente por escrito;`,
    `c) Informar o CONTRATANTE, sem demora, sobre imprevistos que afetem prazo ou custo;`,
    `d) Manter o local organizado e remover resíduos gerados pelo serviço;`,
    `e) Responder pela garantia prevista na Cláusula 7.`,
    ``,
    `CLÁUSULA 5 — DAS OBRIGAÇÕES DO CONTRATANTE`,
    `a) Efetuar o pagamento na forma e no prazo combinados;`,
    `b) Garantir o acesso ao local e as condições necessárias à execução (energia, água, espaço, segurança);`,
    `c) Fornecer os materiais que estejam por sua conta, quando indicado no orçamento, em tempo hábil;`,
    `d) Aprovar por escrito (inclusive por WhatsApp) qualquer alteração de escopo antes da execução;`,
    `e) Comunicar eventuais defeitos dentro do prazo de garantia.`,
    ``,
    `CLÁUSULA 6 — DAS ALTERAÇÕES E SERVIÇOS EXTRAS`,
    `Serviços não previstos no orçamento aprovado serão objeto de orçamento complementar e só serão executados após aprovação do CONTRATANTE.`,
    ``,
    `CLÁUSULA 7 — DA GARANTIA`,
    textoGarantiaContrato(d.garantiaDias),
    ``,
    `CLÁUSULA 8 — DA RESCISÃO`,
    `Qualquer das partes pode rescindir este contrato mediante aviso com 5 (cinco) dias de antecedência. Em caso de rescisão, o CONTRATANTE pagará pelos serviços já executados e pelos materiais já adquiridos para a obra, mediante comprovação.`,
    ``,
    `CLÁUSULA 9 — DAS DISPOSIÇÕES GERAIS E DO FORO`,
    `Este contrato é firmado em caráter irrevogável e obriga as partes e seus sucessores. As partes elegem o foro da comarca de ${prestador.cidade} para dirimir quaisquer dúvidas.`,
    ``,
    `CLÁUSULA 10 — DO ACEITE ELETRÔNICO`,
    `As partes reconhecem a validade da assinatura eletrônica simples aposta pelo CONTRATANTE neste documento, por meio de link enviado ao seu WhatsApp, com registro de nome, data, hora e dispositivo, nos termos do art. 10, § 2º, da MP 2.200-2/2001, como prova da sua concordância com todas as cláusulas.`,
    ``,
    `${prestador.cidade}, ${formatarData(d.data)}.`,
  ].join("\n");
}

/** Mensagem de WhatsApp para enviar o link do contrato. */
export function mensagemEnvioContrato(p: { cliente: string; negocio: string; numero: number; link: string }): string {
  const primeiro = p.cliente.trim().split(/\s+/)[0] ?? p.cliente;
  return (
    `Olá, ${primeiro}! Aqui é da ${p.negocio}.\n\n` +
    `Como combinado, segue o contrato nº ${p.numero} do serviço aprovado, para você conferir e assinar pelo celular:\n${p.link}\n\n` +
    `É rapidinho: leia, desenhe sua assinatura e toque em "Assinar". Qualquer dúvida, é só chamar!`
  );
}
