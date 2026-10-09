import { Document, Page, Text, View } from "@react-pdf/renderer";
import { CARBONO, GRAFITE, PAGO, PAUTA, TINTA } from "./estilos";
import type { ContaAdmin, Resumo } from "@/lib/adminCalculos";
import { ROTULO_SITUACAO } from "@/lib/adminCalculos";

interface Ponto {
  rotulo: string;
  valor: number;
}

export interface DadosRelatorio {
  titulo: string;
  periodoTexto: string;
  geradoEm: Date;
  resumo: Resumo;
  novasPorMes: Ponto[];
  ativosPorSemana: Ponto[];
  funil: Ponto[];
  profissoes: Ponto[];
  novasContas: ContaAdmin[];
  secoes: { numeros: boolean; graficos: boolean; contas: boolean };
}

const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${Math.round(v * 100)}%`;
const dataBr = (d: Date | null) => (d ? d.toLocaleDateString("pt-BR") : "—");

const s = {
  pagina: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: TINTA, lineHeight: 1.35 },
  faixa: { backgroundColor: CARBONO, color: "#FFFFFF", padding: 16, borderRadius: 8, marginBottom: 16 },
  h1: { fontSize: 18, fontFamily: "Helvetica-Bold", lineHeight: 1.2 },
  sub: { fontSize: 10, color: "#DCE4F7", marginTop: 8 },
  h2: { fontSize: 12, fontFamily: "Helvetica-Bold", color: CARBONO, marginTop: 14, marginBottom: 8 },
  grade: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
  cartao: { width: "31.8%", borderWidth: 1, borderColor: PAUTA, borderRadius: 6, padding: 8 },
  rot: { fontSize: 7.5, color: GRAFITE, textTransform: "uppercase" as const, letterSpacing: 0.6 },
  val: { fontSize: 15, fontFamily: "Helvetica-Bold", marginTop: 2 },
  barraLinha: { flexDirection: "row" as const, alignItems: "center" as const, marginBottom: 4 },
  barraRot: { width: 150, fontSize: 9, paddingRight: 6 },
  barraFundo: { flex: 1, height: 8, backgroundColor: PAUTA, borderRadius: 4 },
  barraVal: { width: 34, textAlign: "right" as const, fontSize: 9, fontFamily: "Helvetica-Bold" },
  tabCab: { flexDirection: "row" as const, borderBottomWidth: 1, borderBottomColor: TINTA, paddingBottom: 3, fontFamily: "Helvetica-Bold", fontSize: 8, color: GRAFITE },
  tabLin: { flexDirection: "row" as const, borderBottomWidth: 1, borderBottomColor: PAUTA, paddingVertical: 4, fontSize: 8.5 },
  rodape: { position: "absolute" as const, bottom: 20, left: 36, right: 36, fontSize: 8, color: GRAFITE, textAlign: "center" as const },
};

function Barras({ pontos }: { pontos: Ponto[] }) {
  const max = Math.max(1, ...pontos.map((p) => p.valor));
  return (
    <View>
      {pontos.map((p, i) => (
        <View key={i} style={s.barraLinha} wrap={false}>
          <Text style={s.barraRot}>{p.rotulo}</Text>
          <View style={s.barraFundo}>
            <View style={{ width: `${(p.valor / max) * 100}%`, height: 8, backgroundColor: i % 2 ? PAGO : CARBONO, borderRadius: 4 }} />
          </View>
          <Text style={s.barraVal}>{p.valor}</Text>
        </View>
      ))}
    </View>
  );
}

/** Relatório do Painel administrativo em PDF. */
export default function RelatorioAdminPDF({ d }: { d: DadosRelatorio }) {
  const r = d.resumo;
  const numeros: [string, string][] = [
    ["Contas", String(r.contas)],
    ["Novas no período", String(r.novas)],
    ["Ativas (30 dias)", String(r.ativos)],
    ["Em teste grátis", String(r.emTeste)],
    ["Pro pagantes", String(r.pro)],
    ["Grátis", String(r.gratis)],
    ["Teste acabou sem assinar", String(r.testeAcabou)],
    ["Cancelaram", String(r.cancelaram)],
    ["Conversão do teste", pct(r.conversaoTeste)],
    ["Receita no período", reais(r.receitaPeriodo)],
    ["Receita mensal estimada", reais(r.mrr)],
    ["Avisos ligados", String(r.avisosLigados)],
    ["Orçamentos criados", String(r.orcamentosPeriodo)],
    ["Orçamentos enviados", String(r.enviadosPeriodo)],
    ["Orçamentos aprovados", String(r.aprovadosPeriodo)],
    ["Valor aprovado", reais(r.valorAprovadoPeriodo)],
    ["Contratos assinados", String(r.contratosAssinadosPeriodo)],
    ["Lista de espera (site)", String(r.leads)],
  ];
  return (
    <Document title={d.titulo} author="Preço Fechado" language="pt-BR">
      <Page size="A4" style={s.pagina}>
        <View style={s.faixa}>
          <Text style={s.h1}>{d.titulo}</Text>
          <Text style={s.sub}>
            {d.periodoTexto} · gerado em {d.geradoEm.toLocaleString("pt-BR")}
          </Text>
        </View>

        {d.secoes.numeros && (
          <>
            <Text style={s.h2}>Números</Text>
            <View style={s.grade}>
              {numeros.map(([rot, val]) => (
                <View key={rot} style={s.cartao} wrap={false}>
                  <Text style={s.rot}>{rot}</Text>
                  <Text style={s.val}>{val}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {d.secoes.graficos && (
          <>
            <Text style={s.h2}>Novas contas por mês</Text>
            <Barras pontos={d.novasPorMes} />
            <Text style={s.h2}>Contas ativas por semana</Text>
            <Barras pontos={d.ativosPorSemana} />
            <Text style={s.h2}>Funil</Text>
            <Barras pontos={d.funil} />
            <Text style={s.h2}>Profissões</Text>
            <Barras pontos={d.profissoes} />
          </>
        )}

        {d.secoes.contas && (
          <>
            <Text style={s.h2} break={d.secoes.graficos}>
              Contas criadas no período ({d.novasContas.length})
            </Text>
            <View style={s.tabCab}>
              <Text style={{ flex: 2 }}>Negócio</Text>
              <Text style={{ flex: 2 }}>Contato</Text>
              <Text style={{ flex: 1.3 }}>Situação</Text>
              <Text style={{ width: 52 }}>Criada</Text>
              <Text style={{ width: 40, textAlign: "right" }}>Orç.</Text>
            </View>
            {d.novasContas.map((c) => (
              <View key={c.uid} style={s.tabLin} wrap={false}>
                <Text style={{ flex: 2 }}>
                  {c.negocio}
                  {c.responsavel ? ` · ${c.responsavel}` : ""}
                </Text>
                <Text style={{ flex: 2, color: GRAFITE }}>{[c.email, c.whatsapp].filter(Boolean).join(" · ")}</Text>
                <Text style={{ flex: 1.3 }}>{ROTULO_SITUACAO[c.situacao]}</Text>
                <Text style={{ width: 52 }}>{dataBr(c.criadoEm)}</Text>
                <Text style={{ width: 40, textAlign: "right" }}>{c.orcamentos}</Text>
              </View>
            ))}
            {d.novasContas.length === 0 && <Text style={{ color: GRAFITE, marginTop: 6 }}>Nenhuma conta nova no período.</Text>}
          </>
        )}

        <Text style={s.rodape} fixed render={({ pageNumber, totalPages }) => `Preço Fechado · relatório administrativo · página ${pageNumber} de ${totalPages}`} />
      </Page>
    </Document>
  );
}
