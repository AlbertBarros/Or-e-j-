/**
 * POST /api/mercadopago?s=<WEBHOOK_SEGREDO> — avisos (webhooks) do Mercado Pago que liberam o Pro sozinho.
 *
 * Fluxo: o Mercado Pago avisa "pagamento X" → confirmamos na API deles (nunca confiamos só no aviso)
 * → achamos o usuário pelo e-mail do pagador → gravamos plano "pro" e "planoAte".
 * Assinatura cancelada ou pausada: gravamos assinatura.status; o Pro continua até o fim do período pago
 * e depois a rotina diária volta a conta para o plano grátis.
 *
 * Variáveis no projeto do app no Cloudflare: MP_ACCESS_TOKEN, WEBHOOK_SEGREDO, FIREBASE_SERVICE_ACCOUNT.
 * (Substitui o antigo worker-pagamentos: agora tudo roda no próprio app, sem publicar nada à parte.)
 */
import { abrirFirestore } from "../../servidor/firestore.js";

function mesesDoPagamento(descricao, valor) {
  const d = (descricao || "").toLowerCase();
  if (d.includes("anual")) return 12;
  if (d.includes("mensal")) return 1;
  return Number(valor) >= 200 ? 12 : 1; // pelo valor (238,80 anual / 29,90 mensal)
}

async function mp(env, caminho) {
  const r = await fetch(`https://api.mercadopago.com${caminho}`, { headers: { authorization: `Bearer ${env.MP_ACCESS_TOKEN}` } });
  if (!r.ok) throw new Error(`mercado pago ${caminho}: ${r.status}`);
  return r.json();
}

/** Acha o perfil pelo e-mail (campo email, ou pela conta no Authentication em perfis antigos). */
async function acharUsuario(fs, email) {
  const [porCampo] = await fs.consultar("users", [["email", "EQUAL", email.toLowerCase()]], { limite: 1 });
  if (porCampo) return { uid: porCampo.id, dados: porCampo.dados, gravarEmail: false };
  const conta = await fs.contaPorEmail(email);
  if (!conta) return null;
  const perfil = await fs.ler(`users/${conta.localId}`);
  return perfil ? { uid: conta.localId, dados: perfil.dados, gravarEmail: true } : null;
}

async function ativarPro(fs, email, meses) {
  const u = await acharUsuario(fs, email);
  if (!u) return { ok: false, motivo: `nenhum usuário com e-mail ${email}` };
  // Pro ainda válido (inclusive o teste de 14 dias): soma os meses a partir do fim dele.
  const atual = u.dados.planoAte instanceof Date ? u.dados.planoAte : null;
  const ate = atual && atual > new Date() ? new Date(atual) : new Date();
  ate.setMonth(ate.getMonth() + meses);
  const campos = { plano: "pro", planoAte: ate, "assinatura.status": "ativa", "assinatura.atualizadoEm": new Date() };
  if (u.gravarEmail) campos.email = email.toLowerCase();
  await fs.atualizar(`users/${u.uid}`, campos);
  return { ok: true, uid: u.uid, ate: ate.toISOString() };
}

async function marcarAssinatura(fs, email, status) {
  const u = await acharUsuario(fs, email);
  if (!u) return { ok: false, motivo: `nenhum usuário com e-mail ${email}` };
  await fs.atualizar(`users/${u.uid}`, { "assinatura.status": status, "assinatura.atualizadoEm": new Date() });
  return { ok: true, uid: u.uid, status };
}

export async function onRequestGet({ env }) {
  return new Response(env.MP_ACCESS_TOKEN ? "Preço Fechado — webhook de pagamentos ativo" : "webhook não configurado", { status: 200 });
}

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  if (!env.MP_ACCESS_TOKEN || !env.FIREBASE_SERVICE_ACCOUNT) return new Response("não configurado", { status: 503 });
  if (!env.WEBHOOK_SEGREDO || url.searchParams.get("s") !== env.WEBHOOK_SEGREDO) return new Response("não autorizado", { status: 401 });

  let aviso = {};
  try {
    aviso = await request.json();
  } catch {
    /* alguns avisos vêm só na query string */
  }
  const tipo = aviso.type || aviso.topic || url.searchParams.get("type") || url.searchParams.get("topic") || "";
  const id = (aviso.data && aviso.data.id) || url.searchParams.get("data.id") || url.searchParams.get("id");
  if (!id) return new Response("sem id", { status: 200 });

  try {
    const fs = await abrirFirestore(env);
    let email = null;
    let descricao = "";
    let valor = 0;
    let aprovado = false;
    let idPagamento = null; // trava: o mesmo pagamento chega por mais de um tipo de aviso

    if (tipo === "payment") {
      const p = await mp(env, `/v1/payments/${id}`);
      aprovado = p.status === "approved";
      idPagamento = String(p.id);
      email = p.payer && p.payer.email;
      descricao = p.description || p.additional_info?.items?.[0]?.title || "";
      valor = p.transaction_amount;
      if (p.metadata && p.metadata.preapproval_id) {
        const pre = await mp(env, `/preapproval/${p.metadata.preapproval_id}`);
        descricao = pre.reason || descricao;
        email = pre.payer_email || email;
      }
    } else if (tipo === "subscription_authorized_payment") {
      const ap = await mp(env, `/authorized_payments/${id}`);
      const pre = await mp(env, `/preapproval/${ap.preapproval_id}`);
      email = pre.payer_email;
      descricao = pre.reason || "";
      valor = pre.auto_recurring?.transaction_amount || 0;
      aprovado = ap.status === "approved" || ap.payment?.status === "approved";
      idPagamento = ap.payment?.id ? String(ap.payment.id) : `ap-${id}`;
    } else if (tipo === "subscription_preapproval") {
      const pre = await mp(env, `/preapproval/${id}`);
      email = pre.payer_email;
      if (!email) return new Response("assinatura sem e-mail", { status: 200 });
      // Cancelada ou pausada: só registra. O Pro vale até o fim do período já pago.
      if (pre.status === "cancelled" || pre.status === "paused") {
        const r = await marcarAssinatura(fs, email, pre.status === "cancelled" ? "cancelada" : "pausada");
        console.log(JSON.stringify({ tipo, id, email, r }));
        return Response.json(r);
      }
      // Autorizada: a cobrança chega como subscription_authorized_payment; aqui só marca como ativa.
      if (pre.status === "authorized") {
        const r = await marcarAssinatura(fs, email, "ativa");
        return Response.json(r);
      }
      return new Response(`assinatura ${pre.status}`, { status: 200 });
    } else {
      return new Response(`tipo ignorado: ${tipo}`, { status: 200 });
    }

    if (!aprovado || !email) return new Response("não aprovado ou sem e-mail", { status: 200 });
    const meses = mesesDoPagamento(descricao, valor);
    if (idPagamento && !(await fs.criarSeNaoExiste(`pagamentos/${idPagamento}`, { email: email.toLowerCase(), meses, valor: Number(valor) || 0, tipo, criadoEm: new Date() }))) {
      return new Response("pagamento já processado", { status: 200 });
    }
    const resultado = await ativarPro(fs, email, meses);
    console.log(JSON.stringify({ tipo, id, email, meses, resultado }));
    return Response.json(resultado);
  } catch (e) {
    console.error(String(e));
    return new Response("erro interno", { status: 500 }); // o Mercado Pago tenta de novo mais tarde
  }
}
