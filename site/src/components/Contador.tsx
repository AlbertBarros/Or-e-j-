import { useEffect, useRef, useState } from "react";

interface Props {
  ate: number;
  prefixo?: string;
  sufixo?: string;
  decimais?: number;
  duracao?: number;
  className?: string;
}

/** Número que conta de 0 até o valor quando entra na tela. */
export default function Contador({ ate, prefixo = "", sufixo = "", decimais = 0, duracao = 1400, className = "" }: Props) {
  const [v, setV] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const rodou = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const iniciar = () => {
      if (rodou.current) return;
      rodou.current = true;
      if (reduzir) {
        setV(ate);
        return;
      }
      const t0 = performance.now();
      const passo = (t: number) => {
        const p = Math.min(1, (t - t0) / duracao);
        const e = 1 - Math.pow(1 - p, 3);
        setV(ate * e);
        if (p < 1) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    };
    if (!("IntersectionObserver" in window)) {
      iniciar();
      return;
    }
    const obs = new IntersectionObserver(([e]) => e?.isIntersecting && iniciar(), { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ate, duracao]);

  const texto = v.toLocaleString("pt-BR", { minimumFractionDigits: decimais, maximumFractionDigits: decimais });
  return (
    <span ref={ref} className={`tabular ${className}`}>
      {prefixo}
      {texto}
      {sufixo}
    </span>
  );
}
