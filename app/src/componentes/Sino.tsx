import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { pedirPermissaoNotificacao, suportaNotificacaoSistema, type Notificacao } from "@/hooks/useNotificacoes";
import { diasDesde, textoHaDias } from "@/lib/datas";

interface Props {
  notificacoes: Notificacao[];
  naoVistas: number;
  aoAbrir: () => void;
}

const COR: Record<Notificacao["tipo"], string> = { aprovado: "bg-[#E6F4EA] text-pago", recusado: "bg-[#FDECEF] text-recusado", assinado: "bg-carbono-claro text-carbono" };
const ICONE: Record<Notificacao["tipo"], string> = { aprovado: "✓", recusado: "×", assinado: "✎" };

/** Sininho com contador e painel de notificações. */
export default function Sino({ notificacoes, naoVistas, aoAbrir }: Props) {
  const [aberto, setAberto] = useState(false);
  const [permissao, setPermissao] = useState<NotificationPermission | "indisponivel">(() => (suportaNotificacaoSistema() ? Notification.permission : "indisponivel"));

  useEffect(() => {
    if (aberto) aoAbrir();
  }, [aberto, aoAbrir]);

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className="botao-icone relative" aria-label={naoVistas ? `${naoVistas} notificações novas` : "Notificações"}>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {naoVistas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-recusado px-1 text-[11px] font-bold text-white" aria-hidden="true">
            {naoVistas > 9 ? "9+" : naoVistas}
          </span>
        )}
      </button>

      {aberto &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-tinta/40 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && setAberto(false)}>
            <div role="dialog" aria-modal="true" aria-labelledby="not-t" className="mt-0 flex max-h-[85dvh] w-full max-w-md flex-col vidro-forte rounded-b-3xl sm:mt-10 sm:rounded-3xl">
              <header className="flex items-center justify-between px-5 pt-4">
                <h2 id="not-t" className="text-lg font-semibold">
                  Notificações
                </h2>
                <button type="button" onClick={() => setAberto(false)} className="botao-texto">
                  Fechar
                </button>
              </header>
              {permissao === "default" && (
                <div className="mx-5 mt-3 rounded-xl bg-carbono-claro p-3 text-sm">
                  <p>Quer um aviso no celular quando um cliente aprovar ou assinar, com o app aberto?</p>
                  <button type="button" onClick={() => pedirPermissaoNotificacao().then(setPermissao)} className="mt-2 font-semibold text-carbono underline">
                    Ativar avisos
                  </button>
                </div>
              )}
              <ul className="mt-3 min-h-0 flex-1 divide-y divide-pauta overflow-y-auto">
                {notificacoes.length === 0 && <li className="p-8 text-center text-sm text-grafite">Quando um cliente aprovar um orçamento ou assinar um contrato, aparece aqui.</li>}
                {notificacoes.map((n) => (
                  <li key={n.id}>
                    <Link to={n.link} onClick={() => setAberto(false)} className="lista-item">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold ${COR[n.tipo]}`} aria-hidden="true">
                        {ICONE[n.tipo]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold leading-snug">{n.titulo}</span>
                        <span className="block text-xs text-grafite">
                          {n.texto} · {textoHaDias(diasDesde(n.quando))}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="border-t border-pauta px-5 py-3 text-xs text-grafite">Os avisos aparecem assim que o cliente responde, com o app aberto ou ao abri-lo. Avisos com o app fechado chegam numa próxima versão.</p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
