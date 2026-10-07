export default function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-grafite">
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-pauta border-t-carbono" aria-hidden="true" />
        <span>{texto}</span>
      </div>
    </div>
  );
}
