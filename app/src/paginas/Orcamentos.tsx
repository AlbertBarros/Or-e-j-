import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import BarraAbas from "@/componentes/BarraAbas";
import CabecalhoAba from "@/componentes/CabecalhoAba";
import Selo from "@/componentes/Selo";
import Busca from "@/componentes/Busca";
import { IconeMais1, IconeSeta } from "@/componentes/Icones";
import { useAuth } from "@/hooks/useAuth";
import { useOrcamentos } from "@/hooks/useOrcamentos";
import { ROTULO_FILTRO, type Filtro } from "@/lib/orcamentos";
import { diasDesde, paraDate, textoHaDias } from "@/lib/datas";
import { combina } from "@/lib/texto";
import { formatarReais } from "@shared/src/mensagens";

const FILTROS: Filtro[] = ["todos", "rascunho", "enviado", "aprovado", "atrasado", "pago"];

/** Orçamentos: lista com filtros por status, busca e paginação. */
export default function Orcamentos() {
  const { usuario } = useAuth();
  const [params, setParams] = useSearchParams();
  const filtroInicial = (params.get("filtro") as Filtro | null) ?? "todos";
  const [filtro, setFiltro] = useState<Filtro>(FILTROS.includes(filtroInicial) ? filtroInicial : "todos");
  const [busca, setBusca] = useState("");
  const { orcamentos, carregando, erro, temMais, carregarMais } = useOrcamentos(usuario?.uid, filtro);

  useEffect(() => {
    if (filtro === "todos") params.delete("filtro");
    else params.set("filtro", filtro);
    setParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  const visiveis = busca ? orcamentos.filter((o) => combina(busca, o.cliente.nome, o.cliente.whatsapp, String(o.numero))) : orcamentos;

  return (
    <main className="pb-abas mx-auto w-full max-w-[560px] px-4">
      <CabecalhoAba
        titulo="Orçamentos"
        acao={
          <Link to="/orcamentos/novo" className="botao-primario !w-auto !min-h-11 px-4 text-sm">
            <IconeMais1 tamanho={18} /> Novo
          </Link>
        }
      />

      <div className="mt-4">
        <Busca valor={busca} aoMudar={setBusca} placeholder="Buscar por cliente, telefone ou número" rotulo="Buscar orçamentos" />
      </div>

      <nav aria-label="Filtrar por status" className="-mx-4 mt-3 overflow-x-auto px-4" data-tour="orc-filtros">
        <div className="flex gap-2 pb-1" role="tablist">
          {FILTROS.map((f) => (
            <button key={f} type="button" role="tab" aria-selected={filtro === f} onClick={() => setFiltro(f)} className={`chip shrink-0 ${filtro === f ? "chip-ativo" : "hover:border-carbono"}`}>
              {ROTULO_FILTRO[f]}
            </button>
          ))}
        </div>
      </nav>

      {erro && (
        <p role="alert" className="mt-3 rounded-xl bg-[#FDECEF] px-3 py-2 text-sm text-recusado">
          {erro}
        </p>
      )}

      {!carregando && visiveis.length === 0 && (
        <section className="cartao mt-3 p-8 text-center">
          <p className="font-semibold">{busca ? "Nada encontrado." : filtro === "atrasado" ? "Nenhum pagamento atrasado. Bom sinal." : `Nenhum orçamento em "${ROTULO_FILTRO[filtro]}".`}</p>
          {filtro === "todos" && !busca && (
            <Link to="/orcamentos/novo" className="botao-primario mt-4 !w-auto px-6">
              Criar o primeiro orçamento
            </Link>
          )}
        </section>
      )}

      {visiveis.length > 0 && (
        <ul className="cartao mt-3 divide-y divide-pauta overflow-hidden">
          {visiveis.map((o) => {
            const criado = paraDate(o.criadoEm);
            return (
              <li key={o.id}>
                <Link to={`/orcamentos/${o.id}`} className="lista-item">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="tabular text-xs font-semibold text-carbono">Nº {String(o.numero).padStart(4, "0")}</span>
                      <Selo orcamento={o} />
                    </div>
                    <p className="truncate font-medium">{o.cliente.nome}</p>
                    <p className="text-xs text-grafite">{criado ? textoHaDias(diasDesde(criado)) : ""}</p>
                  </div>
                  <span className="tabular shrink-0 font-semibold">{formatarReais(o.total)}</span>
                  <IconeSeta tamanho={18} className="shrink-0 text-grafite" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {carregando && <p className="mt-3 text-center text-sm text-grafite">Carregando…</p>}
      {temMais && !carregando && !busca && (
        <button type="button" onClick={carregarMais} className="botao-secundario mt-3">
          Carregar mais
        </button>
      )}

      <BarraAbas />
    </main>
  );
}
