/** Métrica da página pública (aprovação/recusa), via Firestore lite. Nunca quebra o fluxo. */
import { getApp } from "firebase/app";
import { addDoc, collection, getFirestore, serverTimestamp } from "firebase/firestore/lite";

export function registrarEventoPublico(nome: "orcamento_aprovado" | "orcamento_recusado", orcamentoId: string): void {
  try {
    const db = getFirestore(getApp("publico"));
    addDoc(collection(db, "eventos"), { nome, orcamentoId, origem: "publico", criadoEm: serverTimestamp() }).catch(() => undefined);
  } catch {
    /* ignora */
  }
}
