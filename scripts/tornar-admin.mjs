#!/usr/bin/env node
/**
 * Dá (ou tira) acesso ao Painel administrativo para uma conta, pelo e-mail do login.
 * Só este script (com a conta de serviço) consegue escrever em admins/: pelo app ninguém se torna admin.
 *
 * Uso (PowerShell, na raiz do projeto):
 *   node scripts/tornar-admin.mjs seu@email.com            # dá acesso
 *   node scripts/tornar-admin.mjs seu@email.com --remover  # tira o acesso
 *
 * Precisa do service-account.json na raiz (o mesmo do ativar-pro.cjs).
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { abrirFirestore } from "../servidor/firestore.js";

const [, , email, opcao] = process.argv;
if (!email || !email.includes("@")) {
  console.error("Uso: node scripts/tornar-admin.mjs <email> [--remover]");
  process.exit(1);
}
const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const chave = join(raiz, "service-account.json");
if (!existsSync(chave)) {
  console.error("Não achei service-account.json na raiz do projeto.");
  process.exit(1);
}

const fs = await abrirFirestore({ FIREBASE_SERVICE_ACCOUNT: readFileSync(chave, "utf8") });
const conta = await fs.contaPorEmail(email);
if (!conta) {
  console.error(`Nenhuma conta com o e-mail ${email}. Entre no app uma vez com esse e-mail e rode de novo.`);
  process.exit(2);
}
if (opcao === "--remover") {
  await fs.apagar(`admins/${conta.localId}`);
  console.log(`OK: ${email} não é mais administrador.`);
} else {
  await fs.atualizar(`admins/${conta.localId}`, { email: email.toLowerCase(), criadoEm: new Date() });
  console.log(`OK: ${email} agora vê o Painel administrativo (Mais → Painel administrativo).`);
}
