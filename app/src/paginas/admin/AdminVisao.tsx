import { useEffect, useMemo, useState } from "react";
import { BarrasHorizontais, BarrasSimples, Indicador } from "@/componentes/GraficosAdmin";
import { BarrasMensais, Rosca } from "@/componentes/Graficos";
import { ativosPorSemana, calcularResumo, contarEventos, funil, novasPorMes, orcamentosPorMes, periodoDeDias, topProfissoes, type DadosAdmin } from "@/lib/admin";
import { nomeProfissao } from "@/lib/profissoes";
import { formatarReais } from "@shared/src/mensagens";

export const PERIODOS = [
  { dias: 7, rotulo: "7 dias" },
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "90 dias" },
  { dias: 365, rotulo: "12 meses" },
];

const EVENTOS: { id: string; rotulo: string }[] = [
  { id: "cadastro_concluido", rotulo: "Cadastros concluídos" },
  { id: "orcamento_enviado", rotulo: "Orçamentos enviados" },
  { id: "tour_iniciado", rotulo: "Tours iniciados" },
  { id: "tour_concluido", rotulo: "Tours concluídos" },
  { id: "avisos_ligados", rotulo: "Avisos ligados" },
  { id: "teste_pro_ativado", rotulo: "Testes Pro ativados (contas antigas)" },
  { id: "clique_assinar_pro", rotulo: "Cliques em assinar o Pro" },
  { id: "recibo_emitido", rotulo: "Recibos emitidos" },
  { id: "contrato_enviado", rotulo: "Contratos enviados" },
];

/** Visão geral: indicadores do período e gráficos. */
export default function AdminVisao({ dados }: { dados: DadosAdmin }) {
  const [dias, setDias] = useState(30);
  const [eventos, setEventos] = useState<Record<string, number> | null>(null);
  const periodo = useMemo(() => periodoDeDias(dias), [dias]);
  const r = useMemo(() => calcularResumo(dados, periodo), [dados, periodo]);
  const nomes = useMemo(() => Object.fromEntries(dados.contas.map((c) => [c.profissao, nomeProfissao(c.profissao)])), [dados.contas]);

  useEffect(() => {
    setEventos(null);
    contarEventos(dias).then(setEventos);
  }, [dias]);

  const pct = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Como está a plataforma</h2>
        <div className="flex gap-1.5 rounded-xl bg-carbono-claro/60 p-1" role="radiogroup" aria-label="Período">
          {PERIODOS.map((p) => (
            <button key={p.dias} type="button" role="radio" aria-checked={dias === p.dias} onClick={() => setDias(p.dias)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${dias === p.dias ? "bg-white text-carbono shadow-sm" : "text-grafite hover:text-carbono"}`}>
              {p.rotulo}
            </button>
          ))}
        </div>
      </div>

      <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Indicador destaque rotulo="Contas" valor={r.contas} detalhe={`+${r.novas} nos últimos ${dias} dias`} />
        <Indicador rotulo="Ativas" valor={r.ativos} detalhe="usaram nos últimos 30 dias" />
        <Indicador rotulo="Em teste grátis" valor={r.emTeste} detalhe="14 dias de Pro" />
        <Indicador rotulo="Pro pagantes" valor={r.pro} detalhe={`conversão do teste: ${pct(r.conversaoTeste)}`} />
        <Indicador rotulo="Grátis" valor={r.gratis} detalhe="nunca testaram ou assinaram" />
        <Indicador rotulo="Teste acabou" valor={r.testeAcabou} detalhe="não assinaram" />
        <Indicador rotulo="Cancelaram" valor={r.cancelaram} detalhe={`Pro vencido sem renovar: ${r.proVencido}`} />
        <Indicador rotulo="Receita no período" valor={formatarReais(r.receitaPeriodo)} detalhe={`estimada por mês: ${formatarReais(r.mrr)}`} />
        <Indicador rotulo="Orçamentos" valor={r.orcamentosPeriodo} detalhe={`${r.enviadosPeriodo} enviados · ${r.aprovadosPeriodo} aprovados`} />
        <Indicador rotulo="Valor aprovado" valor={formatarReais(r.valorAprovadoPeriodo)} detalhe="nos orçamentos dos clientes" />
        <Indicador rotulo="Contratos assinados" valor={r.contratosAssinadosPeriodo} detalhe={`no período`} />
        <Indicador rotulo="Avisos ligados" valor={r.avisosLigados} detalhe={`${r.suporteAberto} pedidos de suporte abertos`} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="cartao p-4" aria-labelledby="g-novas">
          <h3 id="g-novas" className="titulo-secao">Novas contas por mês</h3>
          <div className="mt-3">
            <BarrasSimples titulo="Novas contas por mês" pontos={novasPorMes(dados.contas, 12)} />
          </div>
        </section>
        <section className="cartao p-4" aria-labelledby="g-ativos">
          <h3 id="g-ativos" className="titulo-secao">Contas ativas por semana</h3>
          <div className="mt-3">
            <BarrasSimples titulo="Contas ativas por semana" pontos={ativosPorSemana(dados, 12)} cor="#1E40AF" />
          </div>
        </section>
        <section className="cartao p-4" aria-labelledby="g-planos">
          <h3 id="g-planos" className="titulo-secao">Contas por situação</h3>
          <div className="mt-3">
            <Rosca
              centro={String(r.contas)}
              legenda="contas"
              partes={[
                { rotulo: "Pro pagante", valor: r.pro, cor: "#15803D" },
                { rotulo: "Em teste", valor: r.emTeste, cor: "#2563EB" },
                { rotulo: "Grátis", valor: r.gratis, cor: "#94A3B8" },
                { rotulo: "Teste acabou", valor: r.testeAcabou, cor: "#D97706" },
                { rotulo: "Pro vencido", valor: r.proVencido, cor: "#9F1239" },
              ]}
            />
          </div>
        </section>
        <section className="cartao p-4" aria-labelledby="g-orc">
          <h3 id="g-orc" className="titulo-secao">Orçamentos na plataforma (6 meses)</h3>
          <div className="mt-3">
            <BarrasMensais meses={orcamentosPorMes(dados, 6)} />
          </div>
        </section>
        <section className="cartao p-4" aria-labelledby="g-funil">
          <h3 id="g-funil" className="titulo-secao">Funil: do cadastro ao Pro</h3>
          <div className="mt-4">
            <BarrasHorizontais pontos={funil(dados.contas)} funil />
          </div>
        </section>
        <section className="cartao p-4" aria-labelledby="g-prof">
          <h3 id="g-prof" className="titulo-secao">Profissões</h3>
          <div className="mt-4">
            <BarrasHorizontais pontos={topProfissoes(dados.contas, nomes, 8)} />
          </div>
        </section>
      </div>

      <section className="cartao p-4" aria-labelledby="g-uso">
        <h3 id="g-uso" className="titulo-secao">Uso do app nos últimos {dias} dias</h3>
        {eventos === null ? (
          <p className="mt-3 text-sm text-grafite">Carregando…</p>
        ) : (
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {EVENTOS.map((e) => (
              <div key={e.id} className="rounded-xl bg-white/60 p-3">
                <dt className="text-xs text-grafite">{e.rotulo}</dt>
                <dd className="tabular text-xl font-bold">{eventos[e.id] ?? 0}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </div>
  );
}
