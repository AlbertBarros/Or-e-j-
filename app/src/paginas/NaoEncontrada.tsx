import { Link } from "react-router";
import Logo from "@/componentes/Logo";

export default function NaoEncontrada() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col items-center justify-center px-4 text-center">
      <Logo tamanho={36} />
      <p className="tabular mt-8 text-6xl font-bold text-carbono">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Essa página não existe.</h1>
      <p className="mt-2 text-grafite">O endereço pode estar errado ou o link pode ter vencido.</p>
      <Link to="/" className="botao-primario mt-6 !w-auto px-6">
        Ir para o painel
      </Link>
    </main>
  );
}
