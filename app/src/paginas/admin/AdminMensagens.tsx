import { useEffect, useMemo, useState } from "react";
import { IconeCheck, IconeEmail, IconeWhatsapp } from "@/componentes/Icones";
import { contasDoSegmento, personalizar, SEGMENTOS, type ContaAdmin, type DadosAdmin, type Segmento } from "@/lib/admin";
import { formatarWhatsapp, linkWhatsapp } from "@shared/src/mensagens";

type Canal = "whatsapp" | "email";
type Alvo = Segmento | "leads";

interface Destinatario {
  id: string;
  nome: string;
  negocio: string;
  email: string;
  whatsapp: string;
}

const LOTE_EMAIL = 30;

function chaveEnviados(alvo: Alvo, canal: Canal) {
  return `orcaja:admin:enviados:${alvo}:${canal}`;
}

function lerEnviados(alvo: Alvo, canal: Canal): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(chaveEnviados(alvo, canal)) ?? "{}");
  } catch {
    return {};
  }
}

/** Mensagens em massa para grupos de clientes: um por um no WhatsApp, ou por e-mail (individual ou em cópia oculta). */
export default function AdminMensagens({ dados }: { dados: DadosAdmin }) {
  const [alvo, setAlvo] = useState<Alvo>("cancelaram");
  const [canal, setCanal] = useState<Canal>("whatsapp");
  const [texto, setTexto] = useState(SEGMENTOS[0]!.mensagem);
  const [assunto, setAssunto] = useState("Uma mensagem do Preço Fechado");
  const [enviados, setEnviados] = useState<Record<string, number>>(() => lerEnviados("cancelaram", "whatsapp"));
  const [copiado, setCopiado] = useState(false);

  const segmentos = useMemo(
    () => [
      ...SEGMENTOS.map((s) => ({ ...s, contas: contasDoSegmento(dados.contas, s.id) as ContaAdmin[] })),
    ],
    [dados.contas],
  );

  const destinatarios: Destinatario[] = useMemo(() => {
    if (alvo === "leads") return dados.leads.map((l) => ({ id: l.id, nome: "", negocio: "", email: l.email, whatsapp: l.whatsapp }));
    return (segmentos.find((s) => s.id === alvo)?.contas ?? []).map((c) => ({ id: c.uid, nome: c.responsavel, negocio: c.negocio, email: c.email, whatsapp: c.whatsapp }));
  }, [alvo, segmentos, dados.leads]);

  useEffect(() => {
    setEnviados(lerEnviados(alvo, canal));
  }, [alvo, canal]);

  function escolher(a: Alvo) {
    setAlvo(a);
    setTexto(
      a === "leads"
        ? "Olá! Você deixou seu contato no site do Preço Fechado. O app já está no ar e toda conta nova ganha 14 dias de Pro grátis: https://orca-ja-app.pages.dev"
        : (SEGMENTOS.find((s) => s.id === a)?.mensagem ?? ""),
    );
  }

  function marcar(id: string) {
    const novo = { ...enviados, [id]: Date.now() };
    setEnviados(novo);
    try {
      localStorage.setItem(chaveEnviados(alvo, canal), JSON.stringify(novo));
    } catch {
      /* sem armazenamento: só não lembra depois */
    }
  }

  function limparMarcas() {
    setEnviados({});
    try {
      localStorage.removeItem(chaveEnviados(alvo, canal));
    } catch {
      /* ignora */
    }
  }

  const msg = (d: Destinatario) => personalizar(texto, { responsavel: d.nome, negocio: d.negocio || "seu negócio" });
  const comCanal = destinatarios.filter((d) => (canal === "whatsapp" ? d.whatsapp.replace(/\D/g, "").length >= 10 : d.email.includes("@")));
  const feitos = comCanal.filter((d) => enviados[d.id]).length;
  const emails = comCanal.map((d) => d.email);
  const lotes: string[][] = [];
  for (let i = 0; i < emails.length; i += LOTE_EMAIL) lotes.push(emails.slice(i, i + LOTE_EMAIL));
  const textoGeral = personalizar(texto, { responsavel: "", negocio: "seu negócio" });

  async function copiarEmails() {
    try {
      await navigator.clipboard.writeText(emails.join(", "));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      /* ignora */
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      {/* 1. Para quem */}
      <section aria-labelledby="m-quem" className="space-y-2">
        <h2 id="m-quem" className="text-lg font-bold">
          1. Para quem
        </h2>
        <div className="space-y-2" role="radiogroup" aria-label="Grupo de clientes">
          {segmentos.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={alvo === s.id} onClick={() => escolher(s.id)} className={`cartao flex w-full items-center gap-3 p-3 text-left ${alvo === s.id ? "!border-carbono ring-2 ring-carbono/20" : "hover:border-carbono"}`}>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{s.rotulo}</span>
                <span className="block text-xs text-grafite">{s.descricao}</span>
              </span>
              <span className="tabular rounded-full bg-carbono-claro px-2.5 py-0.5 text-sm font-bold text-carbono">{s.contas.length}</span>
            </button>
          ))}
          <button type="button" role="radio" aria-checked={alvo === "leads"} onClick={() => escolher("leads")} className={`cartao flex w-full items-center gap-3 p-3 text-left ${alvo === "leads" ? "!border-carbono ring-2 ring-carbono/20" : "hover:border-carbono"}`}>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Lista de espera do site</span>
              <span className="block text-xs text-grafite">Deixaram o contato no site, sem conta no app.</span>
            </span>
            <span className="tabular rounded-full bg-carbono-claro px-2.5 py-0.5 text-sm font-bold text-carbono">{dados.leads.length}</span>
          </button>
        </div>
      </section>

      <div className="space-y-5">
        {/* 2. Canal e mensagem */}
        <section aria-labelledby="m-msg" className="cartao space-y-3 p-4">
          <h2 id="m-msg" className="text-lg font-bold">
            2. Mensagem
          </h2>
          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-carbono-claro/60 p-1" role="radiogroup" aria-label="Canal">
            {(["whatsapp", "email"] as Canal[]).map((c) => (
              <button key={c} type="button" role="radio" aria-checked={canal === c} onClick={() => setCanal(c)} className={`flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold ${canal === c ? "bg-white text-carbono shadow-sm" : "text-grafite"}`}>
                {c === "whatsapp" ? <IconeWhatsapp /> : <IconeEmail tamanho={18} />}
                {c === "whatsapp" ? "WhatsApp" : "E-mail"}
              </button>
            ))}
          </div>
          {canal === "email" && (
            <div>
              <label htmlFor="m-assunto" className="rotulo">
                Assunto
              </label>
              <input id="m-assunto" value={assunto} onChange={(e) => setAssunto(e.target.value)} className="campo" />
            </div>
          )}
          <div>
            <label htmlFor="m-texto" className="rotulo">
              Texto
            </label>
            <textarea id="m-texto" value={texto} onChange={(e) => setTexto(e.target.value)} rows={5} className="campo min-h-32 py-2" />
            <p className="ajuda">
              Use <code>{"{nome}"}</code> para o primeiro nome e <code>{"{negocio}"}</code> para o nome do negócio. Eles são trocados em cada mensagem.
            </p>
          </div>
          {destinatarios[0] && (
            <div className="rounded-xl bg-white/70 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-grafite">Prévia</p>
              <p className="mt-1 whitespace-pre-line [overflow-wrap:anywhere]">{msg(destinatarios[0])}</p>
            </div>
          )}
        </section>

        {/* 3. Enviar */}
        <section aria-labelledby="m-enviar" className="cartao p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="m-enviar" className="text-lg font-bold">
              3. Enviar
            </h2>
            <span className="text-sm text-grafite">
              {feitos} de {comCanal.length} enviados
              {Object.keys(enviados).length > 0 && (
                <button type="button" onClick={limparMarcas} className="ml-2 font-semibold text-carbono underline">
                  zerar
                </button>
              )}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-pauta" aria-hidden="true">
            <div className="h-full rounded-full bg-gradient-to-r from-[#1E40AF] to-[#10B981] transition-[width]" style={{ width: `${comCanal.length ? (feitos / comCanal.length) * 100 : 0}%` }} />
          </div>
          {destinatarios.length > comCanal.length && (
            <p className="ajuda mt-2">
              {destinatarios.length - comCanal.length} {destinatarios.length - comCanal.length === 1 ? "pessoa não tem" : "pessoas não têm"} {canal === "whatsapp" ? "WhatsApp" : "e-mail"} cadastrado.
            </p>
          )}

          {canal === "email" && lotes.length > 0 && (
            <div className="mt-3 rounded-xl bg-carbono-claro/50 p-3 text-sm">
              <p className="font-semibold">Para todos de uma vez (cópia oculta, sem personalizar o nome)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {lotes.map((l, i) => (
                  <a
                    key={i}
                    href={`mailto:?bcc=${encodeURIComponent(l.join(","))}&subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(textoGeral)}`}
                    className="botao-secundario !min-h-10 !w-auto px-3 text-sm"
                  >
                    Abrir e-mail {lotes.length > 1 ? `(${i * LOTE_EMAIL + 1}–${i * LOTE_EMAIL + l.length})` : `(${l.length})`}
                  </a>
                ))}
                <button type="button" onClick={copiarEmails} className="botao-secundario !min-h-10 !w-auto px-3 text-sm">
                  {copiado ? "Copiados ✓" : "Copiar e-mails"}
                </button>
              </div>
            </div>
          )}

          {comCanal.length === 0 ? (
            <p className="mt-4 text-sm text-grafite">Ninguém neste grupo com {canal === "whatsapp" ? "WhatsApp" : "e-mail"}.</p>
          ) : (
            <ul className="mt-3 divide-y divide-pauta">
              {comCanal.map((d) => {
                const feito = Boolean(enviados[d.id]);
                const href =
                  canal === "whatsapp"
                    ? linkWhatsapp(d.whatsapp, msg(d))
                    : `mailto:${d.email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(msg(d))}`;
                return (
                  <li key={d.id} className="flex items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{d.negocio || d.email || formatarWhatsapp(d.whatsapp)}</span>
                      <span className="block truncate text-xs text-grafite">
                        {d.nome ? `${d.nome} · ` : ""}
                        {canal === "whatsapp" ? formatarWhatsapp(d.whatsapp) : d.email}
                      </span>
                    </span>
                    <a href={href} target="_blank" rel="noopener" onClick={() => marcar(d.id)} className={`${feito ? "botao-secundario" : "botao-primario"} !min-h-10 !w-auto shrink-0 px-4 text-sm`}>
                      {feito ? (
                        <>
                          <IconeCheck tamanho={16} /> Enviado
                        </>
                      ) : canal === "whatsapp" ? (
                        "Enviar"
                      ) : (
                        "E-mail"
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="ajuda mt-3">O WhatsApp abre com a mensagem pronta; é só tocar em enviar. As marcas de "Enviado" ficam salvas neste aparelho.</p>
        </section>
      </div>
    </div>
  );
}
