/**
 * Cloudflare Pages Function para /o/:id.
 *
 * O WhatsApp (e outros apps) montam a prévia do link lendo as meta tags do HTML, sem rodar JavaScript.
 * Numa SPA, elas seriam sempre as mesmas. Esta função busca o orçamento no Firestore (leitura pública,
 * permitida pelas regras) e injeta no index.html as tags Open Graph específicas:
 * "Orçamento nº 12 — JS Elétrica" / "Total R$ 240,00 · válido até 22/10. Toque para ver e aprovar."
 *
 * Variáveis usadas (já cadastradas no projeto Pages do app): VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_API_KEY, VITE_APP_URL.
 *
 * Fica na raiz do repositório porque o Cloudflare Pages só lê a pasta functions/ do "root directory" do projeto.
 * O projeto do site (orca-ja) compartilha o repositório: nele não existem as variáveis VITE_*, então a função
 * apenas repassa a requisição (context.next) e nada muda no site.
 */

function escapar(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function reais(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataCurta(timestamp) {
  if (!timestamp) return null;
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

async function buscarOrcamento(env, id) {
  const projeto = env.VITE_FIREBASE_PROJECT_ID;
  const chave = env.VITE_FIREBASE_API_KEY;
  if (!projeto || !chave || !/^[A-Za-z0-9_-]{10,40}$/.test(id)) return null;
  const url = `https://firestore.googleapis.com/v1/projects/${projeto}/databases/(default)/documents/orcamentos/${id}?key=${chave}`;
  const resposta = await fetch(url, { cf: { cacheTtl: 30, cacheEverything: true } });
  if (!resposta.ok) return null;
  const doc = await resposta.json();
  const f = doc.fields || {};
  const negocio = (f.negocio && f.negocio.mapValue && f.negocio.mapValue.fields) || {};
  return {
    numero: Number(f.numero && (f.numero.integerValue || f.numero.doubleValue)),
    total: Number(f.total && (f.total.doubleValue || f.total.integerValue)),
    status: f.status && f.status.stringValue,
    validadeAte: f.validadeAte && f.validadeAte.timestampValue,
    nomeNegocio: negocio.nome && negocio.nome.stringValue,
  };
}

export async function onRequestGet(context) {
  const { request, env, params } = context;
  if (!env.VITE_FIREBASE_PROJECT_ID) return context.next(); // projeto do site: não é o app
  // index.html da SPA. Pedimos "/" (não "/index.html": o Pages redireciona esse caminho e o corpo vem vazio).
  const indexResp = await env.ASSETS.fetch(new Request(new URL("/", request.url).toString(), { method: "GET" }));
  if (!indexResp.ok) return context.next();
  let html = await indexResp.text();
  if (!html.includes("</head>")) return context.next();

  let titulo = "Orçamento — Orça Já";
  let descricao = "Veja o orçamento e aprove com um toque. Sem cadastro, sem baixar nada.";
  try {
    const o = await buscarOrcamento(env, params.id);
    if (o && o.status && o.status !== "rascunho") {
      titulo = `Orçamento nº ${String(o.numero).padStart(4, "0")} — ${o.nomeNegocio || "Orça Já"}`;
      const validade = dataCurta(o.validadeAte);
      const partes = [`Total ${reais(o.total)}`];
      if (o.status === "enviado" && validade) partes.push(`válido até ${validade}`);
      if (o.status === "enviado") partes.push("Toque para ver e aprovar.");
      else if (o.status === "aprovado") partes.push("Aprovado.");
      else if (o.status === "pago") partes.push("Pago.");
      else if (o.status === "recusado") partes.push("Recusado.");
      descricao = partes.join(" · ").replace(" · Toque", ". Toque").replace(" · Aprovado", ". Aprovado").replace(" · Pago", ". Pago").replace(" · Recusado", ". Recusado");
    }
  } catch (e) {
    // Sem prévia específica, segue com a genérica.
  }

  const base = (env.VITE_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
  const urlPagina = `${base}/o/${params.id}`;
  const imagem = `${base}/icones/icone-512.png`;
  const tags = [
    `<title>${escapar(titulo)}</title>`,
    `<meta name="description" content="${escapar(descricao)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Orça Já">`,
    `<meta property="og:title" content="${escapar(titulo)}">`,
    `<meta property="og:description" content="${escapar(descricao)}">`,
    `<meta property="og:url" content="${escapar(urlPagina)}">`,
    `<meta property="og:image" content="${escapar(imagem)}">`,
    `<meta property="og:locale" content="pt_BR">`,
    `<meta name="twitter:card" content="summary">`,
  ].join("\n    ");

  // Troca o <title> e a description genéricos pelos específicos.
  html = html.replace(/<title>[^<]*<\/title>/, "").replace(/<meta name="description"[^>]*>/, "");
  html = html.replace("</head>", `    ${tags}\n  </head>`);

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=30",
    },
  });
}
