#!/usr/bin/env node
/**
 * Ativa (ou desativa) o plano Pro de um usuário pelo e-mail, direto no Firestore.
 *
 * Uso (PowerShell, na raiz do projeto):
 *   node scripts/ativar-pro.cjs cliente@email.com            # Pro por 1 mês
 *   node scripts/ativar-pro.cjs cliente@email.com 12         # Pro por 12 meses
 *   node scripts/ativar-pro.cjs cliente@email.com --free     # volta para o grátis
 *
 * Precisa da chave de conta de serviço do Firebase em ./service-account.json (ignorada pelo Git):
 *   Console do Firebase → Configurações do projeto → Contas de serviço → Gerar nova chave privada.
 * Sem dependências: assina um JWT com a chave e fala com a API REST do Firestore.
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const [, , email, arg2] = process.argv;
if (!email || !email.includes("@")) {
  console.error("Uso: node scripts/ativar-pro.cjs <email> [meses | --free]");
  process.exit(1);
}
const voltarFree = arg2 === "--free";
const meses = voltarFree ? 0 : Math.max(1, Number(arg2 || 1));

const caminhoChave = path.join(__dirname, "..", "service-account.json");
if (!fs.existsSync(caminhoChave)) {
  console.error("Não achei service-account.json na raiz do projeto. Baixe no Console do Firebase (Contas de serviço).");
  process.exit(1);
}
const conta = JSON.parse(fs.readFileSync(caminhoChave, "utf8"));
const projeto = conta.project_id;

function base64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function tokenDeAcesso() {
  const agora = Math.floor(Date.now() / 1000);
  const cabecalho = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const corpo = base64url(
    JSON.stringify({
      iss: conta.client_email,
      scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit",
      aud: "https://oauth2.googleapis.com/token",
      iat: agora,
      exp: agora + 3600,
    }),
  );
  const assinatura = crypto.sign("RSA-SHA256", Buffer.from(`${cabecalho}.${corpo}`), conta.private_key);
  const jwt = `${cabecalho}.${corpo}.${base64url(assinatura)}`;
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  if (!resp.ok) throw new Error(`Falha ao obter token: ${resp.status} ${await resp.text()}`);
  return (await resp.json()).access_token;
}

async function main() {
  const token = await tokenDeAcesso();
  const base = `https://firestore.googleapis.com/v1/projects/${projeto}/databases/(default)/documents`;
  const cab = { authorization: `Bearer ${token}`, "content-type": "application/json" };

  // Procura o usuário pelo e-mail
  const busca = await fetch(`${base}:runQuery`, {
    method: "POST",
    headers: cab,
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "users" }],
        where: { fieldFilter: { field: { fieldPath: "email" }, op: "EQUAL", value: { stringValue: email.toLowerCase() } } },
        limit: 1,
      },
    }),
  });
  const resultados = await busca.json();
  let docUsuario = (resultados || []).map((r) => r.document).find(Boolean);
  let uid = docUsuario && docUsuario.name.split("/").pop();
  let salvarEmail = false;

  // Conta antiga sem o campo e-mail? Procura no login do Firebase (Authentication) e usa o uid de lá.
  if (!docUsuario) {
    const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projeto}/accounts:lookup`, {
      method: "POST",
      headers: cab,
      body: JSON.stringify({ email: [email.toLowerCase()] }),
    });
    const contaAuth = lookup.ok ? ((await lookup.json()).users || [])[0] : null;
    if (contaAuth) {
      const perfil = await fetch(`${base}/users/${contaAuth.localId}`, { headers: cab });
      if (perfil.ok) {
        docUsuario = await perfil.json();
        uid = contaAuth.localId;
        salvarEmail = true;
      }
    }
  }
  if (!docUsuario) {
    console.error(`Nenhum usuário com o e-mail ${email}. A pessoa precisa criar a conta no app com esse e-mail primeiro.`);
    process.exit(2);
  }
  const nome = docUsuario.fields.nomeNegocio && docUsuario.fields.nomeNegocio.stringValue;

  const campos = voltarFree
    ? { plano: { stringValue: "free" } }
    : (() => {
        const ate = new Date();
        ate.setMonth(ate.getMonth() + meses);
        return { plano: { stringValue: "pro" }, planoAte: { timestampValue: ate.toISOString() } };
      })();
  if (salvarEmail) campos.email = { stringValue: email.toLowerCase() }; // deixa a conta pronta para o webhook
  const mask = Object.keys(campos).map((c) => `updateMask.fieldPaths=${c}`).join("&");
  const atualiza = await fetch(`${base}/users/${uid}?${mask}`, { method: "PATCH", headers: cab, body: JSON.stringify({ fields: campos }) });
  if (!atualiza.ok) throw new Error(`Falha ao atualizar: ${atualiza.status} ${await atualiza.text()}`);
  const dados = await atualiza.json();
  console.log(
    voltarFree
      ? `OK: ${nome || uid} voltou para o plano grátis.`
      : `OK: ${nome || uid} agora é Pro até ${new Date(dados.fields.planoAte.timestampValue).toLocaleDateString("pt-BR")}.`,
  );
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
