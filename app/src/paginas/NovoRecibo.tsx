import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import CabecalhoPagina from "@/componentes/CabecalhoPagina";
import Campo from "@/componentes/Campo";
import { IconeLixeira } from "@/componentes/Icones";
import { useAuth } from "@/hooks/useAuth";
import { useCatalogo, useClientes } from "@/hooks/useDados";
import { criarReciboAvulso } from "@/lib/orcamentos";
import { garantirCliente } from "@/lib/clientes";
import { registrarEvento } from "@/lib/eventos";
import { METODOS } from "@/lib/pagamento";
import { dataParaInput, inputParaData } from "@/lib/datas";
import { validarNome, validarWhatsapp } from "@/lib/validacao";
import { podeTestarPro } from "@/lib/usuario";
import type { MetodoPagamento } from "@/tipos";
import { formatarReais, formatarWhatsapp } from "@shared/src/mensagens";
import { paraNumero } from "@shared/src/numero";

interface Linha {
  id: number;
  descricao: string;
  valor: string;
}

/** Recibo avulso (Pro): recebeu sem ter feito orçamento? Cliente, serviço e valor, e o recibo sai na hora. */
export default function NovoRecibo() {
  const { usuario, perfil } = useAuth();
  const navegar = useNavigate();
  const { clientes } = useClientes(usuario?.uid);
  const { itens: catalogo } = useCatalogo(usuario?.uid);

  const [nome, setNome] = useState("");
  const [whats, setWhats] = useState("");
  const [linhas, setLinhas] = useState<Linha[]>([{ id: 1, descricao: "", valor: "" }]);
  const [proximo, setProximo] = useState(2);
  const [data, setData] = useState(dataParaInput(new Date()));
  const [metodo, setMetodo] = useState<MetodoPagamento>("pix");
  const [observacoes, setObservacoes] = useState("");
  const [erros, setErros] = useState<Record<string, string | null>>({});
  const [salvando, setSalvando] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const total = useMemo(() => linhas.reduce((s, l) => s + Math.max(0, paraNumero(l.valor)), 0), [linhas]);
  const sugestoes = useMemo(() => {
    const q = nome.trim().toLowerCase();
    if (q.length < 2) return [];
    return clientes.filter((c) => c.nome.toLowerCase().includes(q) && c.nome !== nome).slice(0, 4);
  }, [clientes, nome]);
  const ativos = catalogo.filter((i) => i.ativo !== false);

  if (!perfil || !usuario) return null;

  if (perfil.plano !== "pro") {
    return (
      <main className="mx-auto w-full max-w-[560px] px-4">
        <CabecalhoPagina titulo="Recibo avulso" voltarPara="/mais" />
        <div className="cartao mt-6 p-6 text-center">
          <h2 className="text-xl font-semibold">O recibo em PDF é do plano Pro</h2>
          <p className="mt-2 text-grafite">Recibo com sua logo, garantia e valor por extenso, pronto para mandar no WhatsApp, mesmo sem orçamento.</p>
          <Link to="/conta#plano" className="botao-primario mt-5">
            {podeTestarPro(perfil) ? "Testar o Pro grátis por 14 dias" : "Ver planos"}
          </Link>
        </div>
      </main>
    );
  }

  function mudarLinha(id: number, campo: "descricao" | "valor", valor: string) {
    setLinhas((ls) => ls.map((l) => (l.id === id ? { ...l, [campo]: valor } : l)));
  }

  function adicionarDoCatalogo(idItem: string) {
    const item = ativos.find((i) => i.id === idItem);
    if (!item) return;
    setLinhas((ls) => {
      const vazia = ls.find((l) => !l.descricao.trim() && !l.valor.trim());
      const nova = { id: vazia?.id ?? proximo, descricao: item.nome, valor: item.preco ? String(item.preco).replace(".", ",") : "" };
      return vazia ? ls.map((l) => (l.id === vazia.id ? nova : l)) : [...ls, nova];
    });
    setProximo((n) => n + 1);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!usuario || !perfil) return;
    const errosNovos: Record<string, string | null> = {
      nome: validarNome(nome, "o nome do cliente"),
      whats: validarWhatsapp(whats),
      itens: linhas.some((l) => l.descricao.trim() && paraNumero(l.valor) > 0) ? null : "Informe pelo menos um serviço com valor.",
      data: data ? null : "Informe a data do pagamento.",
    };
    setErros(errosNovos);
    if (Object.values(errosNovos).some(Boolean)) return;
    setSalvando(true);
    setErroGeral(null);
    try {
      const itens = linhas
        .filter((l) => l.descricao.trim() && paraNumero(l.valor) > 0)
        .map((l) => ({ descricao: l.descricao.trim(), qtd: 1, unidade: "un", valorUnit: paraNumero(l.valor) }));
      const cliente = { nome: nome.trim(), whatsapp: whats };
      const id = await criarReciboAvulso(usuario.uid, perfil, { cliente, itens, pagoEm: inputParaData(data) ?? new Date(), metodo, observacoes });
      void garantirCliente(usuario.uid, cliente.nome, cliente.whatsapp).catch(() => undefined);
      registrarEvento("recibo_avulso", { uid: usuario.uid, orcamentoId: id });
      navegar(`/orcamentos/${id}/recibo`, { replace: true });
    } catch (err) {
      console.error(err);
      setErroGeral("Não deu para salvar. Confira a internet e tente de novo.");
      setSalvando(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[560px] px-4 pb-40">
      <CabecalhoPagina titulo="Recibo avulso" voltarPara="/mais" />
      <p className="mt-4 text-sm text-grafite">Para quando você recebeu sem ter mandado orçamento. No próximo passo você escolhe a garantia e envia o PDF.</p>

      <form id="form-recibo" onSubmit={salvar} noValidate className="mt-4 space-y-4">
        <section className="documento space-y-3 p-4" aria-labelledby="r-cliente">
          <h2 id="r-cliente" className="text-sm font-semibold uppercase tracking-wide text-grafite">
            Cliente
          </h2>
          <div className="relative">
            <Campo id="r-nome" rotulo="Nome do cliente" value={nome} onChange={(e) => setNome(e.target.value)} erro={erros.nome} autoComplete="off" />
            {sugestoes.length > 0 && (
              <ul className="mt-1 overflow-hidden rounded-xl border border-pauta bg-folha text-sm shadow-lg" aria-label="Clientes salvos">
                {sugestoes.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-carbono-claro"
                      onClick={() => {
                        setNome(c.nome);
                        setWhats(formatarWhatsapp(c.whatsapp));
                      }}
                    >
                      <span className="font-medium">{c.nome}</span>
                      <span className="text-xs text-grafite">{formatarWhatsapp(c.whatsapp)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Campo id="r-whats" rotulo="WhatsApp do cliente" type="tel" inputMode="tel" value={whats} onChange={(e) => setWhats(e.target.value)} erro={erros.whats} placeholder="(61) 98888-7777" />
        </section>

        <section className="documento space-y-3 p-4" aria-labelledby="r-servicos">
          <h2 id="r-servicos" className="text-sm font-semibold uppercase tracking-wide text-grafite">
            O que foi pago
          </h2>
          {linhas.map((l, i) => (
            <div key={l.id} className="flex items-end gap-2">
              <div className="min-w-0 flex-[3]">
                <Campo id={`r-desc-${l.id}`} rotulo={i === 0 ? "Serviço ou produto" : `Item ${i + 1}`} value={l.descricao} onChange={(e) => mudarLinha(l.id, "descricao", e.target.value)} />
              </div>
              <div className="min-w-0 flex-[2]">
                <Campo id={`r-valor-${l.id}`} rotulo="Valor (R$)" inputMode="decimal" value={l.valor} onChange={(e) => mudarLinha(l.id, "valor", e.target.value)} placeholder="0,00" />
              </div>
              {linhas.length > 1 && (
                <button type="button" onClick={() => setLinhas((ls) => ls.filter((x) => x.id !== l.id))} className="botao-icone mb-0.5 shrink-0 text-recusado" aria-label={`Remover item ${i + 1}`}>
                  <IconeLixeira tamanho={18} />
                </button>
              )}
            </div>
          ))}
          {erros.itens && (
            <p role="alert" className="erro">
              {erros.itens}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setLinhas((ls) => [...ls, { id: proximo, descricao: "", valor: "" }]);
                setProximo((n) => n + 1);
              }}
              className="botao-secundario !min-h-10 text-sm"
            >
              + Adicionar item
            </button>
            {ativos.length > 0 && (
              <label className="relative">
                <span className="sr-only">Adicionar do catálogo</span>
                <select
                  value=""
                  onChange={(e) => adicionarDoCatalogo(e.target.value)}
                  className="botao-secundario !min-h-10 w-full appearance-none text-center text-sm"
                >
                  <option value="">+ Do catálogo</option>
                  {ativos.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.nome} · {formatarReais(it.preco)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </section>

        <section className="documento space-y-3 p-4" aria-labelledby="r-pag">
          <h2 id="r-pag" className="text-sm font-semibold uppercase tracking-wide text-grafite">
            Pagamento
          </h2>
          <Campo id="r-data" rotulo="Data do pagamento" type="date" value={data} onChange={(e) => setData(e.target.value)} erro={erros.data} />
          <fieldset>
            <legend className="rotulo">Forma de pagamento</legend>
            <div className="grid grid-cols-3 gap-2">
              {METODOS.map((m) => (
                <button key={m.valor} type="button" aria-pressed={metodo === m.valor} onClick={() => setMetodo(m.valor)} className={`opcao !min-h-10 text-sm ${metodo === m.valor ? "opcao-ativa" : ""}`}>
                  {m.rotulo}
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="r-obs" className="rotulo">
              Observação (opcional)
            </label>
            <textarea id="r-obs" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} className="campo min-h-16 py-2" placeholder="Ex.: pagamento da segunda parcela" />
          </div>
        </section>
        {erroGeral && (
          <p role="alert" className="erro">
            {erroGeral}
          </p>
        )}
      </form>

      <div className="fixed inset-x-0 bottom-0 barra-fixa p-4">
        <div className="mx-auto max-w-[560px]">
          <div className="flex items-baseline justify-between" aria-live="polite">
            <span className="font-medium">Valor recebido</span>
            <span className="tabular text-3xl font-bold">{formatarReais(total)}</span>
          </div>
          <button type="submit" form="form-recibo" className="botao-primario mt-3" disabled={salvando}>
            {salvando ? "Salvando…" : "Continuar para o recibo"}
          </button>
        </div>
      </div>
    </main>
  );
}
