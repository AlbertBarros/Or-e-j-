/**
 * Lista de espera: grava em `leads` no Firestore pela API REST.
 * Usamos REST em vez do SDK para a página continuar leve no 3G
 * (as regras de segurança valem do mesmo jeito: só criação, com os 5 campos).
 */
export interface Lead {
  email: string;
  whatsapp: string;
  profissao: string;
  origem: string;
}

const projeto = import.meta.env.PUBLIC_FIREBASE_PROJECT_ID;
const chave = import.meta.env.PUBLIC_FIREBASE_API_KEY;

export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) && email.trim().length < 120;
}

export function whatsappValido(numero: string): boolean {
  const d = numero.replace(/\D/g, "");
  return d.length >= 10 && d.length <= 13;
}

export async function gravarLead(lead: Lead): Promise<void> {
  if (!projeto || !chave) {
    throw new Error("Configuração do Firebase ausente (PUBLIC_FIREBASE_PROJECT_ID / API_KEY).");
  }
  const url = `https://firestore.googleapis.com/v1/projects/${projeto}/databases/(default)/documents/leads?key=${chave}`;
  const corpo = {
    fields: {
      email: { stringValue: lead.email.trim().toLowerCase() },
      whatsapp: { stringValue: lead.whatsapp.replace(/\D/g, "") },
      profissao: { stringValue: lead.profissao },
      origem: { stringValue: lead.origem },
      criadoEm: { timestampValue: new Date().toISOString() },
    },
  };
  const resposta = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  if (!resposta.ok) {
    const texto = await resposta.text().catch(() => "");
    throw new Error(`Não foi possível salvar (${resposta.status}). ${texto.slice(0, 200)}`);
  }
}
