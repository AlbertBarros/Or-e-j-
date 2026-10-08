/** Logo do negócio ou inicial, num quadrado arredondado. */
export default function Avatar({ nome, logo, tamanho = 48, className = "" }: { nome: string; logo?: string | null; tamanho?: number; className?: string }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-pauta bg-folha ${className}`}
      style={{ width: tamanho, height: tamanho }}
      aria-hidden="true"
    >
      {logo ? (
        <img src={logo} alt="" className="h-full w-full object-contain" />
      ) : (
        <span className="font-bold text-carbono" style={{ fontSize: Math.round(tamanho * 0.42) }}>
          {nome.trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}
    </div>
  );
}
