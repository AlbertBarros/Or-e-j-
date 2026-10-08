/** Gráficos em SVG puro (sem biblioteca): barras mensais agrupadas e rosca de proporção. */
import { useId, useState } from "react";
import type { MesEstatistica } from "@/lib/estatisticas";

const CORES = { enviados: "#1E3A8A", aprovados: "#15803D", recusados: "#9F1239" } as const;

export function BarrasMensais({ meses }: { meses: MesEstatistica[] }) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const id = useId();
  const max = Math.max(1, ...meses.flatMap((m) => [m.enviados, m.aprovados, m.recusados]));
  const W = 320;
  const H = 150;
  const base = H - 26;
  const grupo = W / meses.length;
  const barra = Math.min(14, (grupo - 16) / 3);
  const escala = (v: number) => (v / max) * (base - 14);
  const sel = ativo !== null ? meses[ativo] : null;

  return (
    <figure aria-labelledby={`${id}-t`}>
      <figcaption id={`${id}-t`} className="sr-only">
        Orçamentos por mês: enviados, aprovados e recusados
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1="0" x2={W} y1={base - escala(max * f)} y2={base - escala(max * f)} stroke="#E4E7EC" strokeDasharray="2 4" />
        ))}
        {meses.map((m, i) => {
          const x0 = i * grupo + (grupo - barra * 3 - 6) / 2;
          const series: [keyof typeof CORES, number][] = [
            ["enviados", m.enviados],
            ["aprovados", m.aprovados],
            ["recusados", m.recusados],
          ];
          return (
            <g key={m.chave} onMouseEnter={() => setAtivo(i)} onMouseLeave={() => setAtivo(null)} onClick={() => setAtivo(ativo === i ? null : i)} className="cursor-pointer">
              <rect x={i * grupo} y="0" width={grupo} height={H} fill={ativo === i ? "#DCE4F7" : "transparent"} opacity="0.5" rx="8" />
              {series.map(([k, v], j) => (
                <rect
                  key={k}
                  x={x0 + j * (barra + 3)}
                  y={base - escala(v)}
                  width={barra}
                  height={Math.max(v > 0 ? 2 : 0, escala(v))}
                  rx="3"
                  fill={CORES[k]}
                  className="barra-crescer"
                  style={{ animationDelay: `${i * 60 + j * 30}ms` }}
                >
                  <title>{`${m.rotulo}: ${v} ${k}`}</title>
                </rect>
              ))}
              <text x={i * grupo + grupo / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#5B6270" fontWeight={ativo === i ? 700 : 500}>
                {m.rotulo}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <ul className="flex gap-3 text-grafite">
          {(Object.keys(CORES) as (keyof typeof CORES)[]).map((k) => (
            <li key={k} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CORES[k] }} />
              {k.charAt(0).toUpperCase() + k.slice(1)}
            </li>
          ))}
        </ul>
        <p className="tabular font-medium text-tinta" aria-live="polite">
          {sel ? `${sel.rotulo}: ${sel.enviados} enviados · ${sel.aprovados} aprovados · ${sel.recusados} recusados` : "Toque num mês para ver os números"}
        </p>
      </div>
    </figure>
  );
}

export function Rosca({ partes, centro, legenda }: { partes: { rotulo: string; valor: number; cor: string }[]; centro: string; legenda: string }) {
  const total = partes.reduce((s, p) => s + p.valor, 0);
  const R = 42;
  const C = 2 * Math.PI * R;
  let acumulado = 0;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0" role="img" aria-label={`${centro} ${legenda}`}>
        <circle cx="50" cy="50" r={R} fill="none" stroke="#E4E7EC" strokeWidth="12" />
        {total > 0 &&
          partes.map((p) => {
            const frac = p.valor / total;
            const el = (
              <circle
                key={p.rotulo}
                cx="50"
                cy="50"
                r={R}
                fill="none"
                stroke={p.cor}
                strokeWidth="12"
                strokeDasharray={`${frac * C} ${C}`}
                strokeDashoffset={-acumulado * C}
                transform="rotate(-90 50 50)"
                strokeLinecap={partes.length === 1 ? "round" : "butt"}
              />
            );
            acumulado += frac;
            return el;
          })}
        <text x="50" y="47" textAnchor="middle" fontSize="20" fontWeight="800" fill="#1A1D23">
          {centro}
        </text>
        <text x="50" y="62" textAnchor="middle" fontSize="8.5" fill="#5B6270">
          {legenda}
        </text>
      </svg>
      <ul className="space-y-1.5 text-sm">
        {partes.map((p) => (
          <li key={p.rotulo} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.cor }} />
            <span className="text-grafite">{p.rotulo}</span>
            <span className="tabular ml-auto font-semibold">{p.valor}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
