import { useState } from "react";
import { IconeCheck, IconeEmail, IconeEstrela, IconeWhatsapp } from "@/componentes/Icones";
import { dataBr, marcarSuporteRespondido, publicarDepoimento, type DadosAdmin } from "@/lib/admin";
import { formatarWhatsapp, linkWhatsapp } from "@shared/src/mensagens";

/** Pedidos de suporte (formulário da Ajuda) e moderação dos depoimentos que aparecem no site. */
export default function AdminSuporte({ dados, aoMudar }: { dados: DadosAdmin; aoMudar: () => Promise<void> }) {
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [verRespondidas, setVerRespondidas] = useState(false);
  const abertas = dados.suporte.filter((s) => !s.respondidaEm);
  const lista = verRespondidas ? dados.suporte : abertas;

  async function acao(id: string, f: () => Promise<void>) {
    setOcupado(id);
    try {
      await f();
      await aoMudar();
    } catch (e) {
      console.error(e);
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section aria-labelledby="s-sup" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 id="s-sup" className="text-lg font-bold">
            Suporte <span className="text-grafite">({abertas.length} abertos)</span>
          </h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={verRespondidas} onChange={(e) => setVerRespondidas(e.target.checked)} className="h-4 w-4" />
            Ver respondidos
          </label>
        </div>
        {lista.length === 0 && <p className="cartao p-6 text-center text-sm text-grafite">Nenhum pedido {verRespondidas ? "" : "aberto"}. 🎉</p>}
        {lista.map((s) => (
          <article key={s.id} className={`cartao p-4 ${s.respondidaEm ? "opacity-70" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-full bg-carbono-claro px-2 py-0.5 text-xs font-semibold text-carbono">{s.assunto || "Mensagem"}</span>
              <span className="text-xs text-grafite">{s.criadoEm ? s.criadoEm.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : ""}</span>
            </div>
            <p className="mt-2 font-semibold">
              {s.nome} <span className="font-normal text-grafite">· {s.negocio}</span>
            </p>
            <p className="mt-1 whitespace-pre-line text-sm [overflow-wrap:anywhere]">{s.mensagem}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {s.whatsapp && (
                <a href={linkWhatsapp(s.whatsapp, `Olá, ${s.nome.split(" ")[0] || ""}! Aqui é do suporte do Preço Fechado. Sobre sua mensagem: `)} target="_blank" rel="noopener" className="botao-primario !min-h-10 !w-auto px-3 text-sm">
                  <IconeWhatsapp /> {formatarWhatsapp(s.whatsapp)}
                </a>
              )}
              {s.email && (
                <a href={`mailto:${s.email}?subject=${encodeURIComponent(`Re: ${s.assunto} · Preço Fechado`)}&body=${encodeURIComponent(`Olá, ${s.nome.split(" ")[0] || ""}!\n\nSobre sua mensagem:\n> ${s.mensagem}\n\n`)}`} className="botao-secundario !min-h-10 !w-auto px-3 text-sm">
                  <IconeEmail tamanho={18} /> E-mail
                </a>
              )}
              {!s.respondidaEm ? (
                <button type="button" disabled={ocupado === s.id} onClick={() => acao(s.id, () => marcarSuporteRespondido(s.id))} className="botao-secundario !min-h-10 !w-auto px-3 text-sm">
                  <IconeCheck tamanho={16} /> {ocupado === s.id ? "…" : "Marcar como respondido"}
                </button>
              ) : (
                <span className="self-center text-xs text-pago">Respondido em {dataBr(s.respondidaEm)}</span>
              )}
            </div>
          </article>
        ))}
      </section>

      <section aria-labelledby="s-dep" className="space-y-3">
        <h2 id="s-dep" className="text-lg font-bold">
          Depoimentos <span className="text-grafite">({dados.depoimentos.filter((d) => d.publicado).length} no site)</span>
        </h2>
        <p className="text-sm text-grafite">Os publicados aparecem na página inicial do site. Se a pessoa editar, volta para revisão.</p>
        {dados.depoimentos.length === 0 && <p className="cartao p-6 text-center text-sm text-grafite">Nenhum depoimento ainda. Eles chegam pela tela Ajuda do app.</p>}
        {dados.depoimentos.map((d) => (
          <article key={d.uid} className="cartao p-4">
            <p className="text-[#F59E0B]" aria-label={`Nota ${d.nota} de 5`}>
              {Array.from({ length: 5 }, (_, i) => (
                <IconeEstrela key={i} tamanho={16} cheia={i < d.nota} className="inline" />
              ))}
            </p>
            <blockquote className="mt-2 text-sm [overflow-wrap:anywhere]">“{d.texto}”</blockquote>
            <p className="mt-2 text-xs text-grafite">
              {d.nome} · {d.negocio}
              {d.cidade ? ` · ${d.cidade}` : ""}
            </p>
            <button
              type="button"
              disabled={ocupado === d.uid}
              onClick={() => acao(d.uid, () => publicarDepoimento(d.uid, !d.publicado))}
              className={`${d.publicado ? "botao-secundario" : "botao-primario"} mt-3 !min-h-10 !w-auto px-4 text-sm`}
            >
              {ocupado === d.uid ? "…" : d.publicado ? "Tirar do site" : "Publicar no site"}
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}
