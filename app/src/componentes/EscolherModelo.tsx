import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import DocumentoOrcamento from "./DocumentoOrcamento";
import { IconeWhatsapp } from "./Icones";
import { MODELOS_DOCUMENTO } from "@/lib/pagamento";
import type { ModeloDocumento, Orcamento } from "@/tipos";

interface Props {
  orcamento: Orcamento;
  logo: string | null;
  modeloInicial: ModeloDocumento;
  ocupado?: boolean;
  textoEnviar?: string;
  aoEnviar: (modelo: ModeloDocumento) => void;
  aoBaixarPdf: (modelo: ModeloDocumento) => void;
  aoFechar: () => void;
}

/** Antes de enviar: escolhe o modelo do documento e vê, numa moldura de celular, como o cliente vai receber. */
export default function EscolherModelo({ orcamento, logo, modeloInicial, ocupado, textoEnviar = "Enviar no WhatsApp", aoEnviar, aoBaixarPdf, aoFechar }: Props) {
  const [modelo, setModelo] = useState<ModeloDocumento>(modeloInicial);

  useEffect(() => {
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") aoFechar();
    }
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [aoFechar]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/60 sm:items-center sm:p-4" onClick={(e) => e.target === e.currentTarget && !ocupado && aoFechar()}>
      <div role="dialog" aria-modal="true" aria-labelledby="mod-t" className="flex max-h-[94dvh] w-full max-w-lg flex-col rounded-t-3xl bg-fundo shadow-2xl sm:rounded-3xl">
        <header className="flex items-center justify-between px-5 pt-4">
          <h2 id="mod-t" className="text-lg font-semibold">
            Como o cliente vai ver
          </h2>
          <button type="button" onClick={aoFechar} className="botao-texto" disabled={ocupado}>
            Fechar
          </button>
        </header>

        <div className="mt-3 grid grid-cols-3 gap-2 px-5" role="radiogroup" aria-label="Modelo do documento">
          {MODELOS_DOCUMENTO.map((m) => (
            <button key={m.modelo} type="button" role="radio" aria-checked={modelo === m.modelo} onClick={() => setModelo(m.modelo)} className={`opcao flex-col !items-start gap-0.5 !px-3 !py-2 !text-left ${modelo === m.modelo ? "opcao-ativa" : ""}`}>
              <span className="text-sm font-semibold">{m.nome}</span>
              <span className="line-clamp-2 text-[11px] font-normal leading-tight text-grafite">{m.descricao}</span>
            </button>
          ))}
        </div>

        {/* Moldura de celular */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="mx-auto w-full max-w-[340px] rounded-[2.2rem] border-[6px] border-tinta bg-tinta p-1 shadow-xl">
            <div className="relative h-[460px] overflow-y-auto rounded-[1.8rem] bg-fundo">
              <div className="sticky top-0 z-10 flex h-6 items-center justify-center bg-fundo">
                <span className="h-4 w-24 rounded-full bg-tinta" aria-hidden="true" />
              </div>
              <div className="px-3 pb-4 pt-1">
                <p className="mb-2 text-center text-[11px] text-grafite">{orcamento.negocio.nome} enviou um orçamento para você</p>
                <div className="origin-top scale-[0.92]">
                  <DocumentoOrcamento orcamento={orcamento} logoDataUrl={logo} modelo={modelo} rodapeMarca={false} />
                </div>
                <div className="mt-2 space-y-1.5">
                  <div className="flex min-h-10 items-center justify-center rounded-xl bg-pago text-sm font-semibold text-white">Aprovar orçamento</div>
                  <div className="text-center text-xs text-grafite">Recusar</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="space-y-2 border-t border-pauta bg-folha p-4" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
          <button type="button" onClick={() => aoEnviar(modelo)} disabled={ocupado} className="botao-primario">
            <IconeWhatsapp /> {ocupado ? "Enviando…" : textoEnviar}
          </button>
          <button type="button" onClick={() => aoBaixarPdf(modelo)} disabled={ocupado} className="botao-secundario">
            Baixar em PDF
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
