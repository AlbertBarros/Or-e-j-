/**
 * Web Push sem bibliotecas (só WebCrypto): roda no Cloudflare (Pages Functions) e no Node 20+.
 *
 * - VAPID (RFC 8292): JWT ES256 assinado com a chave privada do servidor.
 * - Criptografia do conteúdo (RFC 8291 + RFC 8188, "aes128gcm"): ECDH com a chave do aparelho,
 *   HKDF com o segredo de autenticação e AES-128-GCM num único registro.
 *
 * Chaves: VAPID_PUBLICA (65 bytes, base64url, a mesma usada no app) e VAPID_PRIVADA (32 bytes "d", base64url).
 */

const enc = new TextEncoder();

export function b64urlParaBytes(texto) {
  const b64 = texto.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((texto.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesParaB64url(bytes) {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < u.length; i++) bin += String.fromCharCode(u[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function juntar(...partes) {
  const total = partes.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let i = 0;
  for (const p of partes) {
    out.set(p, i);
    i += p.length;
  }
  return out;
}

async function hmac(chave, dados) {
  const k = await crypto.subtle.importKey("raw", chave, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, dados));
}

/** Chave privada VAPID (d) + pública (65 bytes) → CryptoKey ECDSA para assinar o JWT. */
async function chaveVapid(publica, privada) {
  const pub = b64urlParaBytes(publica);
  if (pub.length !== 65 || pub[0] !== 4) throw new Error("VAPID_PUBLICA inválida");
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: privada,
    x: bytesParaB64url(pub.slice(1, 33)),
    y: bytesParaB64url(pub.slice(33, 65)),
    ext: true,
  };
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

/** Cabeçalho Authorization VAPID para o servidor de push do aparelho. */
export async function cabecalhoVapid(endpoint, { publica, privada, contato }) {
  const aud = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const cab = bytesParaB64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const corpo = bytesParaB64url(enc.encode(JSON.stringify({ aud, exp, sub: contato })));
  const chave = await chaveVapid(publica, privada);
  const assinatura = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, chave, enc.encode(`${cab}.${corpo}`));
  return `vapid t=${cab}.${corpo}.${bytesParaB64url(assinatura)}, k=${publica}`;
}

/**
 * Criptografa a mensagem para um aparelho (aes128gcm). "fixos" só existe para o teste com vetores conhecidos.
 * Devolve o corpo binário pronto para o POST.
 */
export async function criptografar(mensagem, { p256dh, auth }, fixos = {}) {
  const uaPublica = b64urlParaBytes(p256dh);
  const segredoAuth = b64urlParaBytes(auth);
  if (uaPublica.length !== 65 || segredoAuth.length < 16) throw new Error("inscrição de push inválida");

  // Par efêmero do servidor
  let par;
  if (fixos.parServidor) par = fixos.parServidor;
  else par = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublica = new Uint8Array(await crypto.subtle.exportKey("raw", par.publicKey));

  const chaveUa = await crypto.subtle.importKey("raw", uaPublica, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const segredoEcdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: chaveUa }, par.privateKey, 256));

  // RFC 8291 §3.4: IKM = HKDF(auth, ecdh, "WebPush: info" || 0 || ua_public || as_public, 32)
  const prkChave = await hmac(segredoAuth, segredoEcdh);
  const infoChave = juntar(enc.encode("WebPush: info\0"), uaPublica, asPublica, new Uint8Array([1]));
  const ikm = (await hmac(prkChave, infoChave)).slice(0, 32);

  // RFC 8188: CEK e NONCE a partir do salt
  const salt = fixos.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, juntar(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, juntar(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);

  const texto = typeof mensagem === "string" ? enc.encode(mensagem) : mensagem;
  const claro = juntar(texto, new Uint8Array([2])); // 0x02 = último (e único) registro, sem preenchimento
  const chaveAes = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, chaveAes, claro));

  // Cabeçalho: salt (16) | rs (4, big-endian) | idlen (1) | keyid (chave pública do servidor, 65)
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return juntar(salt, rs, new Uint8Array([asPublica.length]), asPublica, cifrado);
}

/**
 * Envia uma notificação. Devolve { ok, status, expirada } — "expirada" (404/410) significa que a inscrição
 * não vale mais e deve ser apagada.
 */
export async function enviarPush(inscricao, dados, vapid, { ttl = 86400, urgencia = "high" } = {}) {
  const corpo = await criptografar(JSON.stringify(dados), inscricao.keys);
  const resp = await fetch(inscricao.endpoint, {
    method: "POST",
    headers: {
      authorization: await cabecalhoVapid(inscricao.endpoint, vapid),
      "content-encoding": "aes128gcm",
      "content-type": "application/octet-stream",
      ttl: String(ttl),
      urgency: urgencia,
    },
    body: corpo,
  });
  return { ok: resp.ok, status: resp.status, expirada: resp.status === 404 || resp.status === 410 };
}
