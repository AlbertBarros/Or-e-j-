/**
 * Orçamentos (orcamentos/{id}). Único lugar que fala com o Firestore sobre eles.
 * Numeração sequencial por usuário em transação (docs/ARQUITETURA.md → Operações críticas).
 */
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type DocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import { inicioDoDia, paraDate, somarDias } from "./datas";
import type { ItemOrcamento, Orcamento, StatusOrcamento, Usuario } from "@/tipos";
import { total as calcularTotal } from "@shared/src/mensagens";
import { normalizarWhatsapp } from "@shared/src/mensagens";

export interface DadosOrcamento {
  cliente: { nome: string; whatsapp: string };
  itens: ItemOrcamento[];
  desconto: number;
  validadeDias: number;
  vencimentoPagamento: Date | null;
  observacoes: string;
}

export type Filtro = "todos" | "rascunho" | "enviado" | "aprovado" | "atrasado" | "pago";

export const ROTULO_FILTRO: Record<Filtro, string> = {
  todos: "Todos",
  rascunho: "Rascunhos",
  enviado: "Enviados",
  aprovado: "Aprovados",
  atrasado: "Atrasados",
  pago: "Pagos",
};

function paraOrcamento(snap: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): Orcamento {
  return { id: snap.id, ...(snap.data() as Omit<Orcamento, "id">) };
}

/** Snapshot do negócio gravado no orçamento, para a página pública não ler users/. */
export function snapshotNegocio(perfil: Usuario): Orcamento["negocio"] {
  const pro = perfil.plano === "pro";
  return {
    nome: perfil.nomeNegocio,
    nomePix: perfil.nomePix,
    whatsapp: perfil.whatsapp,
    chavePix: perfil.chavePix,
    cidade: perfil.cidade,
    mostrarMarca: !pro,
    mostrarLogo: pro && perfil.temLogo,
    mostrarPix: pro,
  };
}

function limparItens(itens: ItemOrcamento[]): ItemOrcamento[] {
  return itens
    .map((i) => ({
      descricao: i.descricao.trim(),
      qtd: Math.max(0, i.qtd),
      unidade: i.unidade.trim() || "un",
      valorUnit: Math.max(0, i.valorUnit),
    }))
    .filter((i) => i.descricao && i.qtd > 0);
}

/** Cria um rascunho com o próximo número do usuário (transação em users/{uid}.proximoNumero). */
export async function criarOrcamento(uid: string, perfil: Usuario, dados: DadosOrcamento): Promise<string> {
  const ref = doc(collection(db, "orcamentos"));
  const itens = limparItens(dados.itens);
  const agora = new Date();
  await runTransaction(db, async (tx) => {
    const usuarioRef = doc(db, "users", uid);
    const usuarioSnap = await tx.get(usuarioRef);
    if (!usuarioSnap.exists()) throw new Error("Perfil não encontrado.");
    const numero = Number(usuarioSnap.data().proximoNumero ?? 1);
    tx.set(ref, {
      ownerId: uid,
      numero,
      cliente: { nome: dados.cliente.nome.trim(), whatsapp: normalizarWhatsapp(dados.cliente.whatsapp) },
      itens,
      desconto: Math.max(0, dados.desconto),
      total: calcularTotal(itens, dados.desconto),
      validadeDias: dados.validadeDias,
      validadeAte: Timestamp.fromDate(somarDias(agora, dados.validadeDias)),
      ...(dados.vencimentoPagamento ? { vencimentoPagamento: Timestamp.fromDate(dados.vencimentoPagamento) } : {}),
      observacoes: dados.observacoes.trim(),
      status: "rascunho" as StatusOrcamento,
      negocio: snapshotNegocio(perfil),
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    });
    tx.update(usuarioRef, { proximoNumero: numero + 1 });
  });
  return ref.id;
}

/** Atualiza um rascunho. A validade é recontada a partir da criação. */
export async function atualizarOrcamento(orcamento: Orcamento, dados: DadosOrcamento): Promise<void> {
  const itens = limparItens(dados.itens);
  const base = paraDate(orcamento.criadoEm) ?? new Date();
  await updateDoc(doc(db, "orcamentos", orcamento.id), {
    cliente: { nome: dados.cliente.nome.trim(), whatsapp: normalizarWhatsapp(dados.cliente.whatsapp) },
    itens,
    desconto: Math.max(0, dados.desconto),
    total: calcularTotal(itens, dados.desconto),
    validadeDias: dados.validadeDias,
    validadeAte: Timestamp.fromDate(somarDias(base, dados.validadeDias)),
    vencimentoPagamento: dados.vencimentoPagamento ? Timestamp.fromDate(dados.vencimentoPagamento) : deleteField(),
    observacoes: dados.observacoes.trim(),
    atualizadoEm: serverTimestamp(),
  });
}

export async function excluirOrcamento(id: string): Promise<void> {
  await deleteDoc(doc(db, "orcamentos", id));
}

export async function buscarOrcamento(id: string): Promise<Orcamento | null> {
  const snap = await getDoc(doc(db, "orcamentos", id));
  return snap.exists() ? paraOrcamento(snap) : null;
}

export function observarOrcamento(
  id: string,
  aoMudar: (o: Orcamento | null) => void,
  aoFalhar: (e: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, "orcamentos", id),
    (snap) => aoMudar(snap.exists() ? paraOrcamento(snap) : null),
    aoFalhar,
  );
}

/** "Atrasado" é calculado: aprovado com vencimento antes de hoje. */
export function estaAtrasado(o: Orcamento, hoje: Date = new Date()): boolean {
  const venc = paraDate(o.vencimentoPagamento);
  return o.status === "aprovado" && !!venc && inicioDoDia(venc) < inicioDoDia(hoje);
}

/**
 * Observa a lista do usuário com filtro e limite (a paginação cresce o limite).
 * "atrasado" busca os aprovados e filtra no cliente.
 */
export function observarOrcamentos(
  uid: string,
  filtro: Filtro,
  limite: number,
  aoMudar: (lista: Orcamento[], temMais: boolean) => void,
  aoFalhar: (e: Error) => void,
): () => void {
  const col = collection(db, "orcamentos");
  const base = [where("ownerId", "==", uid)];
  if (filtro === "atrasado") base.push(where("status", "==", "aprovado"));
  else if (filtro !== "todos") base.push(where("status", "==", filtro));
  const q = query(col, ...base, orderBy("criadoEm", "desc"), limit(limite + 1));
  return onSnapshot(
    q,
    (snap) => {
      let lista = snap.docs.map(paraOrcamento);
      const temMais = lista.length > limite;
      if (temMais) lista = lista.slice(0, limite);
      if (filtro === "atrasado") lista = lista.filter((o) => estaAtrasado(o));
      aoMudar(lista, temMais);
    },
    aoFalhar,
  );
}

export interface Resumo {
  aReceber: number;
  recebidoNoMes: number;
  atrasados: number;
}

/** Totais do topo do painel: aprovados não pagos e pagos no mês corrente. */
export function observarResumo(uid: string, aoMudar: (r: Resumo) => void, aoFalhar: (e: Error) => void): () => void {
  const col = collection(db, "orcamentos");
  let aprovados: Orcamento[] = [];
  let pagos: Orcamento[] = [];
  const agora = new Date();
  const mes = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
  const emitir = () => {
    const recebido = pagos
      .filter((o) => {
        const d = paraDate(o.pagoEm);
        return d && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === mes;
      })
      .reduce((s, o) => s + o.total, 0);
    aoMudar({
      aReceber: Math.round(aprovados.reduce((s, o) => s + o.total, 0) * 100) / 100,
      recebidoNoMes: Math.round(recebido * 100) / 100,
      atrasados: aprovados.filter((o) => estaAtrasado(o)).length,
    });
  };
  const pararA = onSnapshot(
    query(col, where("ownerId", "==", uid), where("status", "==", "aprovado"), orderBy("criadoEm", "desc"), limit(500)),
    (snap) => {
      aprovados = snap.docs.map(paraOrcamento);
      emitir();
    },
    aoFalhar,
  );
  const pararP = onSnapshot(
    query(col, where("ownerId", "==", uid), where("status", "==", "pago"), orderBy("criadoEm", "desc"), limit(500)),
    (snap) => {
      pagos = snap.docs.map(paraOrcamento);
      emitir();
    },
    aoFalhar,
  );
  return () => {
    pararA();
    pararP();
  };
}

/** Clientes distintos dos orçamentos recentes, para o autocomplete. */
export function clientesDistintos(lista: Orcamento[]): { nome: string; whatsapp: string }[] {
  const vistos = new Map<string, { nome: string; whatsapp: string }>();
  for (const o of lista) {
    const chave = o.cliente.nome.trim().toLowerCase();
    if (chave && !vistos.has(chave)) vistos.set(chave, { nome: o.cliente.nome.trim(), whatsapp: o.cliente.whatsapp });
  }
  return [...vistos.values()];
}
