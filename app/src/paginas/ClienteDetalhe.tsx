import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import CabecalhoPagina from "@/componentes/CabecalhoPagina";
import Campo from "@/componentes/Campo";
import Carregando from "@/componentes/Carregando";
import Confirmar from "@/componentes/Confirmar";
import Selo from "@/componentes/Selo";
import { IconeSeta, IconeWhatsapp } from "@/componentes/Icones";
import { useAuth } from "@/hooks/useAuth";
import { useClientes, useTodosOrcamentos } from "@/hooks/useDados";
import { atualizarCliente, criarCliente, estatisticasDoCliente, excluirCliente } from "@/lib/clientes";
import { validarNome, validarWhatsapp } from "@/lib/validacao";
import { formatarReais, formatarWhatsapp, linkWhatsapp } from "@shared/src/mensagens";

/** Cliente: dados editáveis, histórico de orçamentos e ações. Também serve para criar (/clientes/novo). */
export default function ClienteDetalhe() {
  const { id } = useParams();
  const novo = id === "novo";
  const { usuario } = useAuth();
  const uid = usuario?.uid;
  const navegar = useNavigate();
  const { clientes, carregando } = useClientes(uid);
  const { orcamentos } = useTodosOrcamentos(uid);
  const cliente = useMemo(() => clientes.find((c) => c.id === id) ?? null, [clientes, id]);
  const stats = useMemo(() => (cliente ? estatisticasDoCliente(cliente, orcamentos) : null), [cliente, orcamentos]);

  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [documento, setDocumento] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [cep, setCep] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [preenchido, setPreenchido] = useState(false);
  const [erros, setErros] = useState<Record<string, string | null>>({});
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);
  const [editando, setEditando] = useState(novo);

  useEffect(() => {
    if (!cliente || preenchido) return;
    setPreenchido(true);
    setNome(cliente.nome);
    setWhatsapp(formatarWhatsapp(cliente.whatsapp));
    setEmail(cliente.email ?? "");
    setDocumento(cliente.documento ?? "");
    setLogradouro(cliente.endereco?.logradouro ?? "");
    setBairro(cliente.endereco?.bairro ?? "");
    setCidade(cliente.endereco?.cidade ?? "");
    setUf(cliente.endereco?.uf ?? "");
    setCep(cliente.endereco?.cep ?? "");
    setObservacoes(cliente.observacoes ?? "");
  }, [cliente, preenchido]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 2500);
    return () => clearTimeout(t);
  }, [aviso]);

  if (!novo && carregando) return <Carregando />;
  if (!novo && !cliente) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4">
        <CabecalhoPagina titulo="Cliente" voltarPara="/clientes" />
        <p className="cartao mt-6 p-6 text-center text-grafite">Cliente não encontrado.</p>
      </main>
    );
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!uid) return;
    const novos = { nome: validarNome(nome, "o nome"), whatsapp: novo ? validarWhatsapp(whatsapp) : null };
    setErros(novos);
    if (Object.values(novos).some(Boolean)) return;
    setSalvando(true);
    setErroGeral(null);
    const temEndereco = logradouro.trim() || bairro.trim() || cidade.trim() || cep.trim();
    const endereco = temEndereco ? { logradouro: logradouro.trim(), bairro: bairro.trim(), cidade: cidade.trim(), uf: uf.trim().toUpperCase(), cep: cep.trim() } : null;
    try {
      if (novo) {
        const idNovo = await criarCliente(uid, nome, whatsapp, { email, documento, endereco, observacoes });
        navegar(`/clientes/${idNovo}`, { replace: true });
        return;
      }
      await atualizarCliente(cliente!.id, { nome, email, documento, endereco, observacoes });
      setEditando(false);
      setAviso("Cliente salvo");
    } catch (err) {
      console.error(err);
      setErroGeral("Não deu para salvar. Confira a internet e tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!cliente) return;
    setSalvando(true);
    try {
      await excluirCliente(cliente.id);
      navegar("/clientes", { replace: true });
    } catch {
      setErroGeral("Não deu para excluir. Tente de novo.");
      setSalvando(false);
      setConfirmarExcluir(false);
    }
  }

  const dele = cliente ? orcamentos.filter((o) => o.cliente.whatsapp === cliente.whatsapp) : [];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 pb-32">
      <CabecalhoPagina
        titulo={novo ? "Novo cliente" : cliente!.nome}
        voltarPara="/clientes"
        acao={
          !novo && !editando ? (
            <button type="button" onClick={() => setEditando(true)} className="botao-texto">
              Editar
            </button>
          ) : undefined
        }
      />

      {aviso && (
        <p role="status" className="mt-3 rounded-xl bg-[#E6F4EA]/80 px-3 py-2 text-center text-sm font-medium text-pago backdrop-blur">
          {aviso}
        </p>
      )}
      {erroGeral && (
        <p role="alert" className="mt-3 rounded-xl bg-[#FDECEF] px-3 py-2 text-sm text-recusado">
          {erroGeral}
        </p>
      )}

      {!novo && !editando && cliente && stats && (
        <>
          <section className="cartao mt-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-grafite">WhatsApp</p>
                <p className="font-medium">{formatarWhatsapp(cliente.whatsapp)}</p>
                {cliente.email && <p className="mt-1 text-sm text-grafite">{cliente.email}</p>}
                {cliente.documento && <p className="text-sm text-grafite">CPF/CNPJ {cliente.documento}</p>}
                {cliente.endereco?.logradouro && (
                  <p className="mt-1 text-sm text-grafite">
                    {cliente.endereco.logradouro}, {cliente.endereco.bairro} · {cliente.endereco.cidade}/{cliente.endereco.uf}
                  </p>
                )}
                {cliente.observacoes && <p className="mt-2 whitespace-pre-line text-sm">{cliente.observacoes}</p>}
              </div>
              <a href={linkWhatsapp(cliente.whatsapp, "")} target="_blank" rel="noopener" className="botao-icone !bg-[#E6F4EA] !text-pago" aria-label="Abrir conversa no WhatsApp">
                <IconeWhatsapp />
              </a>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-pauta pt-3 text-center">
              <div>
                <dt className="text-xs text-grafite">Orçamentos</dt>
                <dd className="tabular text-lg font-bold">{stats.orcamentos}</dd>
              </div>
              <div>
                <dt className="text-xs text-grafite">Aprovados</dt>
                <dd className="tabular text-lg font-bold text-pago">{stats.aprovados}</dd>
              </div>
              <div>
                <dt className="text-xs text-grafite">Valor aprovado</dt>
                <dd className="tabular text-lg font-bold">{formatarReais(stats.valorAprovado)}</dd>
              </div>
            </dl>
          </section>

          <section className="mt-4" aria-labelledby="hist">
            <h2 id="hist" className="titulo-secao">Histórico</h2>
            {dele.length === 0 ? (
              <p className="cartao mt-2 p-5 text-center text-sm text-grafite">Nenhum orçamento ainda.</p>
            ) : (
              <ul className="cartao mt-2 divide-y divide-pauta overflow-hidden">
                {dele.map((o) => (
                  <li key={o.id}>
                    <Link to={`/orcamentos/${o.id}`} className="lista-item">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="tabular text-xs font-semibold text-carbono">Nº {String(o.numero).padStart(4, "0")}</span>
                          <Selo orcamento={o} />
                        </div>
                        <p className="truncate text-sm text-grafite">{o.itens.map((i) => i.descricao).join(", ")}</p>
                      </div>
                      <span className="tabular shrink-0 font-semibold">{formatarReais(o.total)}</span>
                      <IconeSeta tamanho={18} className="shrink-0 text-grafite" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {(novo || editando) && (
        <form id="form-cliente" onSubmit={salvar} noValidate className="mt-4 space-y-3">
          <section className="cartao space-y-3 p-4">
            <Campo id="nome" rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} erro={erros.nome} autoComplete="off" />
            <Campo id="whatsapp" rotulo="WhatsApp" type="tel" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} erro={erros.whatsapp} disabled={!novo} ajuda={!novo ? "O WhatsApp identifica o cliente e não pode ser alterado." : undefined} />
            <Campo id="email" rotulo="E-mail (opcional)" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Campo id="documento" rotulo="CPF ou CNPJ (opcional, entra no contrato)" inputMode="numeric" value={documento} onChange={(e) => setDocumento(e.target.value)} />
          </section>
          <section className="cartao space-y-3 p-4">
            <h2 className="titulo-secao">Endereço (opcional, entra no contrato)</h2>
            <Campo id="logradouro" rotulo="Rua e número" value={logradouro} onChange={(e) => setLogradouro(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Campo id="bairro" rotulo="Bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
              <Campo id="cep" rotulo="CEP" inputMode="numeric" value={cep} onChange={(e) => setCep(e.target.value)} />
            </div>
            <div className="grid grid-cols-[1fr_80px] gap-3">
              <Campo id="cidade" rotulo="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
              <Campo id="uf" rotulo="UF" maxLength={2} value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} />
            </div>
          </section>
          <section className="cartao p-4">
            <label htmlFor="obs" className="rotulo">
              Observações (só você vê)
            </label>
            <textarea id="obs" className="campo min-h-20 py-2" rows={2} maxLength={500} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </section>
          {!novo && (
            <button type="button" onClick={() => setConfirmarExcluir(true)} className="botao-texto w-full !text-recusado">
              Excluir cliente
            </button>
          )}
        </form>
      )}

      <div className="fixed inset-x-0 bottom-0 barra-fixa p-4">
        <div className="mx-auto max-w-[560px] space-y-2">
          {novo || editando ? (
            <div className="flex gap-2">
              {!novo && (
                <button type="button" onClick={() => setEditando(false)} className="botao-secundario !w-auto px-4" disabled={salvando}>
                  Cancelar
                </button>
              )}
              <button type="submit" form="form-cliente" className="botao-primario" disabled={salvando}>
                {salvando ? "Salvando…" : "Salvar"}
              </button>
            </div>
          ) : (
            <>
              <Link to={`/orcamentos/novo?cliente=${cliente!.id}`} className="botao-primario">
                Novo orçamento para {cliente!.nome.split(" ")[0]}
              </Link>
              <Link to={`/clientes/mensagem?ids=${cliente!.id}`} className="botao-secundario">
                <IconeWhatsapp /> Enviar mensagem ou cartão
              </Link>
            </>
          )}
        </div>
      </div>

      {confirmarExcluir && (
        <Confirmar
          titulo={`Excluir ${cliente?.nome}?`}
          texto="Os orçamentos continuam guardados; só a ficha do cliente é removida."
          textoConfirmar="Excluir cliente"
          perigo
          ocupado={salvando}
          aoConfirmar={excluir}
          aoCancelar={() => setConfirmarExcluir(false)}
        />
      )}
    </main>
  );
}
