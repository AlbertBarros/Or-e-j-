import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import CabecalhoPagina from "@/componentes/CabecalhoPagina";
import Carregando from "@/componentes/Carregando";
import Confirmar from "@/componentes/Confirmar";
import DocumentoOrcamento from "@/componentes/DocumentoOrcamento";
import Selo from "@/componentes/Selo";
import { useAuth } from "@/hooks/useAuth";
import { useOrcamento } from "@/hooks/useOrcamentos";
import {
  enviarOrcamento,
  excluirOrcamento,
  linkEnvioWhatsapp,
  linkPublico,
  voltarParaRascunho,
  LimiteAtingidoError,
} from "@/lib/orcamentos";
import { buscarLogo } from "@/lib/usuario";
import { LIMITE_FREE } from "@/lib/firebase";

const URL_PRECOS = "https://orca-ja-6cz.pages.dev/precos";

function IconeWhatsapp() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1.1 2.7.1.2 1.9 2.9 4.6 4 1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

/** T5 — Detalhe do orçamento (visão do profissional), com ações por status. */
export default function DetalheOrcamento() {
  const { id } = useParams();
  const { usuario, perfil } = useAuth();
  const navegar = useNavigate();
  const { orcamento, carregando, erro } = useOrcamento(id);
  const [logo, setLogo] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<"excluir" | "editar" | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [limiteAtingido, setLimiteAtingido] = useState(false);
  const [linkPendente, setLinkPendente] = useState<string | null>(null);

  useEffect(() => {
    if (usuario && perfil?.temLogo) buscarLogo(usuario.uid).then(setLogo).catch(() => setLogo(null));
  }, [usuario, perfil?.temLogo]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3000);
    return () => clearTimeout(t);
  }, [aviso]);

  function abrirWhatsapp(link: string) {
    const janela = window.open(link, "_blank", "noopener");
    if (!janela) setLinkPendente(link); // pop-up bloqueado: mostra um botão para abrir
  }

  async function enviar() {
    if (!orcamento || !usuario) return;
    setErroAcao(null);
    setOcupado(true);
    try {
      await enviarOrcamento(usuario.uid, orcamento);
      abrirWhatsapp(linkEnvioWhatsapp(orcamento));
    } catch (e) {
      if (e instanceof LimiteAtingidoError) setLimiteAtingido(true);
      else {
        console.error(e);
        setErroAcao("Não deu para enviar. Confira a internet e tente de novo.");
      }
    } finally {
      setOcupado(false);
    }
  }

  async function copiarLink() {
    if (!orcamento) return;
    try {
      await navigator.clipboard.writeText(linkPublico(orcamento.id));
      setAviso("Link copiado");
    } catch {
      setErroAcao("Não deu para copiar. Segure no link para copiar: " + linkPublico(orcamento.id));
    }
  }

  async function confirmar() {
    if (!orcamento) return;
    setOcupado(true);
    try {
      if (confirmacao === "excluir") {
        await excluirOrcamento(orcamento.id);
        navegar("/", { replace: true });
        return;
      }
      if (confirmacao === "editar") {
        await voltarParaRascunho(orcamento.id);
        navegar(`/orcamentos/${orcamento.id}/editar`);
        return;
      }
    } catch (e) {
      console.error(e);
      setErroAcao("Não deu para concluir a ação. Tente de novo.");
    } finally {
      setOcupado(false);
      setConfirmacao(null);
    }
  }

  if (carregando) return <Carregando />;

  if (erro || !orcamento || orcamento.ownerId !== usuario?.uid) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4">
        <CabecalhoPagina titulo="Orçamento" />
        <p className="documento mt-6 p-6 text-center text-grafite">{erro ?? "Orçamento não encontrado."}</p>
        <Link to="/" className="botao-secundario mt-4">
          Voltar ao painel
        </Link>
      </main>
    );
  }

  const numero = String(orcamento.numero).padStart(4, "0");
  const status = orcamento.status;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 pb-40">
      <CabecalhoPagina titulo={`Orçamento nº ${numero}`} acao={<Selo orcamento={orcamento} />} />

      <div className="mt-4">
        <DocumentoOrcamento orcamento={orcamento} logoDataUrl={logo} />
      </div>

      {erroAcao && (
        <p role="alert" className="mt-3 rounded-[10px] bg-[#FDECEF] px-3 py-2 text-sm text-recusado">
          {erroAcao}
        </p>
      )}
      {linkPendente && (
        <div className="mt-3 rounded-[10px] border border-pauta bg-folha p-3 text-sm">
          <p className="text-grafite">O navegador bloqueou a abertura automática do WhatsApp.</p>
          <a href={linkPendente} target="_blank" rel="noopener" className="botao-primario mt-2" onClick={() => setLinkPendente(null)}>
            <IconeWhatsapp /> Abrir o WhatsApp
          </a>
        </div>
      )}

      {/* Barra de ações por status */}
      <div className="fixed inset-x-0 bottom-0 border-t border-pauta bg-folha p-4">
        <div className="mx-auto max-w-[560px] space-y-2">
          {aviso && (
            <p role="status" className="rounded-[10px] bg-[#E6F4EA] px-3 py-2 text-center text-sm font-medium text-pago">
              {aviso}
            </p>
          )}

          {status === "rascunho" && (
            <>
              <button type="button" onClick={enviar} disabled={ocupado} className="botao-primario">
                <IconeWhatsapp /> {ocupado ? "Enviando…" : "Enviar no WhatsApp"}
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmacao("excluir")} className="botao-secundario !text-recusado">
                  Excluir
                </button>
                <Link to={`/orcamentos/${orcamento.id}/editar`} className="botao-secundario">
                  Editar
                </Link>
              </div>
            </>
          )}

          {status === "enviado" && (
            <>
              <button type="button" onClick={() => abrirWhatsapp(linkEnvioWhatsapp(orcamento))} className="botao-primario">
                <IconeWhatsapp /> Reenviar no WhatsApp
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={copiarLink} className="botao-secundario">
                  Copiar link
                </button>
                <button type="button" onClick={() => setConfirmacao("editar")} className="botao-secundario">
                  Editar
                </button>
              </div>
            </>
          )}

          {status === "recusado" && (
            <>
              <button type="button" onClick={() => setConfirmacao("editar")} className="botao-primario">
                Editar e reenviar
              </button>
              <button type="button" onClick={copiarLink} className="botao-secundario">
                Copiar link
              </button>
            </>
          )}

          {(status === "aprovado" || status === "pago") && (
            <>
              <p className="text-center text-xs text-grafite">
                {status === "aprovado" ? "Cobrar e Marcar como pago chegam na próxima etapa." : "Gerar recibo chega na próxima etapa."}
              </p>
              <button type="button" onClick={copiarLink} className="botao-secundario">
                Copiar link
              </button>
            </>
          )}
        </div>
      </div>

      {confirmacao === "excluir" && (
        <Confirmar
          titulo={`Excluir o orçamento nº ${numero}?`}
          texto="Essa ação não pode ser desfeita. O número não será reaproveitado."
          textoConfirmar="Excluir orçamento"
          perigo
          ocupado={ocupado}
          aoConfirmar={confirmar}
          aoCancelar={() => setConfirmacao(null)}
        />
      )}
      {confirmacao === "editar" && (
        <Confirmar
          titulo="Editar este orçamento?"
          texto="Ele volta a ser rascunho e o link que o cliente recebeu deixa de mostrar os botões de aprovar até você enviar de novo."
          textoConfirmar="Voltar a rascunho e editar"
          ocupado={ocupado}
          aoConfirmar={confirmar}
          aoCancelar={() => setConfirmacao(null)}
        />
      )}
      {limiteAtingido && (
        <Confirmar
          titulo={`Você usou os ${LIMITE_FREE} orçamentos grátis deste mês`}
          texto="O rascunho ficou salvo. No Pro, os envios são ilimitados, com Pix na aprovação, recibo em PDF e sua logo."
          textoConfirmar="Ver planos"
          aoConfirmar={() => window.open(URL_PRECOS, "_blank", "noopener")}
          aoCancelar={() => setLimiteAtingido(false)}
        />
      )}
    </main>
  );
}
