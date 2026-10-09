import { useMemo, useState } from "react";
import Busca from "@/componentes/Busca";
import { IconeEmail, IconeSeta, IconeWhatsapp } from "@/componentes/Icones";
import { baixarTexto, dataBr, planilhaContas, ROTULO_SITUACAO, type ContaAdmin, type DadosAdmin, type Situacao } from "@/lib/admin";
import { nomeProfissao } from "@/lib/profissoes";
import { combina } from "@/lib/texto";
import { formatarReais, formatarWhatsapp, linkWhatsapp } from "@shared/src/mensagens";

type Filtro = "todas" | "ativas" | "inativas" | "cancelaram" | Situacao;

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: "todas", rotulo: "Todas" },
  { id: "ativas", rotulo: "Ativas" },
  { id: "teste", rotulo: "Em teste" },
  { id: "pro", rotulo: "Pro" },
  { id: "gratis", rotulo: "Grátis" },
  { id: "teste_acabou", rotulo: "Teste acabou" },
  { id: "pro_vencido", rotulo: "Pro vencido" },
  { id: "cancelaram", rotulo: "Cancelaram" },
  { id: "inativas", rotulo: "Inativas" },
];

export const COR_SITUACAO: Record<Situacao, string> = {
  pro: "bg-[#E6F4EA] text-pago",
  teste: "bg-carbono-claro text-carbono",
  gratis: "bg-pauta text-grafite",
  teste_acabou: "bg-[#FDF3E7] text-atraso",
  pro_vencido: "bg-[#FDECEF] text-recusado",
};

type Ordem = "novas" | "atividade" | "orcamentos" | "valor";

function filtrar(c: ContaAdmin, f: Filtro): boolean {
  if (f === "todas") return true;
  if (f === "ativas") return c.ativo;
  if (f === "inativas") return !c.ativo;
  if (f === "cancelaram") return c.cancelou;
  return c.situacao === f;
}

/** Lista de todas as contas (profissionais), com filtros, busca, contato e planilha. */
export default function AdminClientes({ dados }: { dados: DadosAdmin }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [ordem, setOrdem] = useState<Ordem>("novas");
  const [limite, setLimite] = useState(40);

  const lista = useMemo(() => {
    const l = dados.contas.filter((c) => filtrar(c, filtro) && combina(busca, c.negocio, c.responsavel, c.email, c.whatsapp, c.cidade, nomeProfissao(c.profissao)));
    const t = (d: Date | null) => d?.getTime() ?? 0;
    l.sort((a, b) =>
      ordem === "novas" ? t(b.criadoEm) - t(a.criadoEm) : ordem === "atividade" ? t(b.ultimaAtividade) - t(a.ultimaAtividade) : ordem === "orcamentos" ? b.orcamentos - a.orcamentos : b.valorAprovado - a.valorAprovado,
    );
    return l;
  }, [dados.contas, busca, filtro, ordem]);

  const contagem = (f: Filtro) => dados.contas.filter((c) => filtrar(c, f)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Clientes da plataforma</h2>
          <p className="text-sm text-grafite">{dados.contas.length} contas de profissionais. Toque numa conta para ver tudo.</p>
        </div>
        <button type="button" onClick={() => baixarTexto(planilhaContas(lista), `contas-preco-fechado-${new Date().toISOString().slice(0, 10)}.csv`)} className="botao-secundario !min-h-10 !w-auto px-4 text-sm">
          Baixar planilha ({lista.length})
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Busca valor={busca} aoMudar={setBusca} placeholder="Buscar por nome, e-mail, WhatsApp, cidade ou profissão" rotulo="Buscar contas" />
        <label className="flex items-center gap-2 text-sm">
          <span className="text-grafite">Ordenar</span>
          <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} className="campo !min-h-11 !w-auto">
            <option value="novas">Mais novas</option>
            <option value="atividade">Última atividade</option>
            <option value="orcamentos">Mais orçamentos</option>
            <option value="valor">Maior valor aprovado</option>
          </select>
        </label>
      </div>

      <nav aria-label="Filtrar contas" className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2 pb-1" role="tablist">
          {FILTROS.map((f) => (
            <button key={f.id} type="button" role="tab" aria-selected={filtro === f.id} onClick={() => setFiltro(f.id)} className={`chip shrink-0 ${filtro === f.id ? "chip-ativo" : "hover:border-carbono"}`}>
              {f.rotulo} <span className="tabular ml-1 opacity-70">{contagem(f.id)}</span>
            </button>
          ))}
        </div>
      </nav>

      {lista.length === 0 ? (
        <p className="cartao p-8 text-center text-grafite">Nenhuma conta com esse filtro.</p>
      ) : (
        <ul className="space-y-2">
          {lista.slice(0, limite).map((c) => (
            <li key={c.uid}>
              <details className="cartao guia-topico group overflow-hidden">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-3 sm:p-4">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold">{c.negocio}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${COR_SITUACAO[c.situacao]}`}>{ROTULO_SITUACAO[c.situacao]}</span>
                      {c.cancelou && <span className="rounded-full bg-[#FDECEF] px-2 py-0.5 text-[11px] font-semibold text-recusado">Cancelou</span>}
                      {!c.ativo && <span className="rounded-full bg-pauta px-2 py-0.5 text-[11px] font-semibold text-grafite">Inativa</span>}
                    </span>
                    <span className="block truncate text-sm text-grafite">
                      {c.responsavel || "—"} · {nomeProfissao(c.profissao)}
                      {c.cidade ? ` · ${c.cidade}` : ""} · desde {dataBr(c.criadoEm) || "—"}
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-right text-sm sm:block">
                    <span className="tabular block font-semibold">{c.orcamentos} orç.</span>
                    <span className="tabular block text-xs text-grafite">{formatarReais(c.valorAprovado)} aprov.</span>
                  </span>
                  <IconeSeta tamanho={18} className="shrink-0 text-grafite transition-transform group-open:rotate-90" />
                </summary>
                <div className="border-t border-pauta px-4 pb-4 pt-3">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                    <Dado rotulo="E-mail" valor={c.email || "—"} />
                    <Dado rotulo="WhatsApp" valor={c.whatsapp ? formatarWhatsapp(c.whatsapp) : "—"} />
                    <Dado rotulo="Pro até" valor={dataBr(c.planoAte) || "—"} />
                    <Dado rotulo="Fim do teste" valor={dataBr(c.testeProAte) || "—"} />
                    <Dado rotulo="Última atividade" valor={dataBr(c.ultimaAtividade) || "—"} />
                    <Dado rotulo="Orçamentos" valor={`${c.orcamentos} (${c.enviados} enviados, ${c.aprovados} aprovados)`} />
                    <Dado rotulo="Valor aprovado" valor={formatarReais(c.valorAprovado)} />
                    <Dado rotulo="Contratos" valor={`${c.contratos} (${c.assinados} assinados)`} />
                    <Dado rotulo="Avisos no celular" valor={c.avisosLigados ? "Ligados" : "Desligados"} />
                    <Dado rotulo="Tour guiado" valor={c.tourConcluido ? "Concluído" : "Não fez"} />
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {c.whatsapp && (
                      <a href={linkWhatsapp(c.whatsapp, `Olá, ${c.responsavel.split(" ")[0] || "tudo bem"}! Aqui é do Preço Fechado.`)} target="_blank" rel="noopener" className="botao-primario !min-h-10 !w-auto px-4 text-sm">
                        <IconeWhatsapp /> WhatsApp
                      </a>
                    )}
                    {c.email && (
                      <a href={`mailto:${c.email}?subject=${encodeURIComponent("Preço Fechado")}`} className="botao-secundario !min-h-10 !w-auto px-4 text-sm">
                        <IconeEmail tamanho={18} /> E-mail
                      </a>
                    )}
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
      {lista.length > limite && (
        <button type="button" onClick={() => setLimite((n) => n + 40)} className="botao-secundario">
          Mostrar mais ({lista.length - limite})
        </button>
      )}
    </div>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-grafite">{rotulo}</dt>
      <dd className="truncate font-medium" title={valor}>
        {valor}
      </dd>
    </div>
  );
}
