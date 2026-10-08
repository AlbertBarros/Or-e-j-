import type { ReactNode } from "react";
import BotaoAjuda from "./BotaoAjuda";

interface Props {
  titulo: string;
  subtitulo?: string;
  acao?: ReactNode;
}

/** Cabeçalho das telas de primeiro nível (com barra de abas): título grande, uma ação e o botão de ajuda à direita. */
export default function CabecalhoAba({ titulo, subtitulo, acao }: Props) {
  return (
    <header className="flex items-end justify-between gap-3 pt-5">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold tracking-tight">{titulo}</h1>
        {subtitulo && <p className="mt-0.5 text-sm text-grafite">{subtitulo}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {acao}
        <BotaoAjuda />
      </div>
    </header>
  );
}
