import { useEffect, useRef, useState } from "react";
import Carregando from "@/componentes/Carregando";
import Logo from "@/componentes/Logo";
import Assinatura, { type AssinaturaHandle } from "./Assinatura";
import { assinarContrato, buscarContratoPublico, buscarLogoPublica } from "./firestorePublico";
import { paraDate } from "@/lib/datas";
import type { Contrato } from "@/tipos";
import { formatarData, formatarReais, linkWhatsapp } from "@shared/src/mensagens";

const SITE = "https://orca-ja-6cz.pages.dev";

/** /c/:id — o cliente lê o contrato e assina na tela (assinatura eletrônica simples). */
export default function PaginaContrato({ id }: { id: string }) {
  const [contrato, setContrato] = useState<Contrato | null | undefined>(undefined);
  const [logo, setLogo] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [temTraco, setTemTraco] = useState(false);
  const [aceite, setAceite] = useState(false);
  const [assinando, setAssinando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recemAssinado, setRecemAssinado] = useState(false);
  const handle = useRef<AssinaturaHandle | null>(null);

  useEffect(() => {
    let cancelado = false;
    buscarContratoPublico(id)
      .then(async (c) => {
        if (cancelado) return;
        setContrato(c);
        if (c) {
          document.title = `Contrato nº ${c.numero} — ${c.contratado.nome}`;
          setNome(c.contratante.nome);
          if (!c.mostrarMarca) setLogo(await buscarLogoPublica(c.ownerId).catch(() => null));
        }
      })
      .catch(() => !cancelado && setContrato(null));
    return () => {
      cancelado = true;
    };
  }, [id]);

  if (contrato === undefined) return <Carregando texto="Abrindo o contrato…" />;
  if (!contrato || contrato.status === "rascunho" || contrato.status === "cancelado") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
        <Logo tamanho={36} />
        <h1 className="mt-6 text-2xl font-semibold">{contrato ? "Este contrato não está disponível." : "Contrato não encontrado."}</h1>
        <p className="mt-2 text-grafite">{contrato ? "Peça ao profissional para enviá-lo de novo." : "O link pode estar errado ou o contrato foi removido."}</p>
      </main>
    );
  }
  const c = contrato;
  const assinado = c.status === "assinado";
  const assinadoEm = paraDate(c.assinatura?.assinadoEm);
  const falar = linkWhatsapp(c.contratado.whatsapp, `Olá! Estou vendo o contrato nº ${c.numero} e tenho uma dúvida.`);

  async function assinar() {
    setErro(null);
    if (nome.trim().length < 3) {
      setErro("Digite seu nome completo.");
      return;
    }
    const imagem = handle.current?.imagem();
    if (!imagem) {
      setErro("Desenhe sua assinatura no quadro.");
      return;
    }
    if (!aceite) {
      setErro("Marque que leu e concorda com o contrato.");
      return;
    }
    setAssinando(true);
    try {
      await assinarContrato(c.id, { nome: nome.trim(), imagem, agente: navigator.userAgent.slice(0, 160) });
      setContrato({ ...c, status: "assinado", assinatura: { nome: nome.trim(), imagem, assinadoEm: { toDate: () => new Date() } as Contrato["assinatura"] extends infer A ? (A extends { assinadoEm: infer T } ? T : never) : never, agente: navigator.userAgent.slice(0, 160) } });
      setRecemAssinado(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      console.error(e);
      setErro("Não deu para registrar a assinatura. Confira a internet e tente de novo, ou fale com o profissional.");
    } finally {
      setAssinando(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[720px] flex-col px-4 pb-12 pt-4">
      <p className="mb-3 text-center text-sm text-grafite">{c.contratado.nome} enviou um contrato para você</p>

      {assinado && (
        <section className={`documento mb-4 flex items-center gap-4 border-pago p-4 ${recemAssinado ? "surgir" : ""}`} aria-live="polite">
          <div className="carimbo rounded-md border-4 border-pago px-3 py-1 text-xl font-bold uppercase tracking-widest text-pago">Assinado</div>
          <div className="text-sm">
            <p className="font-semibold">Contrato assinado por {c.assinatura?.nome}</p>
            <p className="text-grafite">{assinadoEm ? `${formatarData(assinadoEm)} às ${assinadoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "agora"}</p>
          </div>
        </section>
      )}

      <article className="documento p-5 sm:p-8">
        <header className="flex items-start justify-between gap-3 border-b border-pauta pb-4">
          <div className="flex items-center gap-3">
            {logo && <img src={logo} alt="" className="h-12 w-12 rounded-xl object-contain" />}
            <div>
              <p className="font-semibold">{c.contratado.nome}</p>
              <p className="text-xs text-grafite">{c.contratado.cidade}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-grafite">Contrato</p>
            <p className="tabular text-xl font-bold text-carbono">Nº {String(c.numero).padStart(4, "0")}</p>
            <p className="tabular text-sm text-grafite">{formatarReais(c.valor)}</p>
          </div>
        </header>
        <pre className="mt-4 whitespace-pre-wrap font-sans text-[15px] leading-relaxed">{c.texto}</pre>
        {assinado && c.assinatura && (
          <footer className="mt-8 grid gap-6 border-t border-pauta pt-6 sm:grid-cols-2">
            <div className="text-center">
              <img src={c.assinatura.imagem} alt={`Assinatura de ${c.assinatura.nome}`} className="mx-auto h-20 object-contain" />
              <p className="mt-1 border-t border-tinta pt-2 text-sm font-semibold">{c.assinatura.nome}</p>
              <p className="text-xs text-grafite">CONTRATANTE · assinatura eletrônica</p>
            </div>
            <div className="text-center">
              <p className="h-20" />
              <p className="mt-1 border-t border-tinta pt-2 text-sm font-semibold">{c.contratado.responsavel}</p>
              <p className="text-xs text-grafite">CONTRATADO · {c.contratado.nome}</p>
            </div>
          </footer>
        )}
      </article>

      {!assinado && (
        <section className="documento mt-4 p-5" aria-labelledby="ass">
          <h2 id="ass" className="text-xl font-semibold">
            Assinar o contrato
          </h2>
          <p className="mt-1 text-sm text-grafite">Leia o contrato acima. Para assinar, confirme seu nome, desenhe sua assinatura e toque em Assinar.</p>
          <div className="mt-4">
            <label htmlFor="nome" className="rotulo">
              Seu nome completo
            </label>
            <input id="nome" className="campo" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className="rotulo !mb-0">Sua assinatura</span>
              <button type="button" onClick={() => handle.current?.limpar()} className="text-sm font-medium text-carbono">
                Limpar
              </button>
            </div>
            <div className="mt-1">
              <Assinatura aoMudar={setTemTraco} handle={handle} />
            </div>
          </div>
          <label className="mt-4 flex items-start gap-3 text-sm">
            <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} className="mt-1 h-5 w-5" />
            <span>Li e concordo com todas as cláusulas deste contrato. Entendo que esta assinatura eletrônica tem validade legal e registra data, hora e aparelho.</span>
          </label>
          {erro && (
            <p role="alert" className="mt-3 rounded-xl bg-[#FDECEF] px-3 py-2 text-sm text-recusado">
              {erro}
            </p>
          )}
          <button type="button" onClick={assinar} disabled={assinando || !temTraco || !aceite} className="botao-primario mt-4 !bg-pago hover:!bg-[#116632]">
            {assinando ? "Registrando…" : "Assinar contrato"}
          </button>
          <a href={falar} target="_blank" rel="noopener" className="botao-texto mt-2 w-full">
            Tenho uma dúvida, falar com {c.contratado.nome}
          </a>
        </section>
      )}

      {assinado && (
        <a href={falar} target="_blank" rel="noopener" className="botao-secundario mt-4">
          Falar com {c.contratado.nome} no WhatsApp
        </a>
      )}

      {c.mostrarMarca && (
        <p className="mt-6 text-center text-xs text-grafite">
          Contrato gerado com{" "}
          <a href={SITE} className="font-medium text-carbono underline">
            Orça Já
          </a>
        </p>
      )}
    </main>
  );
}
