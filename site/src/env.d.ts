/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_FIREBASE_API_KEY: string;
  readonly PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  readonly PUBLIC_FIREBASE_PROJECT_ID: string;
  readonly PUBLIC_FIREBASE_STORAGE_BUCKET: string;
  readonly PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly PUBLIC_FIREBASE_APP_ID: string;
  readonly PUBLIC_APP_URL: string;
  /** "true" quando o app estiver publicado; antes disso os botões abrem a lista de espera */
  readonly PUBLIC_APP_PRONTO?: string;
  /** Links de checkout da plataforma de pagamento (vazios enquanto não existirem) */
  readonly PUBLIC_CHECKOUT_URL_MENSAL?: string;
  readonly PUBLIC_CHECKOUT_URL_ANUAL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
