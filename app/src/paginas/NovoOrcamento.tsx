import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import CabecalhoPagina from "@/componentes/CabecalhoPagina";
import Campo from "@/componentes/Campo";
import Carregando from "@/componentes/Carregando";
import { useAuth } from "@/hooks/useAuth";
import { useOrcamentos } from "@/hooks/useOrcamentos";
import { atualizarOrcamento, buscarOrcamento, clientesDistintos, criarOrcamento } from "@/lib/orcamentos";
import { registrarEvento } from "@/lib/eventos";
import { lerRascunhoImportado, limparRascunhoImportado } from "@/lib/rascunhoImportado";
import { itensSugeridos, observacoesPadrao, validadeDiasPadrao } from "@/lib/profissoes";
import { useCatalogo, useClientes } from "@/hooks/useDados";
import { enderecoEmLinha, garantirCliente } from "@/lib/clientes";
import { calcularKm, valorFrete } from "@/lib/frete";
import { METODOS } from "@/lib/pagamento";
import { atualizarPerfilV2 } from "@/lib/usuario";
import type { MetodoPagamento } from "@/tipos";
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
  const { itens: catalogo } = useCatalogo(usuario?.uid);
  const { clientes: fichas } = useClientes(usuario?.uid);
  const [params] = useSearchParams();
  const clienteParam = params.get("cliente");

  // Rascunho vindo do site: lido uma única vez (o efeito abaixo roda duas vezes no modo estrito do React)
  const importadoRef = useRef(editando ? null : lerRascunhoImportado());
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
  // Pagamento (V3)
  const [metodos, setMetodos] = useState<MetodoPagamento[]>(["pix"]);
  const [aCombinar, setACombinar] = useState(false);
  const [doisValores, setDoisValores] = useState(false);
  const [valorCartao, setValorCartao] = useState("");
  const [obsPagamento, setObsPagamento] = useState("");
  // Frete (V3)
  const [freteAtivo, setFreteAtivo] = useState(false);
  const [freteEndereco, setFreteEndereco] = useState("");
  const [freteKm, setFreteKm] = useState("");
  const [freteFixo, setFreteFixo] = useState("");
  const [fretePorKm, setFretePorKm] = useState("");
  const [calculandoFrete, setCalculandoFrete] = useState(false);
  const [erroFrete, setErroFrete] = useState<string | null>(null);
  const [mostrarSugeridos, setMostrarSugeridos] = useState(false);
  const [erros, setErros] = useState<Record<string, string | null>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const slug = perfil?.profissao ?? "outra";
  // "Dos sugeridos" usa o catálogo do profissional; sem catálogo, as sugestões da profissão.
  const doCatalogo = catalogo.filter((i) => i.ativo).map((i) => ({ descricao: i.nome, unidade: i.unidade, precoSugerido: i.preco }));
  const sugeridos = doCatalogo.length > 0 ? doCatalogo : itensSugeridos(slug);
  const rotuloSugeridos = doCatalogo.length > 0 ? "+ Do catálogo" : "+ Dos sugeridos";

  // Veio da ficha do cliente (?cliente=id): preenche nome e WhatsApp.
  useEffect(() => {
    if (!clienteParam || editando) return;
    const f = fichas.find((c) => c.id === clienteParam);
    if (f) {
      setClienteNome(f.nome);
      setClienteWhats(formatarWhatsapp(f.whatsapp));
    }
  }, [clienteParam, fichas, editando]);
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
      if (perfil.frete) {
        setFreteFixo(paraTexto(perfil.frete.fixo));
        setFretePorKm(paraTexto(perfil.frete.porKm));
      }
      // Veio do gerador do site? Preenche com o que a pessoa já montou lá.
      const importado = importadoRef.current;
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
        setObservacoes(importado.observacoes || observacoesPadrao(slug));
        return;
      }
      setObservacoes(observacoesPadrao(slug));
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
          if (o.pagamento) {
            setMetodos(o.pagamento.metodos);
            setACombinar(o.pagamento.aCombinar);
            setDoisValores(Boolean(o.pagamento.valorCartao));
            setValorCartao(o.pagamento.valorCartao ? paraTexto(o.pagamento.valorCartao) : "");
            setObsPagamento(o.pagamento.observacao ?? "");
          }
          if (o.frete) {
            setFreteAtivo(true);
            setFreteEndereco(o.frete.endereco);
            setFreteKm(paraTexto(o.frete.km));
            setFreteFixo(paraTexto(o.frete.fixo));
            setFretePorKm(paraTexto(o.frete.porKm));
          }
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
  const kmFrete = paraNumero(freteKm);
  const freteValor = freteAtivo ? valorFrete(kmFrete, paraNumero(freteFixo), paraNumero(fretePorKm)) : 0;
  const valorTotal = Math.round((total(itensNumericos, valorDesconto) + freteValor) * 100) / 100;

  function alternarMetodo(m: MetodoPagamento) {
    setMetodos((l) => (l.includes(m) ? l.filter((x) => x !== m) : [...l, m]));
  }

  async function calcularDistancia() {
    if (!perfil) return;
    setErroFrete(null);
    if (!perfil.endereco?.logradouro) {
      setErroFrete("Cadastre seu endereço em Conta → Dados do recibo para calcular a distância. Ou digite os km à mão.");
      return;
    }
    if (freteEndereco.trim().length < 8) {
      setErroFrete("Digite o endereço do cliente com rua, número, bairro e cidade.");
      return;
    }
    setCalculandoFrete(true);
    try {
      const km = await calcularKm(enderecoEmLinha(perfil.endereco), freteEndereco.trim());
      setFreteKm(paraTexto(km));
    } catch (e) {
      setErroFrete(e instanceof Error ? e.message : "Não deu para calcular. Digite os km à mão.");
    } finally {
      setCalculandoFrete(false);
    }
  }

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
      pagamento: aCombinar || metodos.length > 0 || obsPagamento.trim() ? { metodos, aCombinar, valorCartao: doisValores ? paraNumero(valorCartao) : undefined, observacao: obsPagamento } : null,
      frete: freteAtivo ? { endereco: freteEndereco.trim(), km: kmFrete, fixo: paraNumero(freteFixo), porKm: paraNumero(fretePorKm), valor: freteValor } : null,
    };
    // Guarda os valores de frete como padrão do perfil, para a próxima vez.
    if (freteAtivo && (paraNumero(freteFixo) > 0 || paraNumero(fretePorKm) > 0) && (perfil.frete?.fixo !== paraNumero(freteFixo) || perfil.frete?.porKm !== paraNumero(fretePorKm))) {
      void atualizarPerfilV2(usuario.uid, { frete: { fixo: paraNumero(freteFixo), porKm: paraNumero(fretePorKm) } });
    }
    try {
      if (existente) {
        await atualizarOrcamento(existente, dados);
        void garantirCliente(usuario.uid, clienteNome, clienteWhats);
        navegar(`/orcamentos/${existente.id}`, { replace: true });
      } else {
        const novoId = await criarOrcamento(usuario.uid, perfil, dados);
        void garantirCliente(usuario.uid, clienteNome, clienteWhats);
        registrarEvento("orcamento_criado", { uid: usuario.uid, orcamentoId: novoId, origem: importadoRef.current ? "site" : "app" });
        limparRascunhoImportado();
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
        <section className="documento p-4" aria-labelledby="sec-cliente" data-tour="orc-cliente">
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

        <section className="documento overflow-hidden" aria-labelledby="sec-itens" data-tour="orc-itens">
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
                      list="lista-catalogo"
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
                {rotuloSugeridos}
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
                        return [...semVazios, novoItem({ descricao: s.descricao, unidade: s.unidade, valorUnit: s.precoSugerido > 0 ? paraTexto(s.precoSugerido) : "" })];
                      });
                      setMostrarSugeridos(false);
                    }}
                    className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-carbono-claro"
                  >
                    <span>{s.descricao}</span>
                    <span className="tabular shrink-0 text-sm text-grafite">
                      {s.precoSugerido > 0 ? `${formatarReais(s.precoSugerido)}/${s.unidade}` : "a combinar"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <datalist id="lista-catalogo">
          {catalogo.filter((i) => i.ativo).map((i) => (
            <option key={i.id} value={i.nome} />
          ))}
        </datalist>

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

        <section className="documento space-y-3 p-4" aria-labelledby="sec-pag" data-tour="orc-pagamento">
          <div className="flex items-center justify-between">
            <h2 id="sec-pag" className="text-sm font-semibold uppercase tracking-wide text-grafite">
              Formas de pagamento
            </h2>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={aCombinar} onChange={(e) => setACombinar(e.target.checked)} className="h-4 w-4" /> A combinar
            </label>
          </div>
          {!aCombinar && (
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Métodos aceitos">
              {METODOS.map((m) => (
                <button key={m.valor} type="button" aria-pressed={metodos.includes(m.valor)} onClick={() => alternarMetodo(m.valor)} className={`opcao !min-h-11 !justify-start gap-2 px-3 ${metodos.includes(m.valor) ? "opcao-ativa" : ""}`}>
                  <span className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${metodos.includes(m.valor) ? "border-carbono bg-carbono text-white" : "border-pauta"}`} aria-hidden="true">
                    {metodos.includes(m.valor) && "✓"}
                  </span>
                  {m.rotulo}
                </button>
              ))}
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={doisValores} onChange={(e) => setDoisValores(e.target.checked)} className="h-4 w-4" /> Mostrar dois valores: à vista e no cartão
          </label>
          {doisValores && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="rotulo">À vista (calculado)</span>
                <p className="tabular campo flex items-center bg-fundo">{formatarReais(valorTotal)}</p>
              </div>
              <Campo id="valorCartao" rotulo="No cartão (R$)" inputMode="decimal" placeholder="0,00" value={valorCartao} onChange={(e) => setValorCartao(e.target.value)} className="tabular" />
            </div>
          )}
          <Campo id="obsPag" rotulo="Condição (opcional)" placeholder="Ex.: 50% na aprovação e 50% na entrega" value={obsPagamento} onChange={(e) => setObsPagamento(e.target.value)} maxLength={120} />
        </section>

        <section className="documento p-4" aria-labelledby="sec-frete" data-tour="orc-frete">
          <div className="flex items-center justify-between">
            <h2 id="sec-frete" className="text-sm font-semibold uppercase tracking-wide text-grafite">
              Frete / deslocamento
            </h2>
            <button type="button" onClick={() => setFreteAtivo((v) => !v)} aria-pressed={freteAtivo} className={`chip !min-h-9 ${freteAtivo ? "chip-ativo" : "hover:border-carbono"}`}>
              {freteAtivo ? "Remover frete" : "+ Adicionar frete"}
            </button>
          </div>
          {freteAtivo && (
            <div className="mt-3 space-y-3">
              <Campo id="freteEnd" rotulo="Endereço do cliente (local do serviço)" placeholder="Rua, número, bairro, cidade" value={freteEndereco} onChange={(e) => setFreteEndereco(e.target.value)} autoComplete="off" />
              <div className="flex items-end gap-2">
                <div className="w-28">
                  <Campo id="freteKm" rotulo="Distância (km)" inputMode="decimal" placeholder="0" value={freteKm} onChange={(e) => setFreteKm(e.target.value)} className="tabular" />
                </div>
                <button type="button" onClick={calcularDistancia} disabled={calculandoFrete} className="botao-secundario !min-h-12 flex-1 text-sm">
                  {calculandoFrete ? "Calculando…" : "Calcular distância pelo mapa"}
                </button>
              </div>
              {erroFrete && (
                <p role="alert" className="erro">
                  {erroFrete}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Campo id="freteFixo" rotulo="Valor fixo (R$)" inputMode="decimal" placeholder="0,00" value={freteFixo} onChange={(e) => setFreteFixo(e.target.value)} className="tabular" />
                <Campo id="fretePorKm" rotulo="Por km (R$)" inputMode="decimal" placeholder="0,00" value={fretePorKm} onChange={(e) => setFretePorKm(e.target.value)} className="tabular" />
              </div>
              <p className="ajuda">
                Frete = fixo + km × valor por km = <strong className="tabular text-tinta">{formatarReais(freteValor)}</strong>. Os valores fixo e por km ficam salvos como seu padrão.
              </p>
            </div>
          )}
        </section>

        {erroGeral && (
          <p role="alert" className="rounded-[10px] bg-[#FDECEF] px-3 py-2 text-sm text-recusado">
            {erroGeral}
          </p>
        )}
      </form>

      {/* Barra de total fixa no rodapé (DESIGN.md) */}
      <div className="fixed inset-x-0 bottom-0 barra-fixa border-t-2 border-double border-tinta p-4" data-tour="orc-salvar">
        <div className="mx-auto max-w-[560px]">
          {(valorDesconto > 0 || freteValor > 0) && (
            <div className="flex items-baseline justify-between text-sm text-grafite">
              <span>
                Subtotal{valorDesconto > 0 ? ` − desconto ${formatarReais(valorDesconto)}` : ""}
                {freteValor > 0 ? ` + frete ${formatarReais(freteValor)}` : ""}
              </span>
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
