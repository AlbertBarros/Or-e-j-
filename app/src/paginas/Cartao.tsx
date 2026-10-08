import { useEffect, useState } from "react";
import { Link } from "react-router";
import CabecalhoPagina from "@/componentes/CabecalhoPagina";
import Carregando from "@/componentes/Carregando";
import { IconeCompartilhar, IconeWhatsapp } from "@/componentes/Icones";
import { useAuth } from "@/hooks/useAuth";
import { useCatalogo } from "@/hooks/useDados";
import { compartilharArquivo, gerarCardPng, linkCartao, MODELOS_CARD, MODELOS_CARTAO, publicarCartao } from "@/lib/cartao";
import { buscarLogo, atualizarPerfilV2 } from "@/lib/usuario";
import { nomeProfissao } from "@/lib/profissoes";
import { linkWhatsapp } from "@shared/src/mensagens";
import PreviaCartao from "@/publico/PreviaCartao";

/** Cartão de visita virtual (3 modelos, link público) e cards em imagem (3 modelos) para compartilhar. */
export default function Cartao() {
  const { usuario, perfil } = useAuth();
  const uid = usuario?.uid;
  const { itens: catalogo, carregando } = useCatalogo(uid);
  const [logo, setLogo] = useState<string | null>(null);
  const [modelo, setModelo] = useState<1 | 2 | 3>(perfil?.modeloCartao ?? 1);
  const [previas, setPrevias] = useState<Record<number, string>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [publicado, setPublicado] = useState(false);

  useEffect(() => {
    if (uid && perfil?.temLogo) buscarLogo(uid).then(setLogo).catch(() => setLogo(null));
  }, [uid, perfil?.temLogo]);
  useEffect(() => {
    if (perfil?.modeloCartao) setModelo(perfil.modeloCartao);
  }, [perfil?.modeloCartao]);

  // Publica o cartão automaticamente ao abrir (mantém o link público sempre atual).
  useEffect(() => {
    if (!uid || !perfil || carregando || publicado) return;
    setPublicado(true);
    publicarCartao(uid, perfil, catalogo).catch(console.error);
  }, [uid, perfil, catalogo, carregando, publicado]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3000);
    return () => clearTimeout(t);
  }, [aviso]);

  // Prévias dos cards (miniaturas)
  useEffect(() => {
    if (!uid || !perfil || carregando) return;
    let cancelado = false;
    (async () => {
      for (const m of MODELOS_CARD) {
        try {
          const blob = await gerarCardPng(m.modelo, dadosCard(), logo);
          if (cancelado) return;
          const url = URL.createObjectURL(blob);
          setPrevias((p) => ({ ...p, [m.modelo]: url }));
        } catch {
          /* ignora */
        }
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, perfil?.nomeNegocio, perfil?.descricao, perfil?.instagram, logo, carregando, catalogo.length]);

  if (!perfil || !uid || carregando) return <Carregando />;
  const link = linkCartao(uid);

  function dadosCard() {
    return {
      nome: perfil!.nomeNegocio,
      responsavel: perfil!.nomeResponsavel,
      profissao: nomeProfissao(perfil!.profissao),
      descricao: perfil!.descricao ?? "",
      cidade: perfil!.cidade,
      whatsapp: perfil!.whatsapp,
      instagram: perfil!.instagram,
      servicos: catalogo.filter((i) => i.ativo).map((i) => ({ nome: i.nome, preco: i.preco, unidade: i.unidade })),
      link: linkCartao(uid!),
      mostrarMarca: perfil!.plano !== "pro",
    };
  }

  async function escolherModelo(m: 1 | 2 | 3) {
    setModelo(m);
    setOcupado("modelo");
    try {
      await atualizarPerfilV2(uid!, { modeloCartao: m });
      await publicarCartao(uid!, { ...perfil!, modeloCartao: m }, catalogo, m);
      setAviso("Modelo salvo. Seu link já mostra o novo visual.");
    } catch {
      setAviso("Não deu para salvar o modelo.");
    } finally {
      setOcupado(null);
    }
  }

  async function compartilharLink() {
    const texto = `Meu cartão de visita: ${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: perfil!.nomeNegocio, text: texto, url: link });
        return;
      } catch {
        /* cancelou */
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setAviso("Link copiado");
    } catch {
      setAviso(link);
    }
  }

  async function compartilharCard(m: 1 | 2 | 3) {
    setOcupado(`card${m}`);
    try {
      const blob = await gerarCardPng(m, dadosCard(), logo);
      const r = await compartilharArquivo(new File([blob], `card-${m}.png`, { type: "image/png" }), `Conheça meu trabalho: ${link}`);
      if (r === "baixado") setAviso("Imagem baixada. Anexe na conversa do WhatsApp.");
    } catch {
      setAviso("Não deu para gerar a imagem.");
    } finally {
      setOcupado(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 pb-32">
      <CabecalhoPagina titulo="Cartão de visita" voltarPara="/mais" />

      {aviso && (
        <p role="status" className="mt-3 rounded-xl bg-[#E6F4EA] px-3 py-2 text-center text-sm font-medium text-pago">
          {aviso}
        </p>
      )}

      <section className="mt-4" aria-labelledby="virt">
        <h2 id="virt" className="titulo-secao">Cartão virtual (página com link)</h2>
        <p className="mt-1 text-sm text-grafite">O cliente abre e vê seus serviços, cidade e um botão para chamar no WhatsApp. Escolha o modelo:</p>
        <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Modelo do cartão">
          {MODELOS_CARTAO.map((m) => (
            <button key={m.modelo} type="button" role="radio" aria-checked={modelo === m.modelo} onClick={() => escolherModelo(m.modelo)} disabled={ocupado === "modelo"} className={`opcao flex-col !items-start gap-0.5 !px-3 !py-2 !text-left ${modelo === m.modelo ? "opcao-ativa" : ""}`}>
              <span className="text-sm font-semibold">{m.nome}</span>
              <span className="text-[11px] font-normal text-grafite">{m.descricao}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 overflow-hidden rounded-2xl border border-pauta shadow-sm">
          <PreviaCartao
            cartao={{
              modelo,
              nome: perfil.nomeNegocio,
              responsavel: perfil.nomeResponsavel,
              profissao: nomeProfissao(perfil.profissao),
              descricao: perfil.descricao ?? "",
              cidade: perfil.cidade,
              whatsapp: perfil.whatsapp,
              instagram: perfil.instagram,
              site: perfil.site,
              servicos: catalogo.filter((i) => i.ativo).slice(0, 12).map((i) => ({ nome: i.nome, ...(i.preco > 0 ? { preco: i.preco, unidade: i.unidade } : {}) })),
              temLogo: perfil.temLogo,
              mostrarMarca: perfil.plano !== "pro",
            }}
            logo={logo}
            compacto
          />
        </div>
        <p className="ajuda mt-2 break-all">
          Link: <a href={link} target="_blank" rel="noopener" className="text-carbono underline">{link}</a>
        </p>
        {catalogo.length === 0 && (
          <p className="mt-2 text-sm text-atraso">
            Seu cartão fica melhor com serviços. <Link to="/catalogo" className="font-medium underline">Cadastrar agora</Link>.
          </p>
        )}
      </section>

      <section className="mt-6" aria-labelledby="cards">
        <h2 id="cards" className="titulo-secao">Cards em imagem (para mandar no WhatsApp e redes)</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {MODELOS_CARD.map((m) => (
            <div key={m.modelo} className="cartao overflow-hidden">
              <div className="aspect-square bg-fundo">
                {previas[m.modelo] ? <img src={previas[m.modelo]} alt={`Card ${m.nome}`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-grafite">Gerando…</div>}
              </div>
              <div className="p-2">
                <p className="text-xs font-semibold">{m.nome}</p>
                <button type="button" onClick={() => compartilharCard(m.modelo)} disabled={ocupado !== null} className="botao-secundario mt-1.5 !min-h-9 !px-2 text-xs">
                  <IconeCompartilhar tamanho={14} /> {ocupado === `card${m.modelo}` ? "…" : "Enviar"}
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="ajuda mt-2">As imagens usam sua logo, nome, profissão, serviços e WhatsApp. Mude os dados em Conta e em Produtos e serviços.</p>
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-pauta bg-folha p-4">
        <div className="mx-auto flex max-w-[560px] gap-2">
          <button type="button" onClick={compartilharLink} className="botao-primario">
            <IconeCompartilhar tamanho={18} /> Compartilhar link
          </button>
          <a href={linkWhatsapp("", `Meu cartão de visita: ${link}`)} target="_blank" rel="noopener" className="botao-secundario !w-auto px-4" aria-label="Enviar pelo WhatsApp">
            <IconeWhatsapp />
          </a>
        </div>
      </div>
    </main>
  );
}
