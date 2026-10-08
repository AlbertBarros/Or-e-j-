interface Props {
  tamanho?: number;
  comNome?: boolean;
  className?: string;
}

/** Logo do Preço Fechado: etiqueta de preço com o check verde de "fechado" (mesmo desenho de scripts/gerar-marca.cjs). */
export default function Logo({ tamanho = 32, comNome = true, className = "" }: Props) {
  const fonte = Math.round(tamanho * 0.66);
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width={tamanho} height={tamanho} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="pf-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1E3A8A" />
            <stop offset="1" stopColor="#2B4FB8" />
          </linearGradient>
        </defs>
        <rect width="96" height="96" rx="22" fill="url(#pf-g)" />
        <path d="M40 18 H70 a7 7 0 0 1 7 7 V55 a7 7 0 0 1 -7 7 H40 L17 40 Z" fill="#FFFFFF" />
        <circle cx="34" cy="40" r="4.5" fill="#1E3A8A" />
        <rect x="46" y="31" width="22" height="4" rx="2" fill="#DCE4F7" />
        <rect x="46" y="40" width="16" height="4" rx="2" fill="#DCE4F7" />
        <rect x="46" y="49" width="20" height="5" rx="2.5" fill="#1E3A8A" />
        <circle cx="66" cy="66" r="15" fill="#15803D" stroke="#FFFFFF" strokeWidth="4" />
        <path d="M59 66.5 L64 71.5 L73.5 61" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {comNome && (
        <span className="whitespace-nowrap font-extrabold tracking-tight text-tinta" style={{ fontSize: fonte, lineHeight: 1 }}>
          Preço <span className="text-carbono">Fechado</span>
        </span>
      )}
    </span>
  );
}
