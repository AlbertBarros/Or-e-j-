import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ehIphoneOuIpad, jaInstalado, type EventoInstalacao } from "@/lib/pwa";

const CHAVE_DISPENSADO = "orcaja:instalarDispensadoEm";
const DIAS_SILENCIO = 7;

/**
 * Cartão "Baixar o app".
 * Android/Chrome: usa o pedido de instalação do navegador (beforeinstallprompt).
 * iPhone/iPad: mostra o passo a passo do Safari (a Apple não permite instalar por botão).
 * Outros casos sem suporte: não aparece.
 */
export default function InstalarApp({ compacto = false }: { compacto?: boolean }) {
  const [evento, setEvento] = useState<EventoInstalacao | null>(null);
  const [instalado, setInstalado] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const [guiaIphone, setGuiaIphone] = useState(false);
  const iphone = typeof navigator !== "undefined" && ehIphoneOuIpad();

  useEffect(() => {
    if (jaInstalado()) return;
    try {
      const dispensado = Number(localStorage.getItem(CHAVE_DISPENSADO) ?? 0);
      if (Date.now() - dispensado < DIAS_SILENCIO * 86_400_000) return;
    } catch {
      /* sem localStorage: segue */
    }
    if (iphone) setVisivel(true);

    function aoPoderInstalar(e: Event) {
      e.preventDefault();
      setEvento(e as EventoInstalacao);
      setVisivel(true);
    }
    function aoInstalar() {
      setInstalado(true);
      setVisivel(false);
    }
    window.addEventListener("beforeinstallprompt", aoPoderInstalar);
    window.addEventListener("appinstalled", aoInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", aoPoderInstalar);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, [iphone]);

  async function instalar() {
    if (iphone) {
      setGuiaIphone(true);
      return;
    }
    if (!evento) return;
    await evento.prompt();
    const escolha = await evento.userChoice;
    if (escolha.outcome === "accepted") {
      setInstalado(true);
      setVisivel(false);
    }
    setEvento(null);
  }

  function dispensar() {
    try {
      localStorage.setItem(CHAVE_DISPENSADO, String(Date.now()));
    } catch {
      /* ignora */
    }
    setVisivel(false);
  }

  if (instalado || !visivel) return null;

  return (
    <>
      <section
        aria-labelledby="instalar-titulo"
        className={`cartao flex items-center gap-3 ${compacto ? "p-3" : "p-4"}`}
      >
        <img src="/icones/icone-192.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-[10px]" />
        <div className="min-w-0 flex-1">
          <p id="instalar-titulo" className="font-semibold leading-tight">
            Baixe o app do Preço Fechado
          </p>
          <p className="text-sm text-grafite">
            {iphone ? "Fica na tela inicial do seu iPhone, como um app." : "Abre direto da tela inicial, sem navegador."}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <button type="button" onClick={instalar} className="botao-primario !min-h-10 !w-auto px-4 text-sm">
            Baixar o app
          </button>
          <button type="button" onClick={dispensar} className="text-xs text-grafite hover:text-carbono">
            Agora não
          </button>
        </div>
      </section>

      {guiaIphone &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/40 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setGuiaIphone(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="guia-titulo"
              className="w-full max-w-md vidro-forte rounded-t-2xl p-5 sm:rounded-2xl"
            >
              <h2 id="guia-titulo" className="text-xl font-semibold">
                Instalar no iPhone
              </h2>
              <p className="mt-1 text-sm text-grafite">
                No iPhone a instalação é feita pelo Safari, em 3 toques. Se estiver em outro navegador, abra este endereço no
                Safari primeiro.
              </p>
              <ol className="mt-4 space-y-3">
                <li className="flex gap-3">
                  <span className="tabular flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-carbono-claro font-bold text-carbono">1</span>
                  <p>
                    Toque no botão <strong>Compartilhar</strong>, o quadrado com uma seta para cima, na barra de baixo do Safari.
                  </p>
                </li>
                <li className="flex gap-3">
                  <span className="tabular flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-carbono-claro font-bold text-carbono">2</span>
                  <p>
                    Role a lista e toque em <strong>Adicionar à Tela de Início</strong>.
                  </p>
                </li>
                <li className="flex gap-3">
                  <span className="tabular flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-carbono-claro font-bold text-carbono">3</span>
                  <p>
                    Toque em <strong>Adicionar</strong>, no canto superior direito. O ícone do Preço Fechado aparece na sua tela inicial.
                  </p>
                </li>
              </ol>
              <button type="button" onClick={() => setGuiaIphone(false)} className="botao-primario mt-5">
                Entendi
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
