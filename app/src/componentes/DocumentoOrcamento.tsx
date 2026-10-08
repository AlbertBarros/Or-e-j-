import type { ModeloDocumento, Orcamento } from "@/tipos";
import { formatarReais, formatarData, formatarWhatsapp, subtotal } from "@shared/src/mensagens";
import { paraDate } from "@/lib/datas";
import { descreverPagamento } from "@/lib/pagamento";

interface Props {
  orcamento: Orcamento;
  logoDataUrl?: string | null;
  /** A página pública mostra a marca no rodapé dela mesma; aqui pode desligar para não duplicar. */
  rodapeMarca?: boolean;
  /** Sobrepõe o modelo gravado (usado na prévia antes de enviar). */
  modelo?: ModeloDocumento;
}

/**
 * O orçamento como documento, em 3 modelos:
 * 1 Simples (itens e total), 2 Detalhado (quantidades, condições), 3 Completo (faixa colorida, pagamento, frete).
 */
export default function DocumentoOrcamento({ orcamento: o, logoDataUrl, rodapeMarca = true, modelo }: Props) {
  const m: ModeloDocumento = modelo ?? o.modelo ?? 2;
  const criado = paraDate(o.criadoEm);
  const validade = paraDate(o.validadeAte);
  const vencimento = paraDate(o.vencimentoPagamento);
  const valorSubtotal = subtotal(o.itens);
  const temLogo = Boolean(logoDataUrl && o.negocio.mostrarLogo);
  const pagamento = descreverPagamento(o.pagamento);
  const valorCartao = o.pagamento?.valorCartao;
  const completo = m === 3;
  const simples = m === 1;

  return (
    <article className={`documento overflow-hidden ${completo ? "border-carbono/30" : ""}`} aria-label={`Orçamento número ${o.numero}`}>
      {/* Cabeçalho */}
      {completo ? (
        <header className="bg-gradient-to-br from-carbono to-[#2B4FB8] px-4 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {temLogo ? (
                <img src={logoDataUrl!} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-white object-contain p-1" />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/15 text-2xl font-bold">{o.negocio.nome.trim().charAt(0).toUpperCase()}</span>
              )}
              <div className="min-w-0">
                <p className="truncate text-lg font-bold leading-tight">{o.negocio.nome}</p>
                <p className="text-xs text-white/80">
                  WhatsApp {formatarWhatsapp(o.negocio.whatsapp)}
                  {o.negocio.cidade ? ` · ${o.negocio.cidade}` : ""}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] uppercase tracking-widest text-white/70">Orçamento</p>
              <p className="tabular text-2xl font-bold leading-none">Nº {String(o.numero).padStart(4, "0")}</p>
              {criado && <p className="mt-1 text-xs text-white/80">{formatarData(criado)}</p>}
            </div>
          </div>
        </header>
      ) : (
        <header className={`flex items-start justify-between gap-3 border-b border-pauta px-4 ${simples ? "py-3" : "py-4"}`}>
          <div className="flex min-w-0 items-center gap-3">
            {temLogo && <img src={logoDataUrl!} alt="" className={`shrink-0 rounded-[8px] object-contain ${simples ? "h-9 w-9" : "h-12 w-12"}`} />}
            <div className="min-w-0">
              <p className="truncate font-semibold">{o.negocio.nome}</p>
              {!simples && (
                <p className="text-xs text-grafite">
                  WhatsApp {formatarWhatsapp(o.negocio.whatsapp)}
                  {o.negocio.cidade ? ` · ${o.negocio.cidade}` : ""}
                </p>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-wide text-grafite">Orçamento</p>
            <p className={`tabular font-bold leading-none text-carbono ${simples ? "text-xl" : "text-2xl"}`}>Nº {String(o.numero).padStart(4, "0")}</p>
            {criado && <p className="mt-1 text-xs text-grafite">{formatarData(criado)}</p>}
          </div>
        </header>
      )}

      {/* Cliente */}
      <section className={`px-4 ${simples ? "py-2" : "py-3"} ${completo ? "border-b border-pauta" : ""}`}>
        <p className="text-xs text-grafite">{completo ? "Preparado para" : "Cliente"}</p>
        <p className="font-medium">{o.cliente.nome}</p>
        {!simples && <p className="text-sm text-grafite">{formatarWhatsapp(o.cliente.whatsapp)}</p>}
      </section>

      {/* Itens */}
      {completo && (
        <div className="flex items-center justify-between px-4 pt-3 text-[10px] font-semibold uppercase tracking-wider text-grafite">
          <span>Descrição</span>
          <span>Total</span>
        </div>
      )}
      <ul className={`divide-y divide-pauta ${completo ? "" : "border-t border-pauta"}`}>
        {o.itens.map((item, i) => (
          <li key={i} className={`flex items-start justify-between gap-3 px-4 ${simples ? "py-2" : "py-2.5"}`}>
            <div className="min-w-0">
              <p className="leading-snug">{item.descricao}</p>
              {!simples && (
                <p className="tabular text-xs text-grafite">
                  {item.qtd} {item.unidade} × {formatarReais(item.valorUnit)}
                </p>
              )}
            </div>
            <p className="tabular shrink-0 font-medium">{formatarReais(item.qtd * item.valorUnit)}</p>
          </li>
        ))}
      </ul>

      {/* Totais */}
      <section className={`px-4 py-3 ${completo ? "border-t border-pauta bg-fundo" : "border-t-2 border-double border-tinta"}`}>
        {!simples && (o.desconto > 0 || o.frete) && (
          <div className="flex justify-between text-sm text-grafite">
            <span>Subtotal</span>
            <span className="tabular">{formatarReais(valorSubtotal)}</span>
          </div>
        )}
        {!simples && o.desconto > 0 && (
          <div className="flex justify-between text-sm text-grafite">
            <span>Desconto</span>
            <span className="tabular">- {formatarReais(o.desconto)}</span>
          </div>
        )}
        {o.frete && (
          <div className="flex justify-between text-sm text-grafite">
            <span>Frete{!simples && o.frete.km > 0 ? ` (${o.frete.km.toLocaleString("pt-BR")} km)` : ""}</span>
            <span className="tabular">{formatarReais(o.frete.valor)}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between">
          <span className="font-medium">{valorCartao ? "Total à vista" : "Total"}</span>
          <span className={`tabular font-bold ${simples ? "text-2xl" : "text-3xl"} ${completo ? "text-carbono" : ""}`}>{formatarReais(o.total)}</span>
        </div>
        {valorCartao && valorCartao > 0 && (
          <div className="mt-1 flex items-baseline justify-between text-grafite">
            <span className="text-sm">No cartão</span>
            <span className="tabular text-lg font-semibold">{formatarReais(valorCartao)}</span>
          </div>
        )}
      </section>

      {/* Condições */}
      <section className={`space-y-1.5 border-t border-pauta px-4 py-3 text-sm ${completo ? "" : "bg-fundo"}`}>
        {completo && pagamento && (
          <p>
            <span className="text-grafite">Pagamento:</span> {pagamento}
            {o.pagamento?.observacao ? ` · ${o.pagamento.observacao}` : ""}
          </p>
        )}
        {!completo && !simples && o.pagamento?.observacao && (
          <p>
            <span className="text-grafite">Pagamento:</span> {o.pagamento.observacao}
          </p>
        )}
        {completo && o.frete?.endereco && (
          <p>
            <span className="text-grafite">Local do serviço:</span> {o.frete.endereco}
          </p>
        )}
        {validade && (
          <p>
            <span className="text-grafite">Válido até</span> {formatarData(validade)}
          </p>
        )}
        {!simples && vencimento && (
          <p>
            <span className="text-grafite">Pagamento até</span> {formatarData(vencimento)}
          </p>
        )}
        {!simples && o.observacoes && (
          <p className="whitespace-pre-line">
            <span className="text-grafite">Observações:</span> {o.observacoes}
          </p>
        )}
      </section>

      {o.negocio.mostrarMarca && rodapeMarca && <footer className="border-t border-pauta px-4 py-2 text-center text-xs text-grafite">Feito com Orça Fácil</footer>}
    </article>
  );
}
