/**
 * Firestore "lite" para a página pública: bem menor que o SDK completo e sem Auth.
 * Só faz get do orçamento, get da logo e update de status (aprovar/recusar), que as regras permitem.
 */
import { initializeApp } from "firebase/app";
import { connectFirestoreEmulator, doc, getDoc, getFirestore, serverTimestamp, updateDoc } from "firebase/firestore/lite";
import type { Orcamento } from "@/tipos";

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

/** O cliente só pode mudar status de "enviado" para "aprovado"/"recusado" + respondidoEm (regras). */
export async function responderOrcamento(id: string, resposta: "aprovado" | "recusado"): Promise<void> {
  await updateDoc(doc(db, "orcamentos", id), { status: resposta, respondidoEm: serverTimestamp() });
}
