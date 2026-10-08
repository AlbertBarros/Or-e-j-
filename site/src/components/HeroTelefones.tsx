import { useEffect, useRef, useState } from "react";

const TELAS = [
  { tela: "inicio", alt: "Início do app com totais, pendências e gráficos", rotulo: "Início" },
  { tela: "novo", alt: "Formulário de novo orçamento", rotulo: "Novo orçamento" },
  { tela: "previa", alt: "Prévia do orçamento antes de enviar", rotulo: "Prévia" },
  { tela: "contratos", alt: "Contratos assinados e pendentes", rotulo: "Contratos" },
];

/** Herói: celular grande com telas que se alternam e inclinação 3D suave que segue o mouse; ao lado, a tela do cliente aprovando. */
export default function HeroTelefones() {
  const [i, setI] = useState(0);
  const [pausado, setPausado] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const [inclinacao, setInclinacao] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (pausado) return;
    const t = setInterval(() => setI((k) => (k + 1) % TELAS.length), 3200);
    return () => clearInterval(t);
  }, [pausado]);

  function mover(e: React.MouseEvent<HTMLDivElement>) {
    const r = caixa.current?.getBoundingClientRect();
    if (!r) return;
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setInclinacao({ x: -py * 10, y: px * 12 });
  }

  return (
    <div ref={caixa} onMouseMove={mover} onMouseLeave={() => setInclinacao({ x: 0, y: 0 })} onMouseEnter={() => setPausado(true)} onFocus={() => setPausado(true)} onBlur={() => setPausado(false)} className="relative mx-auto flex w-full max-w-[560px] items-end justify-center gap-4 px-2" style={{ perspective: 1200 }}>
      <span className="mancha" aria-hidden="true" />
      <div className="inclinavel w-full max-w-[320px]" style={{ transform: `rotateX(${inclinacao.x}deg) rotateY(${inclinacao.y}deg)` }}>
        <div className="telefone flutuar">
          <div className="tela">
            <div className="trocador">
              {TELAS.map((t, k) => (
                <img key={t.tela} src={`/app/${t.tela}.webp`} alt={k === i ? t.alt : ""} width={780} height={1688} loading={k === 0 ? "eager" : "lazy"} decoding="async" className={k === i ? "ativa" : ""} aria-hidden={k !== i} />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-center gap-1.5" role="tablist" aria-label="Telas do app">
          {TELAS.map((t, k) => (
            <button key={t.tela} type="button" role="tab" aria-selected={k === i} aria-label={t.rotulo} onClick={() => setI(k)} className={`h-2 rounded-full transition-all ${k === i ? "w-7 bg-carbono" : "w-2 bg-pauta hover:bg-grafite"}`} />
          ))}
        </div>
      </div>
      <div className="hidden w-[220px] shrink-0 translate-y-6 sm:block">
        <div className="telefone flutuar-2" style={{ maxWidth: 220, borderRadius: "2.2rem", padding: 7 }}>
          <div className="tela" style={{ borderRadius: "1.7rem", paddingTop: 20 }}>
            <img src="/app/aprovado.webp" alt="Página do cliente com o orçamento aprovado" width={780} height={1688} loading="lazy" decoding="async" />
          </div>
        </div>
      </div>
    </div>
  );
}
