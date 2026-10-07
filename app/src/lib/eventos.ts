/**
 * Métricas do PRD (decisão da Fase 5: coleção `eventos`, só criação, sem Google Analytics).
 * Nunca guarda dados pessoais: só o nome do evento, o uid (quando logado), o id do orçamento e a origem.
 * Falhas são ignoradas: métrica nunca pode quebrar o fluxo do usuário.
 */
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export type NomeEvento =
  | "cadastro_concluido"
  | "orcamento_criado"
  | "orcamento_enviado"
  | "orcamento_pago"
  | "recibo_emitido"
  | "limite_free_atingido"
  | "clique_assinar_pro";

export function registrarEvento(nome: NomeEvento, dados: { uid?: string; orcamentoId?: string; origem?: string } = {}): void {
  addDoc(collection(db, "eventos"), {
    nome,
    ...(dados.uid ? { uid: dados.uid } : {}),
    ...(dados.orcamentoId ? { orcamentoId: dados.orcamentoId } : {}),
    origem: dados.origem ?? "app",
    criadoEm: serverTimestamp(),
  }).catch(() => undefined);
}
