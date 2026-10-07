/** Login: Google (janela) e link mágico por e-mail. */
import {
  GoogleAuthProvider,
  signInWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";

const CHAVE_EMAIL = "orcaja:emailParaLogin";

export async function entrarComGoogle(): Promise<User> {
  const provedor = new GoogleAuthProvider();
  provedor.setCustomParameters({ prompt: "select_account" });
  const resultado = await signInWithPopup(auth, provedor);
  return resultado.user;
}

/** Envia o link mágico. O e-mail fica guardado para concluir o login no mesmo aparelho. */
export async function enviarLinkPorEmail(email: string): Promise<void> {
  await sendSignInLinkToEmail(auth, email.trim(), {
    url: `${window.location.origin}/entrar`,
    handleCodeInApp: true,
  });
  localStorage.setItem(CHAVE_EMAIL, email.trim());
}

export function ehLinkDeEmail(url: string = window.location.href): boolean {
  return isSignInWithEmailLink(auth, url);
}

export function emailGuardado(): string | null {
  return localStorage.getItem(CHAVE_EMAIL);
}

export async function concluirLoginPorLink(email: string, url: string = window.location.href): Promise<User> {
  const resultado = await signInWithEmailLink(auth, email.trim(), url);
  localStorage.removeItem(CHAVE_EMAIL);
  return resultado.user;
}

export function sair(): Promise<void> {
  return signOut(auth);
}

/** Traduz os códigos do Firebase Auth para frases que dizem o que houve e o que fazer. */
export function mensagemDeErroAuth(erro: unknown): string {
  const codigo = (erro as { code?: string })?.code ?? "";
  switch (codigo) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "A janela do Google foi fechada antes de terminar. Tente de novo.";
    case "auth/popup-blocked":
      return "O navegador bloqueou a janela do Google. Permita pop-ups para este site e tente de novo.";
    case "auth/invalid-email":
      return "E-mail inválido. Confira se digitou certo, com o @ e o ponto.";
    case "auth/invalid-action-code":
    case "auth/expired-action-code":
      return "Este link já foi usado ou venceu. Peça um novo link abaixo.";
    case "auth/unauthorized-domain":
      return "Este endereço ainda não está autorizado no Firebase. Avise o suporte.";
    case "auth/network-request-failed":
      return "Sem conexão. Confira a internet e tente de novo.";
    case "auth/too-many-requests":
      return "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";
    default:
      console.error(erro);
      return "Não deu para entrar agora. Tente de novo em instantes.";
  }
}
