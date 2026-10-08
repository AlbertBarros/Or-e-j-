import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import CabecalhoPagina from "@/componentes/CabecalhoPagina";
import Carregando from "@/componentes/Carregando";
import { useAuth } from "@/hooks/useAuth";
import { useOrcamento } from "@/hooks/useOrcamentos";
import { linkPublico, tomSugerido } from "@/lib/orcamentos";
import { paraDate } from "@/lib/datas";
import { diasEmAtraso, linkWhatsapp, mensagemCobranca, type TomCobranca } from "@shared/src/mensagens";

const TONS: { tom: TomCobranca; rotulo: string; descricao: string }[] = [
  { tom: "gentil", rotulo: "Gentil", descricao: "Lembrete leve, para quem está no prazo ou pouco atrasado." },
  { tom: "firme", rotulo: "Firme", descricao: "Direto, para quem já passou alguns dias do vencimento." },
  { tom: "final", rotulo: "Final", descricao: "Último aviso, para atrasos longos." },
];

/** T7 — Cobrar: três mensagens prontas, tom sugerido pelos dias de atraso, envio pelo WhatsApp. */
export default function Cobrar() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const { orcamento, carregando, erro } = useOrcamento(id);
  const [tom, setTom] = useState<TomCobranca | null>(null);

  useEffect(() => {
    if (orcamento && tom === null) setTom(tomSugerido(orcamento));
  }, [orcamento, tom]);

  if (carregando) return <Carregando />;
  if (erro || !orcamento || orcamento.ownerId !== usuario?.uid) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4">
        <CabecalhoPagina titulo="Cobrar" />
        <p className="documento mt-6 p-6 text-center text-grafite">{erro ?? "Orçamento não encontrado."}</p>
      </main>
    );
  }
  if (orcamento.status !== "aprovado") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4">
        <CabecalhoPagina titulo="Cobrar" voltarPara={`/orcamentos/${orcamento.id}`} />
        <p className="documento mt-6 p-6 text-center text-grafite">Só dá para cobrar orçamentos aprovados e ainda não pagos.</p>
        <Link to={`/orcamentos/${orcamento.id}`} className="botao-secundario mt-4">
          Voltar ao orçamento
        </Link>
      </main>
    );
  }

  const vencimento = paraDate(orcamento.vencimentoPagamento) ?? new Date();
  const dias = diasEmAtraso(vencimento);
  const sugerido = tomSugerido(orcamento);
  const tomAtual = tom ?? sugerido;
  const mensagem = mensagemCobranca(tomAtual, {
    cliente: orcamento.cliente.nome,
    negocio: orcamento.negocio.nome,
    numero: orcamento.numero,
    total: orcamento.total,
    vencimento,
    link: linkPublico(orcamento.id),
  });
  const link = linkWhatsapp(orcamento.cliente.whatsapp, mensagem);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 pb-32">
      <CabecalhoPagina titulo={`Cobrar · nº ${String(orcamento.numero).padStart(4, "0")}`} voltarPara={`/orcamentos/${orcamento.id}`} />

      <p className="mt-4 text-grafite">
        {dias > 0 ? (
          <>
            Vencido há <strong className="text-atraso">{dias} {dias === 1 ? "dia" : "dias"}</strong>. Sugerimos o tom{" "}
            <strong className="text-tinta">{TONS.find((t) => t.tom === sugerido)?.rotulo}</strong>.
          </>
        ) : (
          <>Ainda não venceu. Um lembrete gentil costuma bastar.</>
        )}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tom da mensagem">
        {TONS.map((t) => (
          <button
            key={t.tom}
            type="button"
            role="radio"
            aria-checked={tomAtual === t.tom}
            onClick={() => setTom(t.tom)}
            className={`opcao flex-col !items-start !justify-start gap-1 !px-3 !py-3 !text-left ${tomAtual === t.tom ? "opcao-ativa" : ""}`}
          >
            <span className="font-semibold">
              {t.rotulo}
              {t.tom === sugerido ? " ·" : ""}
            </span>
            <span className="text-xs font-normal text-grafite">{t.descricao}</span>
          </button>
        ))}
      </div>

      <section className="documento mt-4 p-4" aria-labelledby="previa">
        <h2 id="previa" className="text-sm font-semibold uppercase tracking-wide text-grafite">
          Prévia da mensagem
        </h2>
        <p className="mt-2 whitespace-pre-line leading-relaxed">{mensagem}</p>
      </section>

      <div className="fixed inset-x-0 bottom-0 barra-fixa p-4">
        <div className="mx-auto max-w-[560px]">
          <a href={link} target="_blank" rel="noopener" className="botao-primario">
            Enviar no WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}
