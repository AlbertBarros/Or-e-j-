import { IconeBusca } from "./Icones";

interface Props {
  valor: string;
  aoMudar: (v: string) => void;
  placeholder: string;
  rotulo: string;
}

/** Campo de busca com ícone, usado nas listas (clientes, contratos, catálogo). */
export default function Busca({ valor, aoMudar, placeholder, rotulo }: Props) {
  return (
    <label className="relative block">
      <span className="sr-only">{rotulo}</span>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-grafite">
        <IconeBusca tamanho={18} />
      </span>
      <input type="search" value={valor} onChange={(e) => aoMudar(e.target.value)} placeholder={placeholder} className="campo !pl-10" autoComplete="off" />
    </label>
  );
}
