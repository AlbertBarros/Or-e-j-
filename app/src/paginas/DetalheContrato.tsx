import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import CabecalhoPagina from "@/componentes/CabecalhoPagina";
import Carregando from "@/componentes/Carregando";
import Confirmar from "@/componentes/Confirmar";
import { IconeWhatsapp } from "@/componentes/Icones";
import { useAuth } from "@/hooks/useAuth";
import { useContrato } from "@/hooks/useDados";
import { atualizarTextoContrato, cancelarContrato, excluirContrato, linkEnvioContrato, linkPublicoContrato, marcarContratoEnviado, ROTULO_STATUS_CONTRATO } from "@/lib/contratos";
import { buscarLogo } from "@/lib/usuario";
import { paraDate } from "@/lib/datas";
import { formatarData } from "@shared/src/mensagens";

/** Contrato: revisar/editar texto, enviar, copiar link, acompanhar assinatura e baixar PDF. */
export default function DetalheContrato() {
  const { id } = useParams();
  const { usuario, perfil } = useAuth();
  const navegar = useNavigate();
  const { contrato, carregando, erro } = useContrato(id);
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<"excluir" | "cancelar" | null>(null);
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    if (usuario && perfil?.temLogo) buscarLogo(usuario.uid).then(setLogo).catch(() => setLogo(null));
  }, [usuario, perfil?.temLogo]);
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3000);
    return () => clearTimeout(t);
  }, [aviso]);

  if (carregando) return <Carregando />;
  if (erro || !contrato || contrato.ownerId !== usuario?.uid) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4">
        <CabecalhoPagina titulo="Contrato" voltarPara="/contratos" />
        <p className="cartao mt-6 p-6 text-center text-grafite">{erro ?? "Contrato não encontrado."}</p>
      </main>
    );
  }
  const c = contrato;
  const numero = String(c.numero).padStart(4, "0");
  const assinado = c.status === "assinado";

  function abrir(link: string) {
    const j = window.open(link, "_blank", "noopener");
    if (!j) setErroAcao("O navegador bloqueou a abertura. Toque em Copiar link e cole no WhatsApp.");
  }

  async function enviar() {
    setOcupado(true);
    setErroAcao(null);
    try {
      if (c.status === "rascunho") await marcarContratoEnviado(c.id);
      registrarEnvio();
      abrir(linkEnvioContrato(c));
    } catch (e) {
      console.error(e);
      setErroAcao("Não deu para enviar. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }
  function registrarEnvio() {
    import("@/lib/eventos").then(({ registrarEvento }) => registrarEvento("contrato_enviado", { uid: usuario?.uid, orcamentoId: c.orcamentoId }));
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(linkPublicoContrato(c.id));
      setAviso("Link copiado");
    } catch {
      setErroAcao("Não deu para copiar: " + linkPublicoContrato(c.id));
    }
  }

  async function salvarTexto() {
    setOcupado(true);
    try {
      await atualizarTextoContrato(c.id, texto);
      setEditando(false);
      setAviso("Texto salvo");
    } catch {
      setErroAcao("Não deu para salvar o texto.");
    } finally {
      setOcupado(false);
    }
  }

  async function baixarPdf() {
    setOcupado(true);
    setErroAcao(null);
    try {
      const { gerarPdfContrato, baixarArquivo } = await import("@/pdf/gerarPdf");
      baixarArquivo(await gerarPdfContrato(c, logo));
    } catch (e) {
      console.error(e);
      setErroAcao("Não deu para gerar o PDF.");
    } finally {
      setOcupado(false);
    }
  }

  async function confirmar() {
    setOcupado(true);
    try {
      if (confirmacao === "excluir") {
        await excluirContrato(c.id);
        navegar("/contratos", { replace: true });
        return;
      }
      if (confirmacao === "cancelar") {
        await cancelarContrato(c.id);
        setAviso("Contrato cancelado");
      }
    } catch {
      setErroAcao("Não deu para concluir. Tente de novo.");
    } finally {
      setOcupado(false);
      setConfirmacao(null);
    }
  }

  const assinadoEm = paraDate(c.assinatura?.assinadoEm);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 pb-44">
      <CabecalhoPagina
        titulo={`Contrato nº ${numero}`}
        voltarPara="/contratos"
        acao={<span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${assinado ? "bg-[#E6F4EA] text-pago" : c.status === "enviado" ? "bg-[#FDF3E7] text-atraso" : "bg-pauta text-grafite"}`}>{ROTULO_STATUS_CONTRATO[c.status]}</span>}
      />

      {assinado && c.assinatura && (
        <section className="cartao mt-4 flex items-center gap-4 p-4">
          <img src={c.assinatura.imagem} alt={`Assinatura de ${c.assinatura.nome}`} className="h-16 w-36 rounded-lg border border-pauta bg-white object-contain" />
          <div className="min-w-0 text-sm">
            <p className="font-semibold">Assinado por {c.assinatura.nome}</p>
            <p className="text-grafite">{assinadoEm ? `${formatarData(assinadoEm)} às ${assinadoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}</p>
            <p className="truncate text-xs text-grafite">{c.assinatura.agente}</p>
          </div>
        </section>
      )}

      <p className="mt-3 text-sm text-grafite">
        Base: <Link to={`/orcamentos/${c.orcamentoId}`} className="font-medium text-carbono underline">orçamento nº {String(c.orcamentoNumero).padStart(4, "0")}</Link>
        {c.status === "rascunho" && " · Revise o texto abaixo antes de enviar. Depois de enviado, ele não muda."}
      </p>

      <section className="documento mt-3 p-5" aria-label="Texto do contrato">
        {editando ? (
          <textarea className="campo min-h-[60vh] py-3 font-mono text-sm leading-relaxed" value={texto} onChange={(e) => setTexto(e.target.value)} />
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed">{c.texto}</pre>
        )}
      </section>

      {erroAcao && (
        <p role="alert" className="mt-3 rounded-xl bg-[#FDECEF] px-3 py-2 text-sm text-recusado">
          {erroAcao}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-pauta bg-folha p-4">
        <div className="mx-auto max-w-[560px] space-y-2">
          {aviso && (
            <p role="status" className="rounded-xl bg-[#E6F4EA] px-3 py-2 text-center text-sm font-medium text-pago">
              {aviso}
            </p>
          )}
          {editando ? (
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditando(false)} className="botao-secundario !w-auto px-4" disabled={ocupado}>
                Cancelar
              </button>
              <button type="button" onClick={salvarTexto} className="botao-primario" disabled={ocupado}>
                {ocupado ? "Salvando…" : "Salvar texto"}
              </button>
            </div>
          ) : c.status === "cancelado" ? (
            <>
              <button type="button" onClick={baixarPdf} className="botao-secundario" disabled={ocupado}>
                Baixar PDF
              </button>
              <button type="button" onClick={() => setConfirmacao("excluir")} className="botao-texto w-full !text-recusado">
                Excluir
              </button>
            </>
          ) : assinado ? (
            <>
              <button type="button" onClick={baixarPdf} className="botao-primario" disabled={ocupado}>
                {ocupado ? "Gerando…" : "Baixar PDF assinado"}
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={copiarLink} className="botao-secundario">
                  Copiar link
                </button>
                <button type="button" onClick={() => abrir(linkEnvioContrato(c))} className="botao-secundario">
                  <IconeWhatsapp /> Reenviar
                </button>
              </div>
            </>
          ) : (
            <>
              <button type="button" onClick={enviar} className="botao-primario" disabled={ocupado}>
                <IconeWhatsapp /> {c.status === "rascunho" ? "Enviar para assinatura" : "Reenviar no WhatsApp"}
              </button>
              <div className="flex gap-2">
                {c.status === "rascunho" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setTexto(c.texto);
                      setEditando(true);
                    }}
                    className="botao-secundario"
                  >
                    Editar texto
                  </button>
                ) : (
                  <button type="button" onClick={copiarLink} className="botao-secundario">
                    Copiar link
                  </button>
                )}
                <button type="button" onClick={baixarPdf} className="botao-secundario" disabled={ocupado}>
                  PDF
                </button>
              </div>
              <button type="button" onClick={() => setConfirmacao(c.status === "rascunho" ? "excluir" : "cancelar")} className="botao-texto w-full !text-recusado">
                {c.status === "rascunho" ? "Excluir" : "Cancelar contrato"}
              </button>
            </>
          )}
        </div>
      </div>

      {confirmacao && (
        <Confirmar
          titulo={confirmacao === "excluir" ? `Excluir o contrato nº ${numero}?` : `Cancelar o contrato nº ${numero}?`}
          texto={confirmacao === "excluir" ? "Essa ação não pode ser desfeita." : "O link enviado ao cliente deixa de permitir a assinatura."}
          textoConfirmar={confirmacao === "excluir" ? "Excluir" : "Cancelar contrato"}
          perigo
          ocupado={ocupado}
          aoConfirmar={confirmar}
          aoCancelar={() => setConfirmacao(null)}
        />
      )}
    </main>
  );
}
