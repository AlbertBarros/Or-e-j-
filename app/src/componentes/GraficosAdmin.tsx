/** Gráficos do Painel administrativo, em SVG puro (sem biblioteca), no mesmo estilo dos gráficos do Início. */
import { useId, useState, type ReactNode } from "react";

interface Ponto {
  rotulo: string;
  valor: number;
}

/** Barras verticais de uma série, com o valor no topo da barra destacada. */
export function BarrasSimples({ pontos, titulo, cor = "#2563EB", formatar = (v: number) => String(v) }: { pontos: Ponto[]; titulo: string; cor?: string; formatar?: (v: number) => string }) {
  const id = useId();
  const [ativo, setAtivo] = useState<number | null>(null);
  const W = 360;
  const H = 170;
  const base = H - 24;
  const max = Math.max(1, ...pontos.map((p) => p.valor));
  const largura = W / Math.max(1, pontos.length);
  const barra = Math.max(6, Math.min(26, largura - 10));
  const escala = (v: number) => (v / max) * (base - 22);
  return (
    <figure aria-labelledby={`${id}-t`}>
      <figcaption id={`${id}-t`} className="sr-only">
        {titulo}: {pontos.map((p) => `${p.rotulo} ${formatar(p.valor)}`).join(", ")}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-g`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={cor} />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.85" />
          </linearGradient>
        </defs>
        {[0.5, 1].map((f) => (
          <line key={f} x1="0" x2={W} y1={base - escala(max * f)} y2={base - escala(max * f)} stroke="#E4E7EC" strokeDasharray="2 4" />
        ))}
        {pontos.map((p, i) => {
          const x = i * largura + (largura - barra) / 2;
          const h = escala(p.valor);
          const mostrar = ativo === i || (ativo === null && i === pontos.length - 1);
          return (
            <g key={i} onMouseEnter={() => setAtivo(i)} onMouseLeave={() => setAtivo(null)} onClick={() => setAtivo(ativo === i ? null : i)} className="cursor-pointer">
              <rect x={i * largura} y="0" width={largura} height={H} fill={ativo === i ? "#DCE4F7" : "transparent"} opacity="0.5" rx="6" />
              <rect x={x} y={base - h} width={barra} height={Math.max(h, p.valor > 0 ? 2 : 0)} rx={Math.min(6, barra / 2)} fill={`url(#${id}-g)`} />
              {mostrar && (
                <text x={x + barra / 2} y={base - h - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1A1D23">
                  {formatar(p.valor)}
                </text>
              )}
              <text x={i * largura + largura / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="#5B6270">
                {p.rotulo}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

/** Barras horizontais (ranking ou funil), com porcentagem sobre o primeiro valor quando "funil". */
export function BarrasHorizontais({ pontos, funil = false }: { pontos: Ponto[]; funil?: boolean }) {
  const max = Math.max(1, ...pontos.map((p) => p.valor));
  const primeiro = pontos[0]?.valor || 1;
  return (
    <ul className="space-y-2.5">
      {pontos.map((p, i) => (
        <li key={p.rotulo}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate">{p.rotulo}</span>
            <span className="tabular shrink-0 font-semibold">
              {p.valor}
              {funil && i > 0 && <span className="ml-1 text-xs font-normal text-grafite">({Math.round((p.valor / primeiro) * 100)}%)</span>}
            </span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-pauta/70">
            <div className="h-full rounded-full bg-gradient-to-r from-[#1E40AF] via-[#2563EB] to-[#10B981] transition-[width] duration-700" style={{ width: `${Math.max(p.valor > 0 ? 3 : 0, (p.valor / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Cartão de número (indicador). */
export function Indicador({ rotulo, valor, detalhe, destaque = false, icone }: { rotulo: string; valor: ReactNode; detalhe?: ReactNode; destaque?: boolean; icone?: ReactNode }) {
  return (
    <div className={`${destaque ? "cartao-destaque text-white" : "cartao"} flex flex-col p-4`}>
      <div className="flex items-center justify-between gap-2">
        <p className={`text-xs font-semibold uppercase tracking-wider ${destaque ? "text-white/75" : "text-grafite"}`}>{rotulo}</p>
        {icone && <span className={destaque ? "text-white/80" : "text-carbono"}>{icone}</span>}
      </div>
      <p className="tabular mt-1.5 text-2xl font-bold leading-tight">{valor}</p>
      {detalhe && <p className={`mt-0.5 text-xs ${destaque ? "text-white/75" : "text-grafite"}`}>{detalhe}</p>}
    </div>
  );
}
