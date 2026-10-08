import { useEffect, useRef, useState, type FormEvent } from "react";
import Logo from "@/componentes/Logo";
import Campo from "@/componentes/Campo";
import InstalarApp from "@/componentes/InstalarApp";
import {
  entrarComGoogle,
  enviarLinkPorEmail,
  concluirRedirecionamento,
  ehLinkDeEmail,
  emailGuardado,
  concluirLoginPorLink,
  mensagemDeErroAuth,
} from "@/lib/auth";
import { validarEmail } from "@/lib/validacao";
import { URL_SITE } from "@/lib/planos";

type Etapa = "inicial" | "link-enviado" | "confirmar-email";

export default function Entrar() {
  const [etapa, setEtapa] = useState<Etapa>("inicial");
  const [email, setEmail] = useState("");
  const [erroEmail, setErroEmail] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<"google" | "email" | null>(null);

  // Chegou por um link mágico? Conclui o login (pede o e-mail se abriu em outro aparelho).
  // O código do link só vale uma vez: a trava evita a segunda execução do efeito no modo estrito do React.
  // Voltou do Google (celular)? Mostra o erro, se houver; o login em si chega pelo onAuthStateChanged.
  useEffect(() => {
    concluirRedirecionamento().catch((e) => setErro(mensagemDeErroAuth(e)));
  }, []);

  const linkTratado = useRef(false);
  useEffect(() => {
    if (!ehLinkDeEmail() || linkTratado.current) return;
    linkTratado.current = true;
    const guardado = emailGuardado();
    if (guardado) {
      setOcupado("email");
      concluirLoginPorLink(guardado)
        .catch((e) => setErro(mensagemDeErroAuth(e)))
        .finally(() => setOcupado(null));
    } else {
      setEtapa("confirmar-email");
    }
  }, []);

  async function comGoogle() {
    setErro(null);
    setOcupado("google");
    try {
      await entrarComGoogle();
    } catch (e) {
      setErro(mensagemDeErroAuth(e));
    } finally {
      setOcupado(null);
    }
  }

  async function enviarLink(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const problema = validarEmail(email);
    setErroEmail(problema);
    if (problema) return;
    setOcupado("email");
    try {
      await enviarLinkPorEmail(email);
      setEtapa("link-enviado");
    } catch (err) {
      setErro(mensagemDeErroAuth(err));
    } finally {
      setOcupado(null);
    }
  }

  async function confirmarEmail(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const problema = validarEmail(email);
    setErroEmail(problema);
    if (problema) return;
    setOcupado("email");
    try {
      await concluirLoginPorLink(email);
    } catch (err) {
      setErro(mensagemDeErroAuth(err));
      setOcupado(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 py-8">
      <div className="flex justify-center pt-6">
        <Logo tamanho={40} />
      </div>

      <section className="documento mt-8 p-5">
        {etapa === "link-enviado" ? (
          <>
            <h1 className="text-2xl font-bold">Confira seu e-mail</h1>
            <p className="mt-2 text-grafite">
              Enviamos um link de acesso para <strong className="text-tinta">{email}</strong>. Abra o e-mail neste
              mesmo celular e toque no link para entrar. Ele vale por pouco tempo.
            </p>
            <p className="mt-4 text-sm text-grafite">Não chegou? Olhe a caixa de spam ou peça outro.</p>
            <button type="button" onClick={() => setEtapa("inicial")} className="botao-secundario mt-4">
              Pedir outro link
            </button>
          </>
        ) : etapa === "confirmar-email" ? (
          <form onSubmit={confirmarEmail} noValidate>
            <h1 className="text-2xl font-bold">Confirme seu e-mail</h1>
            <p className="mt-2 text-grafite">
              Você abriu o link em outro aparelho ou navegador. Digite o e-mail que recebeu o link para concluir.
            </p>
            <div className="mt-4">
              <Campo
                id="email-confirmar"
                rotulo="Seu e-mail"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                erro={erroEmail}
                autoFocus
              />
            </div>
            {erro && (
              <p role="alert" className="mt-3 rounded-[10px] bg-[#FDECEF] px-3 py-2 text-sm text-recusado">
                {erro}
              </p>
            )}
            <button type="submit" className="botao-primario mt-4" disabled={ocupado === "email"}>
              {ocupado === "email" ? "Entrando…" : "Entrar"}
            </button>
          </form>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Entrar no Orça Fácil</h1>
            <p className="mt-2 text-grafite">Se é a primeira vez, sua conta é criada aqui mesmo. Leva 2 minutos.</p>

            <button
              type="button"
              onClick={comGoogle}
              disabled={ocupado !== null}
              className="botao-secundario mt-6"
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6C12.3 13.4 17.7 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
                <path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.8-6z" />
                <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.7-4-13.6-9.9l-7.8 6C6.5 42.6 14.6 48 24 48z" />
              </svg>
              {ocupado === "google" ? "Abrindo o Google…" : "Entrar com Google"}
            </button>

            <div className="my-5 flex items-center gap-3 text-sm text-grafite" aria-hidden="true">
              <span className="h-px flex-1 bg-pauta" />
              ou
              <span className="h-px flex-1 bg-pauta" />
            </div>

            <form onSubmit={enviarLink} noValidate>
              <Campo
                id="email"
                rotulo="Seu e-mail"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                erro={erroEmail}
                ajuda="Você recebe um link e entra sem precisar de senha."
              />
              <button type="submit" className="botao-primario mt-4" disabled={ocupado !== null}>
                {ocupado === "email" ? "Enviando…" : "Receber link por e-mail"}
              </button>
            </form>

            {erro && (
              <p role="alert" className="mt-4 rounded-[10px] bg-[#FDECEF] px-3 py-2 text-sm text-recusado">
                {erro}
              </p>
            )}
          </>
        )}
      </section>

      <div className="mt-4">
        <InstalarApp compacto />
      </div>

      <p className="mt-6 text-center text-xs text-grafite">
        Ao entrar, você concorda com os{" "}
        <a href={`${URL_SITE}/termos`} target="_blank" rel="noopener" className="underline">
          termos de uso
        </a>{" "}
        e a{" "}
        <a href={`${URL_SITE}/privacidade`} target="_blank" rel="noopener" className="underline">
          política de privacidade
        </a>
        .
      </p>
    </main>
  );
}
