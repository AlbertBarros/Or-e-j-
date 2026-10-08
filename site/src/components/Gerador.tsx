import { useMemo, useRef, useState } from "react";
import { subtotal, total, formatarReais } from "@shared/src/mensagens";
import type { Profissao } from "../lib/profissoes";
import { paraNumero, paraTexto } from "@shared/src/numero";
import { linkCadastroComRascunho } from "../lib/rascunho";

/** Item em edição: quantidade e valor ficam como texto para aceitar vírgula. */
interface ItemEmEdicao {
  id: number;
  descricao: string;
  qtd: string;
  unidade: string;
  valorUnit: string;
}

export interface DadosOrcamentoPDF {
  negocio: string;
  whatsappNegocio: string;
  cliente: string;
  itens: { descricao: string; qtd: number; unidade: string; valorUnit: number }[];
  desconto: number;
  observacoes: string;
  validadeDias: number;
  profissaoNome: string;
  slug: string;
}

interface Props {
  profissao: Pick<Profissao, "slug" | "nome" | "itens" | "observacoesPadrao" | "validadeDiasPadrao">;
}

const ITENS_INICIAIS = 3;

export default function Gerador({ profissao }: Props) {
  const [negocio, setNegocio] = useState("");
  const [whatsappNegocio, setWhatsappNegocio] = useState("");
  const [cliente, setCliente] = useState("");
  // IDs determinísticos no início (servidor e navegador geram o mesmo HTML); depois, um contador local.
  const proximoId = useRef(ITENS_INICIAIS + 1);
  const novoId = () => proximoId.current++;
  const [itens, setItens] = useState<ItemEmEdicao[]>(() =>
    profissao.itens.slice(0, ITENS_INICIAIS).map((i, k) => ({
      id: k + 1,
      descricao: i.descricao,
      qtd: "1",
      unidade: i.unidade,
      valorUnit: paraTexto(i.precoSugerido),
    })),
  );
  const [desconto, setDesconto] = useState("");
  const [observacoes, setObservacoes] = useState(profissao.observacoesPadrao);
  const [mostrarSugeridos, setMostrarSugeridos] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const itensNumericos = useMemo(
    () =>
      itens.map((i) => ({
        descricao: i.descricao.trim(),
        qtd: paraNumero(i.qtd),
        unidade: i.unidade.trim() || "un",
        valorUnit: paraNumero(i.valorUnit),
      })),
    [itens],
  );
  const valorDesconto = paraNumero(desconto);
  const valorSubtotal = subtotal(itensNumericos);
  const valorTotal = total(itensNumericos, valorDesconto);

  function atualizar(id: number, campo: keyof ItemEmEdicao, valor: string) {
    setItens((lista) => lista.map((i) => (i.id === id ? { ...i, [campo]: valor } : i)));
  }
  function remover(id: number) {
    setItens((lista) => lista.filter((i) => i.id !== id));
  }
  function adicionarVazio() {
    setItens((lista) => [...lista, { id: novoId(), descricao: "", qtd: "1", unidade: "un", valorUnit: "" }]);
  }
  function adicionarSugerido(indice: number) {
    const s = profissao.itens[indice];
    if (!s) return;
    setItens((lista) => [
      ...lista,
      { id: novoId(), descricao: s.descricao, qtd: "1", unidade: s.unidade, valorUnit: paraTexto(s.precoSugerido) },
    ]);
    setMostrarSugeridos(false);
  }

  function dadosParaPdf(): DadosOrcamentoPDF {
    return {
      negocio: negocio.trim() || "Seu negócio",
      whatsappNegocio: whatsappNegocio.trim(),
      cliente: cliente.trim() || "Cliente",
      itens: itensNumericos.filter((i) => i.descricao && i.qtd > 0),
      desconto: valorDesconto,
      observacoes: observacoes.trim(),
      validadeDias: profissao.validadeDiasPadrao,
      profissaoNome: profissao.nome,
      slug: profissao.slug,
    };
  }

  async function baixarPdf() {
    setErro(null);
    const dados = dadosParaPdf();
    if (dados.itens.length === 0) {
      setErro("Adicione pelo menos um item com descrição e quantidade antes de baixar o PDF.");
      return;
    }
    setGerandoPdf(true);
    try {
      // A biblioteca de PDF é pesada: só carrega quando a pessoa clica.
      const { gerarPdfOrcamento } = await import("../lib/pdf");
      await gerarPdfOrcamento(dados);
    } catch (e) {
      console.error(e);
      setErro("Não deu para gerar o PDF agora. Tente de novo em alguns segundos.");
    } finally {
      setGerandoPdf(false);
    }
  }

  return (
    <section aria-labelledby="gerador-titulo" className="documento overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-pauta px-4 py-4">
        <div>
          <h2 id="gerador-titulo" className="text-xl font-semibold">
            Orçamento
          </h2>
          <p className="text-sm text-grafite">Preencha abaixo. O total atualiza sozinho.</p>
        </div>
        <span className="tabular shrink-0 whitespace-nowrap text-xl font-bold text-carbono sm:text-2xl" aria-hidden="true">
          Nº 0001
        </span>
      </div>

      <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
        <div>
          <label htmlFor="g-negocio" className="rotulo">
            Seu nome ou negócio
          </label>
          <input
            id="g-negocio"
            className="campo"
            value={negocio}
            onChange={(e) => setNegocio(e.target.value)}
            placeholder={`Ex.: ${profissao.nome} João Silva`}
            autoComplete="organization"
          />
        </div>
        <div>
          <label htmlFor="g-whats" className="rotulo">
            Seu WhatsApp
          </label>
          <input
            id="g-whats"
            className="campo"
            value={whatsappNegocio}
            onChange={(e) => setWhatsappNegocio(e.target.value)}
            placeholder="(61) 99999-8888"
            inputMode="tel"
            autoComplete="tel"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="g-cliente" className="rotulo">
            Nome do cliente
          </label>
          <input
            id="g-cliente"
            className="campo"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            placeholder="Ex.: Maria Souza"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="border-t border-pauta">
        <h3 className="px-4 pt-4 text-sm font-semibold uppercase tracking-wide text-grafite">Itens</h3>
        <ul className="divide-y divide-pauta">
          {itens.map((item, indice) => {
            const n = itensNumericos[indice];
            const linha = n ? n.qtd * n.valorUnit : 0;
            return (
              <li key={item.id} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 px-4 py-3">
                <div className="col-span-2">
                  <label htmlFor={`g-desc-${item.id}`} className="sr-only">
                    Descrição do item {indice + 1}
                  </label>
                  <input
                    id={`g-desc-${item.id}`}
                    className="campo"
                    value={item.descricao}
                    onChange={(e) => atualizar(item.id, "descricao", e.target.value)}
                    placeholder="Descrição do serviço"
                  />
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="w-20">
                    <label htmlFor={`g-qtd-${item.id}`} className="rotulo">
                      Qtd
                    </label>
                    <input
                      id={`g-qtd-${item.id}`}
                      className="campo tabular"
                      value={item.qtd}
                      onChange={(e) => atualizar(item.id, "qtd", e.target.value)}
                      inputMode="decimal"
                    />
                  </div>
                  <div className="w-20">
                    <label htmlFor={`g-un-${item.id}`} className="rotulo">
                      Unid.
                    </label>
                    <input
                      id={`g-un-${item.id}`}
                      className="campo"
                      value={item.unidade}
                      onChange={(e) => atualizar(item.id, "unidade", e.target.value)}
                      placeholder="un"
                    />
                  </div>
                  <div className="w-32">
                    <label htmlFor={`g-val-${item.id}`} className="rotulo">
                      Valor (R$)
                    </label>
                    <input
                      id={`g-val-${item.id}`}
                      className="campo tabular"
                      value={item.valorUnit}
                      onChange={(e) => atualizar(item.id, "valorUnit", e.target.value)}
                      inputMode="decimal"
                      placeholder="0,00"
                    />
                  </div>
                </div>
                <div className="flex flex-col items-end justify-end gap-1">
                  <span className="tabular font-semibold">{formatarReais(linha)}</span>
                  <button
                    type="button"
                    onClick={() => remover(item.id)}
                    className="inline-flex min-h-11 items-center px-2 text-sm text-grafite hover:text-recusado"
                    aria-label={`Remover item ${indice + 1}`}
                  >
                    Remover
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap gap-2 px-4 py-3">
          <button type="button" onClick={adicionarVazio} className="botao-secundario flex-1">
            + Adicionar item
          </button>
          <button
            type="button"
            onClick={() => setMostrarSugeridos((v) => !v)}
            className="botao-secundario flex-1"
            aria-expanded={mostrarSugeridos}
            aria-controls="g-sugeridos"
          >
            + Dos sugeridos
          </button>
        </div>
        {mostrarSugeridos && (
          <ul id="g-sugeridos" className="mx-4 mb-3 divide-y divide-pauta rounded-[10px] border border-pauta">
            {profissao.itens.map((s, i) => (
              <li key={s.descricao}>
                <button
                  type="button"
                  onClick={() => adicionarSugerido(i)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-carbono-claro"
                >
                  <span>{s.descricao}</span>
                  <span className="tabular shrink-0 text-sm text-grafite">
                    {formatarReais(s.precoSugerido)}/{s.unidade}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-4 border-t border-pauta px-4 py-4 sm:grid-cols-2">
        <div>
          <label htmlFor="g-desconto" className="rotulo">
            Desconto (R$)
          </label>
          <input
            id="g-desconto"
            className="campo tabular"
            value={desconto}
            onChange={(e) => setDesconto(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="g-obs" className="rotulo">
            Observações
          </label>
          <textarea
            id="g-obs"
            className="campo min-h-24 py-2"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      {erro && (
        <p role="alert" className="mx-4 mb-3 rounded-[10px] bg-[#FDECEF] px-3 py-2 text-sm text-recusado">
          {erro}
        </p>
      )}

      {/* Barra de total: fixa no rodapé enquanto o gerador está na tela */}
      <div className="sticky bottom-0 border-t-2 border-double border-tinta bg-folha px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        {valorDesconto > 0 && (
          <div className="flex items-baseline justify-between text-sm text-grafite">
            <span>Subtotal</span>
            <span className="tabular">{formatarReais(valorSubtotal)}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between" aria-live="polite">
          <span className="text-base font-medium">Total</span>
          <span className="tabular text-3xl font-bold text-tinta">{formatarReais(valorTotal)}</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={baixarPdf} disabled={gerandoPdf} className="botao-secundario">
            {gerandoPdf ? "Gerando PDF…" : "Baixar PDF"}
          </button>
          <a
            href={linkCadastroComRascunho({
              profissao: profissao.slug,
              negocio: negocio.trim() || undefined,
              cliente: cliente.trim() || undefined,
              itens: itensNumericos.filter((i) => i.descricao && i.qtd > 0),
              desconto: valorDesconto || undefined,
              observacoes: observacoes.trim() || undefined,
            })}
            className="botao-primario"
          >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1.1 2.7.1.2 1.9 2.9 4.6 4 1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
            </svg>
            Salvar e enviar pelo WhatsApp
          </a>
        </div>
        <p className="mt-2 text-center text-xs text-grafite">PDF grátis, com a marca "Feito com Orça Fácil". Para enviar por link e receber a aprovação, crie sua conta grátis: o orçamento vai junto.</p>
      </div>

    </section>
  );
}
