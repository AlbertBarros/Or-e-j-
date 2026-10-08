import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconePlay } from "./Icones";
import { useTour } from "@/tour/Tour";
import { emTestePro, marcarTutorial } from "@/lib/usuario";
import type { Usuario } from "@/tipos";

/**
 * Primeiro acesso: oferece o tour guiado uma vez (marcado no perfil, vale para todos os aparelhos).
 * Se a pessoa disser "agora não", o tour continua disponível em Ajuda.
 */
export default function OfertaTour({ uid, perfil }: { uid: string; perfil: Usuario }) {
  const { ativo, iniciar } = useTour();
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (perfil.tutorial?.oferecidoEm || ativo) return;
    const t = window.setTimeout(() => setAberto(true), 700); // deixa a tela Início aparecer primeiro
    return () => window.clearTimeout(t);
  }, [perfil.tutorial?.oferecidoEm, ativo]);

  if (!aberto) return null;

  function responder(fazer: boolean) {
    setAberto(false);
    void marcarTutorial(uid, "oferecidoEm").catch(() => undefined);
    if (fazer) iniciar();
  }

  const teste = emTestePro(perfil);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/45 backdrop-blur-sm sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="oferta-titulo" className="vidro-forte surgir w-full max-w-md rounded-t-3xl p-6 sm:rounded-3xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg" style={{ background: "linear-gradient(135deg,#1E40AF,#2563EB 60%,#10B981 160%)" }}>
          <IconePlay tamanho={30} />
        </div>
        <h2 id="oferta-titulo" className="mt-4 text-center text-xl font-bold">
          Quer um tour rápido?
        </h2>
        <p className="mt-1 text-center text-grafite">Em 2 minutos eu te mostro como fazer, enviar e receber um orçamento, passo a passo nas telas do app.</p>
        {teste && (
          <p className="mt-3 rounded-xl bg-[#E6F4EA] px-3 py-2 text-center text-sm font-medium text-pago">
            🎁 Seu teste grátis do Pro por 14 dias já começou: Pix, recibo e sua logo liberados.
          </p>
        )}
        <button type="button" onClick={() => responder(true)} className="botao-primario mt-5" autoFocus>
          Fazer o tour
        </button>
        <button type="button" onClick={() => responder(false)} className="botao-texto mt-2 w-full">
          Agora não (fica em Ajuda)
        </button>
      </div>
    </div>,
    document.body,
  );
}
