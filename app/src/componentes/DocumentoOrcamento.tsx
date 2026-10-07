import type { Orcamento } from "@/tipos";
import { formatarReais, formatarData, formatarWhatsapp, subtotal } from "@shared/src/mensagens";
import { paraDate } from "@/lib/datas";

interface Props {
  orcamento: Orcamento;
  logoDataUrl?: string | null;
}

/** O orçamento como documento: folha branca, número em destaque, itens pautados e total no pé. */
export default function DocumentoOrcamento({ orcamento: o, logoDataUrl }: Props) {
  const criado = paraDate(o.criadoEm);
  const validade = paraDate(o.validadeAte);
  const vencimento = paraDate(o.vencimentoPagamento);
  const valorSubtotal = subtotal(o.itens);

  return (
    <article className="documento overflow-hidden" aria-label={`Orçamento número ${o.numero}`}>
      <header className="flex items-start justify-between gap-3 border-b border-pauta px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          {logoDataUrl && o.negocio.mostrarLogo && (
            <img src={logoDataUrl} alt="" className="h-12 w-12 shrink-0 rounded-[8px] object-contain" />
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold">{o.negocio.nome}</p>
            <p className="text-xs text-grafite">
              WhatsApp {formatarWhatsapp(o.negocio.whatsapp)}
              {o.negocio.cidade ? ` · ${o.negocio.cidade}` : ""}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] uppercase tracking-wide text-grafite">Orçamento</p>
          <p className="tabular text-2xl font-bold leading-none text-carbono">Nº {String(o.numero).padStart(4, "0")}</p>
          {criado && <p className="mt-1 text-xs text-grafite">{formatarData(criado)}</p>}
        </div>
      </header>

      <section className="px-4 py-3">
        <p className="text-xs text-grafite">Cliente</p>
        <p className="font-medium">{o.cliente.nome}</p>
        <p className="text-sm text-grafite">{formatarWhatsapp(o.cliente.whatsapp)}</p>
      </section>

      <ul className="divide-y divide-pauta border-t border-pauta">
        {o.itens.map((item, i) => (
          <li key={i} className="flex items-start justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <p className="leading-snug">{item.descricao}</p>
              <p className="tabular text-xs text-grafite">
                {item.qtd} {item.unidade} × {formatarReais(item.valorUnit)}
              </p>
            </div>
            <p className="tabular shrink-0 font-medium">{formatarReais(item.qtd * item.valorUnit)}</p>
          </li>
        ))}
      </ul>

      <section className="border-t-2 border-double border-tinta px-4 py-3">
        {o.desconto > 0 && (
          <>
            <div className="flex justify-between text-sm text-grafite">
              <span>Subtotal</span>
              <span className="tabular">{formatarReais(valorSubtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-grafite">
              <span>Desconto</span>
              <span className="tabular">- {formatarReais(o.desconto)}</span>
            </div>
          </>
        )}
        <div className="flex items-baseline justify-between">
          <span className="font-medium">Total</span>
          <span className="tabular text-3xl font-bold">{formatarReais(o.total)}</span>
        </div>
      </section>

      <section className="space-y-2 border-t border-pauta bg-fundo px-4 py-3 text-sm">
        {validade && (
          <p>
            <span className="text-grafite">Válido até</span> {formatarData(validade)}
          </p>
        )}
        {vencimento && (
          <p>
            <span className="text-grafite">Pagamento até</span> {formatarData(vencimento)}
          </p>
        )}
        {o.observacoes && (
          <p className="whitespace-pre-line">
            <span className="text-grafite">Observações:</span> {o.observacoes}
          </p>
        )}
      </section>

      {o.negocio.mostrarMarca && (
        <footer className="border-t border-pauta px-4 py-2 text-center text-xs text-grafite">Feito com Orça Já</footer>
      )}
    </article>
  );
}
