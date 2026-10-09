/**
 * Cálculos do Painel administrativo (funções puras, sem banco): situação de cada conta, resumo, séries dos gráficos,
 * segmentos de mensagens e planilha. Testadas em adminCalculos.test.ts.
 */
import type { Timestamp } from "firebase/firestore";
import { paraDate } from "./datas";
import { PRECO_MENSAL } from "./planos";

export const DIA = 86_400_000;
const DIAS_ATIVO = 30;

export type Bruto = Record<string, unknown>;
export const txt = (v: unknown) => (typeof v === "string" ? v : "");
export const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
export const data = (v: unknown) => paraDate(v as Timestamp | Date | null | undefined);

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
export type Situacao = "pro" | "teste" | "teste_acabou" | "pro_vencido" | "gratis";

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  pro: "Pro (pagante)",
  teste: "Em teste grátis",
  teste_acabou: "Teste acabou",
  pro_vencido: "Pro vencido",
  gratis: "Grátis",
};

export interface ContaAdmin {
  uid: string;
  negocio: string;
  responsavel: string;
  email: string;
  whatsapp: string;
  profissao: string;
  cidade: string;
  criadoEm: Date | null;
  planoAte: Date | null;
  testeProAte: Date | null;
  situacao: Situacao;
  cancelou: boolean;
  orcamentos: number;
  enviados: number;
  aprovados: number;
  valorAprovado: number;
  contratos: number;
  assinados: number;
  ultimaAtividade: Date | null;
  ativo: boolean;
  avisosLigados: boolean;
  tourConcluido: boolean;
}

/** Dados brutos, já com datas convertidas. */
export interface OrcAdmin {
  id: string;
  ownerId: string;
  status: string;
  total: number;
  avulso: boolean;
  criadoEm: Date | null;
  enviadoEm: Date | null;
  respondidoEm: Date | null;
  pagoEm: Date | null;
}
export interface ContratoAdmin {
  id: string;
  ownerId: string;
  status: string;
  valor: number;
  criadoEm: Date | null;
  assinadoEm: Date | null;
}
export interface PagamentoAdmin {
  id: string;
  email: string;
  meses: number;
  valor: number;
  criadoEm: Date | null;
}
export interface SuporteAdmin {
  id: string;
  uid: string;
  nome: string;
  negocio: string;
  email: string;
  whatsapp: string;
  assunto: string;
  mensagem: string;
  criadoEm: Date | null;
  respondidaEm: Date | null;
}
export interface DepoimentoAdmin {
  uid: string;
  nome: string;
  negocio: string;
  cidade: string;
  nota: number;
  texto: string;
  publicado: boolean;
}
export interface LeadAdmin {
  id: string;
  email: string;
  whatsapp: string;
  profissao: string;
  origem: string;
  criadoEm: Date | null;
}

export interface DadosAdmin {
  contas: ContaAdmin[];
  orcamentos: OrcAdmin[];
  contratos: ContratoAdmin[];
  pagamentos: PagamentoAdmin[];
  suporte: SuporteAdmin[];
  depoimentos: DepoimentoAdmin[];
  leads: LeadAdmin[];
  carregadoEm: Date;
}

// ---------------------------------------------------------------------------
// Cálculo das contas (função pura: testada em admin.test.ts)
// ---------------------------------------------------------------------------
export function situacaoDaConta(u: { plano?: string; planoAte: Date | null; testeProAte: Date | null }, agora: Date): Situacao {
  const ate = u.planoAte;
  const teste = u.testeProAte;
  const emTeste = Boolean(ate && teste && Math.abs(ate.getTime() - teste.getTime()) < 60_000);
  if (u.plano === "pro" && !ate) return "pro"; // Pro sem data de fim (liberado à mão, sem vencimento)
  if (u.plano === "pro" && ate && ate > agora) return emTeste ? "teste" : "pro";
  if (teste && teste <= agora && !(u.plano === "pro" && ate && ate > agora)) {
    // Teste acabou. Se depois pagou e venceu, conta como Pro vencido.
    if (ate && !emTeste && ate <= agora) return "pro_vencido";
    return "teste_acabou";
  }
  if (ate && ate <= agora) return "pro_vencido";
  return "gratis";
}

export function montarContas(
  usuarios: { uid: string; d: Bruto }[],
  orcamentos: OrcAdmin[],
  contratos: ContratoAdmin[],
  donosComPush: Set<string>,
  agora: Date,
): ContaAdmin[] {
  const porDono = new Map<string, { o: OrcAdmin[]; c: ContratoAdmin[] }>();
  for (const o of orcamentos) {
    const g = porDono.get(o.ownerId) ?? { o: [], c: [] };
    g.o.push(o);
    porDono.set(o.ownerId, g);
  }
  for (const c of contratos) {
    const g = porDono.get(c.ownerId) ?? { o: [], c: [] };
    g.c.push(c);
    porDono.set(c.ownerId, g);
  }

  return usuarios.map(({ uid, d }) => {
    const planoAte = data(d.planoAte);
    const testeProAte = data(d.testeProAte);
    const g = porDono.get(uid) ?? { o: [], c: [] };
    const reais = g.o.filter((o) => !o.avulso);
    const datas = [
      ...g.o.flatMap((o) => [o.criadoEm, o.enviadoEm, o.pagoEm]),
      ...g.c.map((c) => c.criadoEm),
      data(d.criadoEm),
    ].filter((x): x is Date => x instanceof Date);
    const ultima = datas.length ? new Date(Math.max(...datas.map((x) => x.getTime()))) : null;
    const assinatura = (d.assinatura as { status?: string } | undefined)?.status;
    const tutorial = d.tutorial as { concluidoEm?: unknown } | undefined;
    return {
      uid,
      negocio: txt(d.nomeNegocio) || "(sem nome)",
      responsavel: txt(d.nomeResponsavel),
      email: txt(d.email),
      whatsapp: txt(d.whatsapp),
      profissao: txt(d.profissao) || "outra",
      cidade: txt(d.cidade),
      criadoEm: data(d.criadoEm),
      planoAte,
      testeProAte,
      situacao: situacaoDaConta({ plano: txt(d.plano), planoAte, testeProAte }, agora),
      cancelou: assinatura === "cancelada" || assinatura === "pausada",
      orcamentos: reais.length,
      enviados: reais.filter((o) => o.status !== "rascunho").length,
      aprovados: reais.filter((o) => o.status === "aprovado" || o.status === "pago").length,
      valorAprovado: reais.filter((o) => o.status === "aprovado" || o.status === "pago").reduce((s, o) => s + o.total, 0),
      contratos: g.c.length,
      assinados: g.c.filter((c) => c.status === "assinado").length,
      ultimaAtividade: ultima,
      ativo: Boolean(ultima && agora.getTime() - ultima.getTime() <= DIAS_ATIVO * DIA && reais.length + g.c.length > 0),
      avisosLigados: donosComPush.has(uid),
      tourConcluido: Boolean(tutorial?.concluidoEm),
    };
  });
}

// ---------------------------------------------------------------------------
// Números do painel (funções puras)
// ---------------------------------------------------------------------------
export interface Periodo {
  inicio: Date;
  fim: Date;
}

export function periodoDeDias(dias: number, agora = new Date()): Periodo {
  return { inicio: new Date(agora.getTime() - dias * DIA), fim: agora };
}

const dentro = (d: Date | null, p: Periodo) => Boolean(d && d >= p.inicio && d <= p.fim);

export interface Resumo {
  contas: number;
  novas: number;
  ativos: number;
  emTeste: number;
  pro: number;
  gratis: number;
  testeAcabou: number;
  proVencido: number;
  cancelaram: number;
  conversaoTeste: number; // 0..1: dos testes que acabaram, quantos viraram Pro
  receitaPeriodo: number;
  mrr: number;
  orcamentosPeriodo: number;
  enviadosPeriodo: number;
  aprovadosPeriodo: number;
  valorAprovadoPeriodo: number;
  contratosAssinadosPeriodo: number;
  avisosLigados: number;
  suporteAberto: number;
  leads: number;
}

export function calcularResumo(d: DadosAdmin, p: Periodo): Resumo {
  const c = d.contas;
  const conta = (s: Situacao) => c.filter((x) => x.situacao === s).length;
  const testaram = c.filter((x) => x.testeProAte && x.testeProAte <= p.fim);
  const viraramPro = testaram.filter((x) => x.situacao === "pro").length;
  const orcs = d.orcamentos.filter((o) => !o.avulso);
  const aprovados = orcs.filter((o) => (o.status === "aprovado" || o.status === "pago") && dentro(o.respondidoEm, p));

  // Receita mensal recorrente estimada: último pagamento de cada pagante (anual dividido por 12)
  const ultimoPorEmail = new Map<string, PagamentoAdmin>();
  for (const pg of [...d.pagamentos].sort((a, b) => (a.criadoEm?.getTime() ?? 0) - (b.criadoEm?.getTime() ?? 0))) ultimoPorEmail.set(pg.email.toLowerCase(), pg);
  const mrr = c
    .filter((x) => x.situacao === "pro" && !x.cancelou)
    .reduce((s, x) => {
      const pg = ultimoPorEmail.get(x.email.toLowerCase());
      if (!pg || !pg.valor) return s + PRECO_MENSAL;
      return s + pg.valor / Math.max(1, pg.meses);
    }, 0);

  return {
    contas: c.length,
    novas: c.filter((x) => dentro(x.criadoEm, p)).length,
    ativos: c.filter((x) => x.ativo).length,
    emTeste: conta("teste"),
    pro: conta("pro"),
    gratis: conta("gratis"),
    testeAcabou: conta("teste_acabou"),
    proVencido: conta("pro_vencido"),
    cancelaram: c.filter((x) => x.cancelou).length,
    conversaoTeste: testaram.length ? viraramPro / testaram.length : 0,
    receitaPeriodo: d.pagamentos.filter((pg) => dentro(pg.criadoEm, p)).reduce((s, pg) => s + pg.valor, 0),
    mrr: Math.round(mrr * 100) / 100,
    orcamentosPeriodo: orcs.filter((o) => dentro(o.criadoEm, p)).length,
    enviadosPeriodo: orcs.filter((o) => dentro(o.enviadoEm, p)).length,
    aprovadosPeriodo: aprovados.length,
    valorAprovadoPeriodo: aprovados.reduce((s, o) => s + o.total, 0),
    contratosAssinadosPeriodo: d.contratos.filter((x) => x.status === "assinado" && dentro(x.assinadoEm, p)).length,
    avisosLigados: c.filter((x) => x.avisosLigados).length,
    suporteAberto: d.suporte.filter((s) => !s.respondidaEm).length,
    leads: d.leads.length,
  };
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Novas contas por mês (últimos n meses). */
export function novasPorMes(contas: ContaAdmin[], n = 12, agora = new Date()): { rotulo: string; valor: number }[] {
  const lista: { chave: string; rotulo: string; valor: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    lista.push({ chave: `${d.getFullYear()}-${d.getMonth()}`, rotulo: MESES[d.getMonth()] ?? "", valor: 0 });
  }
  for (const c of contas) {
    if (!c.criadoEm) continue;
    const item = lista.find((x) => x.chave === `${c.criadoEm!.getFullYear()}-${c.criadoEm!.getMonth()}`);
    if (item) item.valor++;
  }
  return lista.map(({ rotulo, valor }) => ({ rotulo, valor }));
}

/** Contas com alguma atividade (orçamento criado/enviado/pago ou contrato) em cada uma das últimas n semanas. */
export function ativosPorSemana(d: DadosAdmin, n = 12, agora = new Date()): { rotulo: string; valor: number }[] {
  const semanas: { inicio: number; fim: number; donos: Set<string> }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const fim = agora.getTime() - i * 7 * DIA;
    semanas.push({ inicio: fim - 7 * DIA, fim, donos: new Set() });
  }
  const marcar = (dono: string, datas: (Date | null)[]) => {
    for (const dt of datas) {
      if (!dt) continue;
      const s = semanas.find((w) => dt.getTime() > w.inicio && dt.getTime() <= w.fim);
      s?.donos.add(dono);
    }
  };
  d.orcamentos.forEach((o) => marcar(o.ownerId, [o.criadoEm, o.enviadoEm, o.pagoEm]));
  d.contratos.forEach((c) => marcar(c.ownerId, [c.criadoEm]));
  return semanas.map((w) => {
    const dt = new Date(w.fim);
    return { rotulo: `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`, valor: w.donos.size };
  });
}

/** Orçamentos da plataforma por mês: criados, enviados e aprovados. */
export function orcamentosPorMes(d: DadosAdmin, n = 6, agora = new Date()) {
  const meses: { chave: string; rotulo: string; enviados: number; aprovados: number; recusados: number; valorAprovado: number; valorRecebido: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    meses.push({ chave: `${dt.getFullYear()}-${dt.getMonth()}`, rotulo: MESES[dt.getMonth()] ?? "", enviados: 0, aprovados: 0, recusados: 0, valorAprovado: 0, valorRecebido: 0 });
  }
  const achar = (dt: Date | null) => (dt ? meses.find((m) => m.chave === `${dt.getFullYear()}-${dt.getMonth()}`) : undefined);
  for (const o of d.orcamentos) {
    if (o.avulso) continue;
    const e = achar(o.enviadoEm);
    if (e) e.enviados++;
    const r = achar(o.respondidoEm);
    if (r && (o.status === "aprovado" || o.status === "pago")) {
      r.aprovados++;
      r.valorAprovado += o.total;
    } else if (r && o.status === "recusado") r.recusados++;
  }
  return meses;
}

/** Funil: cadastro → 1º orçamento → enviou → teve aprovação → Pro pagante. */
export function funil(contas: ContaAdmin[]): { rotulo: string; valor: number }[] {
  return [
    { rotulo: "Criaram a conta", valor: contas.length },
    { rotulo: "Fizeram orçamento", valor: contas.filter((c) => c.orcamentos > 0).length },
    { rotulo: "Enviaram ao cliente", valor: contas.filter((c) => c.enviados > 0).length },
    { rotulo: "Tiveram aprovação", valor: contas.filter((c) => c.aprovados > 0).length },
    { rotulo: "Assinaram o Pro (alguma vez)", valor: contas.filter((c) => c.situacao === "pro" || c.situacao === "pro_vencido").length },
  ];
}

export function topProfissoes(contas: ContaAdmin[], nomes: Record<string, string>, n = 6): { rotulo: string; valor: number }[] {
  const m = new Map<string, number>();
  contas.forEach((c) => m.set(c.profissao, (m.get(c.profissao) ?? 0) + 1));
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([slug, valor]) => ({ rotulo: nomes[slug] ?? (slug === "outra" ? "Outra" : slug), valor }));
}

// ---------------------------------------------------------------------------
// Segmentos para mensagens
// ---------------------------------------------------------------------------
export type Segmento = "cancelaram" | "teste_acabou" | "teste_acabando" | "gratis" | "pro_vencido" | "inativos" | "todos";

export const SEGMENTOS: { id: Segmento; rotulo: string; descricao: string; mensagem: string }[] = [
  {
    id: "cancelaram",
    rotulo: "Cancelaram a assinatura",
    descricao: "Cancelaram ou pausaram o Pro no Mercado Pago.",
    mensagem:
      "Olá, {nome}! Aqui é do Preço Fechado. Vi que você cancelou o Pro e queria entender: teve algo que não funcionou bem para a {negocio}? Sua resposta ajuda muito. Se quiser voltar, é só responder esta mensagem que eu te ajudo.",
  },
  {
    id: "teste_acabou",
    rotulo: "Teste acabou e não assinaram",
    descricao: "Usaram os 14 dias do Pro e não assinaram.",
    mensagem:
      "Olá, {nome}! Seu teste do Pro no Preço Fechado terminou. Com o Pro, seus clientes pagam no Pix logo depois de aprovar, e você manda recibo com a sua logo. O anual sai por menos de R$ 1 por dia. Quer que eu te mande o link para assinar?",
  },
  {
    id: "teste_acabando",
    rotulo: "Teste acabando (até 3 dias)",
    descricao: "Ainda estão no teste, que termina em breve.",
    mensagem:
      "Olá, {nome}! Seu teste do Pro no Preço Fechado acaba em poucos dias. Para não perder o Pix na aprovação, o recibo e a sua logo nos orçamentos da {negocio}, assine em Mais → Conta e plano. Qualquer dúvida, é só responder aqui.",
  },
  {
    id: "gratis",
    rotulo: "Grátis (nunca assinaram)",
    descricao: "Estão no plano grátis e nunca pagaram o Pro.",
    mensagem:
      "Olá, {nome}! Obrigado por usar o Preço Fechado na {negocio}. Sabia que no Pro o cliente já paga no Pix ao aprovar, e você manda orçamentos ilimitados com a sua logo? Se quiser, te explico em 2 minutos.",
  },
  {
    id: "pro_vencido",
    rotulo: "Pro vencido (não renovaram)",
    descricao: "Pagaram o Pro e o período acabou sem renovar.",
    mensagem: "Olá, {nome}! Seu plano Pro no Preço Fechado venceu. Quer renovar? Seus orçamentos e clientes continuam salvos. Posso te mandar o link?",
  },
  {
    id: "inativos",
    rotulo: "Sem usar há 30 dias",
    descricao: "Criaram a conta mas não mexem há mais de 30 dias.",
    mensagem:
      "Olá, {nome}! Faz tempo que você não usa o Preço Fechado. Ficou alguma dúvida? Em Ajuda tem um tour de 2 minutos que mostra tudo. Se preferir, me responda aqui que eu te ajudo a mandar o primeiro orçamento.",
  },
  { id: "todos", rotulo: "Todas as contas", descricao: "Avisos gerais, novidades.", mensagem: "Olá, {nome}! Novidade no Preço Fechado: " },
];

export function contasDoSegmento(contas: ContaAdmin[], s: Segmento, agora = new Date()): ContaAdmin[] {
  switch (s) {
    case "cancelaram":
      return contas.filter((c) => c.cancelou);
    case "teste_acabou":
      return contas.filter((c) => c.situacao === "teste_acabou");
    case "teste_acabando":
      return contas.filter((c) => c.situacao === "teste" && c.planoAte && c.planoAte.getTime() - agora.getTime() <= 3 * DIA);
    case "gratis":
      return contas.filter((c) => c.situacao === "gratis");
    case "pro_vencido":
      return contas.filter((c) => c.situacao === "pro_vencido");
    case "inativos":
      return contas.filter((c) => !c.ativo && c.criadoEm && agora.getTime() - c.criadoEm.getTime() > 30 * DIA);
    default:
      return contas;
  }
}

export function personalizar(texto: string, c: Pick<ContaAdmin, "responsavel" | "negocio">): string {
  const nome = c.responsavel.trim().split(/\s+/)[0] || "tudo bem";
  return texto.replace(/\{nome\}/g, nome).replace(/\{negocio\}/g, c.negocio);
}

// ---------------------------------------------------------------------------
// Planilha (CSV para Excel/Google Planilhas: separador ";" e BOM para os acentos)
// ---------------------------------------------------------------------------
export function paraCsv(linhas: (string | number)[][]): string {
  const celula = (v: string | number) => {
    const s = typeof v === "number" ? String(v).replace(".", ",") : v;
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + linhas.map((l) => l.map(celula).join(";")).join("\r\n");
}

export function baixarTexto(conteudo: string, nome: string, tipo = "text/csv;charset=utf-8"): void {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function dataBr(d: Date | null): string {
  return d ? d.toLocaleDateString("pt-BR") : "";
}

export function planilhaContas(contas: ContaAdmin[]): string {
  return paraCsv([
    ["Negócio", "Responsável", "E-mail", "WhatsApp", "Profissão", "Cidade", "Situação", "Cancelou", "Criada em", "Pro até", "Última atividade", "Ativo (30 dias)", "Orçamentos", "Enviados", "Aprovados", "Valor aprovado (R$)", "Contratos", "Assinados", "Avisos ligados"],
    ...contas.map((c) => [
      c.negocio,
      c.responsavel,
      c.email,
      c.whatsapp,
      c.profissao,
      c.cidade,
      ROTULO_SITUACAO[c.situacao],
      c.cancelou ? "sim" : "não",
      dataBr(c.criadoEm),
      dataBr(c.planoAte),
      dataBr(c.ultimaAtividade),
      c.ativo ? "sim" : "não",
      c.orcamentos,
      c.enviados,
      c.aprovados,
      Math.round(c.valorAprovado * 100) / 100,
      c.contratos,
      c.assinados,
      c.avisosLigados ? "sim" : "não",
    ]),
  ]);
}
