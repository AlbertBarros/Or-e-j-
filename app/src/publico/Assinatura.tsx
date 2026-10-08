import { useEffect, useRef, useState } from "react";

interface Props {
  aoMudar: (temTraco: boolean) => void;
}

export interface AssinaturaHandle {
  limpar: () => void;
  imagem: () => string | null;
}

/** Área para desenhar a assinatura com o dedo ou o mouse. Exporta PNG pequeno. */
export default function Assinatura({ aoMudar, handle }: Props & { handle: React.MutableRefObject<AssinaturaHandle | null> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const [temTraco, setTemTraco] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const escala = Math.min(2, window.devicePixelRatio || 1);
    const largura = canvas.clientWidth;
    const altura = 180;
    canvas.width = largura * escala;
    canvas.height = altura * escala;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(escala, escala);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1A1D23";
  }, []);

  useEffect(() => {
    handle.current = {
      limpar: () => {
        const canvas = ref.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        setTemTraco(false);
        aoMudar(false);
      },
      imagem: () => {
        const canvas = ref.current;
        if (!canvas || !temTraco) return null;
        // Reduz para ~600px de largura para caber nas regras (< 80 KB)
        const saida = document.createElement("canvas");
        const fator = Math.min(1, 600 / canvas.width);
        saida.width = Math.round(canvas.width * fator);
        saida.height = Math.round(canvas.height * fator);
        const ctx = saida.getContext("2d");
        if (!ctx) return null;
        ctx.drawImage(canvas, 0, 0, saida.width, saida.height);
        return saida.toDataURL("image/png");
      },
    };
  }, [handle, temTraco, aoMudar]);

  function posicao(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function iniciar(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    desenhando.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = posicao(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.1, p.y + 0.1);
    ctx.stroke();
    if (!temTraco) {
      setTemTraco(true);
      aoMudar(true);
    }
  }
  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return;
    e.preventDefault();
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const p = posicao(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  function parar(e: React.PointerEvent<HTMLCanvasElement>) {
    desenhando.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ok */
    }
  }

  return (
    <div className="relative">
      <canvas
        ref={ref}
        className="block h-[180px] w-full touch-none rounded-xl border-2 border-dashed border-pauta bg-white"
        onPointerDown={iniciar}
        onPointerMove={mover}
        onPointerUp={parar}
        onPointerCancel={parar}
        onPointerLeave={parar}
        aria-label="Área para desenhar sua assinatura"
        role="img"
      />
      {!temTraco && <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-grafite">Desenhe sua assinatura aqui</p>}
      <span className="pointer-events-none absolute bottom-6 left-6 right-6 border-b border-pauta" aria-hidden="true" />
    </div>
  );
}
