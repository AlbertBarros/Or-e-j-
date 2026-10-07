import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import CabecalhoPagina from "@/componentes/CabecalhoPagina";
import Campo from "@/componentes/Campo";
import Carregando from "@/componentes/Carregando";
import { useAuth } from "@/hooks/useAuth";
import { useOrcamentos } from "@/hooks/useOrcamentos";
import { atualizarOrcamento, buscarOrcamento, clientesDistintos, criarOrcamento } from "@/lib/orcamentos";
import { registrarEvento } from "@/lib/eventos";
import { lerRascunhoImportado, limparRascunhoImportado } from "@/lib/rascunhoImportado";
import { itensSugeridos, observacoesPadrao, validadeDiasPadrao } from "@/lib/profissoes";
import { validarNome, validarWhatsapp } from "@/lib/validacao";
import { dataParaInput, inputParaData, paraDate } from "@/lib/datas";
import type { Orcamento } from "@/tipos";
import { formatarReais, subtotal, total, formatarWhatsapp } from "@shared/src/mensagens";
import { paraNumero, paraTexto } from "@shared/src/numero";

interface ItemEmEdicao {
  id: number;
  descricao: string;
  qtd: string;
  unidade: string;
  valorUnit: string;
}

/** T4 — Novo orçamento / Editar (rascunhos). */
export default function NovoOrcamento() {
  const { id } = useParams();
  const editando = Boolean(id);
  const { usuario, perfil } = useAuth();
  const navegar = useNavigate();
  const { orcamentos: recentes } = useOrcamentos(usuario?.uid, "todos");

  const [carregandoExistente, setCarregandoExistente] = useState(editando);
  const [existente, setExistente] = useState<Orcamento | null>(null);

  const [clienteNome, setClienteNome] = useState("");
  const [clienteWhats, setClienteWhats] = useState("");
  const [itens, setItens] = useState<ItemEmEdicao[]>([]);
  const [proximoId, setProximoId] = useState(1);
  const [desconto, setDesconto] = useState("");
  const [validadeDias, setValidadeDias] = useState("15");
  const [vencimento, setVencimento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [mostrarSugeridos, setMostrarSugeridos] = useState(false);
  const [erros, setErros] = useState<Record<string, string | null>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const slug = perfil?.profissao ?? "outra";
  const sugeridos = itensSugeridos(slug);
  const clientes = useMemo(() => clientesDistintos(recentes), [recentes]);

  function novoItem(parcial?: Partial<ItemEmEdicao>): ItemEmEdicao {
    const item = { id: proximoId, descricao: "", qtd: "1", unidade: "un", valorUnit: "", ...parcial };
    setProximoId((n) => n + 1);
    return item;
  }

  // Preenche o formulário: novo (padrões da profissão) ou edição (dados existentes).
  useEffect(() => {
    if (!perfil) return;
    if (!editando) {
      setValidadeDias(String(validadeDiasPadrao(slug)));
      setObservacoes(observacoesPadrao(slug));
      // Veio do gerador do site? Preenche com o que a pessoa já montou lá.
      const importado = lerRascunhoImportado();
      if (importado && importado.itens && importado.itens.length > 0) {
        if (importado.cliente) setClienteNome(importado.cliente);
        setItens(
          importado.itens.map((i, k) => ({
            id: k + 1,
            descricao: String(i.descricao ?? ""),
            qtd: paraTexto(Number(i.qtd) || 1),
            unidade: String(i.unidade ?? "un"),
            valorUnit: paraTexto(Number(i.valorUnit) || 0),
          })),
        );
        setProximoId(importado.itens.length + 1);
        if (importado.desconto) setDesconto(paraTexto(importado.desconto));
        if (importado.observacoes) setObservacoes(importado.observacoes);
        limparRascunhoImportado();
        return;
      }
      setItens([{ id: 1, descricao: "", qtd: "1", unidade: "un", valorUnit: "" }]);
      setProximoId(2);
      return;
    }
    let cancelado = false;
    buscarOrcamento(id!)
      .then((o) => {
        if (cancelado) return;
        if (!o || o.ownerId !== usuario?.uid) {
          setErroGeral("Orçamento não encontrado.");
        } else if (o.status !== "rascunho") {
          navegar(`/orcamentos/${o.id}`, { replace: true });
          return;
        } else {
          setExistente(o);
          setClienteNome(o.cliente.nome);
          setClienteWhats(formatarWhatsapp(o.cliente.whatsapp));
          setItens(
            o.itens.map((i, k) => ({
              id: k + 1,
              descricao: i.descricao,
              qtd: paraTexto(i.qtd),
              unidade: i.unidade,
              valorUnit: paraTexto(i.valorUnit),
            })),
          );
          setProximoId(o.itens.length + 1);
          setDesconto(o.desconto ? paraTexto(o.desconto) : "");
          setValidadeDias(String(o.validadeDias ?? 15));
          const venc = paraDate(o.vencimentoPagamento);
          setVencimento(venc ? dataParaInput(venc) : "");
          setObservacoes(o.observacoes);
        }
        setCarregandoExistente(false);
      })
      .catch(() => {
        if (!cancelado) {
          setErroGeral("Não deu para abrir o orçamento.");
          setCarregandoExistente(false);
        }
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil, editando, id]);

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

  function atualizar(itemId: number, campo: keyof ItemEmEdicao, valor: string) {
    setItens((lista) => lista.map((i) => (i.id === itemId ? { ...i, [campo]: valor } : i)));
  }
  function remover(itemId: number) {
    setItens((lista) => (lista.length > 1 ? lista.filter((i) => i.id !== itemId) : lista));
  }
  function escolherCliente(nome: string) {
    setClienteNome(nome);
    const achado = clientes.find((c) => c.nome.toLowerCase() === nome.trim().toLowerCase());
    if (achado && !clienteWhats) setClienteWhats(formatarWhatsapp(achado.whatsapp));
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!usuario || !perfil) return;
    const itensValidos = itensNumericos.filter((i) => i.descricao && i.qtd > 0);
    const novosErros: Record<string, string | null> = {
      clienteNome: validarNome(clienteNome, "o nome do cliente"),
      clienteWhats: validarWhatsapp(clienteWhats),
      itens: itensValidos.length === 0 ? "Adicione pelo menos um item com descrição e quantidade." : null,
      validadeDias: Number(validadeDias) >= 1 && Number(validadeDias) <= 365 ? null : "Informe a validade em dias, de 1 a 365.",
      vencimento: vencimento && !inputParaData(vencimento) ? "Data de vencimento inválida." : null,
    };
    setErros(novosErros);
    if (Object.values(novosErros).some(Boolean)) {
      setErroGeral("Confira os campos destacados.");
      return;
    }
    setErroGeral(null);
    setSalvando(true);
    const dados = {
      cliente: { nome: clienteNome, whatsapp: clienteWhats },
      itens: itensValidos,
      desconto: valorDesconto,
      validadeDias: Number(validadeDias),
      vencimentoPagamento: vencimento ? inputParaData(vencimento) : null,
      observacoes,
    };
    try {
      if (existente) {
        await atualizarOrcamento(existente, dados);
        navegar(`/orcamentos/${existente.id}`, { replace: true });
      } else {
        const novoId = await criarOrcamento(usuario.uid, perfil, dados);
        registrarEvento("orcamento_criado", { uid: usuario.uid, orcamentoId: novoId });
        navegar(`/orcamentos/${novoId}`, { replace: true });
      }
    } catch (err) {
      console.error(err);
      setErroGeral("Não deu para salvar. Confira a internet e tente de novo.");
      setSalvando(false);
    }
  }

  if (!perfil || carregandoExistente) return <Carregando />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 pb-44">
      <CabecalhoPagina titulo={editando ? `Editar orçamento${existente ? ` nº ${String(existente.numero).padStart(4, "0")}` : ""}` : "Novo orçamento"} voltarPara={existente ? `/orcamentos/${existente.id}` : "/"} />

      <form id="form-orcamento" onSubmit={salvar} noValidate className="mt-4 space-y-6">
        <section className="documento p-4" aria-labelledby="sec-cliente">
          <h2 id="sec-cliente" className="text-sm font-semibold uppercase tracking-wide text-grafite">
            Cliente
          </h2>
          <div className="mt-3 space-y-3">
            <Campo
              id="clienteNome"
              rotulo="Nome do cliente"
              placeholder="Ex.: Maria Souza"
              list="lista-clientes"
              autoComplete="off"
              value={clienteNome}
              onChange={(e) => escolherCliente(e.target.value)}
              erro={erros.clienteNome}
            />
            <datalist id="lista-clientes">
              {clientes.map((c) => (
                <option key={c.nome} value={c.nome} />
              ))}
            </datalist>
            <Campo
              id="clienteWhats"
              rotulo="WhatsApp do cliente"
              placeholder="(61) 99999-8888"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              value={clienteWhats}
              onChange={(e) => setClienteWhats(e.target.value)}
              erro={erros.clienteWhats}
            />
          </div>
        </section>

        <section className="documento overflow-hidden" aria-labelledby="sec-itens">
          <h2 id="sec-itens" className="px-4 pt-4 text-sm font-semibold uppercase tracking-wide text-grafite">
            Itens
          </h2>
          <ul className="mt-2 divide-y divide-pauta border-t border-pauta">
            {itens.map((item, indice) => {
              const n = itensNumericos[indice];
              const linha = n ? n.qtd * n.valorUnit : 0;
              return (
                <li key={item.id} className="space-y-2 px-4 py-3">
                  <div>
                    <label htmlFor={`desc-${item.id}`} className="sr-only">
                      Descrição do item {indice + 1}
                    </label>
                    <input
                      id={`desc-${item.id}`}
                      className="campo"
                      placeholder="Descrição do serviço"
                      value={item.descricao}
                      onChange={(e) => atualizar(item.id, "descricao", e.target.value)}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="w-20">
                      <label htmlFor={`qtd-${item.id}`} className="rotulo">
                        Qtd
                      </label>
                      <input id={`qtd-${item.id}`} className="campo tabular" inputMode="decimal" value={item.qtd} onChange={(e) => atualizar(item.id, "qtd", e.target.value)} />
                    </div>
                    <div className="w-20">
                      <label htmlFor={`un-${item.id}`} className="rotulo">
                        Unid.
                      </label>
                      <input id={`un-${item.id}`} className="campo" placeholder="un" value={item.unidade} onChange={(e) => atualizar(item.id, "unidade", e.target.value)} />
                    </div>
                    <div className="flex-1">
                      <label htmlFor={`val-${item.id}`} className="rotulo">
                        Valor (R$)
                      </label>
                      <input id={`val-${item.id}`} className="campo tabular" inputMode="decimal" placeholder="0,00" value={item.valorUnit} onChange={(e) => atualizar(item.id, "valorUnit", e.target.value)} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => remover(item.id)} className="botao-texto !px-0 hover:!text-recusado" disabled={itens.length === 1}>
                      Remover
                    </button>
                    <span className="tabular font-semibold">{formatarReais(linha)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          {erros.itens && (
            <p className="erro px-4" role="alert">
              {erros.itens}
            </p>
          )}
          <div className="flex gap-2 px-4 py-3">
            <button type="button" onClick={() => setItens((l) => [...l, novoItem()])} className="botao-secundario !min-h-11 flex-1 text-sm">
              + Adicionar item
            </button>
            {sugeridos.length > 0 && (
              <button
                type="button"
                onClick={() => setMostrarSugeridos((v) => !v)}
                className="botao-secundario !min-h-11 flex-1 text-sm"
                aria-expanded={mostrarSugeridos}
                aria-controls="sugeridos"
              >
                + Dos sugeridos
              </button>
            )}
          </div>
          {mostrarSugeridos && (
            <ul id="sugeridos" className="mx-4 mb-4 divide-y divide-pauta rounded-[10px] border border-pauta">
              {sugeridos.map((s) => (
                <li key={s.descricao}>
                  <button
                    type="button"
                    onClick={() => {
                      setItens((l) => {
                        const semVazios = l.filter((i) => i.descricao.trim() || i.valorUnit.trim());
                        return [...semVazios, novoItem({ descricao: s.descricao, unidade: s.unidade, valorUnit: paraTexto(s.precoSugerido) })];
                      });
                      setMostrarSugeridos(false);
                    }}
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
        </section>

        <section className="documento space-y-3 p-4" aria-labelledby="sec-cond">
          <h2 id="sec-cond" className="text-sm font-semibold uppercase tracking-wide text-grafite">
            Condições
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Campo id="desconto" rotulo="Desconto (R$)" inputMode="decimal" placeholder="0,00" value={desconto} onChange={(e) => setDesconto(e.target.value)} className="tabular" />
            <Campo id="validade" rotulo="Validade (dias)" inputMode="numeric" value={validadeDias} onChange={(e) => setValidadeDias(e.target.value.replace(/\D/g, ""))} erro={erros.validadeDias} className="tabular" />
          </div>
          <Campo
            id="vencimento"
            rotulo="Vencimento do pagamento (opcional)"
            type="date"
            value={vencimento}
            onChange={(e) => setVencimento(e.target.value)}
            erro={erros.vencimento}
            ajuda="Depois de aprovado, passou dessa data o orçamento aparece como atrasado."
          />
          <div>
            <label htmlFor="obs" className="rotulo">
              Observações
            </label>
            <textarea id="obs" className="campo min-h-24 py-2" rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
        </section>

        {erroGeral && (
          <p role="alert" className="rounded-[10px] bg-[#FDECEF] px-3 py-2 text-sm text-recusado">
            {erroGeral}
          </p>
        )}
      </form>

      {/* Barra de total fixa no rodapé (DESIGN.md) */}
      <div className="fixed inset-x-0 bottom-0 border-t-2 border-double border-tinta bg-folha p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="mx-auto max-w-[560px]">
          {valorDesconto > 0 && (
            <div className="flex items-baseline justify-between text-sm text-grafite">
              <span>Subtotal</span>
              <span className="tabular">{formatarReais(valorSubtotal)}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between" aria-live="polite">
            <span className="font-medium">Total</span>
            <span className="tabular text-3xl font-bold">{formatarReais(valorTotal)}</span>
          </div>
          <button type="submit" form="form-orcamento" className="botao-primario mt-3" disabled={salvando}>
            {salvando ? "Salvando…" : editando ? "Salvar alterações" : "Salvar rascunho"}
          </button>
        </div>
      </div>
    </main>
  );
}
