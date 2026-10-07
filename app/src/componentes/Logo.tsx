interface Props {
  tamanho?: number;
  comNome?: boolean;
  className?: string;
}

/** Logo do Orça Já (mesmo desenho do site). */
export default function Logo({ tamanho = 32, comNome = true, className = "" }: Props) {
  const fonte = Math.round(tamanho * 0.72);
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width={tamanho} height={tamanho} aria-hidden="true" focusable="false">
        <rect x="22" y="18" width="56" height="70" rx="9" fill="#1E3A8A" />
        <rect x="12" y="8" width="56" height="70" rx="9" fill="#FFFFFF" stroke="#1E3A8A" strokeWidth="4" />
        <line x1="24" y1="26" x2="56" y2="26" stroke="#DCE4F7" strokeWidth="4" strokeLinecap="round" />
        <line x1="24" y1="38" x2="56" y2="38" stroke="#DCE4F7" strokeWidth="4" strokeLinecap="round" />
        <line x1="24" y1="50" x2="44" y2="50" stroke="#DCE4F7" strokeWidth="4" strokeLinecap="round" />
        <rect x="24" y="60" width="32" height="6" rx="3" fill="#1E3A8A" />
        <circle cx="68" cy="70" r="16" fill="#15803D" />
        <path d="M60 70.5 L65.5 76 L76 63.5" fill="none" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {comNome && (
        <span className="font-bold tracking-tight text-tinta" style={{ fontSize: fonte, lineHeight: 1 }}>
          Orça <span className="text-carbono">Já</span>
        </span>
      )}
    </span>
  );
}
