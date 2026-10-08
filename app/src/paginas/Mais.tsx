import { Link } from "react-router";
import BarraAbas from "@/componentes/BarraAbas";
import CabecalhoAba from "@/componentes/CabecalhoAba";
import { IconeCartao, IconeCatalogo, IconeConta, IconeSeta } from "@/componentes/Icones";
import { useAuth } from "@/hooks/useAuth";
import { sair } from "@/lib/auth";
import { URL_SITE } from "@/lib/planos";

const ITENS = [
  { para: "/cartao", Icone: IconeCartao, titulo: "Cartão de visita", texto: "Cartão virtual e cards em imagem para divulgar" },
  { para: "/catalogo", Icone: IconeCatalogo, titulo: "Produtos e serviços", texto: "O que você oferece, com preços" },
  { para: "/conta", Icone: IconeConta, titulo: "Conta e plano", texto: "Seus dados, logo, Pix, endereço e assinatura" },
];

/** Mais: acesso a cartão, catálogo, conta e ajuda. */
export default function Mais() {
  const { perfil } = useAuth();
  return (
    <main className="pb-abas mx-auto w-full max-w-[560px] px-4">
      <CabecalhoAba titulo="Mais" subtitulo={perfil?.nomeNegocio} />
      <ul className="cartao mt-5 divide-y divide-pauta overflow-hidden">
        {ITENS.map(({ para, Icone, titulo, texto }) => (
          <li key={para}>
            <Link to={para} className="lista-item">
              <span className="botao-icone !bg-carbono-claro">
                <Icone tamanho={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{titulo}</span>
                <span className="block text-sm text-grafite">{texto}</span>
              </span>
              <IconeSeta tamanho={18} className="text-grafite" />
            </Link>
          </li>
        ))}
      </ul>

      <ul className="cartao mt-4 divide-y divide-pauta overflow-hidden text-sm">
        <li>
          <a href={`${URL_SITE}/precos`} target="_blank" rel="noopener" className="lista-item">
            <span className="flex-1">Planos e preços</span>
            <IconeSeta tamanho={16} className="text-grafite" />
          </a>
        </li>
        <li>
          <a href={`${URL_SITE}/termos`} target="_blank" rel="noopener" className="lista-item">
            <span className="flex-1">Termos de uso</span>
            <IconeSeta tamanho={16} className="text-grafite" />
          </a>
        </li>
        <li>
          <a href={`${URL_SITE}/privacidade`} target="_blank" rel="noopener" className="lista-item">
            <span className="flex-1">Privacidade</span>
            <IconeSeta tamanho={16} className="text-grafite" />
          </a>
        </li>
      </ul>

      <button type="button" onClick={() => void sair()} className="botao-texto mt-6 w-full !text-recusado">
        Sair da conta
      </button>
      <BarraAbas />
    </main>
  );
}
