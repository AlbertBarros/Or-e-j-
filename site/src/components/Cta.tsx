import { useState } from "react";
import ListaDeEspera, { type OpcaoProfissao } from "./ListaDeEspera";

interface Props {
  texto: string;
  /** Se existir, o botão é um link (app pronto ou checkout). Senão, abre a lista de espera. */
  href?: string;
  origem: string;
  titulo?: string;
  variante?: "primario" | "secundario" | "link";
  opcoesProfissao?: OpcaoProfissao[];
  className?: string;
}

/**
 * Botão de ação do site (Começar grátis, Assinar o Pro, Entrar).
 * Hoje abre a lista de espera; quando houver link (app no ar / checkout), vira um link comum.
 */
export default function Cta({
  texto,
  href,
  origem,
  titulo,
  variante = "primario",
  opcoesProfissao = [],
  className = "",
}: Props) {
  const [aberto, setAberto] = useState(false);
  const classe =
    variante === "primario"
      ? `botao-primario ${className}`
      : variante === "secundario"
        ? `botao-secundario ${className}`
        : `inline-flex min-h-11 items-center px-2 text-sm font-medium text-grafite hover:text-carbono ${className}`;

  if (href) {
    return (
      <a href={href} className={classe} rel={href.startsWith("http") ? "noopener" : undefined}>
        {texto}
      </a>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className={classe}>
        {texto}
      </button>
      {aberto && (
        <ListaDeEspera origem={origem} titulo={titulo} opcoesProfissao={opcoesProfissao} aoFechar={() => setAberto(false)} />
      )}
    </>
  );
}
