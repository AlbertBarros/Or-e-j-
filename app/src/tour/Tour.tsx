import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router";
import { PASSOS_TOUR } from "./passos";
import { useAuth } from "@/hooks/useAuth";
import { marcarTutorial } from "@/lib/usuario";
import { registrarEvento } from "@/lib/eventos";

const CHAVE = "orcaja:tourPasso";

interface ContextoTour {
  ativo: boolean;
  iniciar: () => void;
}

const Contexto = createContext<ContextoTour>({ ativo: false, iniciar: () => undefined });

export function useTour() {
  return useContext(Contexto);
}

function lerPasso(): number | null {
  try {
    const v = sessionStorage.getItem(CHAVE);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}

function gravarPasso(n: number | null) {
  try {
    if (n === null) sessionStorage.removeItem(CHAVE);
    else sessionStorage.setItem(CHAVE, String(n));
  } catch {
    /* sem sessionStorage: o tour só não continua depois de recarregar */
  }
}

/** Tour guiado pelas telas de verdade do app. Fica dentro do roteador (navega entre as telas). */
export function ProvedorTour({ children }: { children: ReactNode }) {
  const [passo, setPasso] = useState<number | null>(() => lerPasso());
  const { usuario } = useAuth();

  const iniciar = useCallback(() => {
    setPasso(0);
    gravarPasso(0);
    registrarEvento("tour_iniciado", { uid: usuario?.uid });
  }, [usuario]);

  const encerrar = useCallback(
    (concluiu: boolean) => {
      setPasso(null);
      gravarPasso(null);
      if (concluiu && usuario) {
        void marcarTutorial(usuario.uid, "concluidoEm").catch(() => undefined);
        registrarEvento("tour_concluido", { uid: usuario.uid });
      }
    },
    [usuario],
  );

  const irPara = useCallback((n: number) => {
    setPasso(n);
    gravarPasso(n);
  }, []);

  const valor = useMemo(() => ({ ativo: passo !== null, iniciar }), [passo, iniciar]);

  return (
    <Contexto.Provider value={valor}>
      {children}
      {passo !== null && usuario && <Sobreposicao passo={Math.min(passo, PASSOS_TOUR.length - 1)} irPara={irPara} encerrar={encerrar} />}
    </Contexto.Provider>
  );
}

interface Retangulo {
  top: number;
  left: number;
  width: number;
  height: number;
}

const FOLGA = 8;

function Sobreposicao({ passo, irPara, encerrar }: { passo: number; irPara: (n: number) => void; encerrar: (concluiu: boolean) => void }) {
  const p = PASSOS_TOUR[passo]!;
  const total = PASSOS_TOUR.length;
  const ultimo = passo === total - 1;
  const navegar = useNavigate();
  const local = useLocation();
  const [ret, setRet] = useState<Retangulo | null>(null);
  const [procurando, setProcurando] = useState(true);
  const cartaoRef = useRef<HTMLDivElement>(null);
  const [alturaCartao, setAlturaCartao] = useState(220);
  const [tela, setTela] = useState({ w: window.innerWidth, h: window.innerHeight });

  // 1) Vai para a tela do passo
  useEffect(() => {
    const [caminho] = p.rota.split("?");
    if (local.pathname !== caminho) navegar(p.rota);
  }, [p.rota, local.pathname, navegar]);

  // 2) Procura o alvo (a tela pode demorar a carregar) e acompanha rolagem e tamanho da janela
  useEffect(() => {
    setRet(null);
    setProcurando(Boolean(p.alvo));
    if (!p.alvo) return;
    let elemento: HTMLElement | null = null;
    let tentativas = 0;
    let rolou = false;
    const medir = () => {
      if (!elemento || !elemento.isConnected) return;
      const r = elemento.getBoundingClientRect();
      setRet({ top: r.top - FOLGA, left: r.left - FOLGA, width: r.width + FOLGA * 2, height: r.height + FOLGA * 2 });
    };
    const procurar = window.setInterval(() => {
      tentativas++;
      const [caminho] = p.rota.split("?");
      if (window.location.pathname === caminho) elemento = document.querySelector<HTMLElement>(`[data-tour="${p.alvo}"]`);
      if (elemento) {
        window.clearInterval(procurar);
        if (!rolou) {
          rolou = true;
          const r = elemento.getBoundingClientRect();
          const visivel = r.top >= 70 && r.bottom <= window.innerHeight - 90;
          if (!visivel) elemento.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        window.setTimeout(() => {
          medir();
          setProcurando(false);
        }, 380);
      } else if (tentativas > 40) {
        window.clearInterval(procurar);
        setProcurando(false); // não achou: explica no centro
      }
    }, 100);
    const aoMudar = () => {
      medir();
      setTela({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener("scroll", aoMudar, true);
    window.addEventListener("resize", aoMudar);
    return () => {
      window.clearInterval(procurar);
      window.removeEventListener("scroll", aoMudar, true);
      window.removeEventListener("resize", aoMudar);
    };
  }, [p.alvo, p.rota, passo]);

  // 3) Foco no cartão a cada passo (leitores de tela anunciam o novo texto)
  useEffect(() => {
    cartaoRef.current?.focus({ preventScroll: true });
  }, [passo, procurando]);

  useLayoutEffect(() => {
    if (cartaoRef.current) setAlturaCartao(cartaoRef.current.offsetHeight);
  }, [passo, ret, procurando]);

  // 4) Teclado: setas e Esc
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") encerrar(false);
      else if (e.key === "ArrowRight") ultimo ? encerrar(true) : irPara(passo + 1);
      else if (e.key === "ArrowLeft" && passo > 0) irPara(passo - 1);
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [passo, ultimo, irPara, encerrar]);

  // Posição do cartão: abaixo ou acima do alvo; sem espaço (ou sem alvo), no rodapé/centro
  const estreito = tela.w < 640;
  const larguraCartao = Math.min(380, tela.w - 24);
  let estilo: React.CSSProperties;
  const temAlvo = ret && !procurando;
  if (temAlvo) {
    const abaixo = tela.h - (ret.top + ret.height);
    const left = estreito ? 12 : Math.min(Math.max(12, ret.left + ret.width / 2 - larguraCartao / 2), tela.w - larguraCartao - 12);
    if (abaixo >= alturaCartao + 24) estilo = { top: ret.top + ret.height + 12, left, width: larguraCartao };
    else if (ret.top >= alturaCartao + 24) estilo = { top: ret.top - alturaCartao - 12, left, width: larguraCartao };
    else estilo = { bottom: 12, left: estreito ? 12 : left, width: larguraCartao };
  } else {
    estilo = estreito ? { bottom: 16, left: 12, width: larguraCartao } : { top: "50%", left: "50%", width: larguraCartao, transform: "translate(-50%, -50%)" };
  }

  return createPortal(
    <div className="tour-raiz" aria-live="off">
      {/* Fundo escuro com recorte no alvo */}
      {temAlvo ? (
        <div className="tour-recorte" style={{ top: ret.top, left: ret.left, width: ret.width, height: ret.height }} aria-hidden="true" />
      ) : (
        <div className="tour-fundo" aria-hidden="true" />
      )}
      {/* Bloqueia toques no app enquanto o tour está aberto */}
      <div className="tour-bloqueio" aria-hidden="true" />

      <div
        ref={cartaoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-titulo"
        aria-describedby="tour-texto"
        tabIndex={-1}
        className="tour-cartao vidro-forte"
        style={estilo}
        key={passo}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-carbono">
            Tour guiado · {passo + 1} de {total}
          </span>
          <button type="button" onClick={() => encerrar(false)} className="text-sm font-medium text-grafite hover:text-carbono">
            Sair
          </button>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-pauta" aria-hidden="true">
          <div className="h-full rounded-full bg-gradient-to-r from-[#1E40AF] via-[#2563EB] to-[#10B981] transition-[width] duration-500" style={{ width: `${((passo + 1) / total) * 100}%` }} />
        </div>
        <h2 id="tour-titulo" className="mt-3 text-lg font-bold leading-snug">
          {p.titulo}
        </h2>
        <p id="tour-texto" className="mt-1 text-[15px] leading-relaxed text-grafite">
          {p.texto}
        </p>
        <div className="mt-4 flex gap-2">
          {passo > 0 && (
            <button type="button" onClick={() => irPara(passo - 1)} className="botao-secundario !min-h-11 flex-1">
              Voltar
            </button>
          )}
          <button
            type="button"
            onClick={() => (ultimo ? (encerrar(true), navegar("/")) : irPara(passo + 1))}
            className="botao-primario !min-h-11 flex-[2]"
            autoFocus
          >
            {ultimo ? "Começar a usar" : passo === 0 ? "Vamos lá" : "Próximo"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
