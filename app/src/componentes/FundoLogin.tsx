import { useEffect, useState } from "react";

/**
 * Fundo da tela de entrada: luzes em degradê que respiram, cartões flutuando (orçamento aprovado, Pix recebido,
 * contrato assinado) e um leve paralaxe que acompanha o mouse. Só decoração: aria-hidden.
 */
export default function FundoLogin() {
  const [p, setP] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const mover = (e: MouseEvent) => setP({ x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 });
    window.addEventListener("mousemove", mover, { passive: true });
    return () => window.removeEventListener("mousemove", mover);
  }, []);

  const camada = (fator: number) => ({ transform: `translate3d(${p.x * fator}px, ${p.y * fator}px, 0)` });

  return (
    <div className="fundo-login" aria-hidden="true">
      <div className="fundo-login-luz luz-1" />
      <div className="fundo-login-luz luz-2" />
      <div className="fundo-login-luz luz-3" />
      <div className="fundo-login-grade" />

      <div className="fundo-login-camada" style={camada(-18)}>
        <div className="flutuante flutuante-a vidro">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E6F4EA] text-pago">✓</span>
          <span>
            <span className="block text-[11px] text-grafite">Orçamento nº 0012</span>
            <span className="block text-sm font-semibold">Aprovado pelo cliente</span>
          </span>
        </div>
        <div className="flutuante flutuante-d vidro">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-carbono-claro text-carbono">✎</span>
          <span>
            <span className="block text-[11px] text-grafite">Contrato nº 0004</span>
            <span className="block text-sm font-semibold">Assinado pelo celular</span>
          </span>
        </div>
      </div>
      <div className="fundo-login-camada" style={camada(14)}>
        <div className="flutuante flutuante-b vidro">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E6F4EA] text-pago">R$</span>
          <span>
            <span className="block text-[11px] text-grafite">Pix recebido</span>
            <span className="tabular block text-sm font-semibold">R$ 288,25</span>
          </span>
        </div>
        <div className="flutuante flutuante-c vidro">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FDF3E7] text-atraso">⏱</span>
          <span>
            <span className="block text-[11px] text-grafite">Enviado no WhatsApp</span>
            <span className="block text-sm font-semibold">em 1 minuto</span>
          </span>
        </div>
      </div>
    </div>
  );
}
