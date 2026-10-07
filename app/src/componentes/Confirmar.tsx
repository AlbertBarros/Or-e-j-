import { useEffect } from "react";
import { createPortal } from "react-dom";

interface Props {
  titulo: string;
  texto: string;
  textoConfirmar: string;
  perigo?: boolean;
  ocupado?: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}

/** Caixa de confirmação (ex.: excluir). Desenhada no <body> por portal. */
export default function Confirmar({ titulo, texto, textoConfirmar, perigo, ocupado, aoConfirmar, aoCancelar }: Props) {
  useEffect(() => {
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") aoCancelar();
    }
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [aoCancelar]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/50 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) aoCancelar();
      }}
    >
      <div role="alertdialog" aria-modal="true" aria-labelledby="conf-titulo" className="w-full max-w-md rounded-t-2xl bg-folha p-5 shadow-xl sm:rounded-2xl">
        <h2 id="conf-titulo" className="text-xl font-semibold">
          {titulo}
        </h2>
        <p className="mt-2 text-grafite">{texto}</p>
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={aoConfirmar}
            disabled={ocupado}
            className={perigo ? "botao-primario !bg-recusado hover:!bg-[#7f0f2e]" : "botao-primario"}
          >
            {ocupado ? "Aguarde…" : textoConfirmar}
          </button>
          <button type="button" onClick={aoCancelar} disabled={ocupado} className="botao-secundario">
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
