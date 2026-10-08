import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import CabecalhoPagina from "@/componentes/CabecalhoPagina";
import Carregando from "@/componentes/Carregando";
import { IconeCheck, IconeWhatsapp } from "@/componentes/Icones";
import { useAuth } from "@/hooks/useAuth";
import { useCatalogo, useClientes } from "@/hooks/useDados";
import { compartilharArquivo, gerarCardPng, linkCartao, MODELOS_CARD } from "@/lib/cartao";
import { buscarLogo } from "@/lib/usuario";
import { nomeProfissao } from "@/lib/profissoes";
import { primeiroNome } from "@/lib/texto";
import { formatarWhatsapp, linkWhatsapp } from "@shared/src/mensagens";

const MODELOS_MSG = (negocio: string, cartao: string) => [
  { nome: "Oi rápido", texto: `Olá, {nome}! Aqui é da ${negocio}. Tudo bem? Passando para deixar meu contato salvo. Quando precisar, é só chamar!` },
  { nome: "Cartão de visita", texto: `Olá, {nome}! Aqui é da ${negocio}. Segue meu cartão de visita com os serviços que faço: ${cartao}\n\nQualquer coisa, é só chamar!` },
  { nome: "Promoção", texto: `Olá, {nome}! Aqui é da ${negocio}. Estou com agenda aberta esta semana e condições especiais para quem fechar até sexta. Quer um orçamento sem compromisso?` },
  { nome: "Retorno", texto: `Olá, {nome}! Aqui é da ${negocio}. Como está o serviço que fizemos? Se precisar de qualquer ajuste ou de um novo orçamento, estou à disposição.` },
];

/**
 * Enviar mensagem para um ou vários clientes: escreve uma vez e abre uma conversa por vez
 * (o WhatsApp não permite envio em massa por site). Pode anexar o card em imagem.
 */
export default function EnviarMensagem() {
  const { usuario, perfil } = useAuth();
  const uid = usuario?.uid;
  const [params] = useSearchParams();
  const ids = useMemo(() => (params.get("ids") ?? "").split(",").filter(Boolean), [params]);
  const { clientes, carregando } = useClientes(uid);
  const { itens: catalogo } = useCatalogo(uid);
  const destinatarios = useMemo(() => ids.map((id) => clientes.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => Boolean(c)), [ids, clientes]);

  const [texto, setTexto] = useState("");
  const [indice, setIndice] = useState(0);
  const [enviados, setEnviados] = useState<Set<string>>(new Set());
  const [card, setCard] = useState<1 | 2 | 3 | null>(null);
  const [gerando, setGerando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    if (uid && perfil?.temLogo) buscarLogo(uid).then(setLogo).catch(() => setLogo(null));
  }, [uid, perfil?.temLogo]);

  const modelos = useMemo(() => (perfil && uid ? MODELOS_MSG(perfil.nomeNegocio, linkCartao(uid)) : []), [perfil, uid]);
  useEffect(() => {
    if (!texto && modelos[0]) setTexto(modelos[0].texto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelos]);

  if (!perfil || carregando) return <Carregando />;
  const atual = destinatarios[indice];
  const tudoEnviado = destinatarios.length > 0 && enviados.size >= destinatarios.length;

  function personalizar(t: string, nome: string) {
    return t.replace(/\{nome\}/g, primeiroNome(nome));
  }

  async function compartilharCard() {
    if (!card || !uid) return;
    setGerando(true);
    try {
      const blob = await gerarCardPng(
        card,
        {
          nome: perfil!.nomeNegocio,
          responsavel: perfil!.nomeResponsavel,
          profissao: nomeProfissao(perfil!.profissao),
          descricao: perfil!.descricao ?? "",
          cidade: perfil!.cidade,
          whatsapp: perfil!.whatsapp,
          instagram: perfil!.instagram,
          servicos: catalogo.filter((i) => i.ativo).map((i) => ({ nome: i.nome, preco: i.preco, unidade: i.unidade })),
          link: linkCartao(uid),
          mostrarMarca: perfil!.plano !== "pro",
        },
        logo,
      );
      const r = await compartilharArquivo(new File([blob], "card-orca-ja.png", { type: "image/png" }), "");
      setAviso(r === "baixado" ? "Imagem baixada. Anexe na conversa do WhatsApp." : null);
    } catch (e) {
      console.error(e);
      setAviso("Não deu para gerar a imagem. Tente de novo.");
    } finally {
      setGerando(false);
    }
  }

  function abrirAtual() {
    if (!atual) return;
    window.open(linkWhatsapp(atual.whatsapp, personalizar(texto, atual.nome)), "_blank", "noopener");
    setEnviados((s) => new Set(s).add(atual.id));
    if (indice < destinatarios.length - 1) setIndice(indice + 1);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 pb-40">
      <CabecalhoPagina titulo={destinatarios.length === 1 ? `Mensagem para ${primeiroNome(destinatarios[0]!.nome)}` : `Mensagem para ${destinatarios.length} clientes`} voltarPara="/clientes" />

      {destinatarios.length === 0 ? (
        <p className="cartao mt-6 p-6 text-center text-grafite">Nenhum cliente selecionado.</p>
      ) : (
        <>
          <section className="mt-4" aria-labelledby="mod">
            <h2 id="mod" className="titulo-secao">Modelos</h2>
            <div className="-mx-4 mt-2 overflow-x-auto px-4">
              <div className="flex gap-2 pb-1">
                {modelos.map((m) => (
                  <button key={m.nome} type="button" onClick={() => setTexto(m.texto)} className={`chip shrink-0 ${texto === m.texto ? "chip-ativo" : "hover:border-carbono"}`}>
                    {m.nome}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="cartao mt-3 p-4">
            <label htmlFor="msg" className="rotulo">
              Sua mensagem <span className="font-normal">({"{nome}"} vira o primeiro nome de cada cliente)</span>
            </label>
            <textarea id="msg" className="campo min-h-36 py-2" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={1000} />
            <p className="ajuda">Prévia para {primeiroNome(atual?.nome ?? "")}: “{personalizar(texto, atual?.nome ?? "").slice(0, 90)}…”</p>
          </section>

          <section className="cartao mt-3 p-4" aria-labelledby="card">
            <h2 id="card" className="titulo-secao">Anexar card em imagem (opcional)</h2>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {MODELOS_CARD.map((m) => (
                <button key={m.modelo} type="button" onClick={() => setCard(card === m.modelo ? null : m.modelo)} aria-pressed={card === m.modelo} className={`opcao flex-col !items-start gap-0.5 !px-3 !py-2 !text-left ${card === m.modelo ? "opcao-ativa" : ""}`}>
                  <span className="text-sm font-semibold">{m.nome}</span>
                  <span className="text-[11px] font-normal text-grafite">{m.descricao}</span>
                </button>
              ))}
            </div>
            {card && (
              <button type="button" onClick={compartilharCard} disabled={gerando} className="botao-secundario mt-3 !min-h-11 text-sm">
                {gerando ? "Gerando imagem…" : "Compartilhar a imagem agora"}
              </button>
            )}
            <p className="ajuda">No celular, a imagem abre a tela de compartilhar e você escolhe a conversa. No computador, ela é baixada para anexar.</p>
            {aviso && (
              <p role="status" className="ajuda !text-carbono">
                {aviso}
              </p>
            )}
          </section>

          {destinatarios.length > 1 && (
            <section className="mt-3" aria-labelledby="fila">
              <h2 id="fila" className="titulo-secao">Fila ({enviados.size} de {destinatarios.length})</h2>
              <ul className="cartao mt-2 divide-y divide-pauta overflow-hidden">
                {destinatarios.map((c, i) => (
                  <li key={c.id} className={`flex items-center gap-3 px-4 py-2.5 ${i === indice && !tudoEnviado ? "bg-carbono-claro/50" : ""}`}>
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${enviados.has(c.id) ? "bg-pago text-white" : "bg-pauta text-grafite"}`}>
                      {enviados.has(c.id) ? <IconeCheck tamanho={14} strokeWidth={3} /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.nome}</span>
                    <span className="text-xs text-grafite">{formatarWhatsapp(c.whatsapp)}</span>
                    {enviados.has(c.id) && i !== indice && (
                      <button type="button" onClick={() => setIndice(i)} className="text-xs font-medium text-carbono">
                        Reabrir
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="fixed inset-x-0 bottom-0 barra-fixa p-4">
            <div className="mx-auto max-w-[560px] space-y-2">
              {tudoEnviado ? (
                <>
                  <p className="text-center text-sm font-medium text-pago">Todas as conversas foram abertas.</p>
                  <Link to="/clientes" className="botao-primario">
                    Voltar aos clientes
                  </Link>
                </>
              ) : (
                <button type="button" onClick={abrirAtual} className="botao-primario" disabled={!texto.trim()}>
                  <IconeWhatsapp /> {destinatarios.length > 1 ? `Abrir WhatsApp de ${primeiroNome(atual?.nome ?? "")} (${indice + 1}/${destinatarios.length})` : "Abrir no WhatsApp"}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
