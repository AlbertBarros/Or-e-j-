/**
 * Suporte e depoimentos.
 * Contatos do suporte vêm das variáveis VITE_SUPORTE_WHATSAPP (só dígitos, com 55) e VITE_SUPORTE_EMAIL,
 * cadastradas no projeto do app no Cloudflare. Sem elas, a Ajuda mostra só o formulário (mensagens em suporte/).
 */
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Usuario } from "@/tipos";

export const SUPORTE = {
  whatsapp: String(import.meta.env.VITE_SUPORTE_WHATSAPP ?? "").replace(/\D/g, ""),
  email: String(import.meta.env.VITE_SUPORTE_EMAIL ?? "").trim(),
};

export const ASSUNTOS = ["Dúvida de uso", "Algo não funcionou", "Plano e pagamento", "Sugestão"] as const;
export type Assunto = (typeof ASSUNTOS)[number];

function aparelho(): string {
  return `${navigator.userAgent.slice(0, 140)} · ${window.innerWidth}x${window.innerHeight}`;
}

export async function enviarMensagemSuporte(uid: string, perfil: Usuario, emailLogin: string | null, assunto: Assunto, mensagem: string): Promise<void> {
  await addDoc(collection(db, "suporte"), {
    uid,
    nome: perfil.nomeResponsavel,
    negocio: perfil.nomeNegocio,
    whatsapp: perfil.whatsapp,
    ...(perfil.email || emailLogin ? { email: (perfil.email || emailLogin) as string } : {}),
    assunto,
    mensagem: mensagem.trim().slice(0, 2900),
    aparelho: aparelho(),
    criadoEm: serverTimestamp(),
  });
}

export function linkWhatsappSuporte(perfil: Usuario): string | null {
  if (!SUPORTE.whatsapp) return null;
  const texto = `Olá! Sou ${perfil.nomeResponsavel}, da ${perfil.nomeNegocio}, e uso o Preço Fechado. Preciso de ajuda com: `;
  return `https://wa.me/${SUPORTE.whatsapp}?text=${encodeURIComponent(texto)}`;
}

// ---------- Depoimentos (depoimentos/{uid}; o dono do sistema publica no console) ----------
export interface Depoimento {
  nome: string;
  negocio: string;
  profissao: string;
  cidade: string;
  nota: number;
  texto: string;
  publicado: boolean;
}

export async function buscarMeuDepoimento(uid: string): Promise<Depoimento | null> {
  const snap = await getDoc(doc(db, "depoimentos", uid));
  return snap.exists() ? (snap.data() as Depoimento) : null;
}

export async function salvarDepoimento(uid: string, perfil: Usuario, nota: number, texto: string): Promise<void> {
  await setDoc(doc(db, "depoimentos", uid), {
    nome: perfil.nomeResponsavel,
    negocio: perfil.nomeNegocio,
    profissao: perfil.profissao,
    cidade: perfil.cidade,
    nota: Math.min(5, Math.max(1, Math.round(nota))),
    texto: texto.trim().slice(0, 600),
    publicado: false,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });
}
