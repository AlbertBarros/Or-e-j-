/**
 * Firestore "lite" para a página pública: bem menor que o SDK completo e sem Auth.
 * Só faz get do orçamento, get da logo e update de status (aprovar/recusar), que as regras permitem.
 */
import { initializeApp } from "firebase/app";
import { connectFirestoreEmulator, doc, getDoc, getFirestore, serverTimestamp, updateDoc } from "firebase/firestore/lite";
import type { CartaoVirtual, Contrato, Orcamento } from "@/tipos";

const app = initializeApp(
  {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  },
  "publico",
);
const db = getFirestore(app);
if (import.meta.env.DEV && import.meta.env.VITE_USAR_EMULADOR === "true") {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

export async function buscarOrcamentoPublico(id: string): Promise<Orcamento | null> {
  const snap = await getDoc(doc(db, "orcamentos", id));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Orcamento, "id">) } as Orcamento) : null;
}

export async function buscarLogoPublica(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(db, "logos", uid));
  return snap.exists() ? ((snap.data() as { dataUrl?: string }).dataUrl ?? null) : null;
}

/**
 * Pede ao servidor para avisar o profissional no celular (Web Push). O servidor confere no banco antes de avisar;
 * se falhar, a rotina de hora em hora reenvia. Nunca atrapalha o cliente.
 */
function pedirAviso(tipo: "orcamento" | "contrato", id: string): void {
  try {
    void fetch("/api/avisar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tipo, id }), keepalive: true }).catch(() => undefined);
  } catch {
    /* sem rede ou sem suporte: a rotina cuida */
  }
}

/** O cliente só pode mudar status de "enviado" para "aprovado"/"recusado" + respondidoEm (regras). */
export async function responderOrcamento(id: string, resposta: "aprovado" | "recusado"): Promise<void> {
  await updateDoc(doc(db, "orcamentos", id), { status: resposta, respondidoEm: serverTimestamp() });
  pedirAviso("orcamento", id);
}

export async function buscarContratoPublico(id: string): Promise<Contrato | null> {
  const snap = await getDoc(doc(db, "contratos", id));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Contrato, "id">) } as Contrato) : null;
}

/** O cliente só pode mudar status "enviado" → "assinado" com a assinatura (regras). */
export async function assinarContrato(id: string, assinatura: { nome: string; imagem: string; agente: string }): Promise<void> {
  await updateDoc(doc(db, "contratos", id), {
    status: "assinado",
    assinatura: { ...assinatura, assinadoEm: serverTimestamp() },
    atualizadoEm: serverTimestamp(),
  });
  pedirAviso("contrato", id);
}

export async function buscarCartaoPublico(uid: string): Promise<CartaoVirtual | null> {
  const snap = await getDoc(doc(db, "cartoes", uid));
  return snap.exists() ? (snap.data() as CartaoVirtual) : null;
}
