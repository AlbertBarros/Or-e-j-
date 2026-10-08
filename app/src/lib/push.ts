/**
 * Avisos no celular com o app fechado (Web Push).
 * O aparelho se inscreve no navegador; a inscrição fica em push/{hash do endereço} com o dono.
 * Quem envia é o servidor (servidor/avisos.js), quando o cliente aprova, recusa ou assina, e no resumo do dia.
 *
 * iPhone: só funciona com o app instalado na Tela de Início (iOS 16.4 ou mais novo).
 */
import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { ehIphoneOuIpad, jaInstalado } from "./pwa";

/** Chave pública VAPID (a privada fica só no Cloudflare). Igual a servidor/avisos.js. */
export const VAPID_PUBLICA = "BICdZU1NfgmXDP4E7lGMHTsa-HMbfU2uLw3SD7jzFiIElPmXxwGvuO0nYs6vSREoW-CILsPGtrDRE4umr8XX2lU";

export type SituacaoPush =
  | "ativo" // inscrito neste aparelho
  | "desligado" // pode ligar
  | "bloqueado" // a pessoa negou a permissão no navegador
  | "instalar-iphone" // iPhone fora da Tela de Início: precisa instalar antes
  | "sem-suporte"; // navegador sem Web Push (ou modo de desenvolvimento)

function b64urlParaBytes(texto: string): Uint8Array<ArrayBuffer> {
  const b64 = texto.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((texto.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function idDaInscricao(endpoint: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 40);
}

function descreverAparelho(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad/i.test(ua)) return "iPhone";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows/i.test(ua)) return "Computador (Windows)";
  if (/Mac/i.test(ua)) return "Computador (Mac)";
  return "Outro aparelho";
}

export function suportaPush(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && typeof Notification !== "undefined";
}

async function registroSW(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  const existente = await navigator.serviceWorker.getRegistration();
  if (existente) return existente;
  // Em desenvolvimento o service worker não é registrado automaticamente: registra aqui para o teste.
  return navigator.serviceWorker.register("/sw.js").catch(() => null);
}

export async function situacaoPush(): Promise<SituacaoPush> {
  if (ehIphoneOuIpad() && !jaInstalado()) return "instalar-iphone";
  if (!suportaPush()) return "sem-suporte";
  if (Notification.permission === "denied") return "bloqueado";
  const reg = await registroSW();
  const insc = reg ? await reg.pushManager.getSubscription() : null;
  return insc && Notification.permission === "granted" ? "ativo" : "desligado";
}

/** Pede permissão, inscreve o aparelho e grava no banco. Precisa ser chamado num toque do usuário. */
export async function ligarPush(uid: string): Promise<SituacaoPush> {
  if (ehIphoneOuIpad() && !jaInstalado()) return "instalar-iphone";
  if (!suportaPush()) return "sem-suporte";
  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") return permissao === "denied" ? "bloqueado" : "desligado";
  const reg = await registroSW();
  if (!reg) return "sem-suporte";
  await navigator.serviceWorker.ready;
  let insc = await reg.pushManager.getSubscription();
  if (!insc) {
    insc = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlParaBytes(VAPID_PUBLICA) });
  }
  const json = insc.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("Inscrição incompleta");
  await setDoc(doc(db, "push", await idDaInscricao(json.endpoint)), {
    ownerId: uid,
    endpoint: json.endpoint,
    chaves: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    aparelho: descreverAparelho(),
    criadoEm: serverTimestamp(),
  });
  return "ativo";
}

/** Desliga neste aparelho (cancela a inscrição e apaga do banco). */
export async function desligarPush(): Promise<void> {
  const reg = await registroSW();
  const insc = reg ? await reg.pushManager.getSubscription() : null;
  if (!insc) return;
  const id = await idDaInscricao(insc.endpoint);
  await insc.unsubscribe().catch(() => undefined);
  await deleteDoc(doc(db, "push", id)).catch(() => undefined);
}

/** Notificação de teste, mostrada pelo próprio aparelho (confirma que a permissão e o service worker funcionam). */
export async function testarNotificacao(): Promise<boolean> {
  const reg = await registroSW();
  if (!reg || Notification.permission !== "granted") return false;
  await reg.showNotification("Avisos ligados ✓", {
    body: "É assim que você vai saber quando um cliente aprovar um orçamento ou assinar um contrato.",
    icon: "/icones/icone-192.png",
    tag: "teste",
    data: { link: "/" },
  });
  return true;
}
