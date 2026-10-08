import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { tamanho?: number };

function Base({ tamanho = 22, children, ...resto }: P) {
  return (
    <svg aria-hidden="true" width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...resto}>
      {children}
    </svg>
  );
}

export const IconeInicio = (p: P) => (
  <Base {...p}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10v10h5v-6h4v6h5V10" />
  </Base>
);
export const IconeOrcamentos = (p: P) => (
  <Base {...p}>
    <rect x="5" y="3" width="14" height="18" rx="2.5" />
    <path d="M9 8h6M9 12h6M9 16h3" />
  </Base>
);
export const IconeClientes = (p: P) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <circle cx="17" cy="9" r="2.6" />
    <path d="M15.5 14.2A4.5 4.5 0 0 1 21 18.5" />
  </Base>
);
export const IconeContratos = (p: P) => (
  <Base {...p}>
    <path d="M7 3h7l4 4v14H7z" />
    <path d="M14 3v4h4" />
    <path d="M9.5 17c1.2-1.6 2-1.6 2.6 0 .6 1.5 1.3 1.5 2.4-.4" />
  </Base>
);
export const IconeMais = (p: P) => (
  <Base {...p}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.8" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8" />
  </Base>
);
export const IconeCartao = (p: P) => (
  <Base {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <circle cx="8.5" cy="11" r="2" />
    <path d="M13 9.5h5M13 13h5M5.5 16.5h6" />
  </Base>
);
export const IconeCatalogo = (p: P) => (
  <Base {...p}>
    <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z" />
    <path d="M4 7.5 12 12l8-4.5M12 12v9" />
  </Base>
);
export const IconeConta = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </Base>
);
export const IconeMais1 = (p: P) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);
export const IconeSeta = (p: P) => (
  <Base {...p}>
    <path d="M9 6l6 6-6 6" />
  </Base>
);
export const IconeBusca = (p: P) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Base>
);
export const IconeWhatsapp = ({ tamanho = 20, ...p }: P) => (
  <svg aria-hidden="true" width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1.1 2.7.1.2 1.9 2.9 4.6 4 1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
  </svg>
);
export const IconeCheck = (p: P) => (
  <Base {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Base>
);
export const IconeLixeira = (p: P) => (
  <Base {...p}>
    <path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13" />
  </Base>
);
export const IconeEditar = (p: P) => (
  <Base {...p}>
    <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z" />
    <path d="m13.5 6.5 3 3" />
  </Base>
);
export const IconeCompartilhar = (p: P) => (
  <Base {...p}>
    <path d="M12 3v12M8 7l4-4 4 4" />
    <path d="M5 12v7h14v-7" />
  </Base>
);
export const IconeGrafico = (p: P) => (
  <Base {...p}>
    <path d="M4 20h16" />
    <rect x="6" y="11" width="3" height="7" rx="0.8" />
    <rect x="11" y="6" width="3" height="12" rx="0.8" />
    <rect x="16" y="14" width="3" height="4" rx="0.8" />
  </Base>
);
export const IconeAlerta = (p: P) => (
  <Base {...p}>
    <path d="M12 3 2.5 20h19z" />
    <path d="M12 9v5M12 17.5v.5" />
  </Base>
);
