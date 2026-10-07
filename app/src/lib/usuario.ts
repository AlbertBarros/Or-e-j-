/** Perfil do profissional (users/{uid}) e logo (logos/{uid}). Único lugar que fala com o Firestore sobre isso. */
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
  deleteDoc,
  setDoc,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Usuario, TipoChavePix } from "@/tipos";
import { normalizarChave } from "@shared/src/pix";
import { normalizarWhatsapp } from "@shared/src/mensagens";

/** "AAAA-MM" no fuso de São Paulo. */
export function mesAtual(agora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(agora);
  const ano = partes.find((p) => p.type === "year")?.value ?? "0000";
  const mes = partes.find((p) => p.type === "month")?.value ?? "00";
  return `${ano}-${mes}`;
}

function paraUsuario(dados: DocumentData): Usuario {
  return dados as Usuario;
}

export async function buscarPerfil(uid: string): Promise<Usuario | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? paraUsuario(snap.data()) : null;
}

/** Observa o perfil em tempo real. Devolve a função que para de observar. */
export function observarPerfil(
  uid: string,
  aoMudar: (perfil: Usuario | null) => void,
  aoFalhar: (erro: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, "users", uid),
    (snap) => aoMudar(snap.exists() ? paraUsuario(snap.data()) : null),
    (erro) => aoFalhar(erro),
  );
}

export interface DadosCadastro {
  profissao: string;
  nomeNegocio: string;
  nomeResponsavel: string;
  whatsapp: string; // como digitado
  cidade: string;
  chavePix: string; // como digitada
  tipoChavePix: TipoChavePix;
  nomePix: string;
  logoDataUrl?: string | null;
}

/** Cria o perfil (plano free, numeração em 1) e, se houver, a logo, numa única gravação. */
export async function criarPerfil(uid: string, dados: DadosCadastro): Promise<void> {
  const perfil = {
    nomeNegocio: dados.nomeNegocio.trim(),
    nomeResponsavel: dados.nomeResponsavel.trim(),
    nomePix: dados.nomePix.trim(),
    profissao: dados.profissao,
    whatsapp: normalizarWhatsapp(dados.whatsapp),
    cidade: dados.cidade.trim(),
    chavePix: normalizarChave(dados.chavePix, dados.tipoChavePix),
    tipoChavePix: dados.tipoChavePix,
    temLogo: Boolean(dados.logoDataUrl),
    plano: "free" as const,
    proximoNumero: 1,
    uso: { mes: mesAtual(), enviados: 0 },
    criadoEm: serverTimestamp(),
  };
  const lote = writeBatch(db);
  lote.set(doc(db, "users", uid), perfil);
  if (dados.logoDataUrl) {
    lote.set(doc(db, "logos", uid), { dataUrl: dados.logoDataUrl, atualizadoEm: serverTimestamp() });
  }
  await lote.commit();
}

/** Atualiza campos editáveis do perfil (nunca plano/planoAte: as regras bloqueiam). */
export async function atualizarPerfil(
  uid: string,
  dados: Partial<Omit<DadosCadastro, "logoDataUrl">>,
): Promise<void> {
  const mudancas: Record<string, unknown> = {};
  if (dados.nomeNegocio !== undefined) mudancas.nomeNegocio = dados.nomeNegocio.trim();
  if (dados.nomeResponsavel !== undefined) mudancas.nomeResponsavel = dados.nomeResponsavel.trim();
  if (dados.nomePix !== undefined) mudancas.nomePix = dados.nomePix.trim();
  if (dados.profissao !== undefined) mudancas.profissao = dados.profissao;
  if (dados.whatsapp !== undefined) mudancas.whatsapp = normalizarWhatsapp(dados.whatsapp);
  if (dados.cidade !== undefined) mudancas.cidade = dados.cidade.trim();
  if (dados.chavePix !== undefined && dados.tipoChavePix !== undefined) {
    mudancas.chavePix = normalizarChave(dados.chavePix, dados.tipoChavePix);
    mudancas.tipoChavePix = dados.tipoChavePix;
  }
  await updateDoc(doc(db, "users", uid), mudancas);
}

export async function buscarLogo(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(db, "logos", uid));
  return snap.exists() ? ((snap.data() as { dataUrl?: string }).dataUrl ?? null) : null;
}

export async function salvarLogo(uid: string, dataUrl: string | null): Promise<void> {
  if (dataUrl) {
    await setDoc(doc(db, "logos", uid), { dataUrl, atualizadoEm: serverTimestamp() });
  } else {
    await deleteDoc(doc(db, "logos", uid));
  }
  await updateDoc(doc(db, "users", uid), { temLogo: Boolean(dataUrl) });
}
