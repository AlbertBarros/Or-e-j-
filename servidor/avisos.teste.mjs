/**
 * Teste de ponta a ponta dos avisos, no emulador do Firestore, com um "celular falso" (servidor HTTP local)
 * recebendo os pushes. Uso: node servidor/testar-avisos.cjs
 */
import http from "node:http";
import crypto from "node:crypto";
import { abrirFirestore } from "./firestore.js";
import { avisoImediato, rotina, resumoDoDia } from "./avisos.js";
import { bytesParaB64url } from "./webpush.js";

const recebidos = [];
const servidor = http.createServer((req, res) => {
  const partes = [];
  req.on("data", (c) => partes.push(c));
  req.on("end", () => {
    recebidos.push({ url: req.url, cab: req.headers, tamanho: Buffer.concat(partes).length });
    res.writeHead(req.url === "/expirada" ? 410 : 201).end();
  });
});
await new Promise((r) => servidor.listen(0, "127.0.0.1", r));
const porta = servidor.address().port;

const vapid = crypto.createECDH("prime256v1");
vapid.generateKeys();
const aparelho = crypto.createECDH("prime256v1");
aparelho.generateKeys();
const chaves = { p256dh: bytesParaB64url(aparelho.getPublicKey()), auth: bytesParaB64url(crypto.randomBytes(16)) };

const env = {
  FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080",
  EMULADOR_PROJETO: process.env.GCLOUD_PROJECT || "demo-preco-fechado",
  VAPID_PUBLICA: bytesParaB64url(vapid.getPublicKey()),
  VAPID_PRIVADA: bytesParaB64url(vapid.getPrivateKey()),
  DEPURAR: process.env.DEPURAR,
};
const fs = await abrirFirestore(env);
const agora = new Date();
const dia = 86_400_000;

let falhas = 0;
function confere(cond, msg) {
  console.log(`${cond ? "ok  " : "FALHOU"} ${msg}`);
  if (!cond) falhas++;
}

// Semeia
await fs.atualizar("users/u1", { nomeNegocio: "JS Elétrica", plano: "pro", planoAte: new Date(agora.getTime() - dia), proximoNumero: 9 });
await fs.atualizar("users/u2", { nomeNegocio: "Outro", plano: "pro", planoAte: new Date(agora.getTime() + 30 * dia) });
await fs.atualizar("push/p1", { ownerId: "u1", endpoint: `http://127.0.0.1:${porta}/aparelho1`, chaves, aparelho: "teste" });
await fs.atualizar("push/p2", { ownerId: "u1", endpoint: `http://127.0.0.1:${porta}/expirada`, chaves, aparelho: "velho" });
await fs.atualizar("orcamentos/orcamentoAprovado01", { ownerId: "u1", numero: 12, status: "aprovado", total: 288.25, cliente: { nome: "Maria Souza" }, respondidoEm: agora, vencimentoPagamento: new Date(agora.getTime() - 5 * dia) });
await fs.atualizar("orcamentos/orcamentoAntigo001", { ownerId: "u1", numero: 3, status: "aprovado", total: 90, cliente: { nome: "Carlos" }, respondidoEm: new Date(agora.getTime() - 3 * 3600_000) });
await fs.atualizar("contratos/contratoAssinado01", { ownerId: "u1", numero: 4, status: "assinado", valor: 448, contratante: { nome: "Roberto" }, assinatura: { nome: "Roberto Alves", assinadoEm: agora } });

// 1) Aviso imediato do orçamento: 1 aparelho recebe; o expirado é apagado; repetir não reenvia
let n = await avisoImediato(fs, env, "orcamento", "orcamentoAprovado01");
confere(n === 1, `aprovação avisada para 1 aparelho (veio ${n})`);
confere(recebidos.some((r) => r.url === "/aparelho1" && r.cab["content-encoding"] === "aes128gcm" && /^vapid t=/.test(r.cab.authorization) && r.tamanho > 100), "push chegou criptografado e com VAPID");
confere((await fs.ler("push/p2")) === null, "inscrição expirada (410) foi apagada");
n = await avisoImediato(fs, env, "orcamento", "orcamentoAprovado01");
confere(n === 0, "o mesmo aviso não sai duas vezes");

// 2) Resposta antiga (fora da janela de 30 min) não é avisada na hora
n = await avisoImediato(fs, env, "orcamento", "orcamentoAntigo001");
confere(n === 0, "resposta antiga não gera aviso imediato");

// 3) Contrato assinado
n = await avisoImediato(fs, env, "contrato", "contratoAssinado01");
confere(n === 1, "assinatura do contrato avisada");

// 4) Rotina: reenvia o antigo, volta o Pro vencido para free e manda o resumo (se já passou das 9h em Brasília)
const r1 = await rotina(fs, env, agora);
confere(r1.reenviados === 1, `rotina reenviou o aviso perdido (${r1.reenviados})`);
confere(r1.proVencidos === 1, `rotina voltou 1 Pro vencido para o grátis (${r1.proVencidos})`);
confere((await fs.ler("users/u1")).dados.plano === "free", "u1 agora é free");
confere((await fs.ler("users/u2")).dados.plano === "pro", "u2 (Pro válido) continua Pro");
const hora = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "2-digit", hourCycle: "h23" }).format(agora));
if (hora >= 9) confere(r1.resumos === 1, `resumo do dia enviado (${r1.resumos})`);
const r2 = await rotina(fs, env, agora);
confere(r2.reenviados === 0 && r2.resumos === 0, "rodar a rotina de novo não repete nada");

// 5) Texto do resumo
const msg = resumoDoDia(
  { plano: "pro", planoAte: new Date(agora.getTime() + 2 * dia), testeProAte: new Date(agora.getTime() + 2 * dia) },
  [{ status: "aprovado", total: 100, cliente: { nome: "Ana Lima" }, vencimentoPagamento: new Date(agora.getTime() - 3 * dia) }],
  [],
  agora,
);
confere(msg && /2 coisas/.test(msg.titulo) && /Ana/.test(msg.texto) && /teste do Pro/.test(msg.texto), `resumo junta atraso e fim do teste: "${msg?.titulo}" / "${msg?.texto}"`);
confere(resumoDoDia({ plano: "free" }, [], [], agora) === null, "sem pendências, sem resumo");

servidor.close();
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo.");
process.exit(falhas ? 1 : 0);
