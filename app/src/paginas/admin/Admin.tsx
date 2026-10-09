import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { carregarDadosAdmin, ehAdmin, type DadosAdmin } from "@/lib/admin";
import { IconeAjuda, IconeClientes, IconeGrafico, IconeOrcamentos, IconeWhatsapp } from "@/componentes/Icones";
import AdminVisao from "./AdminVisao";
import AdminClientes from "./AdminClientes";
import AdminMensagens from "./AdminMensagens";
import AdminRelatorio from "./AdminRelatorio";
import AdminSuporte from "./AdminSuporte";

const ABAS = [
  { id: "visao", rotulo: "Visão geral", Icone: IconeGrafico },
  { id: "clientes", rotulo: "Clientes", Icone: IconeClientes },
  { id: "mensagens", rotulo: "Mensagens", Icone: IconeWhatsapp },
  { id: "relatorio", rotulo: "Relatório", Icone: IconeOrcamentos },
  { id: "suporte", rotulo: "Suporte", Icone: IconeAjuda },
] as const;
type Aba = (typeof ABAS)[number]["id"];

/** Painel administrativo: só aparece (e só carrega dados) para contas em admins/. */
export default function Admin() {
  const { usuario } = useAuth();
  const [params, setParams] = useSearchParams();
  const aba = (ABAS.find((a) => a.id === params.get("aba"))?.id ?? "visao") as Aba;
  const [permitido, setPermitido] = useState<boolean | null>(null);
  const [dados, setDados] = useState<DadosAdmin | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await carregarDadosAdmin());
    } catch (e) {
      console.error(e);
      setErro("Não deu para carregar os dados. Confira a internet e toque em Atualizar.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (!usuario) return;
    ehAdmin(usuario.uid).then((ok) => {
      setPermitido(ok);
      if (ok) void carregar();
    });
  }, [usuario, carregar]);

  if (permitido === null) return <p className="p-10 text-center text-grafite">Verificando acesso…</p>;

  if (!permitido) {
    return (
      <main className="mx-auto w-full max-w-[560px] px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Acesso restrito</h1>
        <p className="mt-2 text-grafite">Esta área é só para a administração do Preço Fechado.</p>
        <Link to="/" className="botao-primario mt-6">
          Voltar ao início
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16">
      <header className="sticky top-0 z-30 -mx-4 border-b border-white/60 bg-folha/75 px-4 backdrop-blur-xl">
        <div className="flex min-h-14 items-center gap-2">
          <Link to="/mais" className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] text-carbono hover:bg-carbono-claro" aria-label="Voltar">
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold leading-tight">Painel administrativo</h1>
            <p className="text-xs text-grafite">{dados ? `Atualizado às ${dados.carregadoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Carregando…"}</p>
          </div>
          <button type="button" onClick={() => void carregar()} disabled={carregando} className="botao-secundario !min-h-10 !w-auto px-4 text-sm">
            {carregando ? "Atualizando…" : "Atualizar"}
          </button>
        </div>
        <nav aria-label="Seções do painel" className="-mx-4 overflow-x-auto px-4 pb-2">
          <div className="flex gap-2" role="tablist">
            {ABAS.map(({ id, rotulo, Icone }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={aba === id}
                onClick={() => setParams(id === "visao" ? {} : { aba: id }, { replace: true })}
                className={`chip shrink-0 gap-1.5 ${aba === id ? "chip-ativo" : "hover:border-carbono"}`}
              >
                <Icone tamanho={16} /> {rotulo}
                {id === "suporte" && dados && dados.suporte.filter((s) => !s.respondidaEm).length > 0 && (
                  <span className="ml-1 rounded-full bg-recusado px-1.5 text-[10px] font-bold text-white">{dados.suporte.filter((s) => !s.respondidaEm).length}</span>
                )}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {erro && (
        <p role="alert" className="erro mt-4">
          {erro}
        </p>
      )}
      {!dados ? (
        <p className="py-16 text-center text-grafite">Carregando os dados da plataforma…</p>
      ) : (
        <div className="mt-5">
          {aba === "visao" && <AdminVisao dados={dados} />}
          {aba === "clientes" && <AdminClientes dados={dados} />}
          {aba === "mensagens" && <AdminMensagens dados={dados} />}
          {aba === "relatorio" && <AdminRelatorio dados={dados} />}
          {aba === "suporte" && <AdminSuporte dados={dados} aoMudar={carregar} />}
        </div>
      )}
    </main>
  );
}
