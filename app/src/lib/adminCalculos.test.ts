import { describe, expect, it } from "vitest";
import { calcularResumo, contasDoSegmento, funil, montarContas, paraCsv, personalizar, situacaoDaConta, type DadosAdmin, type OrcAdmin } from "./adminCalculos";

const agora = new Date("2026-10-08T12:00:00Z");
const dias = (n: number) => new Date(agora.getTime() + n * 86_400_000);

describe("situação da conta", () => {
  it("separa teste, Pro pagante, teste acabado, Pro vencido e grátis", () => {
    expect(situacaoDaConta({ plano: "pro", planoAte: dias(5), testeProAte: dias(5) }, agora)).toBe("teste");
    expect(situacaoDaConta({ plano: "pro", planoAte: dias(200), testeProAte: dias(-20) }, agora)).toBe("pro");
    expect(situacaoDaConta({ plano: "free", planoAte: dias(-1), testeProAte: dias(-1) }, agora)).toBe("teste_acabou");
    expect(situacaoDaConta({ plano: "free", planoAte: dias(-3), testeProAte: dias(-60) }, agora)).toBe("pro_vencido");
    expect(situacaoDaConta({ plano: "pro", planoAte: dias(-3), testeProAte: null }, agora)).toBe("pro_vencido");
    expect(situacaoDaConta({ plano: "free", planoAte: null, testeProAte: null }, agora)).toBe("gratis");
    expect(situacaoDaConta({ plano: "pro", planoAte: null, testeProAte: null }, agora)).toBe("pro");
  });
});

function orc(ownerId: string, status: string, extra: Partial<OrcAdmin> = {}): OrcAdmin {
  return { id: Math.random().toString(36), ownerId, status, total: 100, avulso: false, criadoEm: dias(-2), enviadoEm: dias(-2), respondidoEm: dias(-1), pagoEm: null, ...extra };
}

describe("contas e resumo", () => {
  const usuarios = [
    { uid: "a", d: { nomeNegocio: "A Elétrica", nomeResponsavel: "Ana Lima", email: "a@x.com", plano: "pro", planoAte: dias(300), testeProAte: dias(-30), criadoEm: dias(-45), assinatura: { status: "ativa" } } },
    { uid: "b", d: { nomeNegocio: "B Pinturas", nomeResponsavel: "Bruno", email: "b@x.com", plano: "pro", planoAte: dias(2), testeProAte: dias(2), criadoEm: dias(-12) } },
    { uid: "c", d: { nomeNegocio: "C Reformas", nomeResponsavel: "Carla", email: "c@x.com", plano: "free", planoAte: dias(-5), testeProAte: dias(-5), criadoEm: dias(-60) } },
    { uid: "d", d: { nomeNegocio: "D", nomeResponsavel: "Davi", email: "d@x.com", plano: "pro", planoAte: dias(20), testeProAte: dias(-40), criadoEm: dias(-90), assinatura: { status: "cancelada" } } },
  ];
  const orcamentos = [orc("a", "aprovado"), orc("a", "enviado"), orc("b", "rascunho", { enviadoEm: null, respondidoEm: null }), orc("a", "pago", { avulso: true })];
  const contas = montarContas(usuarios, orcamentos, [], new Set(["a"]), agora);
  const dados: DadosAdmin = { contas, orcamentos, contratos: [], pagamentos: [{ id: "p", email: "a@x.com", meses: 12, valor: 238.8, criadoEm: dias(-10) }], suporte: [], depoimentos: [], leads: [], carregadoEm: agora };

  it("conta orçamentos sem os recibos avulsos e marca quem está ativo", () => {
    const a = contas.find((c) => c.uid === "a")!;
    expect(a.orcamentos).toBe(2);
    expect(a.aprovados).toBe(1);
    expect(a.ativo).toBe(true);
    expect(a.avisosLigados).toBe(true);
    expect(contas.find((c) => c.uid === "c")!.ativo).toBe(false);
  });

  it("resume a plataforma no período", () => {
    const r = calcularResumo(dados, { inicio: dias(-30), fim: agora });
    expect(r.contas).toBe(4);
    expect(r.novas).toBe(1); // só a B foi criada nos últimos 30 dias
    expect(r.pro).toBe(2); // A e D (D cancelou, mas o Pro ainda vale)
    expect(r.emTeste).toBe(1);
    expect(r.testeAcabou).toBe(1);
    expect(r.cancelaram).toBe(1);
    expect(r.receitaPeriodo).toBeCloseTo(238.8);
    expect(r.mrr).toBeCloseTo(19.9); // anual de A dividido por 12; D cancelou e não entra
    expect(r.conversaoTeste).toBeCloseTo(2 / 3); // testes que acabaram: A, C, D → A e D são Pro
  });

  it("monta os segmentos de mensagem", () => {
    expect(contasDoSegmento(contas, "cancelaram", agora).map((c) => c.uid)).toEqual(["d"]);
    expect(contasDoSegmento(contas, "teste_acabou", agora).map((c) => c.uid)).toEqual(["c"]);
    expect(contasDoSegmento(contas, "teste_acabando", agora).map((c) => c.uid)).toEqual(["b"]);
    expect(contasDoSegmento(contas, "inativos", agora).map((c) => c.uid)).toEqual(["c", "d"]);
  });

  it("funil e mensagem personalizada", () => {
    expect(funil(contas).map((f) => f.valor)).toEqual([4, 2, 1, 1, 2]);
    expect(personalizar("Olá, {nome}! Da {negocio}.", contas[0]!)).toBe("Olá, Ana! Da A Elétrica.");
  });
});

describe("planilha", () => {
  it("usa ; e protege células com aspas e quebras", () => {
    const csv = paraCsv([["Nome", "Valor"], ['Ana "A"; Cia', 10.5]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"Ana ""A""; Cia";10,5');
  });
});
