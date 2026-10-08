interface Props {
  tamanho?: number;
  comNome?: boolean;
  className?: string;
}

/** Logo do Preço Fechado: balão de conversa com check (aprovado no WhatsApp) e selo R$. Mesmo desenho de scripts/gerar-marca.cjs. */
export default function Logo({ tamanho = 32, comNome = true, className = "" }: Props) {
  const fonte = Math.round(tamanho * 0.66);
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width={tamanho} height={tamanho} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="pf-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1E40AF" />
            <stop offset="0.55" stopColor="#2563EB" />
            <stop offset="1" stopColor="#10B981" />
          </linearGradient>
        </defs>
        <rect width="96" height="96" rx="22" fill="url(#pf-g)" />
        <path d="M28 18 H68 a12 12 0 0 1 12 12 V50 a12 12 0 0 1 -12 12 H46 L32 76 V62 H28 a12 12 0 0 1 -12 -12 V30 a12 12 0 0 1 12 -12 Z" fill="#FFFFFF" />
        <path d="M34 41 L44 51 L63 30" fill="none" stroke="#16A34A" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="74" cy="22" r="9" fill="#16A34A" stroke="#FFFFFF" strokeWidth="3" />
        <text x="74" y="25.5" textAnchor="middle" fontFamily="Archivo, 'Segoe UI', Arial, sans-serif" fontWeight="800" fontSize="9" fill="#FFFFFF">
          R$
        </text>
      </svg>
      {comNome && (
        <span className="whitespace-nowrap font-extrabold tracking-tight text-tinta" style={{ fontSize: fonte, lineHeight: 1 }}>
          Preço <span className="text-pago">Fechado</span>
        </span>
      )}
    </span>
  );
}
