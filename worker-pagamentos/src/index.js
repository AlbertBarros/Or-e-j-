/**
 * Orça Fácil — Cloudflare Worker que recebe os avisos (webhooks) do Mercado Pago e libera o Pro.
 *
 * Fluxo: Mercado Pago avisa "pagamento X" → o Worker confirma o pagamento na API do Mercado Pago
 * (nunca confia só no aviso) → acha o usuário pelo e-mail do pagador → grava plano "pro" e "planoAte".
 *
 * Segredos (wrangler secret put ...):
 *   MP_ACCESS_TOKEN        token de produção do Mercado Pago (Suas integrações → Credenciais)
 *   FIREBASE_SERVICE_ACCOUNT  conteúdo do service-account.json do Firebase (uma linha)
 *   WEBHOOK_SEGREDO        qualquer texto longo; a URL do webhook no Mercado Pago termina em ?s=<esse texto>
 */

const PLANOS = {
  // Palavra no nome do plano/produto → meses
  anual: 12,
  mensal: 1,
};

function mesesDoPagamento(descricao, valor) {
  const d = (descricao || "").toLowerCase();
  if (d.includes("anual")) return PLANOS.anual;
  if (d.includes("mensal")) return PLANOS.mensal;
  return Number(valor) >= 200 ? 12 : 1; // fallback pelo valor (238,80 anual / 29,90 mensal)
}

// ---------- Firestore via conta de serviço (JWT RS256 com WebCrypto) ----------
function base64url(bytes) {
  const bin = typeof bytes === "string" ? bytes : String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function tokenFirestore(conta) {
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
  const pem = conta.private_key.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
  const chave = await crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const assinatura = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", chave, new TextEncoder().encode(`${cabecalho}.${corpo}`));
  const jwt = `${cabecalho}.${corpo}.${base64url(assinatura)}`;
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  if (!resp.ok) throw new Error(`token google: ${resp.status}`);
  return (await resp.json()).access_token;
}

async function ativarPro(env, email, meses) {
  const conta = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const token = await tokenFirestore(conta);
  const base = `https://firestore.googleapis.com/v1/projects/${conta.project_id}/databases/(default)/documents`;
  const cab = { authorization: `Bearer ${token}`, "content-type": "application/json" };
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
  let docUsuario = ((await busca.json()) || []).map((r) => r.document).find(Boolean);
  let uidAuth = null;
  if (!docUsuario) {
    // Conta antiga sem o campo e-mail: procura no Authentication
    const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${conta.project_id}/accounts:lookup`, {
      method: "POST",
      headers: cab,
      body: JSON.stringify({ email: [email.toLowerCase()] }),
    });
    const contaAuth = lookup.ok ? ((await lookup.json()).users || [])[0] : null;
    if (contaAuth) {
      const perfil = await fetch(`${base}/users/${contaAuth.localId}`, { headers: cab });
      if (perfil.ok) {
        docUsuario = await perfil.json();
        uidAuth = contaAuth.localId;
      }
    }
  }
  if (!docUsuario) return { ok: false, motivo: `nenhum usuário com e-mail ${email}` };

  // Se já é Pro com validade futura, soma os meses a partir dela (renovação antecipada).
  const atual = docUsuario.fields.planoAte && docUsuario.fields.planoAte.timestampValue;
  const inicio = atual && new Date(atual) > new Date() ? new Date(atual) : new Date();
  inicio.setMonth(inicio.getMonth() + meses);
  const uid = uidAuth || docUsuario.name.split("/").pop();
  const campos = { plano: { stringValue: "pro" }, planoAte: { timestampValue: inicio.toISOString() } };
  let mask = "updateMask.fieldPaths=plano&updateMask.fieldPaths=planoAte";
  if (uidAuth) {
    campos.email = { stringValue: email.toLowerCase() };
    mask += "&updateMask.fieldPaths=email";
  }
  const resp = await fetch(`${base}/users/${uid}?${mask}`, { method: "PATCH", headers: cab, body: JSON.stringify({ fields: campos }) });
  if (!resp.ok) return { ok: false, motivo: `firestore ${resp.status}` };
  return { ok: true, uid, ate: inicio.toISOString() };
}

// ---------- Mercado Pago ----------
async function mp(env, caminho) {
  const r = await fetch(`https://api.mercadopago.com${caminho}`, { headers: { authorization: `Bearer ${env.MP_ACCESS_TOKEN}` } });
  if (!r.ok) throw new Error(`mercado pago ${caminho}: ${r.status}`);
  return r.json();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET") return new Response("Orça Fácil — webhook de pagamentos ativo", { status: 200 });
    if (request.method !== "POST") return new Response("método não permitido", { status: 405 });
    if (env.WEBHOOK_SEGREDO && url.searchParams.get("s") !== env.WEBHOOK_SEGREDO) {
      return new Response("não autorizado", { status: 401 });
    }

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
      let email = null;
      let descricao = "";
      let valor = 0;
      let aprovado = false;

      if (tipo === "payment") {
        const p = await mp(env, `/v1/payments/${id}`);
        aprovado = p.status === "approved";
        email = p.payer && p.payer.email;
        descricao = p.description || (p.additional_info && p.additional_info.items && p.additional_info.items[0] && p.additional_info.items[0].title) || "";
        valor = p.transaction_amount;
        // Pagamento de assinatura: a descrição vem do plano (preapproval)
        if (p.metadata && p.metadata.preapproval_id) {
          const pre = await mp(env, `/preapproval/${p.metadata.preapproval_id}`);
          descricao = pre.reason || descricao;
          email = pre.payer_email || email;
        }
      } else if (tipo === "subscription_authorized_payment" || tipo === "subscription_preapproval") {
        // Cobrança recorrente autorizada: busca o pagamento e a assinatura
        const ap = tipo === "subscription_authorized_payment" ? await mp(env, `/authorized_payments/${id}`) : null;
        const preId = ap ? ap.preapproval_id : id;
        const pre = await mp(env, `/preapproval/${preId}`);
        email = pre.payer_email;
        descricao = pre.reason || "";
        valor = (pre.auto_recurring && pre.auto_recurring.transaction_amount) || 0;
        aprovado = ap ? ap.status === "approved" || (ap.payment && ap.payment.status === "approved") : pre.status === "authorized";
      } else {
        return new Response(`tipo ignorado: ${tipo}`, { status: 200 });
      }

      if (!aprovado || !email) return new Response("não aprovado ou sem e-mail", { status: 200 });
      const meses = mesesDoPagamento(descricao, valor);
      const resultado = await ativarPro(env, email, meses);
      console.log(JSON.stringify({ tipo, id, email, meses, resultado }));
      return new Response(JSON.stringify(resultado), { status: 200, headers: { "content-type": "application/json" } });
    } catch (e) {
      console.error(e);
      // 500 faz o Mercado Pago tentar de novo mais tarde
      return new Response("erro interno", { status: 500 });
    }
  },
};
