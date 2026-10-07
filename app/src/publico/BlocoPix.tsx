import { useEffect, useState } from "react";
import type { Orcamento } from "@/tipos";
import { gerarPixCopiaECola } from "@shared/src/pix";
import { formatarReais } from "@shared/src/mensagens";

/** Bloco de pagamento na página pública (Pro): QR Code, código copia-e-cola e valor. */
export default function BlocoPix({ orcamento: o }: { orcamento: Orcamento }) {
  const [qr, setQr] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const codigo = gerarPixCopiaECola({
    chave: o.negocio.chavePix,
    nomeRecebedor: o.negocio.nomePix,
    cidade: o.negocio.cidade || "BRASIL",
    valor: o.total,
    txid: `ORC${o.numero}`,
  });

  useEffect(() => {
    let cancelado = false;
    import("qrcode")
      .then((QRCode) => QRCode.toDataURL(codigo, { margin: 1, width: 240, errorCorrectionLevel: "M" }))
      .then((url) => {
        if (!cancelado) setQr(url);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelado) setErro("Não deu para montar o QR Code. Use o código copia-e-cola.");
      });
    return () => {
      cancelado = true;
    };
  }, [codigo]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setErro("Não deu para copiar automaticamente. Selecione o código abaixo e copie.");
    }
  }

  return (
    <section className="documento p-5" aria-labelledby="pix-titulo">
      <h2 id="pix-titulo" className="text-xl font-semibold">
        Pague com Pix
      </h2>
      <p className="mt-1 text-grafite">
        <span className="tabular font-semibold text-tinta">{formatarReais(o.total)}</span> para {o.negocio.nomePix}. O dinheiro vai direto
        para a conta de {o.negocio.nome}.
      </p>

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="flex h-[240px] w-[240px] shrink-0 items-center justify-center rounded-[10px] border border-pauta bg-white">
          {qr ? <img src={qr} alt="QR Code do Pix" width={240} height={240} /> : <span className="text-sm text-grafite">Gerando QR…</span>}
        </div>
        <div className="w-full min-w-0 flex-1">
          <p className="text-sm text-grafite">Abra o app do seu banco, escolha Pix e leia o QR Code. Ou copie o código:</p>
          <label htmlFor="pix-codigo" className="sr-only">
            Código Pix copia-e-cola
          </label>
          <textarea
            id="pix-codigo"
            readOnly
            value={codigo}
            onFocus={(e) => e.currentTarget.select()}
            className="campo mt-2 min-h-24 break-all py-2 font-mono text-xs"
          />
          <button type="button" onClick={copiar} className="botao-primario mt-2">
            {copiado ? "Copiado!" : "Copiar código Pix"}
          </button>
          {erro && (
            <p role="alert" className="erro">
              {erro}
            </p>
          )}
          <p className="ajuda mt-2">Depois de pagar, avise {o.negocio.nome} pelo WhatsApp. O comprovante do banco é o seu recibo provisório.</p>
        </div>
      </div>
    </section>
  );
}
