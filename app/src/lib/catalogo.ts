/** Catálogo de produtos e serviços: users/{uid}/catalogo/{id}. */
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import type { ItemCatalogo } from "@/tipos";
import { itensSugeridos } from "./profissoes";

export interface DadosItemCatalogo {
  tipo: "servico" | "produto";
  nome: string;
  descricao: string;
  unidade: string;
  preco: number;
}

function ref(uid: string) {
  return collection(db, "users", uid, "catalogo");
}

export function observarCatalogo(uid: string, aoMudar: (itens: ItemCatalogo[]) => void, aoFalhar: (e: Error) => void): () => void {
  return onSnapshot(
    query(ref(uid), orderBy("nome")),
    (snap) => aoMudar(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ItemCatalogo, "id">) }))),
    aoFalhar,
  );
}

export async function criarItemCatalogo(uid: string, dados: DadosItemCatalogo): Promise<string> {
  const r = await addDoc(ref(uid), { ...limpar(dados), ativo: true, criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp() });
  return r.id;
}

export async function atualizarItemCatalogo(uid: string, id: string, dados: Partial<DadosItemCatalogo> & { ativo?: boolean }): Promise<void> {
  const { ativo, ...resto } = dados;
  await updateDoc(doc(ref(uid), id), { ...limparParcial(resto), ...(ativo !== undefined ? { ativo } : {}), atualizadoEm: serverTimestamp() });
}

export async function excluirItemCatalogo(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(ref(uid), id));
}

/** Cria vários itens de uma vez (onboarding: sugeridos da profissão com preços ajustados). */
export async function criarItensEmLote(uid: string, itens: DadosItemCatalogo[]): Promise<void> {
  if (itens.length === 0) return;
  const lote = writeBatch(db);
  for (const i of itens) {
    lote.set(doc(ref(uid)), { ...limpar(i), ativo: true, criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp() });
  }
  await lote.commit();
}

/** Sugestões da profissão no formato do catálogo (para o onboarding e para catálogos vazios). */
export function sugestoesDaProfissao(slug: string): DadosItemCatalogo[] {
  return itensSugeridos(slug).map((s) => ({ tipo: "servico", nome: s.descricao, descricao: "", unidade: s.unidade, preco: s.precoSugerido }));
}

function limpar(d: DadosItemCatalogo): DadosItemCatalogo {
  return { tipo: d.tipo, nome: d.nome.trim(), descricao: d.descricao.trim(), unidade: d.unidade.trim() || "un", preco: Math.max(0, Number(d.preco) || 0) };
}
function limparParcial(d: Partial<DadosItemCatalogo>): Partial<DadosItemCatalogo> {
  const r: Partial<DadosItemCatalogo> = {};
  if (d.tipo !== undefined) r.tipo = d.tipo;
  if (d.nome !== undefined) r.nome = d.nome.trim();
  if (d.descricao !== undefined) r.descricao = d.descricao.trim();
  if (d.unidade !== undefined) r.unidade = d.unidade.trim() || "un";
  if (d.preco !== undefined) r.preco = Math.max(0, Number(d.preco) || 0);
  return r;
}
