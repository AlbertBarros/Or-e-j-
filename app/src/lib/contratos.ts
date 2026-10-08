/** Contratos simples de prestação de serviço: contratos/{id}. */
import { collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, runTransaction, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "./firebase";
import type { Contrato, Orcamento, StatusContrato, Usuario } from "@/tipos";
import { gerarTextoContrato, mensagemEnvioContrato } from "@shared/src/contrato";
import { linkWhatsapp } from "@shared/src/mensagens";
import { enderecoEmLinha } from "./clientes";
import { comPlanoEfetivo } from "./usuario";

export function linkPublicoContrato(id: string): string {
  const base = (import.meta.env.DEV ? window.location.origin : import.meta.env.VITE_APP_URL) || window.location.origin;
  return `${base.replace(/\/$/, "")}/c/${id}`;
}

export function observarContratos(uid: string, aoMudar: (lista: Contrato[]) => void, aoFalhar: (e: Error) => void): () => void {
  return onSnapshot(
    query(collection(db, "contratos"), where("ownerId", "==", uid), orderBy("criadoEm", "desc")),
    (snap) => aoMudar(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Contrato, "id">) }))),
    aoFalhar,
  );
}

export function observarContrato(id: string, aoMudar: (c: Contrato | null) => void, aoFalhar: (e: Error) => void): () => void {
  return onSnapshot(doc(db, "contratos", id), (snap) => aoMudar(snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Contrato, "id">) } as Contrato) : null), aoFalhar);
}

export async function buscarContrato(id: string): Promise<Contrato | null> {
  const snap = await getDoc(doc(db, "contratos", id));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Contrato, "id">) } as Contrato) : null;
}

export interface DadosNovoContrato {
  formaPagamento: string;
  prazoExecucao: string;
  garantiaDias: number;
  contratante: { documento?: string; endereco?: string };
}

/** Cria o contrato (rascunho) a partir de um orçamento aprovado, com numeração própria em transação. */
export async function criarContrato(uid: string, perfilBruto: Usuario, orcamento: Orcamento, dados: DadosNovoContrato): Promise<string> {
  const perfil = comPlanoEfetivo(perfilBruto);
  const ref = doc(collection(db, "contratos"));
  await runTransaction(db, async (tx) => {
    const usuarioRef = doc(db, "users", uid);
    const snap = await tx.get(usuarioRef);
    if (!snap.exists()) throw new Error("Perfil não encontrado.");
    const numero = Number((snap.data() as Usuario).proximoContrato ?? 1);
    const contratado: Contrato["contratado"] = {
      nome: perfil.nomeNegocio,
      responsavel: perfil.nomeResponsavel,
      whatsapp: perfil.whatsapp,
      cidade: perfil.cidade,
      ...(perfil.documento ? { documento: perfil.documento } : {}),
      ...(perfil.endereco ? { endereco: enderecoEmLinha(perfil.endereco) } : {}),
    };
    const contratante: Contrato["contratante"] = {
      nome: orcamento.cliente.nome,
      whatsapp: orcamento.cliente.whatsapp,
      ...(dados.contratante.documento ? { documento: dados.contratante.documento } : {}),
      ...(dados.contratante.endereco ? { endereco: dados.contratante.endereco } : {}),
    };
    const texto = gerarTextoContrato({
      numero,
      orcamentoNumero: orcamento.numero,
      contratante,
      contratado,
      objeto: orcamento.itens,
      valor: orcamento.total,
      formaPagamento: dados.formaPagamento,
      prazoExecucao: dados.prazoExecucao,
      garantiaDias: dados.garantiaDias,
      data: new Date(),
    });
    tx.set(ref, {
      ownerId: uid,
      numero,
      orcamentoId: orcamento.id,
      orcamentoNumero: orcamento.numero,
      status: "rascunho" as StatusContrato,
      contratante,
      contratado,
      objeto: orcamento.itens,
      valor: orcamento.total,
      formaPagamento: dados.formaPagamento,
      prazoExecucao: dados.prazoExecucao,
      garantiaDias: dados.garantiaDias,
      texto,
      mostrarMarca: perfil.plano !== "pro",
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    });
    tx.update(usuarioRef, { proximoContrato: numero + 1 });
  });
  return ref.id;
}

export async function atualizarTextoContrato(id: string, texto: string): Promise<void> {
  await updateDoc(doc(db, "contratos", id), { texto, atualizadoEm: serverTimestamp() });
}

export async function marcarContratoEnviado(id: string): Promise<void> {
  await updateDoc(doc(db, "contratos", id), { status: "enviado" as StatusContrato, enviadoEm: serverTimestamp(), atualizadoEm: serverTimestamp() });
}

export async function cancelarContrato(id: string): Promise<void> {
  await updateDoc(doc(db, "contratos", id), { status: "cancelado" as StatusContrato, atualizadoEm: serverTimestamp() });
}

export async function excluirContrato(id: string): Promise<void> {
  await deleteDoc(doc(db, "contratos", id));
}

export function linkEnvioContrato(c: Contrato): string {
  return linkWhatsapp(c.contratante.whatsapp, mensagemEnvioContrato({ cliente: c.contratante.nome, negocio: c.contratado.nome, numero: c.numero, link: linkPublicoContrato(c.id) }));
}

export const ROTULO_STATUS_CONTRATO: Record<StatusContrato, string> = {
  rascunho: "Rascunho",
  enviado: "Aguardando assinatura",
  assinado: "Assinado",
  cancelado: "Cancelado",
};
