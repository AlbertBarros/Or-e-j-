import { useEffect, useRef, useState } from "react";

export interface Passo {
  n: number;
  t: string;
  d: string;
  tela: string;
  alt: string;
  pontos?: string[];
}

const DURACAO = 5500;

/**
 * Passos interativos: a lista avança sozinha com barra de progresso; clicar num passo troca a tela
 * do celular (grande, fixo na rolagem no desktop). No celular, o telefone fica em cima e os passos embaixo.
 */
export default function PassosInterativos({ passos }: { passos: Passo[] }) {
  const [i, setI] = useState(0);
  const [tocando, setTocando] = useState(true);
  const [visivel, setVisivel] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  // Só anima quando a seção está na tela
  useEffect(() => {
    const el = raiz.current;
    if (!el || !("IntersectionObserver" in window)) {
      setVisivel(true);
      return;
    }
    const obs = new IntersectionObserver(([e]) => setVisivel(Boolean(e?.isIntersecting)), { threshold: 0.25 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!tocando || !visivel) return;
    const t = setTimeout(() => setI((k) => (k + 1) % passos.length), DURACAO);
    return () => clearTimeout(t);
  }, [i, tocando, visivel, passos.length]);

  const atual = passos[i]!;

  return (
    <div ref={raiz} className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
      <ol className="order-2 space-y-3 lg:order-1" aria-label="Passos">
        {passos.map((p, k) => {
          const ativo = k === i;
          return (
            <li key={p.n}>
              <button
                type="button"
                onClick={() => {
                  setI(k);
                  setTocando(false);
                }}
                aria-current={ativo ? "step" : undefined}
                className={`cartao w-full p-5 text-left transition-all ${ativo ? "border-carbono/40 shadow-[0_20px_40px_-24px_rgba(30,58,138,0.5)]" : "hover:border-carbono/30"}`}
              >
                <div className="flex items-start gap-4">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold transition-colors ${ativo ? "bg-carbono text-white" : "bg-carbono-claro text-carbono"}`}>{p.n}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xl font-bold tracking-tight">{p.t}</span>
                    <span className={`block overflow-hidden text-grafite transition-all duration-300 ${ativo ? "mt-2 max-h-60 opacity-100" : "max-h-0 opacity-0"}`}>
                      {p.d}
                      {p.pontos && (
                        <ul className="mt-3 space-y-1.5">
                          {p.pontos.map((x) => (
                            <li key={x} className="flex items-start gap-2 text-sm text-tinta">
                              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#E6F4EA] text-[10px] font-bold text-pago" aria-hidden="true">✓</span>
                              {x}
                            </li>
                          ))}
                        </ul>
                      )}
                    </span>
                  </span>
                </div>
                <div className={`progresso mt-4 ${ativo && tocando && visivel ? "ativo" : ""}`} style={{ "--duracao": `${DURACAO}ms` } as React.CSSProperties} aria-hidden="true">
                  <span style={ativo && !tocando ? { width: "100%" } : undefined} />
                </div>
              </button>
            </li>
          );
        })}
        {!tocando && (
          <li>
            <button type="button" onClick={() => setTocando(true)} className="inline-flex min-h-10 items-center px-2 text-sm font-medium text-carbono hover:underline">
              ▶ Voltar a avançar sozinho
            </button>
          </li>
        )}
      </ol>

      <div className="order-1 lg:sticky lg:top-24 lg:order-2">
        <div className="relative">
          <span className="mancha" aria-hidden="true" />
          <div className="telefone mx-auto">
            <div className="tela">
              <div className="trocador">
                {passos.map((p, k) => (
                  <img key={p.tela} src={`/app/${p.tela}.webp`} alt={k === i ? p.alt : ""} width={780} height={1688} loading="lazy" decoding="async" className={k === i ? "ativa" : ""} aria-hidden={k !== i} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-sm text-grafite" aria-live="polite">
          Passo {atual.n}: {atual.t}
        </p>
      </div>
    </div>
  );
}
