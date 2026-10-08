import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import CabecalhoPagina from "@/componentes/CabecalhoPagina";
import Campo from "@/componentes/Campo";
import Carregando from "@/componentes/Carregando";
import { useAuth } from "@/hooks/useAuth";
import { useOrcamento } from "@/hooks/useOrcamentos";
import { useClientes } from "@/hooks/useDados";
import { criarContrato } from "@/lib/contratos";
import { enderecoEmLinha, idCliente } from "@/lib/clientes";
import { registrarEvento } from "@/lib/eventos";
import { formatarReais } from "@shared/src/mensagens";

const GARANTIAS = [
  { dias: 0, rotulo: "Sem garantia" },
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "90 dias" },
  { dias: 180, rotulo: "6 meses" },
  { dias: 365, rotulo: "1 ano" },
];
const PRAZOS = ["a combinar", "1 dia útil", "3 dias úteis", "7 dias", "15 dias", "30 dias"];

/** Gerar contrato a partir de um orçamento aprovado: poucos campos, o texto já sai pronto. */
export default function NovoContrato() {
  const { usuario, perfil } = useAuth();
  const uid = usuario?.uid;
  const [params] = useSearchParams();
  const orcamentoId = params.get("orcamento") ?? undefined;
  const navegar = useNavigate();
  const { orcamento, carregando } = useOrcamento(orcamentoId);
  const { clientes } = useClientes(uid);
  const cliente = useMemo(() => (orcamento && uid ? clientes.find((c) => c.id === idCliente(uid, orcamento.cliente.whatsapp)) : undefined), [clientes, orcamento, uid]);

  const [formaPagamento, setFormaPagamento] = useState("");
  const [prazo, setPrazo] = useState("a combinar");
  const [prazoOutro, setPrazoOutro] = useState("");
  const [garantia, setGarantia] = useState(90);
  const [documento, setDocumento] = useState("");
  const [endereco, setEndereco] = useState("");
  const [preenchido, setPreenchido] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!orcamento || preenchido) return;
    setPreenchido(true);
    const venc = orcamento.vencimentoPagamento ? "Pix, até a data de vencimento combinada no orçamento" : "Pix na conclusão do serviço";
    setFormaPagamento(perfil?.plano === "pro" ? `${venc}, pela chave informada na página do orçamento` : venc);
  }, [orcamento, preenchido, perfil?.plano]);
  useEffect(() => {
    if (cliente) {
      setDocumento((d) => d || cliente.documento || "");
      setEndereco((e) => e || enderecoEmLinha(cliente.endereco));
    }
  }, [cliente]);

  if (carregando || !perfil) return <Carregando />;
  if (!orcamento || orcamento.ownerId !== uid) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4">
        <CabecalhoPagina titulo="Novo contrato" voltarPara="/contratos" />
        <p className="cartao mt-6 p-6 text-center text-grafite">Escolha um orçamento aprovado para gerar o contrato.</p>
        <Link to="/orcamentos?filtro=aprovado" className="botao-secundario mt-4">
          Ver orçamentos aprovados
        </Link>
      </main>
    );
  }
  if (orcamento.status !== "aprovado" && orcamento.status !== "pago") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4">
        <CabecalhoPagina titulo="Novo contrato" voltarPara={`/orcamentos/${orcamento.id}`} />
        <p className="cartao mt-6 p-6 text-center text-grafite">O contrato é gerado depois que o cliente aprova o orçamento.</p>
      </main>
    );
  }

  async function gerar(e: FormEvent) {
    e.preventDefault();
    if (!uid || !orcamento || !perfil) return;
    const prazoFinal = prazo === "outro" ? prazoOutro.trim() : prazo;
    if (!prazoFinal) {
      setErro("Informe o prazo de execução.");
      return;
    }
    if (!formaPagamento.trim()) {
      setErro("Informe a forma de pagamento.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const id = await criarContrato(uid, perfil, orcamento, {
        formaPagamento: formaPagamento.trim(),
        prazoExecucao: prazoFinal,
        garantiaDias: garantia,
        contratante: { documento: documento.trim() || undefined, endereco: endereco.trim() || undefined },
      });
      registrarEvento("contrato_gerado", { uid, orcamentoId: orcamento.id });
      navegar(`/contratos/${id}`, { replace: true });
    } catch (err) {
      console.error(err);
      setErro("Não deu para gerar o contrato. Confira a internet e tente de novo.");
      setSalvando(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 pb-32">
      <CabecalhoPagina titulo="Gerar contrato" voltarPara={`/orcamentos/${orcamento.id}`} />

      <section className="cartao mt-4 p-4">
        <p className="titulo-secao">Base</p>
        <p className="mt-1 font-semibold">
          Orçamento nº {String(orcamento.numero).padStart(4, "0")} · {orcamento.cliente.nome}
        </p>
        <p className="text-sm text-grafite">
          {orcamento.itens.map((i) => i.descricao).join(", ")} · <span className="tabular font-medium text-tinta">{formatarReais(orcamento.total)}</span>
        </p>
      </section>

      <form id="form-contrato" onSubmit={gerar} noValidate className="mt-4 space-y-3">
        <section className="cartao space-y-3 p-4">
          <h2 className="titulo-secao">Condições</h2>
          <div>
            <span className="rotulo">Prazo de execução</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Prazo">
              {[...PRAZOS, "outro"].map((p) => (
                <button key={p} type="button" role="radio" aria-checked={prazo === p} onClick={() => setPrazo(p)} className={`opcao !min-h-10 px-3 text-xs ${prazo === p ? "opcao-ativa" : ""}`}>
                  {p === "outro" ? "Outro" : p}
                </button>
              ))}
            </div>
            {prazo === "outro" && <div className="mt-2"><Campo id="prazoOutro" rotulo="Descreva o prazo" placeholder="Ex.: 10 dias úteis após a entrega do material" value={prazoOutro} onChange={(e) => setPrazoOutro(e.target.value)} /></div>}
          </div>
          <Campo id="pagamento" rotulo="Forma de pagamento" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} ajuda="Ex.: 50% na aprovação e 50% na conclusão, por Pix." />
          <div>
            <span className="rotulo">Garantia do serviço</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Garantia">
              {GARANTIAS.map((g) => (
                <button key={g.dias} type="button" role="radio" aria-checked={garantia === g.dias} onClick={() => setGarantia(g.dias)} className={`opcao !min-h-10 px-3 text-xs ${garantia === g.dias ? "opcao-ativa" : ""}`}>
                  {g.rotulo}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="cartao space-y-3 p-4">
          <h2 className="titulo-secao">Dados do cliente no contrato (opcionais)</h2>
          <Campo id="doc" rotulo="CPF ou CNPJ do cliente" inputMode="numeric" value={documento} onChange={(e) => setDocumento(e.target.value)} />
          <Campo id="end" rotulo="Endereço do cliente ou do serviço" placeholder="Rua, número, bairro, cidade/UF" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          <p className="ajuda">Ficam salvos na ficha do cliente para a próxima vez.</p>
        </section>

        <p className="text-xs text-grafite">
          O contrato é um modelo sugerido, gerado com os dados acima. Você poderá revisar e editar o texto antes de enviar. Recomendamos a leitura por um advogado para o seu caso.
        </p>
        {erro && (
          <p role="alert" className="rounded-xl bg-[#FDECEF] px-3 py-2 text-sm text-recusado">
            {erro}
          </p>
        )}
      </form>

      <div className="fixed inset-x-0 bottom-0 barra-fixa p-4">
        <div className="mx-auto max-w-[560px]">
          <button type="submit" form="form-contrato" className="botao-primario" disabled={salvando}>
            {salvando ? "Gerando…" : "Gerar contrato preenchido"}
          </button>
        </div>
      </div>
    </main>
  );
}
