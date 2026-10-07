import { useEffect, useState } from "react";
import { Link } from "react-router";
import Logo from "@/componentes/Logo";
import InstalarApp from "@/componentes/InstalarApp";
import Selo from "@/componentes/Selo";
import { useAuth } from "@/hooks/useAuth";
import { useOrcamentos, useResumo } from "@/hooks/useOrcamentos";
import { sair } from "@/lib/auth";
import { buscarLogo } from "@/lib/usuario";
import { LIMITE_FREE } from "@/lib/firebase";
import { ROTULO_FILTRO, type Filtro } from "@/lib/orcamentos";
import { diasDesde, paraDate, textoHaDias } from "@/lib/datas";
import { formatarReais } from "@shared/src/mensagens";

const FILTROS: Filtro[] = ["todos", "rascunho", "enviado", "aprovado", "atrasado", "pago"];

/** T3 — Painel: totais, filtros, lista paginada e botão fixo "Novo orçamento". */
export default function Painel() {
  const { usuario, perfil } = useAuth();
  const [logo, setLogo] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const uid = usuario?.uid;
  const resumo = useResumo(uid);
  const { orcamentos, carregando, erro, temMais, carregarMais } = useOrcamentos(uid, filtro);

  useEffect(() => {
    if (uid && perfil?.temLogo) buscarLogo(uid).then(setLogo).catch(() => setLogo(null));
  }, [uid, perfil?.temLogo]);

  if (!perfil) return null;
  const enviados = perfil.uso.enviados;
  const vazioGeral = !carregando && orcamentos.length === 0 && filtro === "todos";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 pb-28 pt-4">
      <header className="flex items-center justify-between">
        <Logo tamanho={28} />
        <button type="button" onClick={() => void sair()} className="botao-texto">
          Sair
        </button>
      </header>

      <section className="mt-4 flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-pauta bg-folha">
          {logo ? (
            <img src={logo} alt="" className="h-full w-full object-contain" />
          ) : (
            <span className="text-lg font-bold text-carbono">{perfil.nomeNegocio.trim().charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{perfil.nomeNegocio}</h1>
          <p className="text-sm text-grafite">
            {perfil.plano === "pro" ? "Plano Pro" : `Plano grátis · ${enviados} de ${LIMITE_FREE} orçamentos este mês`}
          </p>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3" aria-label="Resumo">
        <div className="documento p-4">
          <p className="text-sm text-grafite">A receber</p>
          <p className="tabular mt-1 text-2xl font-bold">{formatarReais(resumo.aReceber)}</p>
          {resumo.atrasados > 0 && (
            <p className="mt-1 text-xs font-medium text-atraso">
              {resumo.atrasados} {resumo.atrasados === 1 ? "atrasado" : "atrasados"}
            </p>
          )}
        </div>
        <div className="documento p-4">
          <p className="text-sm text-grafite">Recebido no mês</p>
          <p className="tabular mt-1 text-2xl font-bold text-pago">{formatarReais(resumo.recebidoNoMes)}</p>
        </div>
      </section>

      <div className="mt-4">
        <InstalarApp compacto />
      </div>

      {vazioGeral ? (
        <section className="documento mt-4 flex flex-1 flex-col items-center justify-center p-8 text-center">
          <p className="text-lg font-semibold">Seu primeiro orçamento leva 1 minuto.</p>
          <p className="mt-2 max-w-xs text-grafite">
            Os itens da sua profissão já vêm sugeridos. É só ajustar os valores e salvar.
          </p>
          <Link to="/orcamentos/novo" className="botao-primario mt-5 !w-auto px-6">
            Criar o primeiro orçamento
          </Link>
        </section>
      ) : (
        <>
          <nav aria-label="Filtrar por status" className="-mx-4 mt-4 overflow-x-auto px-4">
            <div className="flex gap-2 pb-1" role="tablist">
              {FILTROS.map((f) => (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={filtro === f}
                  onClick={() => setFiltro(f)}
                  className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium ${
                    filtro === f ? "border-carbono bg-carbono text-white" : "border-pauta bg-folha text-grafite hover:border-carbono"
                  }`}
                >
                  {ROTULO_FILTRO[f]}
                </button>
              ))}
            </div>
          </nav>

          {erro && (
            <p role="alert" className="mt-3 rounded-[10px] bg-[#FDECEF] px-3 py-2 text-sm text-recusado">
              {erro}
            </p>
          )}

          {!carregando && orcamentos.length === 0 && (
            <p className="documento mt-3 p-6 text-center text-grafite">
              {filtro === "atrasado" ? "Nenhum orçamento atrasado. Bom sinal." : `Nenhum orçamento em "${ROTULO_FILTRO[filtro]}".`}
            </p>
          )}

          <ul className="documento mt-3 divide-y divide-pauta">
            {orcamentos.map((o) => {
              const criado = paraDate(o.criadoEm);
              return (
                <li key={o.id}>
                  <Link to={`/orcamentos/${o.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-fundo">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="tabular text-sm font-semibold text-carbono">Nº {String(o.numero).padStart(4, "0")}</span>
                        <Selo orcamento={o} />
                      </div>
                      <p className="truncate font-medium">{o.cliente.nome}</p>
                      <p className="text-xs text-grafite">{criado ? textoHaDias(diasDesde(criado)) : ""}</p>
                    </div>
                    <span className="tabular shrink-0 font-semibold">{formatarReais(o.total)}</span>
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-grafite">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </Link>
                </li>
              );
            })}
          </ul>

          {carregando && <p className="mt-3 text-center text-sm text-grafite">Carregando…</p>}
          {temMais && !carregando && (
            <button type="button" onClick={carregarMais} className="botao-secundario mt-3">
              Carregar mais
            </button>
          )}
        </>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-pauta bg-folha p-4">
        <div className="mx-auto max-w-[560px]">
          <Link to="/orcamentos/novo" className="botao-primario">
            Novo orçamento
          </Link>
        </div>
      </div>
    </main>
  );
}
