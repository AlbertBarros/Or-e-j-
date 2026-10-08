import { NavLink } from "react-router";
import { IconeInicio, IconeOrcamentos, IconeClientes, IconeContratos, IconeMais } from "./Icones";

const ABAS = [
  { para: "/", rotulo: "Início", Icone: IconeInicio, exato: true },
  { para: "/orcamentos", rotulo: "Orçamentos", Icone: IconeOrcamentos },
  { para: "/clientes", rotulo: "Clientes", Icone: IconeClientes },
  { para: "/contratos", rotulo: "Contratos", Icone: IconeContratos },
  { para: "/mais", rotulo: "Mais", Icone: IconeMais },
];

/** Barra de navegação fixa no rodapé (telas de primeiro nível). */
export default function BarraAbas() {
  return (
    <nav aria-label="Seções do app" className="fixed inset-x-0 bottom-0 z-40 barra-fixa" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <ul className="mx-auto grid max-w-[560px] grid-cols-5">
        {ABAS.map(({ para, rotulo, Icone, exato }) => (
          <li key={para}>
            <NavLink
              to={para}
              end={exato}
              className={({ isActive }) =>
                `flex min-h-[4.25rem] flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${isActive ? "text-carbono" : "text-grafite hover:text-tinta"}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${isActive ? "bg-carbono-claro" : ""}`}>
                    <Icone tamanho={22} strokeWidth={isActive ? 2.3 : 1.9} />
                  </span>
                  {rotulo}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
