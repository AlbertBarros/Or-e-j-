#!/usr/bin/env node
/**
 * Semeia dados de demonstração no EMULADOR (nunca em produção): Pro + logo, orçamentos em vários status,
 * clientes e um contrato assinado. Usado para tirar as telas do site. Pré-requisito: um usuário já cadastrado.
 * Uso: node scripts/semear-demo.cjs
 */
const path = require("node:path");
const sharp = require(require.resolve("sharp", { paths: [path.join(__dirname, "..", "site")] }));

const BASE = "http://127.0.0.1:8080/v1/projects/orca-ja-aaf65/databases/(default)/documents";
const CAB = { Authorization: "Bearer owner", "Content-Type": "application/json" };

const v = {
  s: (x) => ({ stringValue: String(x) }),
  n: (x) => (Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x }),
  b: (x) => ({ booleanValue: x }),
  t: (d) => ({ timestampValue: d.toISOString() }),
  m: (o) => ({ mapValue: { fields: campos(o) } }),
  a: (l) => ({ arrayValue: { values: l } }),
};
function campos(o) {
  const f = {};
  for (const [k, x] of Object.entries(o)) if (x !== undefined) f[k] = x;
  return f;
}
async function set(colecao, id, fields) {
  const r = await fetch(`${BASE}/${colecao}/${id}`, { method: "PATCH", headers: CAB, body: JSON.stringify({ fields }) });
  if (!r.ok) throw new Error(`${colecao}/${id}: ${r.status} ${await r.text()}`);
}
async function patch(colecao, id, fields) {
  const mask = Object.keys(fields).map((c) => `updateMask.fieldPaths=${c}`).join("&");
  const r = await fetch(`${BASE}/${colecao}/${id}?${mask}`, { method: "PATCH", headers: CAB, body: JSON.stringify({ fields }) });
  if (!r.ok) throw new Error(`${colecao}/${id}: ${r.status} ${await r.text()}`);
}
const dias = (n) => new Date(Date.now() - n * 86400000);

async function main() {
  const lista = await (await fetch(`${BASE}/users`, { headers: CAB })).json();
  const doc = (lista.documents || [])[0];
  if (!doc) throw new Error("Nenhum usuário no emulador. Faça o cadastro no app antes.");
  const uid = doc.name.split("/").pop();
  const perfil = doc.fields;
  const negocio = {
    nome: v.s(perfil.nomeNegocio.stringValue),
    nomePix: v.s(perfil.nomePix.stringValue),
    whatsapp: v.s(perfil.whatsapp.stringValue),
    chavePix: v.s(perfil.chavePix.stringValue),
    cidade: v.s(perfil.cidade.stringValue),
    mostrarMarca: v.b(false),
    mostrarLogo: v.b(true),
    mostrarPix: v.b(true),
  };

  // Logo de demonstração (monograma) como data URL PNG
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" rx="56" fill="#0B1437"/><path d="M128 36 96 136h30l-14 84 70-116h-34l20-68z" fill="#F5C451"/></svg>`;
  const png = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer();
  await set("logos", uid, { dataUrl: v.s(`data:image/png;base64,${png.toString("base64")}`), atualizadoEm: v.t(new Date()) });
  await patch("users", uid, { plano: v.s("pro"), planoAte: v.t(dias(-365)), temLogo: v.b(true), proximoNumero: v.n(9), proximoRecibo: v.n(3), proximoContrato: v.n(3), modeloDocumento: v.n(3) });

  const clientes = [
    ["Maria Souza", "5561988887777"],
    ["Carlos Lima", "5561977776666"],
    ["Ana Pereira", "5561966665555"],
    ["Roberto Alves", "5561955554444"],
    ["Fernanda Costa", "5561944443333"],
  ];
  for (const [nome, w] of clientes) {
    await set("clientes", `${uid}_${w}`, { ownerId: v.s(uid), nome: v.s(nome), whatsapp: v.s(w), criadoEm: v.t(dias(40)), atualizadoEm: v.t(dias(1)) });
  }

  const item = (descricao, qtd, unidade, valorUnit) => v.m({ descricao: v.s(descricao), qtd: v.n(qtd), unidade: v.s(unidade), valorUnit: v.n(valorUnit) });
  const orcs = [
    { n: 1, c: 0, status: "pago", itens: [item("Troca de disjuntor", 2, "un", 90), item("Visita técnica / diagnóstico", 1, "un", 80)], total: 260, criado: 38, enviado: 38, resp: 37, pago: 30 },
    { n: 2, c: 1, status: "recusado", itens: [item("Instalação de chuveiro elétrico", 1, "un", 120)], total: 120, criado: 33, enviado: 33, resp: 31 },
    { n: 3, c: 2, status: "pago", itens: [item("Passagem de fiação (ponto novo)", 4, "ponto", 150), item("Instalação de luminária/lustre", 2, "un", 90)], total: 780, criado: 27, enviado: 27, resp: 26, pago: 20 },
    { n: 4, c: 3, status: "aprovado", itens: [item("Instalação de tomada ou interruptor", 6, "un", 60), item("Visita técnica / diagnóstico", 1, "un", 80)], total: 440, criado: 12, enviado: 12, resp: 11, venc: -3 },
    { n: 5, c: 4, status: "aprovado", itens: [item("Instalação de chuveiro elétrico", 1, "un", 120), item("Troca de disjuntor", 1, "un", 90)], total: 288.25, criado: 6, enviado: 6, resp: 5, venc: 10, frete: true },
    { n: 6, c: 0, status: "enviado", itens: [item("Instalação de luminária/lustre", 3, "un", 90)], total: 270, criado: 2, enviado: 2 },
    { n: 7, c: 1, status: "enviado", itens: [item("Passagem de fiação (ponto novo)", 2, "ponto", 150)], total: 300, criado: 1, enviado: 1 },
    { n: 8, c: 2, status: "rascunho", itens: [item("Troca de disjuntor", 1, "un", 90)], total: 90, criado: 0 },
  ];
  const ids = [];
  for (const o of orcs) {
    const [nome, w] = clientes[o.c];
    const id = `demo${String(o.n).padStart(2, "0")}aaaaaaaaaaaaaaaa`;
    ids.push(id);
    await set("orcamentos", id, {
      ownerId: v.s(uid),
      numero: v.n(o.n),
      cliente: v.m({ nome: v.s(nome), whatsapp: v.s(w) }),
      itens: v.a(o.itens),
      desconto: v.n(0),
      ...(o.frete ? { frete: v.m({ endereco: v.s("QNM 36, Taguatinga Norte, Brasília"), km: v.n(23.3), fixo: v.n(20), porKm: v.n(2.5), valor: v.n(78.25) }) } : {}),
      pagamento: v.m({ metodos: v.a([v.s("pix"), v.s("credito")]), aCombinar: v.b(false), ...(o.n === 5 ? { valorCartao: v.n(305) } : {}) }),
      modelo: v.n(o.n === 5 ? 3 : 2),
      total: v.n(o.total),
      validadeDias: v.n(15),
      validadeAte: v.t(dias(o.criado - 15)),
      ...(o.venc !== undefined ? { vencimentoPagamento: v.t(dias(o.venc)) } : {}),
      observacoes: v.s("Material elétrico por conta do cliente, salvo indicação em contrário. Garantia de 90 dias sobre a mão de obra."),
      status: v.s(o.status),
      negocio: v.m(negocio),
      criadoEm: v.t(dias(o.criado)),
      atualizadoEm: v.t(dias(Math.min(o.criado, o.pago ?? o.resp ?? o.criado))),
      ...(o.enviado !== undefined ? { enviadoEm: v.t(dias(o.enviado)) } : {}),
      ...(o.resp !== undefined ? { respondidoEm: v.t(dias(o.resp)) } : {}),
      ...(o.pago !== undefined ? { pagoEm: v.t(dias(o.pago)) } : {}),
    });
  }

  // Contrato assinado do orçamento 3 e um aguardando do 4
  const assinatura = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200"><path d="M40 130 C 90 40, 130 40, 160 120 S 230 60, 260 110 S 330 160, 380 90 S 470 60, 540 120" fill="none" stroke="#1A1D23" stroke-width="4" stroke-linecap="round"/></svg>`;
  const assPng = await sharp(Buffer.from(assinatura)).png().toBuffer();
  const contratado = v.m({ nome: v.s("JS Elétrica"), responsavel: v.s("João Silva"), whatsapp: v.s("5561999990000"), documento: v.s("12.345.678/0001-90"), endereco: v.s("SQS 308 Bloco C, Asa Sul, Brasília/DF"), cidade: v.s("Brasília") });
  const textoC = (n, cli, valor) => `CONTRATO DE PRESTAÇÃO DE SERVIÇOS Nº ${String(n).padStart(4, "0")}\n\nCONTRATANTE: ${cli}.\nCONTRATADO: JS Elétrica, representado(a) por João Silva.\n\nCLÁUSULA 1 — DO OBJETO\nServiços conforme o orçamento aprovado.\n\nCLÁUSULA 2 — DO VALOR E DO PAGAMENTO\nValor total de ${valor}.\n\n(…demais cláusulas…)`;
  await set("contratos", "democontrato01aaaaaaaaaaa", {
    ownerId: v.s(uid), numero: v.n(1), orcamentoId: v.s(ids[2]), orcamentoNumero: v.n(3), status: v.s("assinado"),
    contratante: v.m({ nome: v.s("Ana Pereira"), whatsapp: v.s("5561966665555") }), contratado,
    objeto: v.a(orcs[2].itens), valor: v.n(780), formaPagamento: v.s("Pix na conclusão"), prazoExecucao: v.s("7 dias"), garantiaDias: v.n(90),
    texto: v.s(textoC(1, "Ana Pereira", "R$ 780,00")), mostrarMarca: v.b(false),
    assinatura: v.m({ nome: v.s("Ana Pereira"), imagem: v.s(`data:image/png;base64,${assPng.toString("base64")}`), assinadoEm: v.t(dias(25)), agente: v.s("iPhone · Safari") }),
    criadoEm: v.t(dias(26)), atualizadoEm: v.t(dias(25)), enviadoEm: v.t(dias(26)),
  });
  await set("contratos", "democontrato02aaaaaaaaaaa", {
    ownerId: v.s(uid), numero: v.n(2), orcamentoId: v.s(ids[3]), orcamentoNumero: v.n(4), status: v.s("enviado"),
    contratante: v.m({ nome: v.s("Roberto Alves"), whatsapp: v.s("5561955554444") }), contratado,
    objeto: v.a(orcs[3].itens), valor: v.n(440), formaPagamento: v.s("50% na aprovação e 50% na entrega"), prazoExecucao: v.s("3 dias úteis"), garantiaDias: v.n(90),
    texto: v.s(textoC(2, "Roberto Alves", "R$ 440,00")), mostrarMarca: v.b(false),
    criadoEm: v.t(dias(10)), atualizadoEm: v.t(dias(10)), enviadoEm: v.t(dias(10)),
  });
  console.log("demo semeada para", uid, "| orçamentos:", ids.length);
  console.log("ids:", JSON.stringify({ aprovadoFrete: ids[4], enviado: ids[5], pago: ids[2], contrato: "democontrato01aaaaaaaaaaa", uid }));
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
