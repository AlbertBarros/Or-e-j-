import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import CabecalhoPagina from "@/componentes/CabecalhoPagina";
import Carregando from "@/componentes/Carregando";
import Confirmar from "@/componentes/Confirmar";
import DocumentoOrcamento from "@/componentes/DocumentoOrcamento";
import Selo from "@/componentes/Selo";
import { useAuth } from "@/hooks/useAuth";
import { useOrcamento } from "@/hooks/useOrcamentos";
import { excluirOrcamento } from "@/lib/orcamentos";
import { buscarLogo } from "@/lib/usuario";

/** T5 — Detalhe do orçamento (visão do profissional). Ações por status; nesta fase, as de rascunho. */
export default function DetalheOrcamento() {
  const { id } = useParams();
  const { usuario, perfil } = useAuth();
  const navegar = useNavigate();
  const { orcamento, carregando, erro } = useOrcamento(id);
  const [logo, setLogo] = useState<string | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  useEffect(() => {
    if (usuario && perfil?.temLogo) buscarLogo(usuario.uid).then(setLogo).catch(() => setLogo(null));
  }, [usuario, perfil?.temLogo]);

  async function excluir() {
    if (!orcamento) return;
    setExcluindo(true);
    try {
      await excluirOrcamento(orcamento.id);
      navegar("/", { replace: true });
    } catch (e) {
      console.error(e);
      setErroAcao("Não deu para excluir. Tente de novo.");
      setExcluindo(false);
      setConfirmandoExclusao(false);
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

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 pb-32">
      <CabecalhoPagina titulo={`Orçamento nº ${numero}`} acao={<Selo orcamento={orcamento} />} />

      <div className="mt-4">
        <DocumentoOrcamento orcamento={orcamento} logoDataUrl={logo} />
      </div>

      {erroAcao && (
        <p role="alert" className="mt-3 rounded-[10px] bg-[#FDECEF] px-3 py-2 text-sm text-recusado">
          {erroAcao}
        </p>
      )}

      {orcamento.status === "rascunho" ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-pauta bg-folha p-4">
          <div className="mx-auto max-w-[560px] space-y-2">
            <p className="text-center text-xs text-grafite">"Enviar no WhatsApp" chega na próxima etapa do app.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmandoExclusao(true)} className="botao-secundario !w-auto px-4 !text-recusado">
                Excluir
              </button>
              <Link to={`/orcamentos/${orcamento.id}/editar`} className="botao-primario">
                Editar
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-center text-sm text-grafite">As ações para este status chegam nas próximas etapas.</p>
      )}

      {confirmandoExclusao && (
        <Confirmar
          titulo={`Excluir o orçamento nº ${numero}?`}
          texto="Essa ação não pode ser desfeita. O número não será reaproveitado."
          textoConfirmar="Excluir orçamento"
          perigo
          ocupado={excluindo}
          aoConfirmar={excluir}
          aoCancelar={() => setConfirmandoExclusao(false)}
        />
      )}
    </main>
  );
}
