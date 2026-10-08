/**
 * Banco de clientes: clientes/{ownerId}_{whatsapp}. A identidade (nome, contato, endereço) fica aqui;
 * números (quantos orçamentos, aprovados, valor) são calculados a partir dos orçamentos, para nunca divergir.
 */
import { collection, deleteDoc, deleteField, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import type { Cliente, Endereco, Orcamento } from "@/tipos";
import { normalizarWhatsapp } from "@shared/src/mensagens";

export function idCliente(uid: string, whatsapp: string): string {
  return `${uid}_${normalizarWhatsapp(whatsapp)}`;
}

export function observarClientes(uid: string, aoMudar: (lista: Cliente[]) => void, aoFalhar: (e: Error) => void): () => void {
  return onSnapshot(
    query(collection(db, "clientes"), where("ownerId", "==", uid), orderBy("nome")),
    (snap) => aoMudar(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Cliente, "id">) }))),
    aoFalhar,
  );
}

/** Garante que o cliente de um orçamento existe no banco (chamado ao criar/editar orçamento). Não sobrescreve dados editados. */
export async function garantirCliente(uid: string, nome: string, whatsapp: string): Promise<void> {
  const digitos = normalizarWhatsapp(whatsapp);
  if (digitos.length < 12) return;
  const ref = doc(db, "clientes", idCliente(uid, digitos));
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { atualizadoEm: serverTimestamp() });
    } else {
      await setDoc(ref, { ownerId: uid, nome: nome.trim(), whatsapp: digitos, criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp() });
    }
  } catch (e) {
    console.error(e); // o banco de clientes nunca impede salvar o orçamento
  }
}

/** Cria no banco os clientes que aparecem em orçamentos mas ainda não existem (migração suave). */
export async function sincronizarClientes(uid: string, orcamentos: Orcamento[], existentes: Cliente[]): Promise<number> {
  const ids = new Set(existentes.map((c) => c.id));
  const faltando = new Map<string, { nome: string; whatsapp: string }>();
  for (const o of orcamentos) {
    const w = normalizarWhatsapp(o.cliente.whatsapp);
    if (w.length < 12) continue;
    const id = idCliente(uid, w);
    if (!ids.has(id) && !faltando.has(id)) faltando.set(id, { nome: o.cliente.nome, whatsapp: w });
  }
  if (faltando.size === 0) return 0;
  const lote = writeBatch(db);
  for (const [id, c] of faltando) {
    lote.set(doc(db, "clientes", id), { ownerId: uid, nome: c.nome, whatsapp: c.whatsapp, criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp() });
  }
  await lote.commit();
  return faltando.size;
}

export interface DadosCliente {
  nome: string;
  email?: string;
  documento?: string;
  endereco?: Endereco | null;
  observacoes?: string;
}

export async function atualizarCliente(id: string, dados: DadosCliente): Promise<void> {
  await updateDoc(doc(db, "clientes", id), {
    nome: dados.nome.trim(),
    email: dados.email?.trim() ? dados.email.trim().toLowerCase() : deleteField(),
    documento: dados.documento?.trim() ? dados.documento.trim() : deleteField(),
    endereco: dados.endereco ? dados.endereco : deleteField(),
    observacoes: dados.observacoes?.trim() ? dados.observacoes.trim() : deleteField(),
    atualizadoEm: serverTimestamp(),
  });
}

/** Cria um cliente à mão (sem orçamento ainda). */
export async function criarCliente(uid: string, nome: string, whatsapp: string, dados: Omit<DadosCliente, "nome"> = {}): Promise<string> {
  const digitos = normalizarWhatsapp(whatsapp);
  const id = idCliente(uid, digitos);
  await setDoc(
    doc(db, "clientes", id),
    {
      ownerId: uid,
      nome: nome.trim(),
      whatsapp: digitos,
      ...(dados.email ? { email: dados.email.trim().toLowerCase() } : {}),
      ...(dados.documento ? { documento: dados.documento.trim() } : {}),
      ...(dados.endereco ? { endereco: dados.endereco } : {}),
      ...(dados.observacoes ? { observacoes: dados.observacoes.trim() } : {}),
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    },
    { merge: true },
  );
  return id;
}

export async function excluirCliente(id: string): Promise<void> {
  await deleteDoc(doc(db, "clientes", id));
}

export interface EstatisticasCliente {
  orcamentos: number;
  aprovados: number;
  recusados: number;
  valorAprovado: number;
  ultimo?: Orcamento;
}

/** Números do cliente a partir dos orçamentos (por WhatsApp). */
export function estatisticasDoCliente(c: Cliente, orcamentos: Orcamento[]): EstatisticasCliente {
  const dele = orcamentos.filter((o) => normalizarWhatsapp(o.cliente.whatsapp) === c.whatsapp);
  const aprovadosLista = dele.filter((o) => o.status === "aprovado" || o.status === "pago");
  return {
    orcamentos: dele.length,
    aprovados: aprovadosLista.length,
    recusados: dele.filter((o) => o.status === "recusado").length,
    valorAprovado: aprovadosLista.reduce((s, o) => s + o.total, 0),
    ultimo: dele[0],
  };
}

export function enderecoEmLinha(e?: Endereco | null): string {
  if (!e) return "";
  return [e.logradouro, e.bairro, [e.cidade, e.uf].filter(Boolean).join("/"), e.cep ? `CEP ${e.cep}` : ""].filter(Boolean).join(", ");
}
