import { useMemo, useState } from "react";
import { Link } from "react-router";
import BarraAbas from "@/componentes/BarraAbas";
import CabecalhoAba from "@/componentes/CabecalhoAba";
import Busca from "@/componentes/Busca";
import { IconeContratos, IconeSeta } from "@/componentes/Icones";
import { useAuth } from "@/hooks/useAuth";
import { useContratos, useTodosOrcamentos } from "@/hooks/useDados";
import { ROTULO_STATUS_CONTRATO } from "@/lib/contratos";
import { paraDate } from "@/lib/datas";
import { combina, primeiroNome } from "@/lib/texto";
import type { StatusContrato } from "@/tipos";
import { formatarData, formatarReais, formatarWhatsapp } from "@shared/src/mensagens";

type Aba = "assinados" | "pendentes" | "todos";
const COR: Record<StatusContrato, string> = {
  rascunho: "bg-pauta text-grafite",
  enviado: "bg-[#FDF3E7] text-atraso",
  assinado: "bg-[#E6F4EA] text-pago",
  cancelado: "bg-[#FDECEF] text-recusado",
};

/** Contratos: assinados e pendentes, com busca por nome e telefone; sugestões para aprovados sem contrato. */
export default function Contratos() {
  const { usuario } = useAuth();
  const uid = usuario?.uid;
  const { contratos, carregando, erro } = useContratos(uid);
  const { orcamentos } = useTodosOrcamentos(uid);
  const [aba, setAba] = useState<Aba>("todos");
  const [busca, setBusca] = useState("");

  const lista = useMemo(
    () =>
      contratos.filter((c) => {
        if (aba === "assinados" && c.status !== "assinado") return false;
        if (aba === "pendentes" && !(c.status === "enviado" || c.status === "rascunho")) return false;
        return combina(busca, c.contratante.nome, c.contratante.whatsapp, String(c.numero));
      }),
    [contratos, aba, busca],
  );
  const sugestoes = useMemo(() => {
    const com = new Set(contratos.filter((c) => c.status !== "cancelado").map((c) => c.orcamentoId));
    return orcamentos.filter((o) => o.status === "aprovado" && !com.has(o.id)).slice(0, 3);
  }, [orcamentos, contratos]);
  const assinados = contratos.filter((c) => c.status === "assinado").length;

  return (
    <main className="pb-abas mx-auto w-full max-w-[560px] px-4">
      <CabecalhoAba titulo="Contratos" subtitulo={contratos.length ? `${assinados} assinado(s) · ${contratos.length - assinados} em andamento` : undefined} />

      <div className="mt-4">
        <Busca valor={busca} aoMudar={setBusca} placeholder="Buscar por cliente, telefone ou número" rotulo="Buscar contratos" />
      </div>
      <div className="mt-3 flex gap-2" role="tablist">
        {(["todos", "assinados", "pendentes"] as Aba[]).map((a) => (
          <button key={a} type="button" role="tab" aria-selected={aba === a} onClick={() => setAba(a)} className={`chip ${aba === a ? "chip-ativo" : "hover:border-carbono"}`}>
            {a === "todos" ? "Todos" : a === "assinados" ? "Assinados" : "Pendentes"}
          </button>
        ))}
      </div>

      {sugestoes.length > 0 && !busca && aba !== "assinados" && (
        <section className="mt-4" aria-labelledby="sug">
          <h2 id="sug" className="titulo-secao">Sugestão: aprovados sem contrato</h2>
          <ul className="mt-2 space-y-2">
            {sugestoes.map((o) => (
              <li key={o.id}>
                <Link to={`/contratos/novo?orcamento=${o.id}`} className="cartao lista-item !rounded-2xl border-dashed">
                  <span className="botao-icone !bg-[#E6F4EA] !text-pago"><IconeContratos tamanho={20} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">Gerar contrato para {primeiroNome(o.cliente.nome)}</span>
                    <span className="block text-sm text-grafite">Orçamento nº {String(o.numero).padStart(4, "0")} · {formatarReais(o.total)}</span>
                  </span>
                  <IconeSeta tamanho={18} className="text-grafite" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {erro && (
        <p role="alert" className="mt-3 rounded-xl bg-[#FDECEF] px-3 py-2 text-sm text-recusado">
          {erro}
        </p>
      )}

      {!carregando && lista.length === 0 && (
        <section className="cartao mt-4 p-8 text-center">
          <p className="font-semibold">{busca ? "Nada encontrado." : "Nenhum contrato ainda."}</p>
          <p className="mt-1 text-sm text-grafite">Quando um orçamento é aprovado, o app sugere gerar o contrato aqui e no Início.</p>
        </section>
      )}

      {lista.length > 0 && (
        <ul className="cartao mt-4 divide-y divide-pauta overflow-hidden">
          {lista.map((c) => {
            const data = paraDate(c.assinatura?.assinadoEm) ?? paraDate(c.enviadoEm) ?? paraDate(c.criadoEm);
            return (
              <li key={c.id}>
                <Link to={`/contratos/${c.id}`} className="lista-item">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="tabular text-xs font-semibold text-carbono">Nº {String(c.numero).padStart(4, "0")}</span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${COR[c.status]}`}>{ROTULO_STATUS_CONTRATO[c.status]}</span>
                    </div>
                    <p className="truncate font-medium">{c.contratante.nome}</p>
                    <p className="text-xs text-grafite">
                      {formatarWhatsapp(c.contratante.whatsapp)}
                      {data ? ` · ${c.status === "assinado" ? "assinado em" : ""} ${formatarData(data)}` : ""}
                    </p>
                  </div>
                  <span className="tabular shrink-0 font-semibold">{formatarReais(c.valor)}</span>
                  <IconeSeta tamanho={18} className="shrink-0 text-grafite" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {carregando && <p className="mt-3 text-center text-sm text-grafite">Carregando…</p>}

      <BarraAbas />
    </main>
  );
}
