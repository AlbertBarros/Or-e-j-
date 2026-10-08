import type { ReactNode } from "react";
import { Link } from "react-router";

interface Props {
  titulo: string;
  voltarPara?: string;
  acao?: ReactNode;
}

/** Cabeçalho das telas internas: seta de voltar, título e uma ação opcional à direita. */
export default function CabecalhoPagina({ titulo, voltarPara = "/", acao }: Props) {
  return (
    <header className="sticky top-0 z-30 -mx-4 flex min-h-14 items-center gap-2 border-b border-white/60 bg-folha/70 px-2 backdrop-blur-xl">
      <Link to={voltarPara} className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] text-carbono hover:bg-carbono-claro" aria-label="Voltar">
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </Link>
      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{titulo}</h1>
      {acao && <div className="shrink-0 pr-2">{acao}</div>}
    </header>
  );
}
