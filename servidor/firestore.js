/**
 * Firestore com a conta de serviço, via REST (sem SDK): roda no Cloudflare e no Node 20+.
 * A conta de serviço ignora as regras de segurança, então só o servidor usa este arquivo.
 *
 * FIREBASE_SERVICE_ACCOUNT = conteúdo do service-account.json (Firebase → Contas de serviço → Gerar nova chave).
 */

function base64url(bytes) {
  const u = typeof bytes === "string" ? new TextEncoder().encode(bytes) : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < u.length; i++) bin += String.fromCharCode(u[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

let cacheToken = null; // { token, expira, email }

/** Token OAuth do Google (válido 1 h; reaproveitado enquanto a função estiver quente). */
export async function tokenGoogle(conta) {
  const agora = Math.floor(Date.now() / 1000);
  if (cacheToken && cacheToken.email === conta.client_email && cacheToken.expira > agora + 60) return cacheToken.token;
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
  const token = (await resp.json()).access_token;
  cacheToken = { token, expira: agora + 3500, email: conta.client_email };
  return token;
}

// ---------- Conversão de valores do REST ----------
export function deValor(v) {
  if (!v || typeof v !== "object") return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return new Date(v.timestampValue);
  if ("nullValue" in v) return null;
  if ("mapValue" in v) return deCampos(v.mapValue.fields || {});
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(deValor);
  return null;
}

export function deCampos(campos) {
  const o = {};
  for (const [k, v] of Object.entries(campos || {})) o[k] = deValor(v);
  return o;
}

export function paraValor(x) {
  if (x === null || x === undefined) return { nullValue: null };
  if (x instanceof Date) return { timestampValue: x.toISOString() };
  if (typeof x === "string") return { stringValue: x };
  if (typeof x === "boolean") return { booleanValue: x };
  if (typeof x === "number") return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(paraValor) } };
  return { mapValue: { fields: paraCampos(x) } };
}

export function paraCampos(o) {
  const f = {};
  for (const [k, v] of Object.entries(o)) f[k] = paraValor(v);
  return f;
}

/** Documento REST → { id, caminho, atualizadoEm, dados }. */
export function doc(d) {
  return { id: d.name.split("/").pop(), caminho: d.name, atualizadoEm: d.updateTime, dados: deCampos(d.fields) };
}

/** Cliente simples do Firestore para uma requisição. */
export async function abrirFirestore(env) {
  // Testes locais: FIRESTORE_EMULATOR_HOST aponta para o emulador (sem conta de serviço; "owner" ignora as regras)
  const emulador = env.FIRESTORE_EMULATOR_HOST;
  if (!env.FIREBASE_SERVICE_ACCOUNT && !emulador) throw new Error("FIREBASE_SERVICE_ACCOUNT não configurada");
  const conta = emulador ? { project_id: env.EMULADOR_PROJETO || "demo-preco-fechado" } : JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const token = emulador ? "owner" : await tokenGoogle(conta);
  const raiz = `projects/${conta.project_id}/databases/(default)/documents`;
  const base = emulador ? `http://${emulador}/v1/${raiz}` : `https://firestore.googleapis.com/v1/${raiz}`;
  const cab = { authorization: `Bearer ${token}`, "content-type": "application/json" };

  return {
    projeto: conta.project_id,
    token,
    cab,

    async ler(caminho) {
      const r = await fetch(`${base}/${caminho}`, { headers: cab });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`ler ${caminho}: ${r.status}`);
      return doc(await r.json());
    },

    /** Atualiza só os campos informados (caminhos com ponto viram mapas: "avisos.resposta"). */
    async atualizar(caminho, campos, { exigeAtualizadoEm } = {}) {
      const mascara = Object.keys(campos)
        .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k.split(".").map((p) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(p) ? p : `\`${p}\``)).join("."))}`)
        .join("&");
      // Monta o objeto aninhado a partir dos caminhos com ponto
      const aninhado = {};
      for (const [k, v] of Object.entries(campos)) {
        const partes = k.split(".");
        let alvo = aninhado;
        partes.slice(0, -1).forEach((p) => (alvo = alvo[p] ??= {}));
        alvo[partes[partes.length - 1]] = v;
      }
      const pre = exigeAtualizadoEm ? `&currentDocument.updateTime=${encodeURIComponent(exigeAtualizadoEm)}` : "";
      const r = await fetch(`${base}/${caminho}?${mascara}${pre}`, { method: "PATCH", headers: cab, body: JSON.stringify({ fields: paraCampos(aninhado) }) });
      if (!r.ok) {
        const e = new Error(`atualizar ${caminho}: ${r.status}`);
        e.status = r.status;
        e.detalhe = await r.text().catch(() => "");
        throw e;
      }
      return doc(await r.json());
    },

    /** Cria o documento só se ainda não existir. Devolve false quando já existia (serve de trava contra repetição). */
    async criarSeNaoExiste(caminho, campos) {
      const r = await fetch(`${base}/${caminho}?currentDocument.exists=false`, { method: "PATCH", headers: cab, body: JSON.stringify({ fields: paraCampos(campos) }) });
      if (r.ok) return true;
      if (r.status === 400 || r.status === 409 || r.status === 412) return false;
      throw new Error(`criar ${caminho}: ${r.status}`);
    },

    async apagar(caminho) {
      const r = await fetch(`${base}/${caminho}`, { method: "DELETE", headers: cab });
      if (!r.ok && r.status !== 404) throw new Error(`apagar ${caminho}: ${r.status}`);
    },

    /** Consulta com filtros de igualdade/comparação. filtros: [[campo, op, valor]] com op EQUAL, LESS_THAN, GREATER_THAN... */
    async consultar(colecao, filtros = [], { limite } = {}) {
      const where =
        filtros.length === 0
          ? undefined
          : filtros.length === 1
            ? { fieldFilter: { field: { fieldPath: filtros[0][0] }, op: filtros[0][1], value: paraValor(filtros[0][2]) } }
            : {
                compositeFilter: {
                  op: "AND",
                  filters: filtros.map(([c, op, v]) => ({ fieldFilter: { field: { fieldPath: c }, op, value: paraValor(v) } })),
                },
              };
      const r = await fetch(`${base}:runQuery`, {
        method: "POST",
        headers: cab,
        body: JSON.stringify({ structuredQuery: { from: [{ collectionId: colecao }], ...(where ? { where } : {}), ...(limite ? { limit: limite } : {}) } }),
      });
      if (!r.ok) throw new Error(`consultar ${colecao}: ${r.status} ${await r.text()}`);
      return ((await r.json()) || []).filter((x) => x.document).map((x) => doc(x.document));
    },

    /** Busca a conta no Authentication pelo e-mail (contas antigas sem o campo email no perfil). */
    async contaPorEmail(email) {
      if (emulador) return null;
      const r = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${conta.project_id}/accounts:lookup`, {
        method: "POST",
        headers: cab,
        body: JSON.stringify({ email: [email.toLowerCase()] }),
      });
      return r.ok ? ((await r.json()).users || [])[0] ?? null : null;
    },
  };
}
