/**
 * Testes das regras do Firestore (docs/ARQUITETURA.md → "Regras e índices").
 * Rodam contra o emulador: `npm run test:regras` na raiz (precisa de Java instalado).
 */
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, beforeEach, describe, it } from "vitest";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, addDoc } from "firebase/firestore";

let ambiente: RulesTestEnvironment;
const A = "usuario-a";
const B = "usuario-b";

const perfilBase = {
  nomeNegocio: "JS Elétrica",
  nomeResponsavel: "João",
  nomePix: "João Silva",
  profissao: "eletricista",
  whatsapp: "5561999990000",
  cidade: "Brasília",
  chavePix: "12345678909",
  tipoChavePix: "cpf",
  temLogo: false,
  plano: "free",
  proximoNumero: 1,
  uso: { mes: "2026-10", enviados: 0 },
  criadoEm: new Date(),
};

function orcamentoBase(ownerId: string, status: string) {
  return {
    ownerId,
    numero: 1,
    cliente: { nome: "Maria", whatsapp: "5561988880000" },
    itens: [{ descricao: "Troca de disjuntor", qtd: 1, unidade: "un", valorUnit: 90 }],
    desconto: 0,
    total: 90,
    validadeAte: new Date(),
    observacoes: "",
    status,
    negocio: {
      nome: "JS Elétrica",
      nomePix: "João Silva",
      whatsapp: "5561999990000",
      chavePix: "12345678909",
      cidade: "Brasília",
      mostrarMarca: true,
      mostrarLogo: false,
      mostrarPix: false,
    },
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  };
}

beforeAll(async () => {
  ambiente = await initializeTestEnvironment({
    projectId: "orca-ja-teste",
    firestore: {
      rules: readFileSync(new URL("./firestore.rules", import.meta.url), "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await ambiente.cleanup();
});

beforeEach(async () => {
  await ambiente.clearFirestore();
});

/** Grava dados iniciais ignorando as regras. */
async function semear(caminho: string, dados: object) {
  await ambiente.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), caminho), dados);
  });
}

const anonimo = () => ambiente.unauthenticatedContext().firestore();
const como = (uid: string) => ambiente.authenticatedContext(uid).firestore();

describe("users", () => {
  it("usuário cria o próprio perfil com plano free", async () => {
    await assertSucceeds(setDoc(doc(como(A), "users", A), perfilBase));
  });
  it("usuário não cria perfil já como pro", async () => {
    await assertFails(setDoc(doc(como(A), "users", A), { ...perfilBase, plano: "pro" }));
  });
  it("usuário não altera o próprio plano", async () => {
    await semear(`users/${A}`, perfilBase);
    await assertFails(updateDoc(doc(como(A), "users", A), { plano: "pro" }));
    await assertSucceeds(updateDoc(doc(como(A), "users", A), { cidade: "Goiânia" }));
  });
  it("usuário A não lê nem edita o perfil de B", async () => {
    await semear(`users/${B}`, perfilBase);
    await assertFails(getDoc(doc(como(A), "users", B)));
    await assertFails(updateDoc(doc(como(A), "users", B), { cidade: "X" }));
  });
});

describe("teste grátis do Pro (14 dias)", () => {
  const dias = (n: number) => new Date(Date.now() + n * 86_400_000);
  it("cria o perfil já em teste de 14 dias, mas não com mais dias", async () => {
    const ate = dias(14);
    await assertSucceeds(setDoc(doc(como(A), "users", A), { ...perfilBase, plano: "pro", planoAte: ate, testeProAte: ate }));
    const longe = dias(20);
    await assertFails(setDoc(doc(como(B), "users", B), { ...perfilBase, plano: "pro", planoAte: longe, testeProAte: longe }));
  });
  it("conta antiga liga o teste uma única vez", async () => {
    await semear(`users/${A}`, perfilBase);
    const ate = dias(14);
    await assertSucceeds(updateDoc(doc(como(A), "users", A), { plano: "pro", planoAte: ate, testeProAte: ate }));
    await semear(`users/${A}`, { ...perfilBase, plano: "free", planoAte: dias(-1), testeProAte: dias(-1) });
    const de_novo = dias(14);
    await assertFails(updateDoc(doc(como(A), "users", A), { plano: "pro", planoAte: de_novo, testeProAte: de_novo }));
  });
  it("não encurta nem estende um Pro pago com o teste", async () => {
    await semear(`users/${A}`, { ...perfilBase, plano: "pro", planoAte: dias(200) });
    const ate = dias(14);
    await assertFails(updateDoc(doc(como(A), "users", A), { plano: "pro", planoAte: ate, testeProAte: ate }));
    await assertFails(updateDoc(doc(como(A), "users", A), { planoAte: dias(400) }));
  });
});

describe("push, suporte e depoimentos", () => {
  const insc = { ownerId: A, endpoint: "https://fcm.googleapis.com/fcm/send/abc", chaves: { p256dh: "x", auth: "y" }, aparelho: "Android", criadoEm: new Date() };
  it("push: dono grava e apaga a própria inscrição; outro não lê", async () => {
    await assertSucceeds(setDoc(doc(como(A), "push", "h1"), insc));
    await assertFails(getDoc(doc(como(B), "push", "h1")));
    await assertFails(setDoc(doc(como(A), "push", "h2"), { ...insc, ownerId: B }));
    await assertFails(setDoc(doc(como(A), "push", "h3"), { ...insc, endpoint: "http://inseguro" }));
    await assertSucceeds(deleteDoc(doc(como(A), "push", "h1")));
  });
  it("suporte: só cria, com o próprio uid; ninguém lê", async () => {
    const m = { uid: A, nome: "João", assunto: "Dúvida", mensagem: "Como envio o PDF?", criadoEm: new Date() };
    await assertSucceeds(addDoc(collection(como(A), "suporte"), m));
    await assertFails(addDoc(collection(como(A), "suporte"), { ...m, uid: B }));
    await assertFails(addDoc(collection(anonimo(), "suporte"), m));
    await semear("suporte/s1", m);
    await assertFails(getDoc(doc(como(A), "suporte", "s1")));
  });
  it("depoimentos: dono escreve como não publicado; site lê só os publicados", async () => {
    const d = { nome: "João", negocio: "JS Elétrica", profissao: "eletricista", cidade: "Brasília", nota: 5, texto: "Meus clientes aprovam muito mais rápido.", publicado: false, criadoEm: new Date() };
    await assertSucceeds(setDoc(doc(como(A), "depoimentos", A), d));
    await assertFails(setDoc(doc(como(A), "depoimentos", A), { ...d, publicado: true }));
    await assertFails(getDoc(doc(anonimo(), "depoimentos", A)));
    await semear(`depoimentos/${B}`, { ...d, publicado: true });
    await assertSucceeds(getDocs(query(collection(anonimo(), "depoimentos"), where("publicado", "==", true))));
    await assertFails(getDocs(collection(anonimo(), "depoimentos")));
  });
});

describe("logos", () => {
  const logo = { dataUrl: "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=", atualizadoEm: new Date() };
  it("dono grava e qualquer um lê", async () => {
    await assertSucceeds(setDoc(doc(como(A), "logos", A), logo));
    await assertSucceeds(getDoc(doc(anonimo(), "logos", A)));
  });
  it("outro usuário não grava a logo de A", async () => {
    await assertFails(setDoc(doc(como(B), "logos", A), logo));
  });
  it("rejeita logo grande demais ou que não é imagem", async () => {
    await assertFails(setDoc(doc(como(A), "logos", A), { ...logo, dataUrl: "data:image/png;base64," + "A".repeat(140000) }));
    await assertFails(setDoc(doc(como(A), "logos", A), { ...logo, dataUrl: "data:text/html;base64,PGI+" }));
  });
});

describe("orcamentos", () => {
  it("anônimo lê um orçamento por ID, mas não lista", async () => {
    await semear("orcamentos/orc1", orcamentoBase(A, "enviado"));
    await assertSucceeds(getDoc(doc(anonimo(), "orcamentos", "orc1")));
    await assertFails(getDocs(collection(anonimo(), "orcamentos")));
    await assertFails(getDocs(query(collection(anonimo(), "orcamentos"), where("ownerId", "==", A))));
  });
  it("anônimo aprova um orçamento enviado", async () => {
    await semear("orcamentos/orc1", orcamentoBase(A, "enviado"));
    await assertSucceeds(updateDoc(doc(anonimo(), "orcamentos", "orc1"), { status: "aprovado", respondidoEm: new Date() }));
  });
  it("anônimo não altera o total nem aprova um rascunho", async () => {
    await semear("orcamentos/orc1", orcamentoBase(A, "enviado"));
    await assertFails(updateDoc(doc(anonimo(), "orcamentos", "orc1"), { status: "aprovado", total: 1 }));
    await semear("orcamentos/orc2", orcamentoBase(A, "rascunho"));
    await assertFails(updateDoc(doc(anonimo(), "orcamentos", "orc2"), { status: "aprovado", respondidoEm: new Date() }));
  });
  it("usuário A não lista nem edita orçamentos de B", async () => {
    await semear("orcamentos/orcB", orcamentoBase(B, "rascunho"));
    await assertFails(getDocs(query(collection(como(A), "orcamentos"), where("ownerId", "==", B))));
    await assertFails(updateDoc(doc(como(A), "orcamentos", "orcB"), { total: 1 }));
    await assertFails(deleteDoc(doc(como(A), "orcamentos", "orcB")));
  });
  it("dono cria, lista, edita e exclui os próprios", async () => {
    await assertSucceeds(setDoc(doc(como(A), "orcamentos", "meu"), orcamentoBase(A, "rascunho")));
    await assertSucceeds(getDocs(query(collection(como(A), "orcamentos"), where("ownerId", "==", A))));
    await assertSucceeds(updateDoc(doc(como(A), "orcamentos", "meu"), { total: 120 }));
    await assertFails(updateDoc(doc(como(A), "orcamentos", "meu"), { ownerId: B }));
    await assertSucceeds(deleteDoc(doc(como(A), "orcamentos", "meu")));
  });
});

describe("catálogo, clientes, contratos e cartões (V2)", () => {
  it("catálogo: só o dono lê e escreve", async () => {
    await assertSucceeds(setDoc(doc(como(A), "users", A, "catalogo", "i1"), { nome: "Tomada", preco: 60 }));
    await assertFails(setDoc(doc(como(B), "users", A, "catalogo", "i2"), { nome: "X" }));
    await assertFails(getDocs(collection(como(B), "users", A, "catalogo")));
  });
  it("clientes: só o dono; ninguém lê os de outro", async () => {
    await assertSucceeds(setDoc(doc(como(A), "clientes", A + "_5561999990000"), { ownerId: A, nome: "Maria", whatsapp: "5561999990000" }));
    await assertFails(setDoc(doc(como(B), "clientes", B + "_x"), { ownerId: A, nome: "Falso", whatsapp: "1" }));
    await assertFails(getDoc(doc(como(B), "clientes", A + "_5561999990000")));
    await assertFails(getDoc(doc(anonimo(), "clientes", A + "_5561999990000")));
  });
  it("contratos: dono cria; link público lê um; cliente só assina contrato enviado", async () => {
    await assertSucceeds(setDoc(doc(como(A), "contratos", "c1"), { ownerId: A, status: "enviado", numero: 1, texto: "..." }));
    await assertSucceeds(getDoc(doc(anonimo(), "contratos", "c1")));
    await assertFails(getDocs(collection(anonimo(), "contratos")));
    await assertFails(updateDoc(doc(anonimo(), "contratos", "c1"), { texto: "alterado" }));
    await assertFails(updateDoc(doc(anonimo(), "contratos", "c1"), { status: "cancelado", atualizadoEm: new Date() }));
    await assertSucceeds(updateDoc(doc(anonimo(), "contratos", "c1"), { status: "assinado", assinatura: { nome: "Maria", imagem: "data:image/png;base64,AAA", agente: "x", assinadoEm: new Date() }, atualizadoEm: new Date() }));
    await assertFails(updateDoc(doc(anonimo(), "contratos", "c1"), { status: "enviado", assinatura: {}, atualizadoEm: new Date() }));
  });
  it("cartões: leitura pública, escrita só do dono", async () => {
    await assertSucceeds(setDoc(doc(como(A), "cartoes", A), { nome: "JS", modelo: 1 }));
    await assertFails(setDoc(doc(como(B), "cartoes", A), { nome: "Falso" }));
    await assertSucceeds(getDoc(doc(anonimo(), "cartoes", A)));
  });
});

describe("eventos", () => {
  it("qualquer um cria evento sem dados pessoais; ninguém lê", async () => {
    await assertSucceeds(addDoc(collection(anonimo(), "eventos"), { nome: "orcamento_aprovado", orcamentoId: "x", origem: "publico", criadoEm: new Date() }));
    await assertSucceeds(addDoc(collection(como(A), "eventos"), { nome: "orcamento_criado", uid: A, origem: "app", criadoEm: new Date() }));
    await assertFails(addDoc(collection(anonimo(), "eventos"), { nome: "x", email: "a@b.co", criadoEm: new Date() }));
    await assertFails(getDocs(collection(como(A), "eventos")));
  });
});

describe("leads", () => {
  it("anônimo cria lead com os 5 campos e nada mais", async () => {
    const lead = { email: "a@b.co", whatsapp: "5561999990000", profissao: "pintor", origem: "site:pintor", criadoEm: new Date() };
    await assertSucceeds(addDoc(collection(anonimo(), "leads"), lead));
    await assertFails(addDoc(collection(anonimo(), "leads"), { ...lead, extra: 1 }));
    await assertFails(getDocs(collection(anonimo(), "leads")));
  });
});
