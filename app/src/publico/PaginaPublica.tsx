import { useEffect, useState } from "react";
import Logo from "@/componentes/Logo";
import DocumentoOrcamento from "@/componentes/DocumentoOrcamento";
import Carregando from "@/componentes/Carregando";
import { buscarLogoPublica, buscarOrcamentoPublico, responderOrcamento } from "./firestorePublico";
import BlocoPix from "./BlocoPix";
import { registrarEventoPublico } from "./eventosPublico";
import { inicioDoDia, paraDate } from "@/lib/datas";
import type { Orcamento } from "@/tipos";
import { formatarData, linkWhatsapp } from "@shared/src/mensagens";

const SITE = "https://orca-ja-6cz.pages.dev";

type Estado = "carregando" | "nao-encontrado" | "indisponivel" | "expirado" | "enviado" | "aprovado" | "recusado" | "pago";

function estadoDe(o: Orcamento | null): Estado {
  if (!o) return "nao-encontrado";
  if (o.status === "rascunho") return "indisponivel";
  if (o.status === "enviado") {
    const validade = paraDate(o.validadeAte);
    if (validade && inicioDoDia(validade) < inicioDoDia(new Date())) return "expirado";
    return "enviado";
  }
  return o.status;
}

/** T6 — Página pública /o/:id: o cliente vê o orçamento e aprova ou recusa, sem login. */
export default function PaginaPublica({ id }: { id: string }) {
  const [orcamento, setOrcamento] = useState<Orcamento | null>(null);
  const [estado, setEstado] = useState<Estado>("carregando");
  const [logo, setLogo] = useState<string | null>(null);
  const [respondendo, setRespondendo] = useState<"aprovado" | "recusado" | null>(null);
  const [recemAprovado, setRecemAprovado] = useState(false);
  const [confirmarRecusa, setConfirmarRecusa] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    buscarOrcamentoPublico(id)
      .then(async (o) => {
        if (cancelado) return;
        setOrcamento(o);
        setEstado(estadoDe(o));
        if (o?.negocio.mostrarLogo) {
          const l = await buscarLogoPublica(o.ownerId).catch(() => null);
          if (!cancelado) setLogo(l);
        }
      })
      .catch((e) => {
        console.error(e);
        if (!cancelado) {
          setErro("Não deu para abrir o orçamento. Confira a internet e tente de novo.");
          setEstado("nao-encontrado");
        }
      });
    return () => {
      cancelado = true;
    };
  }, [id]);

  useEffect(() => {
    if (orcamento) document.title = `Orçamento nº ${orcamento.numero} — ${orcamento.negocio.nome}`;
  }, [orcamento]);

  async function responder(resposta: "aprovado" | "recusado") {
    if (!orcamento) return;
    setErro(null);
    setRespondendo(resposta);
    try {
      await responderOrcamento(orcamento.id, resposta);
      registrarEventoPublico(resposta === "aprovado" ? "orcamento_aprovado" : "orcamento_recusado", orcamento.id);
      setOrcamento({ ...orcamento, status: resposta });
      setEstado(resposta);
      if (resposta === "aprovado") setRecemAprovado(true);
    } catch (e) {
      console.error(e);
      setErro("Não deu para registrar sua resposta. Tente de novo ou fale com o profissional pelo WhatsApp.");
    } finally {
      setRespondendo(null);
      setConfirmarRecusa(false);
    }
  }

  if (estado === "carregando") return <Carregando texto="Abrindo o orçamento…" />;

  const negocio = orcamento?.negocio;
  const falarComProfissional = negocio
    ? linkWhatsapp(negocio.whatsapp, `Olá! Vi o orçamento nº ${orcamento?.numero} e gostaria de falar sobre ele.`)
    : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[720px] flex-col px-4 pb-36 pt-4">
      {estado === "nao-encontrado" || estado === "indisponivel" || !orcamento ? (
        <section className="documento mt-10 p-8 text-center">
          <Logo tamanho={36} className="justify-center" />
          <h1 className="mt-6 text-2xl font-semibold">
            {estado === "indisponivel" ? "Este orçamento ainda não foi enviado." : "Orçamento não encontrado."}
          </h1>
          <p className="mt-2 text-grafite">
            {erro ?? (estado === "indisponivel" ? "Peça ao profissional para enviá-lo de novo." : "O link pode estar errado ou o orçamento foi removido.")}
          </p>
          <a href={SITE} className="botao-secundario mt-6 !w-auto px-6">
            Conhecer o Orça Já
          </a>
        </section>
      ) : (
        <>
          <p className="mb-3 text-center text-sm text-grafite">
            {negocio?.nome} enviou um orçamento para você
          </p>

          <div className="relative">
            <DocumentoOrcamento orcamento={orcamento} logoDataUrl={logo} rodapeMarca={false} />
            {(estado === "aprovado" || estado === "pago") && (
              <div
                className={`carimbo pointer-events-none absolute right-6 top-24 rounded-md border-4 px-4 py-1 text-3xl font-bold uppercase tracking-widest ${
                  estado === "pago" ? "border-pago text-pago" : "border-pago text-pago"
                } ${recemAprovado ? "carimbo-animado" : ""}`}
                aria-hidden="true"
              >
                {estado === "pago" ? "Pago" : "Aprovado"}
              </div>
            )}
          </div>

          {erro && (
            <p role="alert" className="mt-3 rounded-[10px] bg-[#FDECEF] px-3 py-2 text-sm text-recusado">
              {erro}
            </p>
          )}

          {/* Mensagens por estado */}
          <section className="mt-4" aria-live="polite">
            {estado === "aprovado" && (
              <div className="documento p-5">
                <h2 className="text-xl font-semibold text-pago">Orçamento aprovado!</h2>
                <p className="mt-1 text-grafite">
                  {negocio?.nome} já foi avisado.{" "}
                  {negocio?.mostrarPix ? "Você já pode pagar pelo Pix abaixo." : "Ele vai combinar o pagamento e o serviço com você."}
                </p>
                {falarComProfissional && (
                  <a href={falarComProfissional} target="_blank" rel="noopener" className="botao-secundario mt-4">
                    Falar com {negocio?.nome} no WhatsApp
                  </a>
                )}
              </div>
            )}
            {estado === "aprovado" && negocio?.mostrarPix && (
              <div className={`mt-4 ${recemAprovado ? "bloco-pix-animado" : ""}`}>
                <BlocoPix orcamento={orcamento} />
              </div>
            )}
            {estado === "recusado" && (
              <div className="documento p-5">
                <h2 className="text-xl font-semibold">Você recusou este orçamento.</h2>
                <p className="mt-1 text-grafite">Mudou de ideia ou quer ajustar algo? É só chamar o profissional.</p>
                {falarComProfissional && (
                  <a href={falarComProfissional} target="_blank" rel="noopener" className="botao-secundario mt-4">
                    Falar com {negocio?.nome} no WhatsApp
                  </a>
                )}
              </div>
            )}
            {estado === "pago" && (
              <div className="documento p-5">
                <h2 className="text-xl font-semibold text-pago">
                  Pago{paraDate(orcamento.pagoEm) ? ` em ${formatarData(paraDate(orcamento.pagoEm)!)}` : ""}
                </h2>
                <p className="mt-1 text-grafite">Obrigado! Este orçamento já foi quitado.</p>
              </div>
            )}
            {estado === "expirado" && (
              <div className="documento p-5">
                <h2 className="text-xl font-semibold text-atraso">Orçamento expirado</h2>
                <p className="mt-1 text-grafite">
                  Este orçamento valia até {paraDate(orcamento.validadeAte) ? formatarData(paraDate(orcamento.validadeAte)!) : "a data combinada"}. Fale com {negocio?.nome} para receber um
                  atualizado.
                </p>
                {falarComProfissional && (
                  <a href={falarComProfissional} target="_blank" rel="noopener" className="botao-primario mt-4">
                    Falar com {negocio?.nome} no WhatsApp
                  </a>
                )}
              </div>
            )}
          </section>

          {negocio?.mostrarMarca && (
            <p className="mt-6 text-center text-xs text-grafite">
              Feito com{" "}
              <a href={SITE} className="font-medium text-carbono underline">
                Orça Já
              </a>{" "}
              — crie o seu grátis
            </p>
          )}

          {/* Ações do cliente */}
          {estado === "enviado" && (
            <div className="fixed inset-x-0 bottom-0 border-t border-pauta bg-folha p-4">
              <div className="mx-auto max-w-[720px] space-y-2">
                {confirmarRecusa ? (
                  <>
                    <p className="text-center text-sm text-grafite">Tem certeza que quer recusar?</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setConfirmarRecusa(false)} className="botao-secundario" disabled={respondendo !== null}>
                        Voltar
                      </button>
                      <button type="button" onClick={() => responder("recusado")} className="botao-primario !bg-recusado hover:!bg-[#7f0f2e]" disabled={respondendo !== null}>
                        {respondendo === "recusado" ? "Registrando…" : "Recusar mesmo"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => responder("aprovado")} className="botao-primario !bg-pago hover:!bg-[#116632]" disabled={respondendo !== null}>
                      {respondendo === "aprovado" ? "Aprovando…" : "Aprovar orçamento"}
                    </button>
                    <button type="button" onClick={() => setConfirmarRecusa(true)} className="botao-texto w-full" disabled={respondendo !== null}>
                      Recusar
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
