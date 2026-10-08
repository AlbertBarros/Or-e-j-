import { useEffect, useState } from "react";
import Carregando from "@/componentes/Carregando";
import Logo from "@/componentes/Logo";
import PreviaCartao from "./PreviaCartao";
import { buscarCartaoPublico, buscarLogoPublica } from "./firestorePublico";
import type { CartaoVirtual } from "@/tipos";

/** /v/:uid — cartão de visita virtual público. */
export default function PaginaCartao({ uid }: { uid: string }) {
  const [cartao, setCartao] = useState<CartaoVirtual | null | undefined>(undefined);
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    buscarCartaoPublico(uid)
      .then(async (c) => {
        if (cancelado) return;
        setCartao(c);
        if (c) {
          document.title = `${c.nome} · ${c.profissao}`;
          if (c.temLogo) setLogo(await buscarLogoPublica(uid).catch(() => null));
        }
      })
      .catch(() => !cancelado && setCartao(null));
    return () => {
      cancelado = true;
    };
  }, [uid]);

  if (cartao === undefined) return <Carregando texto="Abrindo o cartão…" />;
  if (!cartao) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
        <Logo tamanho={36} />
        <h1 className="mt-6 text-2xl font-semibold">Cartão não encontrado.</h1>
        <p className="mt-2 text-grafite">O link pode estar errado ou o profissional ainda não publicou o cartão.</p>
      </main>
    );
  }
  return <PreviaCartao cartao={cartao} logo={logo} />;
}
