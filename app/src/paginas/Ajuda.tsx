import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import CabecalhoPagina from "@/componentes/CabecalhoPagina";
import Busca from "@/componentes/Busca";
import GuiaInstalar from "@/componentes/GuiaInstalar";
import AtivarAvisos from "@/componentes/AtivarAvisos";
import FaleConosco from "@/componentes/FaleConosco";
import FormDepoimento from "@/componentes/FormDepoimento";
import { IconeAjuda, IconeCelular, IconeEstrela, IconePlay, IconeSeta, IconeSino, IconeWhatsapp } from "@/componentes/Icones";
import { useAuth } from "@/hooks/useAuth";
import { useTour } from "@/tour/Tour";
import { GUIA } from "@/lib/guia";
import { URL_SITE } from "@/lib/planos";
import { combina } from "@/lib/texto";

/** Ajuda: tour guiado, instalar o app, avisos no celular, guia completo, suporte e depoimento. */
export default function Ajuda() {
  const { usuario, perfil } = useAuth();
  const { iniciar } = useTour();
  const local = useLocation();
  const [busca, setBusca] = useState("");

  // Abre direto numa seção (ex.: /ajuda#avisos)
  useEffect(() => {
    if (!local.hash) return;
    const t = window.setTimeout(() => document.getElementById(local.hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    return () => window.clearTimeout(t);
  }, [local.hash]);

  const topicos = useMemo(() => {
    if (!busca.trim()) return GUIA;
    return GUIA.filter((t) => combina(busca, t.titulo, t.resumo, ...t.passos));
  }, [busca]);

  if (!perfil || !usuario) return null;

  return (
    <main className="mx-auto w-full max-w-[560px] px-4 pb-16">
      <CabecalhoPagina titulo="Ajuda" voltarPara="/" />

      {/* Tour */}
      <section className="cartao-destaque surgir mt-5 overflow-hidden p-5" aria-labelledby="ajuda-tour">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <IconePlay tamanho={24} />
          </span>
          <div>
            <h2 id="ajuda-tour" className="text-lg font-bold">
              Tour guiado pelo app
            </h2>
            <p className="mt-0.5 text-sm text-white/80">Em 2 minutos, passo a passo nas telas de verdade: orçamento, envio, aprovação, contrato e recibo.</p>
          </div>
        </div>
        <button type="button" onClick={iniciar} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white font-semibold text-carbono hover:bg-carbono-claro">
          <IconePlay tamanho={20} /> Começar o tour
        </button>
      </section>

      {/* Atalhos da página */}
      <nav aria-label="Seções da ajuda" className="mt-4 grid grid-cols-4 gap-2 text-center text-[11px] font-semibold">
        {[
          { id: "instalar", rotulo: "Instalar", Icone: IconeCelular },
          { id: "avisos", rotulo: "Avisos", Icone: IconeSino },
          { id: "guia", rotulo: "Guia", Icone: IconeAjuda },
          { id: "suporte", rotulo: "Suporte", Icone: IconeWhatsapp },
        ].map(({ id, rotulo, Icone }) => (
          <a key={id} href={`#${id}`} className="cartao flex flex-col items-center gap-1 p-2.5 text-carbono hover:border-carbono">
            <Icone tamanho={20} />
            {rotulo}
          </a>
        ))}
      </nav>

      {/* Instalar */}
      <section id="instalar" className="cartao mt-4 scroll-mt-20 p-4" aria-labelledby="t-instalar">
        <h2 id="t-instalar" className="text-lg font-semibold">
          Instalar o app
        </h2>
        <p className="mt-0.5 text-sm text-grafite">Fica com ícone na tela inicial e abre sem navegador. Grátis, sem loja de aplicativos.</p>
        <div className="mt-4">
          <GuiaInstalar />
        </div>
      </section>

      {/* Avisos */}
      <section id="avisos" className="cartao mt-4 scroll-mt-20 p-4" aria-labelledby="t-avisos">
        <h2 id="t-avisos" className="text-lg font-semibold">
          Avisos no celular
        </h2>
        <p className="mt-0.5 text-sm text-grafite">Saiba na hora, mesmo com o app fechado. Ligue em cada aparelho que você usa.</p>
        <div className="mt-4">
          <AtivarAvisos uid={usuario.uid} />
        </div>
      </section>

      {/* Guia completo */}
      <section id="guia" className="mt-6 scroll-mt-20" aria-labelledby="t-guia">
        <h2 id="t-guia" className="text-lg font-semibold">
          Guia completo
        </h2>
        <p className="mt-0.5 text-sm text-grafite">Tudo o que o app faz, em passos curtos.</p>
        <div className="mt-3">
          <Busca valor={busca} aoMudar={setBusca} placeholder="Buscar: pix, recibo, contrato, frete…" rotulo="Buscar no guia" />
        </div>
        <div className="mt-3 space-y-2">
          {topicos.length === 0 && <p className="cartao p-4 text-sm text-grafite">Nada encontrado. Escreva para o suporte aqui embaixo.</p>}
          {topicos.map((t) => (
            <details key={t.id} className="cartao guia-topico group overflow-hidden" open={Boolean(busca.trim()) && topicos.length <= 2}>
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{t.titulo}</span>
                  <span className="block text-sm text-grafite">{t.resumo}</span>
                </span>
                <IconeSeta tamanho={18} className="shrink-0 text-grafite transition-transform group-open:rotate-90" />
              </summary>
              <div className="border-t border-pauta px-4 pb-4 pt-3">
                <ol className="space-y-2.5">
                  {t.passos.map((passo, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-carbono-claro text-xs font-bold text-carbono">{i + 1}</span>
                      <span className="pt-0.5">{passo}</span>
                    </li>
                  ))}
                </ol>
                {t.ir && (
                  <Link to={t.ir.para} className="botao-secundario mt-3 !min-h-10 text-sm">
                    {t.ir.rotulo}
                  </Link>
                )}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Suporte */}
      <section id="suporte" className="cartao mt-6 scroll-mt-20 p-4" aria-labelledby="t-suporte">
        <h2 id="t-suporte" className="text-lg font-semibold">
          Fale com o suporte
        </h2>
        <p className="mt-0.5 text-sm text-grafite">Dúvida, problema ou sugestão: gente de verdade responde.</p>
        <div className="mt-4">
          <FaleConosco uid={usuario.uid} perfil={perfil} emailLogin={usuario.email} />
        </div>
      </section>

      {/* Depoimento */}
      <section id="depoimento" className="cartao mt-4 scroll-mt-20 p-4" aria-labelledby="t-dep">
        <h2 id="t-dep" className="flex items-center gap-2 text-lg font-semibold">
          <IconeEstrela tamanho={20} cheia className="text-[#F59E0B]" /> Está gostando?
        </h2>
        <p className="mt-0.5 text-sm text-grafite">Conte em uma frase como o Preço Fechado ajuda você. Pode aparecer no nosso site.</p>
        <div className="mt-4">
          <FormDepoimento uid={usuario.uid} perfil={perfil} />
        </div>
      </section>

      <ul className="cartao mt-4 divide-y divide-pauta overflow-hidden text-sm">
        <li>
          <a href={`${URL_SITE}/como-funciona`} target="_blank" rel="noopener" className="lista-item">
            <span className="flex-1">Como funciona (site)</span>
            <IconeSeta tamanho={16} className="text-grafite" />
          </a>
        </li>
        <li>
          <a href={`${URL_SITE}/termos`} target="_blank" rel="noopener" className="lista-item">
            <span className="flex-1">Termos de uso</span>
            <IconeSeta tamanho={16} className="text-grafite" />
          </a>
        </li>
        <li>
          <a href={`${URL_SITE}/privacidade`} target="_blank" rel="noopener" className="lista-item">
            <span className="flex-1">Privacidade</span>
            <IconeSeta tamanho={16} className="text-grafite" />
          </a>
        </li>
      </ul>
    </main>
  );
}
