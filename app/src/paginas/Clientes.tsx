import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import BarraAbas from "@/componentes/BarraAbas";
import CabecalhoAba from "@/componentes/CabecalhoAba";
import Busca from "@/componentes/Busca";
import Avatar from "@/componentes/Avatar";
import { IconeCheck, IconeMais1, IconeSeta, IconeWhatsapp } from "@/componentes/Icones";
import { useAuth } from "@/hooks/useAuth";
import { useClientes, useTodosOrcamentos } from "@/hooks/useDados";
import { estatisticasDoCliente, sincronizarClientes } from "@/lib/clientes";
import { combina } from "@/lib/texto";
import { formatarReais, formatarWhatsapp } from "@shared/src/mensagens";

type FiltroCliente = "todos" | "aprovados" | "sem-aprovacao" | "recusados";
const ROTULO: Record<FiltroCliente, string> = { todos: "Todos", aprovados: "Com aprovação", "sem-aprovacao": "Sem aprovação", recusados: "Recusaram" };

/** Clientes: banco automático com busca, filtros, seleção múltipla e envio de mensagem. */
export default function Clientes() {
  const { usuario } = useAuth();
  const uid = usuario?.uid;
  const navegar = useNavigate();
  const { clientes, carregando, erro } = useClientes(uid);
  const { orcamentos, carregando: carregandoOrc } = useTodosOrcamentos(uid);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroCliente>("todos");
  const [selecionando, setSelecionando] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const sincronizou = useRef(false);

  // Primeira vez: cria no banco os clientes que só existem em orçamentos antigos.
  useEffect(() => {
    if (!uid || carregando || carregandoOrc || sincronizou.current) return;
    sincronizou.current = true;
    sincronizarClientes(uid, orcamentos, clientes).catch(console.error);
  }, [uid, carregando, carregandoOrc, orcamentos, clientes]);

  const lista = useMemo(() => {
    return clientes
      .map((c) => ({ c, e: estatisticasDoCliente(c, orcamentos) }))
      .filter(({ c, e }) => {
        if (filtro === "aprovados" && e.aprovados === 0) return false;
        if (filtro === "sem-aprovacao" && e.aprovados > 0) return false;
        if (filtro === "recusados" && e.recusados === 0) return false;
        return combina(busca, c.nome, c.whatsapp, c.email);
      });
  }, [clientes, orcamentos, filtro, busca]);

  function alternar(id: string) {
    setSelecionados((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function selecionarTodos() {
    setSelecionados(new Set(lista.map(({ c }) => c.id)));
  }
  function irParaMensagem() {
    navegar(`/clientes/mensagem?ids=${[...selecionados].join(",")}`);
  }

  return (
    <main className={`${selecionando && selecionados.size > 0 ? "pb-abas-acao" : "pb-abas"} mx-auto w-full max-w-[560px] px-4`}>
      <CabecalhoAba
        titulo="Clientes"
        subtitulo={clientes.length ? `${clientes.length} ${clientes.length === 1 ? "cliente" : "clientes"}` : undefined}
        acao={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setSelecionando((v) => !v);
                setSelecionados(new Set());
              }}
              className={`chip !min-h-11 ${selecionando ? "chip-ativo" : ""}`}
            >
              {selecionando ? "Cancelar" : "Selecionar"}
            </button>
            <Link to="/clientes/novo" className="botao-primario !w-auto !min-h-11 px-3 text-sm" aria-label="Novo cliente">
              <IconeMais1 tamanho={18} />
            </Link>
          </div>
        }
      />

      <div className="mt-4" data-tour="clientes-busca">
        <Busca valor={busca} aoMudar={setBusca} placeholder="Buscar por nome ou telefone" rotulo="Buscar clientes" />
      </div>
      <nav aria-label="Filtrar clientes" className="-mx-4 mt-3 overflow-x-auto px-4">
        <div className="flex gap-2 pb-1" role="tablist">
          {(Object.keys(ROTULO) as FiltroCliente[]).map((f) => (
            <button key={f} type="button" role="tab" aria-selected={filtro === f} onClick={() => setFiltro(f)} className={`chip shrink-0 ${filtro === f ? "chip-ativo" : "hover:border-carbono"}`}>
              {ROTULO[f]}
            </button>
          ))}
        </div>
      </nav>

      {selecionando && lista.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-grafite">{selecionados.size} selecionado(s)</span>
          <button type="button" onClick={selecionarTodos} className="font-medium text-carbono">
            Selecionar todos ({lista.length})
          </button>
        </div>
      )}

      {erro && (
        <p role="alert" className="mt-3 rounded-xl bg-[#FDECEF] px-3 py-2 text-sm text-recusado">
          {erro}
        </p>
      )}

      {!carregando && lista.length === 0 && (
        <section className="cartao mt-3 p-8 text-center">
          <p className="font-semibold">{busca || filtro !== "todos" ? "Nenhum cliente aqui." : "Seus clientes aparecem aqui sozinhos."}</p>
          <p className="mt-1 text-sm text-grafite">Todo cliente que recebe um orçamento entra nesta lista, aprovando ou não.</p>
        </section>
      )}

      {lista.length > 0 && (
        <ul className="cartao mt-3 divide-y divide-pauta overflow-hidden">
          {lista.map(({ c, e }) => {
            const marcado = selecionados.has(c.id);
            const conteudo = (
              <>
                {selecionando ? (
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${marcado ? "border-carbono bg-carbono text-white" : "border-pauta"}`} aria-hidden="true">
                    {marcado && <IconeCheck tamanho={14} strokeWidth={3} />}
                  </span>
                ) : (
                  <Avatar nome={c.nome} tamanho={40} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.nome}</p>
                  <p className="text-xs text-grafite">
                    {formatarWhatsapp(c.whatsapp)}
                    {e.orcamentos > 0 && ` · ${e.orcamentos} ${e.orcamentos === 1 ? "orçamento" : "orçamentos"}`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {e.aprovados > 0 ? (
                    <>
                      <p className="tabular text-sm font-semibold text-pago">{formatarReais(e.valorAprovado)}</p>
                      <p className="text-[11px] text-grafite">{e.aprovados} aprovado(s)</p>
                    </>
                  ) : e.recusados > 0 ? (
                    <p className="text-xs font-medium text-recusado">Recusou</p>
                  ) : e.orcamentos > 0 ? (
                    <p className="text-xs font-medium text-carbono">Aguardando</p>
                  ) : (
                    <p className="text-xs text-grafite">Sem orçamento</p>
                  )}
                </div>
                {!selecionando && <IconeSeta tamanho={18} className="shrink-0 text-grafite" />}
              </>
            );
            return (
              <li key={c.id}>
                {selecionando ? (
                  <button type="button" onClick={() => alternar(c.id)} aria-pressed={marcado} className="lista-item w-full text-left">
                    {conteudo}
                  </button>
                ) : (
                  <Link to={`/clientes/${c.id}`} className="lista-item">
                    {conteudo}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {carregando && <p className="mt-3 text-center text-sm text-grafite">Carregando…</p>}

      {selecionando && selecionados.size > 0 && (
        <div className="barra-acao-abas fixed inset-x-0 z-30 border-t border-pauta bg-folha p-4">
          <div className="mx-auto max-w-[560px]">
            <button type="button" onClick={irParaMensagem} className="botao-primario">
              <IconeWhatsapp /> Enviar mensagem para {selecionados.size}
            </button>
          </div>
        </div>
      )}

      <BarraAbas />
    </main>
  );
}
