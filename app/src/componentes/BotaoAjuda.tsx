import { Link } from "react-router";
import { IconeAjuda } from "./Icones";

/** Botão de ajuda (canto superior das telas principais): tour, instalar o app, avisos e suporte. */
export default function BotaoAjuda() {
  return (
    <Link to="/ajuda" className="botao-icone relative" aria-label="Ajuda" title="Ajuda" data-tour="ajuda">
      <IconeAjuda tamanho={22} />
    </Link>
  );
}
