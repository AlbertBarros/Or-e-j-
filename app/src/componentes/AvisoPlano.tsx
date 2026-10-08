import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { ativarTestePro, diasRestantesPro, emTestePro, podeTestarPro, DIAS_TESTE_PRO } from "@/lib/usuario";
import { paraDate } from "@/lib/datas";
import type { Usuario } from "@/tipos";

/**
 * Faixa do plano na tela Início:
 * - em teste: quantos dias faltam (destaque nos últimos 3);
 * - teste acabou: convite para assinar;
 * - conta antiga que nunca testou: botão para ligar os 14 dias grátis.
 */
export default function AvisoPlano({ perfil }: { perfil: Usuario }) {
  const { usuario } = useAuth();
  const [ligando, setLigando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const teste = emTestePro(perfil);
  const dias = diasRestantesPro(perfil);
  const fimTeste = paraDate(perfil.testeProAte);
  const testeAcabou = !teste && perfil.plano !== "pro" && fimTeste && fimTeste.getTime() < Date.now();

  async function ligar() {
    if (!usuario) return;
    setLigando(true);
    setErro(null);
    try {
      await ativarTestePro(usuario.uid);
    } catch (e) {
      console.error(e);
      setErro("Não deu para ligar o teste agora. Tente de novo.");
    } finally {
      setLigando(false);
    }
  }

  if (teste) {
    const acabando = dias <= 3;
    return (
      <Link
        to="/conta#plano"
        className={`surgir mt-4 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${acabando ? "border-[#F59E0B]/40 bg-[#FDF3E7]" : "border-white/70 bg-white/60 backdrop-blur"}`}
      >
        <span className="text-xl" aria-hidden="true">
          {acabando ? "⏳" : "🎁"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">
            Pro grátis: {dias === 1 ? "último dia" : `faltam ${dias} dias`}
          </span>
          <span className="block text-grafite">{acabando ? "Assine para não perder o Pix, o recibo e a sua logo." : "Pix na aprovação, recibo em PDF e sua logo liberados."}</span>
        </span>
        <span className="shrink-0 font-semibold text-carbono">{acabando ? "Assinar" : "Ver"}</span>
      </Link>
    );
  }

  if (testeAcabou) {
    return (
      <Link to="/conta#plano" className="surgir mt-4 flex items-center gap-3 rounded-2xl border border-[#F59E0B]/40 bg-[#FDF3E7] px-4 py-3 text-sm">
        <span className="text-xl" aria-hidden="true">
          ⭐
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Seu teste do Pro terminou</span>
          <span className="block text-grafite">Volte a ter Pix na aprovação, recibo e sua logo por menos de R$ 1 por dia.</span>
        </span>
        <span className="shrink-0 font-semibold text-carbono">Assinar</span>
      </Link>
    );
  }

  if (podeTestarPro(perfil)) {
    return (
      <div className="surgir mt-4 rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="text-xl" aria-hidden="true">
            🎁
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Experimente o Pro grátis por {DIAS_TESTE_PRO} dias</span>
            <span className="block text-grafite">Sem cartão. Pix na aprovação, recibo em PDF e sua logo.</span>
          </span>
          <button type="button" onClick={ligar} disabled={ligando} className="botao-primario !min-h-10 !w-auto shrink-0 px-4 text-sm">
            {ligando ? "…" : "Ativar"}
          </button>
        </div>
        {erro && (
          <p role="alert" className="erro mt-2">
            {erro}
          </p>
        )}
      </div>
    );
  }

  return null;
}
