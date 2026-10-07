/**
 * Cloudflare Pages Function: encaminha /__/auth/* para o Firebase Auth do projeto.
 *
 * Por quê: Safari (iPhone) e outros navegadores bloqueiam o login do Google quando a página de
 * autenticação fica em outro domínio (orca-ja-aaf65.firebaseapp.com). Servindo essas páginas
 * pelo endereço do próprio app, o login por redirecionamento funciona em qualquer celular.
 * Referência: Firebase Auth → "Best practices for signInWithRedirect" → opção "proxy auth requests".
 *
 * Só atua no projeto do app (onde existe VITE_FIREBASE_AUTH_DOMAIN); no projeto do site, repassa.
 */
export async function onRequest(context) {
  const { request, env } = context;
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN;
  if (!authDomain) return context.next();

  const url = new URL(request.url);
  const destino = new URL(url.pathname + url.search, `https://${authDomain}`);
  const resposta = await fetch(destino.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  });
  // Repassa a resposta como veio (inclusive redirecionamentos para o Google)
  const cabecalhos = new Headers(resposta.headers);
  cabecalhos.delete("content-security-policy"); // a CSP do Firebase referencia o domínio dele; aqui não se aplica
  return new Response(resposta.body, { status: resposta.status, headers: cabecalhos });
}
