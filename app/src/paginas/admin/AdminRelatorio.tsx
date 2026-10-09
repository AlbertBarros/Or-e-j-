import { useMemo, useState } from "react";
import Campo from "@/componentes/Campo";
import { Indicador } from "@/componentes/GraficosAdmin";
import { ativosPorSemana, baixarTexto, calcularResumo, dataBr, funil, novasPorMes, paraCsv, planilhaContas, topProfissoes, type DadosAdmin, type Periodo } from "@/lib/admin";
import { dataParaInput, inputParaData } from "@/lib/datas";
import { nomeProfissao } from "@/lib/profissoes";
import { formatarReais } from "@shared/src/mensagens";

type Atalho = "7" | "30" | "90" | "mes" | "mes-passado" | "ano" | "tudo" | "livre";

const ATALHOS: { id: Atalho; rotulo: string }[] = [
  { id: "7", rotulo: "Últimos 7 dias" },
  { id: "30", rotulo: "Últimos 30 dias" },
  { id: "90", rotulo: "Últimos 90 dias" },
  { id: "mes", rotulo: "Este mês" },
  { id: "mes-passado", rotulo: "Mês passado" },
  { id: "ano", rotulo: "Este ano" },
  { id: "tudo", rotulo: "Desde o início" },
  { id: "livre", rotulo: "Escolher datas" },
];

function periodoDoAtalho(a: Atalho, de: string, ate: string): Periodo {
  const agora = new Date();
  const fimDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
  switch (a) {
    case "7":
    case "30":
    case "90":
      return { inicio: new Date(agora.getTime() - Number(a) * 86_400_000), fim: agora };
    case "mes":
      return { inicio: new Date(agora.getFullYear(), agora.getMonth(), 1), fim: agora };
    case "mes-passado":
      return { inicio: new Date(agora.getFullYear(), agora.getMonth() - 1, 1), fim: new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59) };
    case "ano":
      return { inicio: new Date(agora.getFullYear(), 0, 1), fim: agora };
    case "tudo":
      return { inicio: new Date(2020, 0, 1), fim: agora };
    default:
      return { inicio: inputParaData(de) ?? new Date(agora.getTime() - 30 * 86_400_000), fim: fimDoDia(inputParaData(ate) ?? agora) };
  }
}

/** Relatório: escolhe o período e o que entra, vê a prévia e baixa em PDF ou planilha. */
export default function AdminRelatorio({ dados }: { dados: DadosAdmin }) {
  const [atalho, setAtalho] = useState<Atalho>("30");
  const [de, setDe] = useState(dataParaInput(new Date(Date.now() - 30 * 86_400_000)));
  const [ate, setAte] = useState(dataParaInput(new Date()));
  const [secoes, setSecoes] = useState({ numeros: true, graficos: true, contas: true });
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const periodo = useMemo(() => periodoDoAtalho(atalho, de, ate), [atalho, de, ate]);
  const r = useMemo(() => calcularResumo(dados, periodo), [dados, periodo]);
  const novasContas = useMemo(
    () => dados.contas.filter((c) => c.criadoEm && c.criadoEm >= periodo.inicio && c.criadoEm <= periodo.fim).sort((a, b) => (b.criadoEm?.getTime() ?? 0) - (a.criadoEm?.getTime() ?? 0)),
    [dados.contas, periodo],
  );
  const periodoTexto = atalho === "tudo" ? `Desde o início até ${dataBr(periodo.fim)}` : `${dataBr(periodo.inicio)} a ${dataBr(periodo.fim)}`;
  const dia = new Date().toISOString().slice(0, 10);

  async function baixarPdf() {
    setGerando(true);
    setErro(null);
    try {
      const { gerarPdfRelatorioAdmin, baixarArquivo } = await import("@/pdf/gerarPdf");
      const nomes = Object.fromEntries(dados.contas.map((c) => [c.profissao, nomeProfissao(c.profissao)]));
      const arquivo = await gerarPdfRelatorioAdmin({
        titulo: "Relatório do Preço Fechado",
        periodoTexto,
        geradoEm: new Date(),
        resumo: r,
        novasPorMes: novasPorMes(dados.contas, 12),
        ativosPorSemana: ativosPorSemana(dados, 12),
        funil: funil(dados.contas),
        profissoes: topProfissoes(dados.contas, nomes, 8),
        novasContas,
        secoes,
      });
      baixarArquivo(arquivo);
    } catch (e) {
      console.error(e);
      setErro("Não deu para gerar o PDF. Tente de novo.");
    } finally {
      setGerando(false);
    }
  }

  function baixarResumoCsv() {
    const linhas: (string | number)[][] = [
      ["Relatório do Preço Fechado", periodoTexto],
      [],
      ["Indicador", "Valor"],
      ["Contas (total)", r.contas],
      ["Novas no período", r.novas],
      ["Ativas (30 dias)", r.ativos],
      ["Em teste grátis", r.emTeste],
      ["Pro pagantes", r.pro],
      ["Grátis", r.gratis],
      ["Teste acabou sem assinar", r.testeAcabou],
      ["Pro vencido", r.proVencido],
      ["Cancelaram", r.cancelaram],
      ["Conversão do teste (%)", Math.round(r.conversaoTeste * 100)],
      ["Receita no período (R$)", r.receitaPeriodo],
      ["Receita mensal estimada (R$)", r.mrr],
      ["Orçamentos criados", r.orcamentosPeriodo],
      ["Orçamentos enviados", r.enviadosPeriodo],
      ["Orçamentos aprovados", r.aprovadosPeriodo],
      ["Valor aprovado (R$)", r.valorAprovadoPeriodo],
      ["Contratos assinados", r.contratosAssinadosPeriodo],
      ["Avisos ligados", r.avisosLigados],
      ["Lista de espera (site)", r.leads],
    ];
    baixarTexto(paraCsv(linhas), `resumo-preco-fechado-${dia}.csv`);
  }

  function baixarLeads() {
    baixarTexto(paraCsv([["E-mail", "WhatsApp", "Profissão", "Origem", "Data"], ...dados.leads.map((l) => [l.email, l.whatsapp, l.profissao, l.origem, dataBr(l.criadoEm)])]), `lista-de-espera-${dia}.csv`);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <section className="cartao h-fit space-y-4 p-4" aria-labelledby="r-config">
        <h2 id="r-config" className="text-lg font-bold">
          Montar relatório
        </h2>
        <fieldset>
          <legend className="rotulo">Período</legend>
          <div className="grid grid-cols-2 gap-2">
            {ATALHOS.map((a) => (
              <button key={a.id} type="button" aria-pressed={atalho === a.id} onClick={() => setAtalho(a.id)} className={`opcao !min-h-10 text-sm ${atalho === a.id ? "opcao-ativa" : ""}`}>
                {a.rotulo}
              </button>
            ))}
          </div>
        </fieldset>
        {atalho === "livre" && (
          <div className="grid grid-cols-2 gap-2">
            <Campo id="r-de" rotulo="De" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
            <Campo id="r-ate" rotulo="Até" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
        )}
        <fieldset className="space-y-2">
          <legend className="rotulo">O que entra no PDF</legend>
          {(
            [
              ["numeros", "Números do período"],
              ["graficos", "Gráficos (novas contas, ativos, funil, profissões)"],
              ["contas", "Lista das contas criadas no período"],
            ] as const
          ).map(([k, rot]) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={secoes[k]} onChange={(e) => setSecoes((s) => ({ ...s, [k]: e.target.checked }))} className="h-4 w-4" />
              {rot}
            </label>
          ))}
        </fieldset>
        <button type="button" onClick={baixarPdf} disabled={gerando || !(secoes.numeros || secoes.graficos || secoes.contas)} className="botao-primario">
          {gerando ? "Gerando PDF…" : "Baixar relatório em PDF"}
        </button>
        <div className="grid gap-2">
          <button type="button" onClick={baixarResumoCsv} className="botao-secundario !min-h-10 text-sm">
            Planilha do resumo (CSV)
          </button>
          <button type="button" onClick={() => baixarTexto(planilhaContas(novasContas), `contas-novas-${dia}.csv`)} className="botao-secundario !min-h-10 text-sm">
            Planilha das contas novas ({novasContas.length})
          </button>
          <button type="button" onClick={() => baixarTexto(planilhaContas(dados.contas), `todas-as-contas-${dia}.csv`)} className="botao-secundario !min-h-10 text-sm">
            Planilha de todas as contas ({dados.contas.length})
          </button>
          <button type="button" onClick={baixarLeads} className="botao-secundario !min-h-10 text-sm">
            Planilha da lista de espera ({dados.leads.length})
          </button>
        </div>
        <p className="ajuda">As planilhas abrem no Excel e no Google Planilhas.</p>
        {erro && (
          <p role="alert" className="erro">
            {erro}
          </p>
        )}
      </section>

      <section aria-labelledby="r-previa" className="space-y-3">
        <div>
          <h2 id="r-previa" className="text-lg font-bold">
            Prévia
          </h2>
          <p className="text-sm text-grafite">{periodoTexto}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Indicador destaque rotulo="Novas contas" valor={r.novas} detalhe={`${r.contas} no total`} />
          <Indicador rotulo="Ativas" valor={r.ativos} />
          <Indicador rotulo="Em teste" valor={r.emTeste} />
          <Indicador rotulo="Pro pagantes" valor={r.pro} detalhe={`conversão ${Math.round(r.conversaoTeste * 100)}%`} />
          <Indicador rotulo="Receita" valor={formatarReais(r.receitaPeriodo)} detalhe={`por mês: ${formatarReais(r.mrr)}`} />
          <Indicador rotulo="Cancelaram" valor={r.cancelaram} />
          <Indicador rotulo="Orçamentos" valor={r.orcamentosPeriodo} detalhe={`${r.aprovadosPeriodo} aprovados`} />
          <Indicador rotulo="Valor aprovado" valor={formatarReais(r.valorAprovadoPeriodo)} />
          <Indicador rotulo="Contratos assinados" valor={r.contratosAssinadosPeriodo} />
        </div>
        <div className="cartao p-4">
          <h3 className="titulo-secao">Contas criadas no período ({novasContas.length})</h3>
          {novasContas.length === 0 ? (
            <p className="mt-2 text-sm text-grafite">Nenhuma.</p>
          ) : (
            <ul className="mt-2 divide-y divide-pauta text-sm">
              {novasContas.slice(0, 15).map((c) => (
                <li key={c.uid} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{c.negocio}</span>
                    <span className="block truncate text-xs text-grafite">
                      {c.responsavel} · {nomeProfissao(c.profissao)}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-grafite">{dataBr(c.criadoEm)}</span>
                </li>
              ))}
            </ul>
          )}
          {novasContas.length > 15 && <p className="ajuda mt-2">E mais {novasContas.length - 15} no PDF e na planilha.</p>}
        </div>
      </section>
    </div>
  );
}
