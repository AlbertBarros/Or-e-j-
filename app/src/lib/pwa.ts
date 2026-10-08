/** Instalação do app (PWA): detecção de plataforma e registro do service worker. */

export interface EventoInstalacao extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function jaInstalado(): boolean {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone || iosStandalone;
}

export function ehIphoneOuIpad(): boolean {
  const ua = navigator.userAgent;
  const ipadNovo = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/i.test(ua) || ipadNovo;
}

export function ehAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

export function registrarServiceWorker(): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("Service worker não registrado:", e));
  });
}

// ---------------------------------------------------------------------------
// Pedido de instalação (Android/Chrome/Edge no computador): guardado desde o início,
// para o botão da Ajuda funcionar mesmo que o evento tenha chegado antes de a tela abrir.
// ---------------------------------------------------------------------------
let pedidoGuardado: EventoInstalacao | null = null;
const ouvintes = new Set<(e: EventoInstalacao | null) => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    pedidoGuardado = e as EventoInstalacao;
    ouvintes.forEach((f) => f(pedidoGuardado));
  });
  window.addEventListener("appinstalled", () => {
    pedidoGuardado = null;
    ouvintes.forEach((f) => f(null));
  });
}

export function pedidoInstalacao(): EventoInstalacao | null {
  return pedidoGuardado;
}

/** Avisa quando o navegador libera (ou retira) o pedido de instalação. Devolve a função para parar. */
export function aoMudarPedidoInstalacao(f: (e: EventoInstalacao | null) => void): () => void {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

/** Mostra o pedido de instalação do navegador. true = instalou. */
export async function instalarAgora(): Promise<boolean> {
  const e = pedidoGuardado;
  if (!e) return false;
  await e.prompt();
  const escolha = await e.userChoice;
  pedidoGuardado = null;
  ouvintes.forEach((f) => f(null));
  return escolha.outcome === "accepted";
}

export type Plataforma = "android" | "iphone" | "computador";

export function plataformaAtual(): Plataforma {
  if (typeof navigator === "undefined") return "computador";
  if (ehIphoneOuIpad()) return "iphone";
  if (ehAndroid()) return "android";
  return "computador";
}
