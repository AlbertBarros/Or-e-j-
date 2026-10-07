/** Inicialização do Firebase. Componentes nunca importam "firebase/*" diretamente: só a pasta lib/. */
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Em produção, o login passa pelo próprio endereço do app (functions/__/auth/* encaminha ao Firebase).
// Assim o Google funciona no Safari/iPhone, que bloqueia autenticação em domínio de terceiros.
const dominioLocal = typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname);
const authDomain = dominioLocal && import.meta.env.PROD ? window.location.host : import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!config.apiKey || !config.projectId) {
  // Falha cedo e com mensagem clara em vez de erros estranhos depois.
  throw new Error("Configuração do Firebase ausente. Copie .env.example para app/.env.local e preencha.");
}

export const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);

auth.languageCode = "pt-BR";

export const usandoEmulador = import.meta.env.DEV && import.meta.env.VITE_USAR_EMULADOR === "true";
if (usandoEmulador) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

export const LIMITE_FREE = Number(import.meta.env.VITE_LIMITE_FREE || "3");
