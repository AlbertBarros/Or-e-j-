/**
 * Painel administrativo: carrega os dados de toda a plataforma (as regras só deixam o administrador ler,
 * ver admins/ em firebase/firestore.rules). Os cálculos ficam em adminCalculos.ts.
 */
import { collection, doc, getDoc, getDocs, query, serverTimestamp, Timestamp, updateDoc, where } from "firebase/firestore";
import { db } from "./firebase";
import { DIA, data, montarContas, num, txt, type Bruto, type ContratoAdmin, type DadosAdmin, type OrcAdmin } from "./adminCalculos";

export * from "./adminCalculos";

// ---------------------------------------------------------------------------
// Acesso
// ---------------------------------------------------------------------------
export async function ehAdmin(uid: string): Promise<boolean> {
  try {
    return (await getDoc(doc(db, "admins", uid))).exists();
  } catch {
    return false;
  }
}


async function ler(colecao: string): Promise<{ id: string; d: Bruto }[]> {
  try {
    const snap = await getDocs(collection(db, colecao));
    return snap.docs.map((x) => ({ id: x.id, d: x.data() as Bruto }));
  } catch (e) {
    console.warn(`admin: não deu para ler ${colecao}`, e);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Carregar tudo
// ---------------------------------------------------------------------------
export async function carregarDadosAdmin(): Promise<DadosAdmin> {
  const agora = new Date();
  const [usuarios, orcs, cons, push, pags, sup, deps, leads] = await Promise.all([
    ler("users"),
    ler("orcamentos"),
    ler("contratos"),
    ler("push"),
    ler("pagamentos"),
    ler("suporte"),
    ler("depoimentos"),
    ler("leads"),
  ]);
  const orcamentos: OrcAdmin[] = orcs.map(({ id, d }) => ({
    id,
    ownerId: txt(d.ownerId),
    status: txt(d.status),
    total: num(d.total),
    avulso: d.avulso === true,
    criadoEm: data(d.criadoEm),
    enviadoEm: data(d.enviadoEm),
    respondidoEm: data(d.respondidoEm),
    pagoEm: data(d.pagoEm),
  }));
  const contratos: ContratoAdmin[] = cons.map(({ id, d }) => ({
    id,
    ownerId: txt(d.ownerId),
    status: txt(d.status),
    valor: num(d.valor),
    criadoEm: data(d.criadoEm),
    assinadoEm: data((d.assinatura as { assinadoEm?: unknown } | undefined)?.assinadoEm),
  }));
  const donosComPush = new Set(push.map((p) => txt(p.d.ownerId)).filter(Boolean));
  return {
    contas: montarContas(
      usuarios.map((u) => ({ uid: u.id, d: u.d })),
      orcamentos,
      contratos,
      donosComPush,
      agora,
    ),
    orcamentos,
    contratos,
    pagamentos: pags.map(({ id, d }) => ({ id, email: txt(d.email), meses: num(d.meses) || 1, valor: num(d.valor), criadoEm: data(d.criadoEm) })),
    suporte: sup
      .map(({ id, d }) => ({
        id,
        uid: txt(d.uid),
        nome: txt(d.nome),
        negocio: txt(d.negocio),
        email: txt(d.email),
        whatsapp: txt(d.whatsapp),
        assunto: txt(d.assunto),
        mensagem: txt(d.mensagem),
        criadoEm: data(d.criadoEm),
        respondidaEm: data(d.respondidaEm),
      }))
      .sort((a, b) => (b.criadoEm?.getTime() ?? 0) - (a.criadoEm?.getTime() ?? 0)),
    depoimentos: deps.map(({ id, d }) => ({ uid: id, nome: txt(d.nome), negocio: txt(d.negocio), cidade: txt(d.cidade), nota: num(d.nota) || 5, texto: txt(d.texto), publicado: d.publicado === true })),
    leads: leads
      .map(({ id, d }) => ({ id, email: txt(d.email), whatsapp: txt(d.whatsapp), profissao: txt(d.profissao), origem: txt(d.origem), criadoEm: data(d.criadoEm) }))
      .sort((a, b) => (b.criadoEm?.getTime() ?? 0) - (a.criadoEm?.getTime() ?? 0)),
    carregadoEm: agora,
  };
}

// ---------------------------------------------------------------------------
// Ações do administrador
// ---------------------------------------------------------------------------
export async function marcarSuporteRespondido(id: string): Promise<void> {
  await updateDoc(doc(db, "suporte", id), { respondidaEm: serverTimestamp() });
}

export async function publicarDepoimento(uid: string, publicado: boolean): Promise<void> {
  await updateDoc(doc(db, "depoimentos", uid), { publicado });
}

/** Eventos de uso (tour, avisos, cliques em assinar) dos últimos dias. */
export async function contarEventos(dias = 30): Promise<Record<string, number>> {
  try {
    const desde = Timestamp.fromMillis(Date.now() - dias * DIA);
    const snap = await getDocs(query(collection(db, "eventos"), where("criadoEm", ">=", desde)));
    const c: Record<string, number> = {};
    snap.docs.forEach((x) => {
      const nome = txt(x.data().nome);
      c[nome] = (c[nome] ?? 0) + 1;
    });
    return c;
  } catch {
    return {};
  }
}

