/**
 * Avisos no celular do profissional (Web Push), mesmo com o app fechado.
 *
 * - Na hora: o cliente aprova/recusa um orçamento ou assina um contrato → a página pública chama /api/avisar
 *   → conferimos no banco que aconteceu mesmo (e há pouco tempo) → avisamos o dono uma única vez.
 * - Rotina (a cada hora, pelo GitHub Actions): reenvia o que ficou para trás e, uma vez por dia (a partir das 9h),
 *   manda um resumo: pagamentos atrasados, orçamentos sem resposta, contratos sem assinatura, teste Pro acabando.
 *   Também volta para "free" quem tem Pro vencido (assinatura cancelada ou não renovada).
 */
import { enviarPush } from "./webpush.js";

/** Mesma chave pública usada pelo app (app/src/lib/push.ts). Não é segredo. */
export const VAPID_PUBLICA_PADRAO = "BICdZU1NfgmXDP4E7lGMHTsa-HMbfU2uLw3SD7jzFiIElPmXxwGvuO0nYs6vSREoW-CILsPGtrDRE4umr8XX2lU";

const MINUTOS_NA_HORA = 30; // janela para o aviso imediato ser aceito

export function pushConfigurado(env) {
  return Boolean((env.FIREBASE_SERVICE_ACCOUNT || env.FIRESTORE_EMULATOR_HOST) && env.VAPID_PRIVADA);
}

function vapid(env) {
  return {
    publica: env.VAPID_PUBLICA || VAPID_PUBLICA_PADRAO,
    privada: env.VAPID_PRIVADA,
    contato: env.VITE_APP_URL || "https://orca-ja-app.pages.dev",
  };
}

const n4 = (n) => String(n ?? 0).padStart(4, "0");
const reais = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const primeiro = (nome) => String(nome || "").trim().split(/\s+/)[0] || "Cliente";

/** Envia para todos os aparelhos do dono. Apaga inscrições que não valem mais. Devolve quantos receberam. */
export async function avisarDono(fs, env, uid, dados) {
  const inscricoes = await fs.consultar("push", [["ownerId", "EQUAL", uid]]);
  let enviados = 0;
  for (const i of inscricoes) {
    const { endpoint, chaves } = i.dados;
    if (!endpoint || !chaves?.p256dh || !chaves?.auth) continue;
    try {
      const r = await enviarPush({ endpoint, keys: chaves }, dados, vapid(env));
      if (r.ok) enviados++;
      else if (r.expirada) await fs.apagar(`push/${i.id}`);
      else console.warn("push recusado", r.status, endpoint.slice(0, 40));
    } catch (e) {
      console.warn("push falhou", String(e));
    }
  }
  return enviados;
}

function recente(data, minutos) {
  return data instanceof Date && Date.now() - data.getTime() < minutos * 60_000 && data.getTime() <= Date.now() + 60_000;
}

/**
 * Marca o aviso como dado e avisa. A trava é um documento avisosEnviados/{chave} criado só se ainda não existir:
 * se duas chamadas chegarem juntas (página do cliente + rotina), só uma avisa.
 */
async function marcarEAvisar(fs, env, d, campo, mensagem) {
  const chave = `${d.caminho.includes("/orcamentos/") ? "o" : "c"}-${d.id}-${campo.split(".").pop()}`;
  const primeiro = await fs.criarSeNaoExiste(`avisosEnviados/${chave}`, { criadoEm: new Date(), dono: d.dados.ownerId || "" });
  if (!primeiro) {
    if (env.DEPURAR) console.log("aviso já enviado:", chave);
    return 0;
  }
  await fs.atualizar(d.caminho.split("/documents/")[1], { [campo]: new Date() });
  return avisarDono(fs, env, d.dados.ownerId, mensagem);
}

export function mensagemOrcamento(o) {
  const nome = o.cliente?.nome || "O cliente";
  if (o.status === "recusado") {
    return { titulo: `${nome} recusou o orçamento nº ${n4(o.numero)}`, texto: "Edite e reenvie, ou fale com o cliente.", link: `/orcamentos/${o.id}`, tag: `o-${o.id}` };
  }
  return {
    titulo: `${nome} aprovou o orçamento nº ${n4(o.numero)} 🎉`,
    texto: `${reais(o.total)}. Toque para gerar o contrato ou cobrar.`,
    link: `/orcamentos/${o.id}`,
    tag: `o-${o.id}`,
  };
}

export function mensagemContrato(c) {
  return {
    titulo: `${c.assinatura?.nome || c.contratante?.nome || "O cliente"} assinou o contrato nº ${n4(c.numero)} ✍️`,
    texto: `${reais(c.valor)}. O PDF assinado já está no app.`,
    link: `/contratos/${c.id}`,
    tag: `c-${c.id}`,
  };
}

/** Aviso imediato pedido pela página pública. Confere tudo no banco antes de avisar. */
export async function avisoImediato(fs, env, tipo, id) {
  if (tipo === "orcamento") {
    const d = await fs.ler(`orcamentos/${id}`);
    if (!d) return 0;
    const o = { ...d.dados, id: d.id };
    if (!["aprovado", "recusado", "pago"].includes(o.status) || o.avisos?.resposta) return 0;
    if (!recente(o.respondidoEm, MINUTOS_NA_HORA)) return 0;
    return marcarEAvisar(fs, env, d, "avisos.resposta", mensagemOrcamento(o));
  }
  if (tipo === "contrato") {
    const d = await fs.ler(`contratos/${id}`);
    if (!d) return 0;
    const c = { ...d.dados, id: d.id };
    if (c.status !== "assinado" || c.avisos?.assinado) return 0;
    if (!recente(c.assinatura?.assinadoEm, MINUTOS_NA_HORA)) return 0;
    return marcarEAvisar(fs, env, d, "avisos.assinado", mensagemContrato(c));
  }
  return 0;
}

/** "AAAA-MM-DD" e hora no fuso de São Paulo. */
function hojeSP(agora = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(agora);
  const v = (t) => p.find((x) => x.type === t)?.value ?? "00";
  return { dia: `${v("year")}-${v("month")}-${v("day")}`, hora: Number(v("hour")) };
}

const DIA = 86_400_000;

/** Resumo diário de um profissional. Devolve a mensagem ou null quando não há nada importante. */
export function resumoDoDia(perfil, orcamentos, contratos, agora = new Date()) {
  const linhas = [];
  let link = "/";
  const inicioHoje = new Date(agora.getTime() - (agora.getTime() % DIA)); // aproximação em UTC; serve para "vencido"

  const atrasados = orcamentos.filter((o) => o.status === "aprovado" && o.vencimentoPagamento instanceof Date && o.vencimentoPagamento < inicioHoje && !o.avulso);
  if (atrasados.length) {
    const soma = atrasados.reduce((s, o) => s + (o.total || 0), 0);
    linhas.push(atrasados.length === 1 ? `${primeiro(atrasados[0].cliente?.nome)} está com ${reais(atrasados[0].total)} atrasado` : `${atrasados.length} pagamentos atrasados (${reais(soma)})`);
    link = "/orcamentos?filtro=atrasado";
  }

  const semResposta = orcamentos.filter((o) => o.status === "enviado" && o.enviadoEm instanceof Date && agora - o.enviadoEm >= 3 * DIA && agora - o.enviadoEm < 30 * DIA);
  if (semResposta.length) {
    linhas.push(semResposta.length === 1 ? `${primeiro(semResposta[0].cliente?.nome)} ainda não respondeu o orçamento` : `${semResposta.length} orçamentos sem resposta há mais de 3 dias`);
    if (link === "/") link = "/orcamentos?filtro=enviado";
  }

  const semAssinatura = contratos.filter((c) => c.status === "enviado" && (c.enviadoEm || c.criadoEm) instanceof Date && agora - (c.enviadoEm || c.criadoEm) >= 2 * DIA);
  if (semAssinatura.length) {
    linhas.push(semAssinatura.length === 1 ? "1 contrato aguardando assinatura" : `${semAssinatura.length} contratos aguardando assinatura`);
    if (link === "/") link = "/contratos";
  }

  const ate = perfil.planoAte instanceof Date ? perfil.planoAte : null;
  const emTeste = ate && perfil.testeProAte instanceof Date && Math.abs(ate - perfil.testeProAte) < 60_000;
  if (perfil.plano === "pro" && ate && ate > agora) {
    const dias = Math.ceil((ate - agora) / DIA);
    if (dias <= 3) {
      linhas.push(emTeste ? `Seu teste do Pro acaba em ${dias} ${dias === 1 ? "dia" : "dias"}` : `Seu Pro vence em ${dias} ${dias === 1 ? "dia" : "dias"}`);
      if (link === "/") link = "/conta#plano";
    }
  }

  if (!linhas.length) return null;
  return {
    titulo: linhas.length === 1 ? linhas[0] : `Bom dia! ${linhas.length} coisas pedem sua atenção`,
    texto: linhas.length === 1 ? "Toque para ver no Preço Fechado." : linhas.join(" · "),
    link,
    tag: "resumo-do-dia",
  };
}

/** Rotina de hora em hora. */
export async function rotina(fs, env, agora = new Date()) {
  const relatorio = { reenviados: 0, resumos: 0, proVencidos: 0 };

  // 1) Avisos que ficaram para trás (o cliente fechou a página antes do aviso sair, por exemplo)
  const ontem = new Date(agora.getTime() - DIA);
  for (const d of await fs.consultar("orcamentos", [["respondidoEm", "GREATER_THAN", ontem]])) {
    const o = { ...d.dados, id: d.id };
    if (["aprovado", "recusado", "pago"].includes(o.status) && !o.avisos?.resposta) {
      relatorio.reenviados += await marcarEAvisar(fs, env, d, "avisos.resposta", mensagemOrcamento(o));
    }
  }
  for (const d of await fs.consultar("contratos", [["assinatura.assinadoEm", "GREATER_THAN", ontem]])) {
    const c = { ...d.dados, id: d.id };
    if (c.status === "assinado" && !c.avisos?.assinado) {
      relatorio.reenviados += await marcarEAvisar(fs, env, d, "avisos.assinado", mensagemContrato(c));
    }
  }

  // 2) Cancelamento automático: Pro vencido volta para o plano grátis
  for (const d of await fs.consultar("users", [["plano", "EQUAL", "pro"], ["planoAte", "LESS_THAN", agora]])) {
    await fs.atualizar(`users/${d.id}`, { plano: "free" });
    relatorio.proVencidos++;
  }

  // 3) Resumo do dia, a partir das 9h (horário de Brasília), uma vez por dia por pessoa
  const { dia, hora } = hojeSP(agora);
  if (hora >= 9) {
    const donos = new Set((await fs.consultar("push")).map((i) => i.dados.ownerId).filter(Boolean));
    for (const uid of donos) {
      const u = await fs.ler(`users/${uid}`);
      if (!u || u.dados.avisos?.rotinaDia === dia) continue;
      const orcs = (await fs.consultar("orcamentos", [["ownerId", "EQUAL", uid]])).map((x) => ({ ...x.dados, id: x.id }));
      const cons = (await fs.consultar("contratos", [["ownerId", "EQUAL", uid]])).map((x) => ({ ...x.dados, id: x.id }));
      const msg = resumoDoDia(u.dados, orcs, cons, agora);
      await fs.atualizar(`users/${uid}`, { "avisos.rotinaDia": dia });
      if (msg) relatorio.resumos += await avisarDono(fs, env, uid, msg);
    }
  }
  return relatorio;
}
