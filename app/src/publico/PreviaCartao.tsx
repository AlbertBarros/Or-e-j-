import type { CartaoVirtual } from "@/tipos";
import { formatarReais, formatarWhatsapp, linkWhatsapp } from "@shared/src/mensagens";

interface Props {
  cartao: Omit<CartaoVirtual, "atualizadoEm">;
  logo: string | null;
  compacto?: boolean;
}

const SITE = "https://orca-ja-6cz.pages.dev";

/** Cartão de visita virtual: 3 modelos. Usado na página pública /v/:uid e na prévia dentro do app. */
export default function PreviaCartao({ cartao: c, logo, compacto = false }: Props) {
  const m = c.modelo;
  const fundo = m === 1 ? "bg-[#F6F7F9] text-tinta" : m === 2 ? "bg-gradient-to-br from-[#0B1437] to-[#1E3A8A] text-white" : "bg-gradient-to-br from-[#1E3A8A] to-[#15803D] text-white";
  const suave = m === 1 ? "text-grafite" : "text-white/75";
  const destaque = m === 2 ? "text-[#F5C451]" : m === 1 ? "text-carbono" : "text-white";
  const caixa = m === 1 ? "bg-folha border border-pauta" : "bg-white/10 border border-white/15";
  const botao = m === 1 ? "bg-carbono text-white hover:bg-[#172f70]" : "bg-white text-carbono hover:bg-carbono-claro";
  const pedir = linkWhatsapp(c.whatsapp, `Olá! Vi seu cartão de visita e gostaria de um orçamento.`);

  return (
    <div className={`${fundo} ${compacto ? "p-5" : "min-h-dvh px-5 pb-10 pt-8"}`}>
      <div className="mx-auto max-w-md">
        <div className="flex flex-col items-center text-center">
          <div className={`flex items-center justify-center overflow-hidden rounded-3xl bg-white shadow-lg ${compacto ? "h-20 w-20" : "h-28 w-28"}`}>
            {logo && c.temLogo ? <img src={logo} alt="" className="h-full w-full object-contain p-2" /> : <span className={`font-bold text-carbono ${compacto ? "text-3xl" : "text-5xl"}`}>{c.nome.trim().charAt(0).toUpperCase()}</span>}
          </div>
          <h1 className={`mt-4 font-bold tracking-tight ${compacto ? "text-xl" : "text-3xl"}`}>{c.nome}</h1>
          <p className={`mt-1 font-semibold ${destaque}`}>
            {c.profissao}
            {c.cidade ? ` · ${c.cidade}` : ""}
          </p>
          {c.descricao && <p className={`mt-2 max-w-sm ${suave} ${compacto ? "text-sm" : ""}`}>{c.descricao}</p>}
          <p className={`mt-1 text-sm ${suave}`}>com {c.responsavel}</p>
        </div>

        <a href={pedir} target="_blank" rel="noopener" className={`mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold ${botao}`}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1.1 2.7.1.2 1.9 2.9 4.6 4 1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
          </svg>
          Pedir orçamento no WhatsApp
        </a>
        <p className={`mt-2 text-center text-sm ${suave}`}>{formatarWhatsapp(c.whatsapp)}</p>

        {c.servicos.length > 0 && (
          <section className={`mt-5 rounded-2xl p-4 ${caixa}`} aria-labelledby="srv">
            <h2 id="srv" className={`text-xs font-semibold uppercase tracking-wider ${destaque}`}>
              Serviços
            </h2>
            <ul className={`mt-2 divide-y ${m === 1 ? "divide-pauta" : "divide-white/10"}`}>
              {(compacto ? c.servicos.slice(0, 4) : c.servicos).map((s) => (
                <li key={s.nome} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                  <span>{s.nome}</span>
                  {s.preco ? (
                    <span className={`tabular shrink-0 font-semibold ${destaque}`}>
                      {formatarReais(s.preco)}
                      {s.unidade ? <span className={`font-normal ${suave}`}>/{s.unidade}</span> : null}
                    </span>
                  ) : (
                    <span className={`shrink-0 text-xs ${suave}`}>a combinar</span>
                  )}
                </li>
              ))}
              {compacto && c.servicos.length > 4 && <li className={`py-2 text-xs ${suave}`}>+ {c.servicos.length - 4} serviços</li>}
            </ul>
          </section>
        )}

        {(c.instagram || c.site) && (
          <div className={`mt-4 flex flex-wrap justify-center gap-3 text-sm ${suave}`}>
            {c.instagram && (
              <a href={`https://instagram.com/${c.instagram}`} target="_blank" rel="noopener" className="underline">
                @{c.instagram}
              </a>
            )}
            {c.site && (
              <a href={c.site.startsWith("http") ? c.site : `https://${c.site}`} target="_blank" rel="noopener" className="underline">
                {c.site.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        )}

        {c.mostrarMarca && (
          <p className={`mt-6 text-center text-xs ${suave}`}>
            Cartão feito com{" "}
            <a href={SITE} className="underline">
              Preço Fechado
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
