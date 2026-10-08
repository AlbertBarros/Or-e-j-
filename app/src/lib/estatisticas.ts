/** Números para o painel: por mês (últimos 6) e totais. */
import type { Orcamento } from "@/tipos";
import { paraDate, mesDe } from "./datas";
import { estaAtrasado } from "./orcamentos";

export interface MesEstatistica {
  chave: string; // "AAAA-MM"
  rotulo: string; // "out"
  enviados: number;
  aprovados: number;
  recusados: number;
  valorAprovado: number;
  valorRecebido: number;
}

export interface Totais {
  total: number;
  rascunhos: number;
  enviados: number; // aguardando resposta
  aprovados: number; // inclui pagos
  recusados: number;
  pagos: number;
  atrasados: number;
  taxaAprovacao: number; // 0..1 sobre os respondidos
  valorAprovado: number;
  valorRecebido: number;
  ticketMedio: number;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function ultimosMeses(n: number, hoje: Date = new Date()): MesEstatistica[] {
  const lista: MesEstatistica[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    lista.push({ chave: mesDe(d), rotulo: MESES[d.getMonth()] ?? "", enviados: 0, aprovados: 0, recusados: 0, valorAprovado: 0, valorRecebido: 0 });
  }
  return lista;
}

export function porMes(orcamentos: Orcamento[], n = 6, hoje: Date = new Date()): MesEstatistica[] {
  const meses = ultimosMeses(n, hoje);
  const mapa = new Map(meses.map((m) => [m.chave, m]));
  for (const o of orcamentos) {
    const enviado = paraDate(o.enviadoEm) ?? (o.status !== "rascunho" ? paraDate(o.criadoEm) : null);
    if (enviado) {
      const m = mapa.get(mesDe(enviado));
      if (m) m.enviados++;
    }
    const respondido = paraDate(o.respondidoEm) ?? enviado;
    if (respondido) {
      const m = mapa.get(mesDe(respondido));
      if (m) {
        if (o.status === "aprovado" || o.status === "pago") {
          m.aprovados++;
          m.valorAprovado += o.total;
        } else if (o.status === "recusado") m.recusados++;
      }
    }
    const pago = paraDate(o.pagoEm);
    if (pago && o.status === "pago") {
      const m = mapa.get(mesDe(pago));
      if (m) m.valorRecebido += o.total;
    }
  }
  return meses;
}

export function totais(orcamentos: Orcamento[]): Totais {
  const t: Totais = { total: orcamentos.length, rascunhos: 0, enviados: 0, aprovados: 0, recusados: 0, pagos: 0, atrasados: 0, taxaAprovacao: 0, valorAprovado: 0, valorRecebido: 0, ticketMedio: 0 };
  for (const o of orcamentos) {
    if (o.status === "rascunho") t.rascunhos++;
    else if (o.status === "enviado") t.enviados++;
    else if (o.status === "recusado") t.recusados++;
    if (o.status === "aprovado" || o.status === "pago") {
      t.aprovados++;
      t.valorAprovado += o.total;
    }
    if (o.status === "pago") {
      t.pagos++;
      t.valorRecebido += o.total;
    }
    if (estaAtrasado(o)) t.atrasados++;
  }
  const respondidos = t.aprovados + t.recusados;
  t.taxaAprovacao = respondidos ? t.aprovados / respondidos : 0;
  t.ticketMedio = t.aprovados ? t.valorAprovado / t.aprovados : 0;
  return t;
}
