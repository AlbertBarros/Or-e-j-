import { useEffect, useState } from "react";
import Logo from "@/componentes/Logo";
import InstalarApp from "@/componentes/InstalarApp";
import { useAuth } from "@/hooks/useAuth";
import { sair } from "@/lib/auth";
import { buscarLogo } from "@/lib/usuario";
import { LIMITE_FREE } from "@/lib/firebase";
import { formatarReais } from "@shared/src/mensagens";

/** T3 — Painel. Nesta fase só o esqueleto e o estado vazio; a lista de orçamentos entra na Fase 2. */
export default function Painel() {
  const { usuario, perfil } = useAuth();
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    if (usuario && perfil?.temLogo) {
      buscarLogo(usuario.uid).then(setLogo).catch(() => setLogo(null));
    }
  }, [usuario, perfil?.temLogo]);

  if (!perfil) return null;
  const enviados = perfil.uso.enviados;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 pb-28 pt-4">
      <header className="flex items-center justify-between">
        <Logo tamanho={28} />
        <button type="button" onClick={() => void sair()} className="botao-texto">
          Sair
        </button>
      </header>

      <section className="mt-5 flex items-center gap-3">
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

      <section className="mt-5 grid grid-cols-2 gap-3" aria-label="Resumo">
        <div className="documento p-4">
          <p className="text-sm text-grafite">A receber</p>
          <p className="tabular mt-1 text-2xl font-bold">{formatarReais(0)}</p>
        </div>
        <div className="documento p-4">
          <p className="text-sm text-grafite">Recebido no mês</p>
          <p className="tabular mt-1 text-2xl font-bold text-pago">{formatarReais(0)}</p>
        </div>
      </section>

      <div className="mt-5">
        <InstalarApp />
      </div>

      <section className="documento mt-6 flex flex-1 flex-col items-center justify-center p-8 text-center">
        <p className="text-lg font-semibold">Seu primeiro orçamento leva 1 minuto.</p>
        <p className="mt-2 max-w-xs text-grafite">
          Cadastro pronto. A criação de orçamentos chega na próxima etapa do app. Avisamos você assim que abrir.
        </p>
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-pauta bg-folha p-4">
        <div className="mx-auto max-w-[560px]">
          <button type="button" className="botao-primario" disabled aria-describedby="novo-ajuda">
            Novo orçamento
          </button>
          <p id="novo-ajuda" className="mt-2 text-center text-xs text-grafite">
            Em construção. Disponível em breve.
          </p>
        </div>
      </div>
    </main>
  );
}
