import type { InputHTMLAttributes, ReactNode } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  rotulo: string;
  erro?: string | null;
  ajuda?: ReactNode;
}

/** Campo de texto com rótulo sempre visível, ajuda e erro (acessibilidade do DESIGN.md). */
export default function Campo({ id, rotulo, erro, ajuda, className = "", ...resto }: Props) {
  const idErro = `${id}-erro`;
  const idAjuda = `${id}-ajuda`;
  return (
    <div>
      <label htmlFor={id} className="rotulo">
        {rotulo}
      </label>
      <input
        id={id}
        className={`campo ${erro ? "campo-erro" : ""} ${className}`}
        aria-invalid={erro ? true : undefined}
        aria-describedby={[erro ? idErro : null, ajuda ? idAjuda : null].filter(Boolean).join(" ") || undefined}
        {...resto}
      />
      {ajuda && !erro && (
        <p id={idAjuda} className="ajuda">
          {ajuda}
        </p>
      )}
      {erro && (
        <p id={idErro} className="erro" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
