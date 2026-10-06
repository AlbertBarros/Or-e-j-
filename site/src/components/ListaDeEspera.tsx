import { useEffect, useRef, useState } from "react";
import { emailValido, whatsappValido, gravarLead } from "../lib/leads";

interface Props {
  profissaoSlug: string;
  profissaoNome: string;
  aoFechar: () => void;
}

/**
 * Enquanto o app não existe, "Salvar e enviar pelo WhatsApp" abre esta lista de espera.
 * Na Fase 5 este botão passa a levar ao cadastro com o orçamento preenchido.
 */
export default function ListaDeEspera({ profissaoSlug, profissaoNome, aoFechar }: Props) {
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [estado, setEstado] = useState<"editando" | "enviando" | "enviado">("editando");
  const [erro, setErro] = useState<string | null>(null);
  const primeiroCampo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    primeiroCampo.current?.focus();
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") aoFechar();
    }
    document.addEventListener("keydown", escape);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", escape);
      document.body.style.overflow = overflowAnterior;
    };
  }, [aoFechar]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!emailValido(email)) {
      setErro("E-mail inválido. Confira se digitou certo, com o @ e o ponto.");
      return;
    }
    if (!whatsappValido(whatsapp)) {
      setErro("WhatsApp inválido. Digite com DDD, por exemplo (61) 99999-8888.");
      return;
    }
    setEstado("enviando");
    try {
      await gravarLead({ email, whatsapp, profissao: profissaoSlug, origem: `site:${profissaoSlug}` });
      setEstado("enviado");
    } catch (err) {
      console.error(err);
      setEstado("editando");
      setErro("Não deu para salvar agora. Confira sua conexão e tente de novo.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/50 p-0 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="le-titulo"
        className="w-full max-w-md rounded-t-2xl bg-folha p-5 shadow-xl sm:rounded-2xl"
      >
        {estado === "enviado" ? (
          <div>
            <h2 id="le-titulo" className="text-xl font-semibold">
              Pronto! Você está na lista.
            </h2>
            <p className="mt-2 text-grafite">
              Avisamos você no e-mail e no WhatsApp assim que der para enviar orçamentos e receber a aprovação por
              link. Enquanto isso, o PDF já está liberado.
            </p>
            <button type="button" onClick={aoFechar} className="botao-primario mt-5 w-full">
              Voltar ao orçamento
            </button>
          </div>
        ) : (
          <form onSubmit={enviar} noValidate>
            <h2 id="le-titulo" className="text-xl font-semibold">
              Enviar pelo WhatsApp e receber a aprovação por link
            </h2>
            <p className="mt-2 text-sm text-grafite">
              Essa parte está quase pronta. Deixe seu contato e avisamos você quando abrir. É grátis para começar.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="le-email" className="rotulo">
                  Seu e-mail
                </label>
                <input
                  id="le-email"
                  ref={primeiroCampo}
                  className="campo"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="le-whats" className="rotulo">
                  Seu WhatsApp
                </label>
                <input
                  id="le-whats"
                  className="campo"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(61) 99999-8888"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  required
                />
              </div>
              <p className="text-sm text-grafite">
                Profissão: <strong className="text-tinta">{profissaoNome}</strong>
              </p>
            </div>
            {erro && (
              <p role="alert" className="mt-3 rounded-[10px] bg-[#FDECEF] px-3 py-2 text-sm text-recusado">
                {erro}
              </p>
            )}
            <div className="mt-5 grid gap-2">
              <button type="submit" disabled={estado === "enviando"} className="botao-primario w-full">
                {estado === "enviando" ? "Salvando…" : "Quero ser avisado"}
              </button>
              <button type="button" onClick={aoFechar} className="botao-secundario w-full">
                Agora não
              </button>
            </div>
            <p className="mt-3 text-xs text-grafite">Usamos seu contato só para avisar do lançamento. Sem spam.</p>
          </form>
        )}
      </div>
    </div>
  );
}
