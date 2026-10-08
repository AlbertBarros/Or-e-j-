import type { Orcamento } from "@/tipos";
import { estaAtrasado } from "@/lib/orcamentos";
import { diasEmAtraso } from "@shared/src/mensagens";
import { paraDate } from "@/lib/datas";

/** Selo de status: texto e cor juntos, nunca só cor (DESIGN.md). */
export default function Selo({ orcamento }: { orcamento: Orcamento }) {
  let rotulo: string;
  let classes: string;
  if (estaAtrasado(orcamento)) {
    const venc = paraDate(orcamento.vencimentoPagamento) ?? new Date();
    const dias = diasEmAtraso(venc);
    rotulo = `Atrasado há ${dias} ${dias === 1 ? "dia" : "dias"}`;
    classes = "bg-[#FDF3E7] text-atraso";
  } else {
    switch (orcamento.status) {
      case "rascunho":
        rotulo = "Rascunho";
        classes = "bg-pauta text-grafite";
        break;
      case "enviado":
        rotulo = "Enviado";
        classes = "bg-carbono-claro text-carbono";
        break;
      case "aprovado":
        rotulo = "Aprovado";
        classes = "bg-[#E6F4EA] text-pago";
        break;
      case "pago":
        rotulo = orcamento.avulso ? "Recibo avulso" : "Pago";
        classes = "bg-pago text-white";
        break;
      case "recusado":
        rotulo = "Recusado";
        classes = "bg-[#FDECEF] text-recusado";
        break;
    }
  }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${classes}`}>{rotulo}</span>;
}
