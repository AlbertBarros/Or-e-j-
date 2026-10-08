import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import CabecalhoPagina from "@/componentes/CabecalhoPagina";
import Campo from "@/componentes/Campo";
import Carregando from "@/componentes/Carregando";
import { useAuth } from "@/hooks/useAuth";
import { sair } from "@/lib/auth";
import { atualizarPerfil, atualizarPerfilV2, atualizarDadosRecibo, buscarLogo, salvarLogo, mesAtual } from "@/lib/usuario";
import { comprimirLogo } from "@/lib/logo";
import { LIMITE_FREE } from "@/lib/firebase";
import { registrarEvento } from "@/lib/eventos";
import { nomeProfissao } from "@/lib/profissoes";
import { validarNome, validarWhatsapp, validarChavePix, ROTULO_TIPO_CHAVE } from "@/lib/validacao";
import { MODELOS_DOCUMENTO } from "@/lib/pagamento";
import { paraNumero, paraTexto } from "@shared/src/numero";
import { CHECKOUT_MENSAL, CHECKOUT_ANUAL, CHECKOUT_ANUAL_PIX, PRECO_MENSAL, PRECO_ANUAL_POR_MES, PRECO_ANUAL_TOTAL, URL_SITE } from "@/lib/planos";
import { detectarTipoChave, type TipoChavePix } from "@shared/src/pix";
import { formatarReais, formatarWhatsapp, formatarData } from "@shared/src/mensagens";
import { paraDate } from "@/lib/datas";

const TIPOS: TipoChavePix[] = ["cpf", "cnpj", "telefone", "email", "aleatoria"];

/** T8 — Conta: plano e uso, assinatura do Pro, dados do negócio, Pix, logo e dados do recibo. */
export default function Conta() {
  const { usuario, perfil } = useAuth();
  const uid = usuario?.uid;

  const [nomeNegocio, setNomeNegocio] = useState("");
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cidade, setCidade] = useState("");
  const [descricao, setDescricao] = useState("");
  const [instagram, setInstagram] = useState("");
  const [site, setSite] = useState("");
  const [freteFixo, setFreteFixo] = useState("");
  const [fretePorKm, setFretePorKm] = useState("");
  const [chavePix, setChavePix] = useState("");
  const [tipoManual, setTipoManual] = useState<TipoChavePix | null>(null);
  const [nomePix, setNomePix] = useState("");
  const [documento, setDocumento] = useState("");
  const [email, setEmail] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidadeEnd, setCidadeEnd] = useState("");
  const [uf, setUf] = useState("");
  const [cep, setCep] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [preenchido, setPreenchido] = useState(false);
  const [erros, setErros] = useState<Record<string, string | null>>({});
  const [salvando, setSalvando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const campoLogo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!perfil || preenchido) return;
    setPreenchido(true);
    setNomeNegocio(perfil.nomeNegocio);
    setNomeResponsavel(perfil.nomeResponsavel);
    setWhatsapp(formatarWhatsapp(perfil.whatsapp));
    setCidade(perfil.cidade);
    setDescricao(perfil.descricao ?? "");
    setInstagram(perfil.instagram ?? "");
    setSite(perfil.site ?? "");
    setFreteFixo(perfil.frete ? paraTexto(perfil.frete.fixo) : "");
    setFretePorKm(perfil.frete ? paraTexto(perfil.frete.porKm) : "");
    setChavePix(perfil.chavePix);
    setTipoManual(perfil.tipoChavePix);
    setNomePix(perfil.nomePix);
    setDocumento(perfil.documento ?? "");
    setEmail(perfil.email ?? "");
    setLogradouro(perfil.endereco?.logradouro ?? "");
    setBairro(perfil.endereco?.bairro ?? "");
    setCidadeEnd(perfil.endereco?.cidade ?? "");
    setUf(perfil.endereco?.uf ?? "");
    setCep(perfil.endereco?.cep ?? "");
    if (uid && perfil.temLogo) buscarLogo(uid).then(setLogo).catch(() => setLogo(null));
  }, [perfil, preenchido, uid]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3000);
    return () => clearTimeout(t);
  }, [aviso]);

  if (!perfil || !uid) return <Carregando />;

  const pro = perfil.plano === "pro";
  const enviados = perfil.uso.mes === mesAtual() ? perfil.uso.enviados : 0;
  const planoAte = paraDate(perfil.planoAte);
  const tipoChave: TipoChavePix = tipoManual ?? (chavePix ? detectarTipoChave(chavePix) : "cpf");

  async function salvarNegocio(e: FormEvent) {
    e.preventDefault();
    const novos = {
      nomeNegocio: validarNome(nomeNegocio, "o nome do negócio"),
      nomeResponsavel: validarNome(nomeResponsavel, "o seu nome"),
      whatsapp: validarWhatsapp(whatsapp),
      cidade: validarNome(cidade, "a cidade"),
    };
    setErros((x) => ({ ...x, ...novos }));
    if (Object.values(novos).some(Boolean)) return;
    setSalvando("negocio");
    setErroGeral(null);
    try {
      await atualizarPerfil(uid!, { nomeNegocio, nomeResponsavel, whatsapp, cidade });
      await atualizarPerfilV2(uid!, { descricao, instagram, site, frete: paraNumero(freteFixo) > 0 || paraNumero(fretePorKm) > 0 ? { fixo: paraNumero(freteFixo), porKm: paraNumero(fretePorKm) } : null });
      setAviso("Dados do negócio salvos");
    } catch (err) {
      console.error(err);
      setErroGeral("Não deu para salvar. Confira a internet e tente de novo.");
    } finally {
      setSalvando(null);
    }
  }

  async function salvarPix(e: FormEvent) {
    e.preventDefault();
    const novos = { chavePix: validarChavePix(chavePix, tipoChave), nomePix: validarNome(nomePix, "o nome que aparece no Pix") };
    setErros((x) => ({ ...x, ...novos }));
    if (Object.values(novos).some(Boolean)) return;
    setSalvando("pix");
    setErroGeral(null);
    try {
      await atualizarPerfil(uid!, { chavePix, tipoChavePix: tipoChave, nomePix });
      setAviso("Pix salvo");
    } catch (err) {
      console.error(err);
      setErroGeral("Não deu para salvar. Confira a internet e tente de novo.");
    } finally {
      setSalvando(null);
    }
  }

  async function salvarRecibo(e: FormEvent) {
    e.preventDefault();
    setSalvando("recibo");
    setErroGeral(null);
    try {
      const temEndereco = logradouro.trim() || bairro.trim() || cep.trim() || cidadeEnd.trim();
      await atualizarDadosRecibo(uid!, {
        documento: documento.trim(),
        email: email.trim(),
        endereco: temEndereco
          ? { logradouro: logradouro.trim(), bairro: bairro.trim(), cidade: cidadeEnd.trim(), uf: uf.trim().toUpperCase(), cep: cep.trim() }
          : null,
      });
      setAviso("Dados do recibo salvos");
    } catch (err) {
      console.error(err);
      setErroGeral("Não deu para salvar. Confira a internet e tente de novo.");
    } finally {
      setSalvando(null);
    }
  }

  async function trocarLogo(arquivo: File | undefined) {
    if (!arquivo) return;
    setSalvando("logo");
    setErroGeral(null);
    try {
      const dataUrl = await comprimirLogo(arquivo);
      await salvarLogo(uid!, dataUrl);
      setLogo(dataUrl);
      setAviso("Logo atualizada");
    } catch (err) {
      setErroGeral(err instanceof Error ? err.message : "Não deu para usar essa imagem.");
    } finally {
      setSalvando(null);
      if (campoLogo.current) campoLogo.current.value = "";
    }
  }

  async function removerLogo() {
    setSalvando("logo");
    try {
      await salvarLogo(uid!, null);
      setLogo(null);
      setAviso("Logo removida");
    } catch {
      setErroGeral("Não deu para remover a logo. Tente de novo.");
    } finally {
      setSalvando(null);
    }
  }

  function cliqueAssinar(qual: string) {
    registrarEvento("clique_assinar_pro", { uid, origem: `conta:${qual}` });
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 pb-16">
      <CabecalhoPagina
        titulo="Conta"
        acao={
          <button type="button" onClick={() => void sair()} className="botao-texto">
            Sair
          </button>
        }
      />

      {aviso && (
        <p role="status" className="sticky top-16 z-20 mt-3 rounded-[10px] bg-[#E6F4EA] px-3 py-2 text-center text-sm font-medium text-pago">
          {aviso}
        </p>
      )}
      {erroGeral && (
        <p role="alert" className="mt-3 rounded-[10px] bg-[#FDECEF] px-3 py-2 text-sm text-recusado">
          {erroGeral}
        </p>
      )}

      {/* Plano */}
      <section id="plano" className="documento mt-4 scroll-mt-20 p-4" aria-labelledby="plano-titulo">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="plano-titulo" className="text-lg font-semibold">
              {pro ? "Plano Pro" : "Plano grátis"}
            </h2>
            <p className="text-sm text-grafite">
              {pro
                ? planoAte
                  ? `Ativo até ${formatarData(planoAte)}.`
                  : "Ativo. Orçamentos ilimitados, Pix na aprovação, recibo e sua logo."
                : `${enviados} de ${LIMITE_FREE} orçamentos enviados este mês.`}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${pro ? "bg-carbono text-white" : "bg-pauta text-grafite"}`}>
            {pro ? "PRO" : "GRÁTIS"}
          </span>
        </div>
        {!pro && (
          <div className="mt-4">
            <p className="text-sm">
              O Pro libera envios ilimitados, <strong>Pix na página de aprovação</strong>, <strong>recibo em PDF</strong> com garantia e a sua logo
              no orçamento.
            </p>
            <div className="mt-3 grid gap-2">
              <a href={CHECKOUT_ANUAL} target="_blank" rel="noopener" onClick={() => cliqueAssinar("anual-cartao")} className="botao-primario">
                Pro anual · {formatarReais(PRECO_ANUAL_POR_MES)}/mês no cartão
              </a>
              <a href={CHECKOUT_ANUAL_PIX} target="_blank" rel="noopener" onClick={() => cliqueAssinar("anual-pix")} className="botao-secundario">
                Pro anual · {formatarReais(PRECO_ANUAL_TOTAL)} no Pix
              </a>
              <a href={CHECKOUT_MENSAL} target="_blank" rel="noopener" onClick={() => cliqueAssinar("mensal")} className="botao-secundario">
                Pro mensal · {formatarReais(PRECO_MENSAL)}/mês no cartão
              </a>
            </div>
            <p className="ajuda mt-2">
              Use no pagamento o mesmo e-mail da sua conta ({perfil.email ?? usuario?.email ?? "seu e-mail"}). O Pro é liberado em até 24 horas úteis.{" "}
              <a href={`${URL_SITE}/precos`} target="_blank" rel="noopener" className="underline">
                Ver comparação dos planos
              </a>
              .
            </p>
          </div>
        )}
      </section>

      {/* Negócio */}
      <form onSubmit={salvarNegocio} noValidate className="documento mt-4 space-y-3 p-4" aria-labelledby="neg-titulo">
        <h2 id="neg-titulo" className="text-sm font-semibold uppercase tracking-wide text-grafite">
          Seu negócio · {nomeProfissao(perfil.profissao)}
        </h2>
        <Campo id="c-nomeNegocio" rotulo="Nome do negócio" value={nomeNegocio} onChange={(e) => setNomeNegocio(e.target.value)} erro={erros.nomeNegocio} />
        <Campo id="c-nomeResponsavel" rotulo="Seu nome" value={nomeResponsavel} onChange={(e) => setNomeResponsavel(e.target.value)} erro={erros.nomeResponsavel} />
        <Campo id="c-whatsapp" rotulo="Seu WhatsApp" type="tel" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} erro={erros.whatsapp} />
        <Campo id="c-cidade" rotulo="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} erro={erros.cidade} />
        <Campo id="c-descricao" rotulo="Frase do negócio (opcional)" placeholder="Ex.: Instalações elétricas residenciais com garantia" maxLength={120} value={descricao} onChange={(e) => setDescricao(e.target.value)} ajuda="Aparece no cartão de visita e nos cards." />
        <div className="grid grid-cols-2 gap-3">
          <Campo id="c-instagram" rotulo="Instagram (opcional)" placeholder="@seuperfil" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
          <Campo id="c-site" rotulo="Site (opcional)" placeholder="seusite.com.br" inputMode="url" value={site} onChange={(e) => setSite(e.target.value)} />
        </div>
        <div>
          <span className="rotulo">Frete / deslocamento padrão</span>
          <div className="grid grid-cols-2 gap-3">
            <Campo id="c-freteFixo" rotulo="Valor fixo (R$)" inputMode="decimal" placeholder="0,00" value={freteFixo} onChange={(e) => setFreteFixo(e.target.value)} className="tabular" />
            <Campo id="c-fretePorKm" rotulo="Por km (R$)" inputMode="decimal" placeholder="0,00" value={fretePorKm} onChange={(e) => setFretePorKm(e.target.value)} className="tabular" />
          </div>
          <p className="ajuda">Usados quando você toca em “Frete” no orçamento. A distância é calculada a partir do seu endereço (Dados do recibo).</p>
        </div>
        <div>
          <span className="rotulo">Modelo padrão do orçamento</span>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Modelo do documento">
            {MODELOS_DOCUMENTO.map((m) => (
              <button key={m.modelo} type="button" role="radio" aria-checked={(perfil.modeloDocumento ?? 2) === m.modelo} onClick={() => atualizarPerfilV2(uid!, { modeloDocumento: m.modelo }).then(() => setAviso(`Modelo ${m.nome} como padrão`))} className={`opcao !min-h-11 text-sm ${(perfil.modeloDocumento ?? 2) === m.modelo ? "opcao-ativa" : ""}`}>
                {m.nome}
              </button>
            ))}
          </div>
          <p className="ajuda">Você ainda escolhe o modelo a cada envio, com a prévia de como o cliente vê.</p>
        </div>
        <button type="submit" className="botao-secundario" disabled={salvando !== null}>
          {salvando === "negocio" ? "Salvando…" : "Salvar dados do negócio"}
        </button>
      </form>

      {/* Logo */}
      <section className="documento mt-4 p-4" aria-labelledby="logo-titulo">
        <h2 id="logo-titulo" className="text-sm font-semibold uppercase tracking-wide text-grafite">
          Logo
        </h2>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-pauta bg-folha">
            {logo ? <img src={logo} alt="Sua logo" className="h-full w-full object-contain" /> : <span className="text-xs text-grafite">sem logo</span>}
          </div>
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <label className="botao-secundario !min-h-11 cursor-pointer text-sm">
              {salvando === "logo" ? "Salvando…" : logo ? "Trocar imagem" : "Enviar imagem"}
              <input ref={campoLogo} type="file" accept="image/*" className="sr-only" onChange={(e) => trocarLogo(e.target.files?.[0])} disabled={salvando !== null} />
            </label>
            {logo && (
              <button type="button" onClick={removerLogo} className="botao-texto" disabled={salvando !== null}>
                Remover
              </button>
            )}
          </div>
        </div>
        <p className="ajuda mt-2">{pro ? "Aparece no orçamento, na página de aprovação e no recibo." : "Fica guardada e aparece nos documentos quando você for Pro."}</p>
      </section>

      {/* Pix */}
      <form onSubmit={salvarPix} noValidate className="documento mt-4 space-y-3 p-4" aria-labelledby="pix-titulo-conta">
        <h2 id="pix-titulo-conta" className="text-sm font-semibold uppercase tracking-wide text-grafite">
          Seu Pix
        </h2>
        <Campo
          id="c-chavePix"
          rotulo="Chave Pix"
          autoComplete="off"
          value={chavePix}
          onChange={(e) => {
            setChavePix(e.target.value);
            setTipoManual(null);
          }}
          erro={erros.chavePix}
        />
        <div>
          <span className="rotulo">Tipo da chave</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo da chave Pix">
            {TIPOS.map((t) => (
              <button key={t} type="button" role="radio" aria-checked={tipoChave === t} onClick={() => setTipoManual(t)} className={`opcao !min-h-11 px-3 ${tipoChave === t ? "opcao-ativa" : ""}`}>
                {ROTULO_TIPO_CHAVE[t]}
              </button>
            ))}
          </div>
        </div>
        <Campo id="c-nomePix" rotulo="Nome que aparece no Pix" value={nomePix} onChange={(e) => setNomePix(e.target.value)} erro={erros.nomePix} />
        <button type="submit" className="botao-secundario" disabled={salvando !== null}>
          {salvando === "pix" ? "Salvando…" : "Salvar Pix"}
        </button>
      </form>

      {/* Dados do recibo */}
      <form onSubmit={salvarRecibo} noValidate className="documento mt-4 space-y-3 p-4" aria-labelledby="rec-titulo">
        <h2 id="rec-titulo" className="text-sm font-semibold uppercase tracking-wide text-grafite">
          Dados do recibo
        </h2>
        <p className="ajuda">Aparecem no cabeçalho do recibo em PDF (plano Pro). Todos opcionais.</p>
        <Campo id="c-documento" rotulo="CPF ou CNPJ" inputMode="numeric" value={documento} onChange={(e) => setDocumento(e.target.value)} />
        <Campo id="c-email" rotulo="E-mail de contato" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Campo id="c-logradouro" rotulo="Rua e número" value={logradouro} onChange={(e) => setLogradouro(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Campo id="c-bairro" rotulo="Bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
          <Campo id="c-cep" rotulo="CEP" inputMode="numeric" value={cep} onChange={(e) => setCep(e.target.value)} />
        </div>
        <div className="grid grid-cols-[1fr_80px] gap-3">
          <Campo id="c-cidadeEnd" rotulo="Cidade" value={cidadeEnd} onChange={(e) => setCidadeEnd(e.target.value)} />
          <Campo id="c-uf" rotulo="UF" maxLength={2} value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} />
        </div>
        <button type="submit" className="botao-secundario" disabled={salvando !== null}>
          {salvando === "recibo" ? "Salvando…" : "Salvar dados do recibo"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-grafite">
        <a href={`${URL_SITE}/termos`} target="_blank" rel="noopener" className="underline">
          Termos de uso
        </a>{" "}
        ·{" "}
        <a href={`${URL_SITE}/privacidade`} target="_blank" rel="noopener" className="underline">
          Privacidade
        </a>
      </p>
      <Link to="/" className="botao-texto mx-auto mt-2">
        Voltar ao painel
      </Link>
    </main>
  );
}
