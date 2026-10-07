import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import CabecalhoPagina from "@/componentes/CabecalhoPagina";
import Campo from "@/componentes/Campo";
import Carregando from "@/componentes/Carregando";
import { useAuth } from "@/hooks/useAuth";
import { useOrcamento } from "@/hooks/useOrcamentos";
import { emitirRecibo } from "@/lib/orcamentos";
import { buscarLogo } from "@/lib/usuario";
import { dataParaInput, inputParaData, paraDate } from "@/lib/datas";
import { observacoesPadrao } from "@/lib/profissoes";
import type { Recibo } from "@/tipos";
import { formatarData, linkWhatsapp, mensagemEnvioRecibo, textoGarantia } from "@shared/src/mensagens";

const OPCOES_GARANTIA = [
  { dias: 0, rotulo: "Sem garantia" },
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "90 dias" },
  { dias: 180, rotulo: "6 meses" },
  { dias: 365, rotulo: "1 ano" },
  { dias: -1, rotulo: "Outro" },
];

const URL_PRECOS = "https://orca-ja-6cz.pages.dev/precos";

/** Recibo (Pro): emitir a partir de um orçamento pago, baixar o PDF e enviar pelo WhatsApp. */
export default function EmitirRecibo() {
  const { id } = useParams();
  const { usuario, perfil } = useAuth();
  const { orcamento, carregando, erro } = useOrcamento(id);

  const [garantiaOpcao, setGarantiaOpcao] = useState(90);
  const [garantiaOutro, setGarantiaOutro] = useState("");
  const [garantiaInicio, setGarantiaInicio] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [documento, setDocumento] = useState("");
  const [email, setEmail] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [cep, setCep] = useState("");
  const [mostrarEndereco, setMostrarEndereco] = useState(false);
  const [preenchido, setPreenchido] = useState(false);

  const [ocupado, setOcupado] = useState<"emitindo" | "pdf" | "enviando" | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    if (usuario && perfil?.temLogo) buscarLogo(usuario.uid).then(setLogo).catch(() => setLogo(null));
  }, [usuario, perfil?.temLogo]);

  // Preenche com os dados do perfil e do orçamento (uma vez).
  useEffect(() => {
    if (!perfil || !orcamento || preenchido) return;
    setPreenchido(true);
    setDocumento(perfil.documento ?? "");
    setEmail(perfil.email ?? "");
    setLogradouro(perfil.endereco?.logradouro ?? "");
    setBairro(perfil.endereco?.bairro ?? "");
    setCidade(perfil.endereco?.cidade ?? perfil.cidade);
    setUf(perfil.endereco?.uf ?? "");
    setCep(perfil.endereco?.cep ?? "");
    setMostrarEndereco(Boolean(perfil.endereco?.logradouro));
    setObservacoes(observacoesPadrao(perfil.profissao));
    const pago = paraDate(orcamento.pagoEm) ?? new Date();
    setGarantiaInicio(dataParaInput(pago));
  }, [perfil, orcamento, preenchido]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3500);
    return () => clearTimeout(t);
  }, [aviso]);

  if (carregando || !perfil) return <Carregando />;

  if (erro || !orcamento || orcamento.ownerId !== usuario?.uid) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4">
        <CabecalhoPagina titulo="Recibo" />
        <p className="documento mt-6 p-6 text-center text-grafite">{erro ?? "Orçamento não encontrado."}</p>
      </main>
    );
  }

  const voltar = `/orcamentos/${orcamento.id}`;

  if (perfil.plano !== "pro") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4">
        <CabecalhoPagina titulo="Recibo" voltarPara={voltar} />
        <section className="documento mt-6 p-6 text-center">
          <h2 className="text-xl font-semibold">O recibo em PDF é do plano Pro</h2>
          <p className="mt-2 text-grafite">
            Com sua logo, garantia do serviço, endereço e valor por extenso, pronto para mandar no WhatsApp. O Pro também libera
            orçamentos ilimitados e o Pix na aprovação.
          </p>
          <a href={URL_PRECOS} target="_blank" rel="noopener" className="botao-primario mt-5">
            Ver planos
          </a>
        </section>
      </main>
    );
  }

  if (orcamento.status !== "pago") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4">
        <CabecalhoPagina titulo="Recibo" voltarPara={voltar} />
        <p className="documento mt-6 p-6 text-center text-grafite">O recibo é emitido depois de marcar o orçamento como pago.</p>
        <Link to={voltar} className="botao-secundario mt-4">
          Voltar ao orçamento
        </Link>
      </main>
    );
  }

  const recibo = orcamento.recibo ?? null;
  const garantiaDias = garantiaOpcao === -1 ? Number(garantiaOutro) || 0 : garantiaOpcao;
  const inicio = inputParaData(garantiaInicio) ?? paraDate(orcamento.pagoEm) ?? new Date();

  async function emitir(e: FormEvent) {
    e.preventDefault();
    if (!usuario || !orcamento) return;
    setErroAcao(null);
    if (garantiaOpcao === -1 && (!Number.isInteger(Number(garantiaOutro)) || Number(garantiaOutro) < 1)) {
      setErroAcao("Informe a garantia em dias (número inteiro).");
      return;
    }
    setOcupado("emitindo");
    try {
      const temEndereco = logradouro.trim() || bairro.trim() || cep.trim();
      await emitirRecibo(usuario.uid, orcamento, {
        garantiaDias,
        garantiaInicio: inicio,
        observacoes,
        emissor: {
          documento: documento.trim(),
          email: email.trim(),
          ...(temEndereco
            ? { endereco: { logradouro: logradouro.trim(), bairro: bairro.trim(), cidade: cidade.trim(), uf: uf.trim().toUpperCase(), cep: cep.trim() } }
            : {}),
        },
      });
      setAviso("Recibo emitido");
    } catch (err) {
      console.error(err);
      setErroAcao("Não deu para emitir o recibo. Confira a internet e tente de novo.");
    } finally {
      setOcupado(null);
    }
  }

  async function gerar(r: Recibo) {
    const { gerarPdfRecibo } = await import("@/pdf/gerarPdf");
    return gerarPdfRecibo(orcamento!, r, logo);
  }

  async function baixar() {
    if (!recibo) return;
    setOcupado("pdf");
    setErroAcao(null);
    try {
      const { baixarArquivo } = await import("@/pdf/gerarPdf");
      baixarArquivo(await gerar(recibo));
    } catch (err) {
      console.error(err);
      setErroAcao("Não deu para gerar o PDF. Tente de novo.");
    } finally {
      setOcupado(null);
    }
  }

  async function enviar() {
    if (!recibo || !orcamento) return;
    setOcupado("enviando");
    setErroAcao(null);
    try {
      const { enviarPdfPeloWhatsapp } = await import("@/pdf/gerarPdf");
      const mensagem = mensagemEnvioRecibo({
        cliente: orcamento.cliente.nome,
        negocio: orcamento.negocio.nome,
        numeroRecibo: recibo.numero,
        total: orcamento.total,
      });
      const resultado = await enviarPdfPeloWhatsapp(await gerar(recibo), mensagem, linkWhatsapp(orcamento.cliente.whatsapp, mensagem));
      if (resultado === "baixado") setAviso("PDF baixado. Anexe na conversa do WhatsApp que abriu.");
    } catch (err) {
      console.error(err);
      setErroAcao("Não deu para enviar. Tente baixar o PDF e mandar manualmente.");
    } finally {
      setOcupado(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 pb-36">
      <CabecalhoPagina titulo={recibo ? `Recibo nº ${String(recibo.numero).padStart(4, "0")}` : "Emitir recibo"} voltarPara={voltar} />

      {recibo ? (
        <section className="documento mt-4 p-5">
          <p className="text-sm text-grafite">Emitido em {formatarData(paraDate(recibo.emitidoEm) ?? new Date())}</p>
          <p className="mt-2 text-lg">
            Recebi de <strong>{orcamento.cliente.nome}</strong> o valor do orçamento nº {String(orcamento.numero).padStart(4, "0")}.
          </p>
          <p className="mt-2 text-grafite">{textoGarantia(recibo.garantiaDias, paraDate(recibo.garantiaInicio) ?? new Date())}</p>
          {recibo.observacoes && <p className="mt-2 whitespace-pre-line text-grafite">{recibo.observacoes}</p>}
          <p className="ajuda mt-3">O recibo já foi emitido e numerado. Para corrigir dados do emissor, edite em Conta e emita o próximo.</p>
        </section>
      ) : (
        <form id="form-recibo" onSubmit={emitir} noValidate className="mt-4 space-y-5">
          <section className="documento p-4" aria-labelledby="sec-garantia">
            <h2 id="sec-garantia" className="text-sm font-semibold uppercase tracking-wide text-grafite">
              Garantia do serviço
            </h2>
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Período de garantia">
              {OPCOES_GARANTIA.map((o) => (
                <button
                  key={o.dias}
                  type="button"
                  role="radio"
                  aria-checked={garantiaOpcao === o.dias}
                  onClick={() => setGarantiaOpcao(o.dias)}
                  className={`opcao !min-h-11 px-3 ${garantiaOpcao === o.dias ? "opcao-ativa" : ""}`}
                >
                  {o.rotulo}
                </button>
              ))}
            </div>
            {garantiaOpcao === -1 && (
              <div className="mt-3 w-40">
                <Campo id="garantiaOutro" rotulo="Dias de garantia" inputMode="numeric" value={garantiaOutro} onChange={(e) => setGarantiaOutro(e.target.value.replace(/\D/g, ""))} className="tabular" />
              </div>
            )}
            {garantiaDias > 0 && (
              <div className="mt-3">
                <Campo id="garantiaInicio" rotulo="Garantia conta a partir de" type="date" value={garantiaInicio} onChange={(e) => setGarantiaInicio(e.target.value)} />
                <p className="ajuda">{textoGarantia(garantiaDias, inicio)}</p>
              </div>
            )}
          </section>

          <section className="documento p-4" aria-labelledby="sec-emissor">
            <h2 id="sec-emissor" className="text-sm font-semibold uppercase tracking-wide text-grafite">
              Seus dados no recibo
            </h2>
            <p className="ajuda mt-1">Nome do negócio, seu nome e WhatsApp vêm do cadastro. O que preencher aqui fica salvo para os próximos.</p>
            <div className="mt-3 space-y-3">
              <Campo id="documento" rotulo="CPF ou CNPJ (opcional)" inputMode="numeric" autoComplete="off" value={documento} onChange={(e) => setDocumento(e.target.value)} />
              <Campo id="email" rotulo="E-mail de contato (opcional)" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              {!mostrarEndereco ? (
                <button type="button" onClick={() => setMostrarEndereco(true)} className="botao-secundario !min-h-11 text-sm">
                  + Adicionar endereço
                </button>
              ) : (
                <div className="space-y-3">
                  <Campo id="logradouro" rotulo="Rua e número" autoComplete="street-address" value={logradouro} onChange={(e) => setLogradouro(e.target.value)} />
                  <div className="grid grid-cols-2 gap-3">
                    <Campo id="bairro" rotulo="Bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
                    <Campo id="cep" rotulo="CEP" inputMode="numeric" autoComplete="postal-code" value={cep} onChange={(e) => setCep(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-[1fr_80px] gap-3">
                    <Campo id="cidadeEnd" rotulo="Cidade" autoComplete="address-level2" value={cidade} onChange={(e) => setCidade(e.target.value)} />
                    <Campo id="uf" rotulo="UF" maxLength={2} autoComplete="address-level1" value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} />
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="documento p-4">
            <label htmlFor="obsRecibo" className="rotulo">
              Observações do recibo
            </label>
            <textarea id="obsRecibo" className="campo min-h-24 py-2" rows={3} maxLength={500} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            <p className="ajuda">{observacoes.length}/500</p>
          </section>
        </form>
      )}

      {erroAcao && (
        <p role="alert" className="mt-3 rounded-[10px] bg-[#FDECEF] px-3 py-2 text-sm text-recusado">
          {erroAcao}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-pauta bg-folha p-4">
        <div className="mx-auto max-w-[560px] space-y-2">
          {aviso && (
            <p role="status" className="rounded-[10px] bg-[#E6F4EA] px-3 py-2 text-center text-sm font-medium text-pago">
              {aviso}
            </p>
          )}
          {recibo ? (
            <>
              <button type="button" onClick={enviar} disabled={ocupado !== null} className="botao-primario">
                {ocupado === "enviando" ? "Preparando…" : "Enviar recibo no WhatsApp"}
              </button>
              <button type="button" onClick={baixar} disabled={ocupado !== null} className="botao-secundario">
                {ocupado === "pdf" ? "Gerando PDF…" : "Baixar PDF do recibo"}
              </button>
            </>
          ) : (
            <button type="submit" form="form-recibo" disabled={ocupado !== null} className="botao-primario">
              {ocupado === "emitindo" ? "Emitindo…" : "Emitir recibo"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
