/**
 * Teste do Web Push: criptografa com servidor/webpush.js e decriptografa com a biblioteca de referência
 * (http_ece, do autor da RFC 8188). Também confere a assinatura VAPID.
 * Uso: node servidor/webpush.teste.mjs  (precisa de http_ece instalado em algum node_modules acima)
 */
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { criptografar, cabecalhoVapid, bytesParaB64url, b64urlParaBytes } from "./webpush.js";

const require = createRequire(import.meta.url);
const ece = require(process.env.HTTP_ECE ?? "http_ece");

// Aparelho (receptor)
const aparelho = crypto.createECDH("prime256v1");
aparelho.generateKeys();
const auth = crypto.randomBytes(16);
const inscricao = { p256dh: bytesParaB64url(aparelho.getPublicKey()), auth: bytesParaB64url(auth) };

const mensagem = JSON.stringify({ titulo: "Maria aprovou o orçamento nº 0012", texto: "R$ 288,25 · toque para ver", link: "/orcamentos/abc" });
const corpo = await criptografar(mensagem, inscricao);
const claro = ece.decrypt(Buffer.from(corpo), { version: "aes128gcm", privateKey: aparelho, authSecret: auth });
if (claro.toString("utf8") !== mensagem) throw new Error("FALHOU: texto decriptografado diferente");
console.log("ok criptografia aes128gcm (decriptografado pela http_ece)");

// VAPID
const vapid = crypto.createECDH("prime256v1");
vapid.generateKeys();
const publica = bytesParaB64url(vapid.getPublicKey());
const privada = bytesParaB64url(vapid.getPrivateKey());
const cab = await cabecalhoVapid("https://fcm.googleapis.com/fcm/send/xyz", { publica, privada, contato: "mailto:suporte@exemplo.com" });
const [, t, k] = cab.match(/^vapid t=([^,]+), k=(.+)$/) ?? [];
if (k !== publica) throw new Error("FALHOU: k diferente da chave pública");
const [h, c, s] = t.split(".");
const chavePub = crypto.createPublicKey({
  key: { kty: "EC", crv: "P-256", x: bytesParaB64url(b64urlParaBytes(publica).slice(1, 33)), y: bytesParaB64url(b64urlParaBytes(publica).slice(33)) },
  format: "jwk",
});
const valido = crypto.verify("sha256", Buffer.from(`${h}.${c}`), { key: chavePub, dsaEncoding: "ieee-p1363" }, Buffer.from(b64urlParaBytes(s)));
if (!valido) throw new Error("FALHOU: assinatura VAPID inválida");
const corpoJwt = JSON.parse(Buffer.from(b64urlParaBytes(c)).toString());
if (corpoJwt.aud !== "https://fcm.googleapis.com") throw new Error("FALHOU: aud");
console.log("ok VAPID (JWT ES256 verificado)", corpoJwt);
