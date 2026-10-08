import { useEffect, useState } from "react";
import { Link } from "react-router";
import { IconeCheck, IconeSino } from "./Icones";
import { desligarPush, ligarPush, situacaoPush, testarNotificacao, type SituacaoPush } from "@/lib/push";
import { registrarEvento } from "@/lib/eventos";

interface Props {
  uid: string;
  /** Versão curta para cartões (Início, oferta do primeiro acesso). */
  compacto?: boolean;
  aoLigar?: () => void;
}

const O_QUE_AVISA = [
  "Cliente aprovou ou recusou um orçamento",
  "Cliente assinou um contrato",
  "Resumo da manhã: pagamentos atrasados, orçamentos sem resposta e contratos sem assinatura",
  "Seu teste ou plano Pro está acabando",
];

/** Ligar/desligar os avisos no celular (Web Push) neste aparelho. */
export default function AtivarAvisos({ uid, compacto = false, aoLigar }: Props) {
  const [situacao, setSituacao] = useState<SituacaoPush | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    situacaoPush()
      .then((s) => vivo && setSituacao(s))
      .catch(() => vivo && setSituacao("sem-suporte"));
    return () => {
      vivo = false;
    };
  }, []);

  async function ligar() {
    setOcupado(true);
    setMensagem(null);
    try {
      const s = await ligarPush(uid);
      setSituacao(s);
      if (s === "ativo") {
        await testarNotificacao();
        registrarEvento("avisos_ligados", { uid });
        setMensagem("Pronto! Mandamos um aviso de teste para este aparelho.");
        aoLigar?.();
      } else if (s === "bloqueado") {
        setMensagem("As notificações estão bloqueadas no navegador. Veja abaixo como liberar.");
      }
    } catch (e) {
      console.error(e);
      setMensagem("Não deu para ligar os avisos agora. Confira a internet e tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  async function desligar() {
    setOcupado(true);
    try {
      await desligarPush();
      setSituacao("desligado");
      setMensagem("Avisos desligados neste aparelho.");
    } finally {
      setOcupado(false);
    }
  }

  async function testar() {
    setMensagem((await testarNotificacao()) ? "Aviso de teste enviado. Olhe a barra de notificações." : "Não deu para mostrar o teste. Ligue os avisos de novo.");
  }

  if (situacao === null) return <p className="text-sm text-grafite">Verificando este aparelho…</p>;

  if (compacto) {
    if (situacao === "ativo" || situacao === "sem-suporte" || situacao === "bloqueado") return null;
    return (
      <div className="cartao flex items-center gap-3 p-3">
        <span className="botao-icone !bg-carbono-claro text-carbono">
          <IconeSino tamanho={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight">Saiba na hora quando aprovarem</p>
          <p className="text-sm text-grafite">{situacao === "instalar-iphone" ? "Instale o app na Tela de Início para receber avisos." : "Ligue os avisos no celular."}</p>
        </div>
        {situacao === "instalar-iphone" ? (
          <Link to="/ajuda#instalar" className="botao-secundario !min-h-10 !w-auto shrink-0 px-3 text-sm">
            Como
          </Link>
        ) : (
          <button type="button" onClick={ligar} disabled={ocupado} className="botao-primario !min-h-10 !w-auto shrink-0 px-4 text-sm">
            {ocupado ? "…" : "Ligar"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <ul className="space-y-1.5 text-sm">
        {O_QUE_AVISA.map((t) => (
          <li key={t} className="flex gap-2">
            <span className="mt-0.5 text-pago" aria-hidden="true">
              <IconeCheck tamanho={16} />
            </span>
            {t}
          </li>
        ))}
      </ul>

      <div className="mt-4" aria-live="polite">
        {situacao === "ativo" && (
          <>
            <p className="flex items-center gap-2 rounded-xl bg-[#E6F4EA] px-3 py-2 text-sm font-medium text-pago">
              <IconeCheck tamanho={18} /> Avisos ligados neste aparelho.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={testar} className="botao-secundario">
                Mandar um teste
              </button>
              <button type="button" onClick={desligar} disabled={ocupado} className="botao-secundario !text-recusado">
                Desligar
              </button>
            </div>
          </>
        )}
        {situacao === "desligado" && (
          <button type="button" onClick={ligar} disabled={ocupado} className="botao-primario">
            {ocupado ? "Ligando…" : "Ligar avisos neste aparelho"}
          </button>
        )}
        {situacao === "instalar-iphone" && (
          <p className="rounded-xl bg-[#FDF3E7] px-3 py-2 text-sm text-tinta">
            No iPhone, os avisos só funcionam com o app instalado. Siga o passo a passo de <a href="#instalar" className="font-semibold underline">Instalar o app</a>, abra pelo ícone novo e volte aqui.
          </p>
        )}
        {situacao === "bloqueado" && (
          <div className="rounded-xl bg-[#FDF3E7] px-3 py-2 text-sm text-tinta">
            <p className="font-semibold">As notificações estão bloqueadas para o Preço Fechado.</p>
            <p className="mt-1">
              Android: toque no cadeado ao lado do endereço (ou segure o ícone do app → Informações do app) → Notificações → Permitir. Computador: clique no cadeado da barra de endereço → Notificações → Permitir. Depois recarregue a página.
            </p>
          </div>
        )}
        {situacao === "sem-suporte" && (
          <p className="rounded-xl bg-pauta/60 px-3 py-2 text-sm text-grafite">
            Este navegador não recebe avisos. Use o Chrome (Android e computador), o Edge, ou o app instalado no iPhone. Os avisos continuam aparecendo no sininho da tela Início.
          </p>
        )}
        {mensagem && <p className="mt-2 text-sm text-grafite">{mensagem}</p>}
      </div>
    </div>
  );
}
