/** Prévia (Open Graph) do link do contrato /c/:id — mesma ideia de /o/:id. */

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
  const url = `https://firestore.googleapis.com/v1/projects/${projeto}/databases/(default)/documents/contratos/${id}?key=${chave}`;
  const resposta = await fetch(url, { cf: { cacheTtl: 30, cacheEverything: true } });
  if (!resposta.ok) return null;
  const doc = await resposta.json();
  const f = doc.fields || {};
  const contratado = (f.contratado && f.contratado.mapValue && f.contratado.mapValue.fields) || {};
  return {
    numero: Number(f.numero && (f.numero.integerValue || f.numero.doubleValue)),
    total: Number(f.valor && (f.valor.doubleValue || f.valor.integerValue)),
    status: f.status && f.status.stringValue,
    nomeNegocio: contratado.nome && contratado.nome.stringValue,
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

  let titulo = "Contrato — Orça Fácil";
  let descricao = "Leia o contrato de prestação de serviço e assine pelo celular.";
  try {
    const o = await buscarOrcamento(env, params.id);
    if (o && o.status && o.status !== "rascunho") {
      titulo = `Contrato nº ${String(o.numero).padStart(4, "0")} — ${o.nomeNegocio || "Orça Fácil"}`;
      descricao = o.status === "assinado" ? `Valor ${reais(o.total)}. Contrato assinado.` : `Valor ${reais(o.total)}. Toque para ler e assinar.`;
    }
  } catch (e) {
    // Sem prévia específica, segue com a genérica.
  }

  const base = (env.VITE_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
  const urlPagina = `${base}/c/${params.id}`;
  const imagem = `${base}/icones/icone-512.png`;
  const tags = [
    `<title>${escapar(titulo)}</title>`,
    `<meta name="description" content="${escapar(descricao)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Orça Fácil">`,
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
