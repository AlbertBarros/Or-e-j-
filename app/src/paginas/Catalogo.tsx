import { useMemo, useState, type FormEvent } from "react";
import CabecalhoPagina from "@/componentes/CabecalhoPagina";
import Campo from "@/componentes/Campo";
import Busca from "@/componentes/Busca";
import Confirmar from "@/componentes/Confirmar";
import { IconeEditar, IconeLixeira, IconeMais1 } from "@/componentes/Icones";
import { useAuth } from "@/hooks/useAuth";
import { useCatalogo } from "@/hooks/useDados";
import { atualizarItemCatalogo, criarItemCatalogo, criarItensEmLote, excluirItemCatalogo, sugestoesDaProfissao, type DadosItemCatalogo } from "@/lib/catalogo";
import { combina } from "@/lib/texto";
import type { ItemCatalogo } from "@/tipos";
import { formatarReais } from "@shared/src/mensagens";
import { paraNumero, paraTexto } from "@shared/src/numero";

const UNIDADES = ["un", "h", "m²", "m", "ponto", "diária", "visita", "kg", "pacote"];

/** Produtos e serviços: lista, busca, adicionar, editar, ativar/desativar e importar sugestões. */
export default function Catalogo() {
  const { usuario, perfil } = useAuth();
  const uid = usuario?.uid;
  const { itens, carregando, erro } = useCatalogo(uid);
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<ItemCatalogo | "novo" | null>(null);
  const [excluindo, setExcluindo] = useState<ItemCatalogo | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const [tipo, setTipo] = useState<"servico" | "produto">("servico");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [unidade, setUnidade] = useState("un");
  const [preco, setPreco] = useState("");
  const [erroForm, setErroForm] = useState<string | null>(null);

  const lista = useMemo(() => itens.filter((i) => combina(busca, i.nome, i.descricao)), [itens, busca]);
  const sugestoes = useMemo(() => {
    if (!perfil) return [];
    const nomes = new Set(itens.map((i) => i.nome.toLowerCase()));
    return sugestoesDaProfissao(perfil.profissao).filter((s) => !nomes.has(s.nome.toLowerCase()));
  }, [perfil, itens]);

  function abrirNovo() {
    setTipo("servico");
    setNome("");
    setDescricao("");
    setUnidade("un");
    setPreco("");
    setErroForm(null);
    setEditando("novo");
  }
  function abrirEdicao(i: ItemCatalogo) {
    setTipo(i.tipo);
    setNome(i.nome);
    setDescricao(i.descricao);
    setUnidade(i.unidade);
    setPreco(i.preco ? paraTexto(i.preco) : "");
    setErroForm(null);
    setEditando(i);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!uid) return;
    if (nome.trim().length < 2) {
      setErroForm("Dê um nome ao item.");
      return;
    }
    const dados: DadosItemCatalogo = { tipo, nome, descricao, unidade, preco: paraNumero(preco) };
    setOcupado(true);
    try {
      if (editando === "novo") await criarItemCatalogo(uid, dados);
      else if (editando) await atualizarItemCatalogo(uid, editando.id, dados);
      setEditando(null);
      setAviso("Salvo");
      setTimeout(() => setAviso(null), 2000);
    } catch (err) {
      console.error(err);
      setErroForm("Não deu para salvar. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  async function importarSugestoes() {
    if (!uid) return;
    setOcupado(true);
    try {
      await criarItensEmLote(uid, sugestoes);
      setAviso(`${sugestoes.length} itens adicionados. Ajuste os preços se quiser.`);
      setTimeout(() => setAviso(null), 3500);
    } catch {
      setAviso("Não deu para importar.");
    } finally {
      setOcupado(false);
    }
  }

  async function excluir() {
    if (!uid || !excluindo) return;
    setOcupado(true);
    try {
      await excluirItemCatalogo(uid, excluindo.id);
    } finally {
      setOcupado(false);
      setExcluindo(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 pb-28">
      <CabecalhoPagina
        titulo="Produtos e serviços"
        voltarPara="/mais"
        acao={
          <button type="button" onClick={abrirNovo} className="botao-primario !w-auto !min-h-10 px-3 text-sm">
            <IconeMais1 tamanho={18} /> Novo
          </button>
        }
      />

      {aviso && (
        <p role="status" className="mt-3 rounded-xl bg-[#E6F4EA] px-3 py-2 text-center text-sm font-medium text-pago">
          {aviso}
        </p>
      )}
      {erro && (
        <p role="alert" className="mt-3 rounded-xl bg-[#FDECEF] px-3 py-2 text-sm text-recusado">
          {erro}
        </p>
      )}

      <p className="mt-3 text-sm text-grafite">Tudo o que cadastrar aqui entra no orçamento com um toque, no recibo e no seu cartão de visita.</p>

      {itens.length > 3 && (
        <div className="mt-3">
          <Busca valor={busca} aoMudar={setBusca} placeholder="Buscar item" rotulo="Buscar no catálogo" />
        </div>
      )}

      {sugestoes.length > 0 && (
        <section className="cartao mt-3 border-dashed p-4">
          <p className="font-semibold">{itens.length === 0 ? "Comece com os itens comuns da sua profissão" : `${sugestoes.length} sugestões da sua profissão`}</p>
          <p className="mt-1 text-sm text-grafite">{sugestoes.slice(0, 4).map((s) => s.nome).join(", ")}{sugestoes.length > 4 ? "…" : ""}</p>
          <button type="button" onClick={importarSugestoes} disabled={ocupado} className="botao-secundario mt-3 !min-h-11 text-sm">
            {ocupado ? "Adicionando…" : `Adicionar ${sugestoes.length} itens sugeridos`}
          </button>
        </section>
      )}

      {!carregando && lista.length === 0 && itens.length > 0 && <p className="cartao mt-3 p-6 text-center text-sm text-grafite">Nada encontrado.</p>}

      {lista.length > 0 && (
        <ul className="cartao mt-3 divide-y divide-pauta overflow-hidden">
          {lista.map((i) => (
            <li key={i.id} className={`flex items-center gap-3 px-4 py-3 ${i.ativo ? "" : "opacity-60"}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {i.nome}
                  {!i.ativo && <span className="ml-2 text-xs font-normal text-grafite">(inativo)</span>}
                </p>
                <p className="truncate text-xs text-grafite">
                  {i.tipo === "produto" ? "Produto" : "Serviço"}
                  {i.descricao ? ` · ${i.descricao}` : ""}
                </p>
              </div>
              <span className="tabular shrink-0 text-sm font-semibold">
                {i.preco > 0 ? `${formatarReais(i.preco)}/${i.unidade}` : "a combinar"}
              </span>
              <button type="button" onClick={() => abrirEdicao(i)} className="botao-icone" aria-label={`Editar ${i.nome}`}>
                <IconeEditar tamanho={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {carregando && <p className="mt-3 text-center text-sm text-grafite">Carregando…</p>}

      {editando && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/50 sm:items-center sm:p-4" onClick={(e) => e.target === e.currentTarget && !ocupado && setEditando(null)}>
          <form onSubmit={salvar} noValidate role="dialog" aria-modal="true" aria-labelledby="ed-t" className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-folha p-5 shadow-xl sm:rounded-2xl">
            <h2 id="ed-t" className="text-xl font-semibold">
              {editando === "novo" ? "Novo item" : "Editar item"}
            </h2>
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo">
                {(["servico", "produto"] as const).map((t) => (
                  <button key={t} type="button" role="radio" aria-checked={tipo === t} onClick={() => setTipo(t)} className={`opcao !min-h-11 ${tipo === t ? "opcao-ativa" : ""}`}>
                    {t === "servico" ? "Serviço" : "Produto"}
                  </button>
                ))}
              </div>
              <Campo id="nomeItem" rotulo="Nome" placeholder="Ex.: Instalação de chuveiro" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
              <Campo id="descItem" rotulo="Descrição (opcional, aparece no cartão)" placeholder="Ex.: Inclui teste e vedação" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={120} />
              <div className="grid grid-cols-2 gap-3">
                <Campo id="precoItem" rotulo="Preço (R$)" inputMode="decimal" placeholder="0,00" value={preco} onChange={(e) => setPreco(e.target.value)} className="tabular" ajuda="Vazio = a combinar" />
                <div>
                  <label htmlFor="unItem" className="rotulo">
                    Unidade
                  </label>
                  <input id="unItem" list="unidades" className="campo" value={unidade} onChange={(e) => setUnidade(e.target.value)} />
                  <datalist id="unidades">
                    {UNIDADES.map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </div>
              </div>
              {editando !== "novo" && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editando.ativo}
                    onChange={(e) => uid && atualizarItemCatalogo(uid, editando.id, { ativo: e.target.checked }).then(() => setEditando({ ...editando, ativo: e.target.checked }))}
                  />
                  Ativo (aparece nas sugestões do orçamento e no cartão)
                </label>
              )}
              {erroForm && (
                <p role="alert" className="erro">
                  {erroForm}
                </p>
              )}
            </div>
            <div className="mt-5 grid gap-2">
              <button type="submit" className="botao-primario" disabled={ocupado}>
                {ocupado ? "Salvando…" : "Salvar"}
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditando(null)} className="botao-secundario" disabled={ocupado}>
                  Cancelar
                </button>
                {editando !== "novo" && (
                  <button
                    type="button"
                    onClick={() => {
                      setExcluindo(editando);
                      setEditando(null);
                    }}
                    className="botao-secundario !w-auto px-4 !text-recusado"
                    aria-label="Excluir item"
                  >
                    <IconeLixeira tamanho={18} />
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      {excluindo && <Confirmar titulo={`Excluir "${excluindo.nome}"?`} texto="Orçamentos antigos não mudam." textoConfirmar="Excluir" perigo ocupado={ocupado} aoConfirmar={excluir} aoCancelar={() => setExcluindo(null)} />}
    </main>
  );
}
