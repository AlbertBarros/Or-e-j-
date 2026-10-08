import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { createPortal } from "react-dom";
import CabecalhoPagina from "@/componentes/CabecalhoPagina";
import Campo from "@/componentes/Campo";
import Carregando from "@/componentes/Carregando";
import Confirmar from "@/componentes/Confirmar";
import DocumentoOrcamento from "@/componentes/DocumentoOrcamento";
import EscolherModelo from "@/componentes/EscolherModelo";
import type { ModeloDocumento } from "@/tipos";
import Selo from "@/componentes/Selo";
import { useAuth } from "@/hooks/useAuth";
import { useOrcamento } from "@/hooks/useOrcamentos";
import { useContratos } from "@/hooks/useDados";
import { IconeContratos } from "@/componentes/Icones";
import {
  definirModelo,
  desfazerPago,
  enviarOrcamento,
  estaAtrasado,
  excluirOrcamento,
  linkEnvioWhatsapp,
  linkPublico,
  marcarComoPago,
  voltarParaRascunho,
  LimiteAtingidoError,
} from "@/lib/orcamentos";
import { buscarLogo } from "@/lib/usuario";
import { LIMITE_FREE } from "@/lib/firebase";
import { dataParaInput, inputParaData } from "@/lib/datas";
import { registrarEvento } from "@/lib/eventos";


function IconeWhatsapp() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1.1 2.7.1.2 1.9 2.9 4.6 4 1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

/** T5 — Detalhe do orçamento (visão do profissional), com as ações de cada status. */
export default function DetalheOrcamento() {
  const { id } = useParams();
  const { usuario, perfil } = useAuth();
  const navegar = useNavigate();
  const { orcamento, carregando, erro } = useOrcamento(id);
  const { contratos } = useContratos(usuario?.uid);
  const contratoDeste = contratos.find((c) => c.orcamentoId === id && c.status !== "cancelado");
  const [logo, setLogo] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<"excluir" | "editar" | "desfazerPago" | null>(null);
  const [marcandoPago, setMarcandoPago] = useState(false);
  const [dataPagamento, setDataPagamento] = useState(dataParaInput(new Date()));
  const [ocupado, setOcupado] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [limiteAtingido, setLimiteAtingido] = useState(false);
  const [linkPendente, setLinkPendente] = useState<string | null>(null);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [escolhendoModelo, setEscolhendoModelo] = useState<"enviar" | "reenviar" | null>(null);

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
    if (!janela) setLinkPendente(link);
  }

  async function enviar(modelo?: ModeloDocumento) {
    if (!orcamento || !usuario) return;
    setErroAcao(null);
    setOcupado(true);
    try {
      if (modelo && modelo !== orcamento.modelo) await definirModelo(orcamento.id, modelo);
      await enviarOrcamento(usuario.uid, orcamento);
      setEscolhendoModelo(null);
      registrarEvento("orcamento_enviado", { uid: usuario.uid, orcamentoId: orcamento.id });
      abrirWhatsapp(linkEnvioWhatsapp(orcamento));
    } catch (e) {
      if (e instanceof LimiteAtingidoError) {
        setLimiteAtingido(true);
        registrarEvento("limite_free_atingido", { uid: usuario.uid });
      }
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

  async function baixarPdf(modelo?: ModeloDocumento) {
    if (!orcamento) return;
    setGerandoPdf(true);
    setErroAcao(null);
    try {
      if (modelo && modelo !== orcamento.modelo && orcamento.status === "rascunho") await definirModelo(orcamento.id, modelo);
      const { gerarPdfOrcamento, baixarArquivo } = await import("@/pdf/gerarPdf");
      baixarArquivo(await gerarPdfOrcamento(orcamento, logo, modelo));
    } catch (e) {
      console.error(e);
      setErroAcao("Não deu para gerar o PDF. Tente de novo.");
    } finally {
      setGerandoPdf(false);
    }
  }

  async function confirmarPago() {
    if (!orcamento) return;
    const data = inputParaData(dataPagamento);
    if (!data) {
      setErroAcao("Informe a data do pagamento.");
      return;
    }
    setOcupado(true);
    setErroAcao(null);
    try {
      await marcarComoPago(orcamento.id, data);
      registrarEvento("orcamento_pago", { uid: usuario?.uid, orcamentoId: orcamento.id });
      setMarcandoPago(false);
      setAviso("Marcado como pago");
    } catch (e) {
      console.error(e);
      setErroAcao("Não deu para marcar como pago. Tente de novo.");
    } finally {
      setOcupado(false);
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
      if (confirmacao === "desfazerPago") {
        await desfazerPago(orcamento.id);
        setAviso("Voltou para aprovado");
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
  const atrasado = estaAtrasado(orcamento);
  const pro = perfil?.plano === "pro";

  const botaoPdf = (
    <button type="button" onClick={() => baixarPdf()} disabled={gerandoPdf} className="botao-texto w-full">
      {gerandoPdf ? "Gerando PDF…" : "Baixar PDF do orçamento"}
    </button>
  );

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 pb-48">
      <CabecalhoPagina titulo={`Orçamento nº ${numero}`} acao={<Selo orcamento={orcamento} />} />

      <div className="mt-4">
        <DocumentoOrcamento orcamento={orcamento} logoDataUrl={logo} />
      </div>

      {(status === "aprovado" || status === "pago") && (
        <Link to={contratoDeste ? `/contratos/${contratoDeste.id}` : `/contratos/novo?orcamento=${orcamento.id}`} className="cartao lista-item mt-3 !rounded-2xl border-dashed">
          <span className="botao-icone !bg-[#E6F4EA] !text-pago"><IconeContratos tamanho={20} /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{contratoDeste ? `Contrato nº ${String(contratoDeste.numero).padStart(4, "0")} · ${contratoDeste.status === "assinado" ? "assinado" : contratoDeste.status === "enviado" ? "aguardando assinatura" : "rascunho"}` : "Sugestão: gerar contrato de prestação de serviço"}</span>
            <span className="block text-sm text-grafite">{contratoDeste ? "Toque para ver, reenviar ou baixar o PDF." : "Já preenchido com os dados deste orçamento, para o cliente assinar pelo celular."}</span>
          </span>
        </Link>
      )}
      {status === "pago" && orcamento.recibo && (
        <p className="mt-3 text-center text-sm text-grafite">
          Recibo nº {String(orcamento.recibo.numero).padStart(4, "0")} emitido.
        </p>
      )}

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

      <div className="fixed inset-x-0 bottom-0 barra-fixa p-4">
        <div className="mx-auto max-w-[560px] space-y-2">
          {aviso && (
            <p role="status" className="rounded-xl bg-[#E6F4EA]/80 px-3 py-2 text-center text-sm font-medium text-pago backdrop-blur">
              {aviso}
            </p>
          )}

          {status === "rascunho" && (
            <>
              <button type="button" onClick={() => setEscolhendoModelo("enviar")} disabled={ocupado} className="botao-primario">
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
              {botaoPdf}
            </>
          )}

          {status === "enviado" && (
            <>
              <button type="button" onClick={() => setEscolhendoModelo("reenviar")} className="botao-primario">
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
              {botaoPdf}
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
              {botaoPdf}
            </>
          )}

          {status === "aprovado" && (
            <>
              <button type="button" onClick={() => setMarcandoPago(true)} className="botao-primario !bg-pago hover:!bg-[#116632]">
                Marcar como pago
              </button>
              <div className="flex gap-2">
                <Link to={`/orcamentos/${orcamento.id}/cobrar`} className={`botao-secundario ${atrasado ? "!border-atraso !text-atraso" : ""}`}>
                  Cobrar
                </Link>
                <button type="button" onClick={copiarLink} className="botao-secundario">
                  {pro ? "Copiar link do Pix" : "Copiar link"}
                </button>
              </div>
              {botaoPdf}
            </>
          )}

          {status === "pago" && (
            <>
              <Link to={`/orcamentos/${orcamento.id}/recibo`} className="botao-primario">
                {orcamento.recibo ? "Ver e enviar recibo" : "Gerar recibo"}
              </Link>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmacao("desfazerPago")} className="botao-secundario">
                  Desfazer pago
                </button>
                <button type="button" onClick={copiarLink} className="botao-secundario">
                  Copiar link
                </button>
              </div>
              {botaoPdf}
            </>
          )}
        </div>
      </div>

      {marcandoPago &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/40 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && !ocupado) setMarcandoPago(false);
            }}
          >
            <div role="dialog" aria-modal="true" aria-labelledby="pago-titulo" className="w-full max-w-md vidro-forte rounded-t-2xl p-5 sm:rounded-2xl">
              <h2 id="pago-titulo" className="text-xl font-semibold">
                Marcar como pago
              </h2>
              <p className="mt-1 text-sm text-grafite">O valor entra em "Recebido no mês" na data informada.</p>
              <div className="mt-4">
                <Campo id="dataPagamento" rotulo="Data do pagamento" type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
              </div>
              <div className="mt-5 grid gap-2">
                <button type="button" onClick={confirmarPago} disabled={ocupado} className="botao-primario !bg-pago hover:!bg-[#116632]">
                  {ocupado ? "Salvando…" : "Confirmar pagamento"}
                </button>
                <button type="button" onClick={() => setMarcandoPago(false)} disabled={ocupado} className="botao-secundario">
                  Cancelar
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {escolhendoModelo && (
        <EscolherModelo
          orcamento={orcamento}
          logo={logo}
          modeloInicial={orcamento.modelo ?? perfil?.modeloDocumento ?? 2}
          ocupado={ocupado || gerandoPdf}
          textoEnviar={escolhendoModelo === "enviar" ? "Enviar no WhatsApp" : "Reenviar no WhatsApp"}
          aoEnviar={async (m) => {
            if (escolhendoModelo === "enviar") {
              await enviar(m);
            } else {
              if (m !== orcamento.modelo) await definirModelo(orcamento.id, m).catch(console.error);
              setEscolhendoModelo(null);
              abrirWhatsapp(linkEnvioWhatsapp(orcamento));
            }
          }}
          aoBaixarPdf={(m) => baixarPdf(m)}
          aoFechar={() => setEscolhendoModelo(null)}
        />
      )}
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
      {confirmacao === "desfazerPago" && (
        <Confirmar
          titulo="Desfazer o pagamento?"
          texto="O orçamento volta para aprovado e sai de 'Recebido no mês'. Use se marcou como pago por engano."
          textoConfirmar="Voltar para aprovado"
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
          aoConfirmar={() => navegar("/conta#plano")}
          aoCancelar={() => setLimiteAtingido(false)}
        />
      )}
    </main>
  );
}
