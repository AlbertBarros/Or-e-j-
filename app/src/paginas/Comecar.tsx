import { useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import Logo from "@/componentes/Logo";
import Campo from "@/componentes/Campo";
import { useAuth } from "@/hooks/useAuth";
import { criarPerfil } from "@/lib/usuario";
import { criarItensEmLote, sugestoesDaProfissao, type DadosItemCatalogo } from "@/lib/catalogo";
import { registrarEvento } from "@/lib/eventos";
import { lerRascunhoImportado } from "@/lib/rascunhoImportado";
import { comprimirLogo, LOGO_MAX_BYTES } from "@/lib/logo";
import { validarNome, validarWhatsapp, validarChavePix, ROTULO_TIPO_CHAVE } from "@/lib/validacao";
import { detectarTipoChave, type TipoChavePix } from "@shared/src/pix";
import { formatarReais } from "@shared/src/mensagens";
import { paraNumero, paraTexto } from "@shared/src/numero";
import dados from "@shared/data/profissoes.json";

const PROFISSOES = (dados as { profissoes: { slug: string; nome: string }[] }).profissoes.map((p) => ({ slug: p.slug, nome: p.nome }));
const TIPOS: TipoChavePix[] = ["cpf", "cnpj", "telefone", "email", "aleatoria"];
const TOTAL_PASSOS = 6;

interface ItemEmEdicao extends DadosItemCatalogo {
  chave: number;
  precoTexto: string;
  marcado: boolean;
}

/**
 * Cadastro completo no primeiro acesso (6 passos): profissão, negócio, endereço e contato, logo, Pix,
 * produtos e serviços. Endereço, logo e catálogo podem ser pulados e preenchidos depois em Conta.
 */
export default function Comecar() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const [passo, setPasso] = useState(1);

  // 1 Profissão
  const [profissao, setProfissao] = useState(() => lerRascunhoImportado()?.profissao ?? "");
  // 2 Negócio
  const [nomeNegocio, setNomeNegocio] = useState("");
  const [nomeResponsavel, setNomeResponsavel] = useState(usuario?.displayName ?? "");
  const [whatsapp, setWhatsapp] = useState("");
  const [cidade, setCidade] = useState("");
  const [descricao, setDescricao] = useState("");
  // 3 Endereço e contato
  const [documento, setDocumento] = useState("");
  const [instagram, setInstagram] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [bairro, setBairro] = useState("");
  const [uf, setUf] = useState("");
  const [cep, setCep] = useState("");
  const [freteFixo, setFreteFixo] = useState("");
  const [fretePorKm, setFretePorKm] = useState("");
  // 4 Logo
  const [logo, setLogo] = useState<string | null>(null);
  const [processandoLogo, setProcessandoLogo] = useState(false);
  const campoLogo = useRef<HTMLInputElement>(null);
  // 5 Pix
  const [chavePix, setChavePix] = useState("");
  const [tipoManual, setTipoManual] = useState<TipoChavePix | null>(null);
  const [nomePix, setNomePix] = useState("");
  // 6 Catálogo
  const [itens, setItens] = useState<ItemEmEdicao[] | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [novoPreco, setNovoPreco] = useState("");

  const [erros, setErros] = useState<Record<string, string | null>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const tipoDetectado = useMemo(() => (chavePix.trim() ? detectarTipoChave(chavePix) : null), [chavePix]);
  const tipoChave: TipoChavePix = tipoManual ?? tipoDetectado ?? "cpf";
  const erroDe = (c: string) => erros[c] ?? null;

  function irPara(n: number) {
    setErroGeral(null);
    setPasso(n);
    window.scrollTo({ top: 0 });
  }

  function passo1() {
    if (!profissao) {
      setErroGeral("Escolha a sua profissão. Se não estiver na lista, toque em \"Outra\".");
      return;
    }
    irPara(2);
  }
  function passo2(e: FormEvent) {
    e.preventDefault();
    const novos = {
      nomeNegocio: validarNome(nomeNegocio, "o nome do negócio"),
      nomeResponsavel: validarNome(nomeResponsavel, "o seu nome"),
      whatsapp: validarWhatsapp(whatsapp),
      cidade: validarNome(cidade, "a cidade"),
    };
    setErros(novos);
    if (Object.values(novos).some(Boolean)) return;
    if (!nomePix) setNomePix(nomeResponsavel.trim());
    irPara(3);
  }
  function passo5(e: FormEvent) {
    e.preventDefault();
    const novos = { chavePix: validarChavePix(chavePix, tipoChave), nomePix: validarNome(nomePix, "o nome que aparece no Pix") };
    setErros(novos);
    if (Object.values(novos).some(Boolean)) return;
    if (itens === null) {
      setItens(sugestoesDaProfissao(profissao).map((s, i) => ({ ...s, chave: i + 1, precoTexto: paraTexto(s.preco), marcado: true })));
    }
    irPara(6);
  }

  async function escolherLogo(arquivo: File | undefined) {
    if (!arquivo) return;
    setErros((e) => ({ ...e, logo: null }));
    setProcessandoLogo(true);
    try {
      setLogo(await comprimirLogo(arquivo));
    } catch (err) {
      setErros((e) => ({ ...e, logo: err instanceof Error ? err.message : "Não deu para usar essa imagem." }));
    } finally {
      setProcessandoLogo(false);
      if (campoLogo.current) campoLogo.current.value = "";
    }
  }

  function adicionarItem() {
    if (novoNome.trim().length < 2) return;
    setItens((l) => [...(l ?? []), { chave: Date.now(), tipo: "servico", nome: novoNome.trim(), descricao: "", unidade: "un", preco: paraNumero(novoPreco), precoTexto: novoPreco, marcado: true }]);
    setNovoNome("");
    setNovoPreco("");
  }

  async function concluir(pularCatalogo = false) {
    if (!usuario) return;
    setSalvando(true);
    setErroGeral(null);
    const temEndereco = logradouro.trim() || bairro.trim() || cep.trim();
    try {
      await criarPerfil(usuario.uid, {
        profissao,
        nomeNegocio,
        nomeResponsavel,
        whatsapp,
        cidade,
        chavePix,
        tipoChavePix: tipoChave,
        nomePix,
        logoDataUrl: logo,
        email: usuario.email,
        descricao,
        instagram,
        documento,
        endereco: temEndereco ? { logradouro: logradouro.trim(), bairro: bairro.trim(), cidade: cidade.trim(), uf: uf.trim().toUpperCase(), cep: cep.trim() } : null,
        cadastroCompleto: true,
        frete: paraNumero(freteFixo) > 0 || paraNumero(fretePorKm) > 0 ? { fixo: paraNumero(freteFixo), porKm: paraNumero(fretePorKm) } : null,
      });
      if (!pularCatalogo && itens) {
        const escolhidos = itens.filter((i) => i.marcado && i.nome.trim()).map((i) => ({ tipo: i.tipo, nome: i.nome, descricao: i.descricao, unidade: i.unidade, preco: paraNumero(i.precoTexto) }));
        await criarItensEmLote(usuario.uid, escolhidos);
      }
      registrarEvento("cadastro_concluido", { uid: usuario.uid });
      navegar("/", { replace: true });
    } catch (err) {
      console.error(err);
      setErroGeral("Não deu para salvar seu cadastro. Confira a internet e tente de novo.");
      setSalvando(false);
    }
  }

  const Rodape = ({ voltar, children }: { voltar?: number; children: React.ReactNode }) => (
    <div className="fixed inset-x-0 bottom-0 barra-fixa p-4">
      <div className="mx-auto flex max-w-[560px] gap-2">
        {voltar && (
          <button type="button" onClick={() => irPara(voltar)} className="botao-secundario !w-auto px-4" disabled={salvando}>
            Voltar
          </button>
        )}
        {children}
      </div>
    </div>
  );

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 pb-32 pt-6">
      <header className="flex items-center justify-between">
        <Logo tamanho={28} />
        <span className="text-sm text-grafite">
          Passo {passo} de {TOTAL_PASSOS}
        </span>
      </header>
      <div className="mt-4 grid grid-cols-6 gap-1" aria-hidden="true">
        {Array.from({ length: TOTAL_PASSOS }, (_, i) => i + 1).map((n) => (
          <span key={n} className={`h-1.5 rounded-full transition-colors ${n <= passo ? "bg-carbono" : "bg-pauta"}`} />
        ))}
      </div>

      {passo === 1 && (
        <section className="surgir mt-6">
          <h1 className="text-2xl font-bold">Qual é a sua profissão?</h1>
          <p className="mt-1 text-grafite">Usamos isso para sugerir os itens dos seus orçamentos e do seu catálogo.</p>
          <div className="mt-5 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Profissão">
            {[...PROFISSOES, { slug: "outra", nome: "Outra" }].map((p) => (
              <button key={p.slug} type="button" role="radio" aria-checked={profissao === p.slug} onClick={() => setProfissao(p.slug)} className={`opcao ${profissao === p.slug ? "opcao-ativa" : ""}`}>
                {p.nome}
              </button>
            ))}
          </div>
          {erroGeral && (
            <p role="alert" className="erro mt-3">
              {erroGeral}
            </p>
          )}
          <Rodape>
            <button type="button" onClick={passo1} className="botao-primario">
              Continuar
            </button>
          </Rodape>
        </section>
      )}

      {passo === 2 && (
        <form className="surgir mt-6" onSubmit={passo2} noValidate>
          <h1 className="text-2xl font-bold">Sua empresa</h1>
          <p className="mt-1 text-grafite">É o que o cliente vê no topo do orçamento, do recibo e do contrato.</p>
          <div className="mt-5 space-y-4">
            <Campo id="nomeNegocio" rotulo="Nome do negócio" placeholder="Ex.: JS Elétrica" autoComplete="organization" value={nomeNegocio} onChange={(e) => setNomeNegocio(e.target.value)} erro={erroDe("nomeNegocio")} ajuda="Pode ser o seu próprio nome, se preferir." />
            <Campo id="nomeResponsavel" rotulo="Seu nome" placeholder="Ex.: João Silva" autoComplete="name" value={nomeResponsavel} onChange={(e) => setNomeResponsavel(e.target.value)} erro={erroDe("nomeResponsavel")} />
            <Campo id="whatsapp" rotulo="Seu WhatsApp" placeholder="(61) 99999-8888" type="tel" inputMode="tel" autoComplete="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} erro={erroDe("whatsapp")} />
            <Campo id="cidade" rotulo="Cidade" placeholder="Ex.: Brasília" autoComplete="address-level2" value={cidade} onChange={(e) => setCidade(e.target.value)} erro={erroDe("cidade")} />
            <Campo id="descricao" rotulo="Frase do negócio (opcional)" placeholder="Ex.: Instalações elétricas residenciais com garantia" maxLength={120} value={descricao} onChange={(e) => setDescricao(e.target.value)} ajuda="Aparece no seu cartão de visita." />
          </div>
          <Rodape voltar={1}>
            <button type="submit" className="botao-primario">
              Continuar
            </button>
          </Rodape>
        </form>
      )}

      {passo === 3 && (
        <form
          className="surgir mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            irPara(4);
          }}
          noValidate
        >
          <h1 className="text-2xl font-bold">Endereço e contato</h1>
          <p className="mt-1 text-grafite">Entram no recibo e no contrato. Tudo opcional: dá para preencher depois em Conta.</p>
          <div className="mt-5 space-y-4">
            <Campo id="documento" rotulo="CPF ou CNPJ" inputMode="numeric" autoComplete="off" value={documento} onChange={(e) => setDocumento(e.target.value)} />
            <Campo id="instagram" rotulo="Instagram" placeholder="@seuperfil" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
            <Campo id="logradouro" rotulo="Rua e número" autoComplete="street-address" value={logradouro} onChange={(e) => setLogradouro(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Campo id="bairro" rotulo="Bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
              <Campo id="cep" rotulo="CEP" inputMode="numeric" autoComplete="postal-code" value={cep} onChange={(e) => setCep(e.target.value)} />
            </div>
            <div className="w-24">
              <Campo id="uf" rotulo="UF" maxLength={2} value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} />
            </div>
            <div className="rounded-xl border border-pauta bg-folha p-3">
              <p className="text-sm font-semibold">Cobra deslocamento?</p>
              <p className="ajuda !mt-0">Defina um valor fixo e um valor por km. No orçamento, ao tocar em “Frete”, o app calcula a distância até o cliente.</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Campo id="freteFixo" rotulo="Valor fixo (R$)" inputMode="decimal" placeholder="0,00" value={freteFixo} onChange={(e) => setFreteFixo(e.target.value)} className="tabular" />
                <Campo id="fretePorKm" rotulo="Por km (R$)" inputMode="decimal" placeholder="0,00" value={fretePorKm} onChange={(e) => setFretePorKm(e.target.value)} className="tabular" />
              </div>
            </div>
          </div>
          <Rodape voltar={2}>
            <button type="submit" className="botao-primario">
              {documento || logradouro || instagram ? "Continuar" : "Pular por agora"}
            </button>
          </Rodape>
        </form>
      )}

      {passo === 4 && (
        <section className="surgir mt-6">
          <h1 className="text-2xl font-bold">Sua logo</h1>
          <p className="mt-1 text-grafite">Aparece no orçamento, no recibo, no contrato e no cartão de visita (no plano Pro).</p>
          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border border-pauta bg-folha shadow-sm">
              {logo ? <img src={logo} alt="Prévia da sua logo" className="h-full w-full object-contain p-2" /> : <span className="text-sm text-grafite">sem logo</span>}
            </div>
            <label className="botao-secundario !w-auto cursor-pointer px-6">
              {processandoLogo ? "Preparando…" : logo ? "Trocar imagem" : "Enviar imagem"}
              <input ref={campoLogo} type="file" accept="image/*" className="sr-only" onChange={(e) => escolherLogo(e.target.files?.[0])} disabled={processandoLogo} />
            </label>
            {logo && (
              <button type="button" onClick={() => setLogo(null)} className="botao-texto">
                Remover
              </button>
            )}
            {erroDe("logo") ? (
              <p className="erro" role="alert">
                {erroDe("logo")}
              </p>
            ) : (
              <p className="ajuda text-center">PNG ou JPG. Reduzimos para até {Math.round(LOGO_MAX_BYTES / 1024)} KB.</p>
            )}
          </div>
          <Rodape voltar={3}>
            <button type="button" onClick={() => irPara(5)} className="botao-primario">
              {logo ? "Continuar" : "Pular por agora"}
            </button>
          </Rodape>
        </section>
      )}

      {passo === 5 && (
        <form className="surgir mt-6" onSubmit={passo5} noValidate>
          <h1 className="text-2xl font-bold">Seu Pix</h1>
          <p className="mt-1 text-grafite">O cliente paga direto para a sua chave. O dinheiro não passa pelo Preço Fechado.</p>
          <div className="mt-5 space-y-4">
            <Campo
              id="chavePix"
              rotulo="Chave Pix"
              placeholder="CPF, CNPJ, celular, e-mail ou chave aleatória"
              autoComplete="off"
              value={chavePix}
              onChange={(e) => {
                setChavePix(e.target.value);
                setTipoManual(null);
              }}
              erro={erroDe("chavePix")}
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
              {tipoDetectado && !tipoManual && <p className="ajuda">Detectamos {ROTULO_TIPO_CHAVE[tipoDetectado]}. Se não for, toque no tipo certo.</p>}
            </div>
            <Campo id="nomePix" rotulo="Nome que aparece no Pix" placeholder="Como está no seu banco" autoComplete="off" value={nomePix} onChange={(e) => setNomePix(e.target.value)} erro={erroDe("nomePix")} />
          </div>
          <Rodape voltar={4}>
            <button type="submit" className="botao-primario">
              Continuar
            </button>
          </Rodape>
        </form>
      )}

      {passo === 6 && (
        <section className="surgir mt-6">
          <h1 className="text-2xl font-bold">Seus produtos e serviços</h1>
          <p className="mt-1 text-grafite">Já separamos os mais comuns da sua profissão. Ajuste os preços, desmarque o que não faz e adicione os seus. Isso entra no orçamento com um toque e no seu cartão.</p>
          <ul className="documento mt-5 divide-y divide-pauta">
            {(itens ?? []).map((i) => (
              <li key={i.chave} className={`flex items-center gap-3 px-3 py-2.5 ${i.marcado ? "" : "opacity-50"}`}>
                <input type="checkbox" checked={i.marcado} onChange={(e) => setItens((l) => l!.map((x) => (x.chave === i.chave ? { ...x, marcado: e.target.checked } : x)))} className="h-5 w-5" aria-label={`Incluir ${i.nome}`} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{i.nome}</span>
                <span className="flex items-center gap-1 text-sm text-grafite">
                  R$
                  <input
                    inputMode="decimal"
                    value={i.precoTexto}
                    onChange={(e) => setItens((l) => l!.map((x) => (x.chave === i.chave ? { ...x, precoTexto: e.target.value } : x)))}
                    className="campo tabular !min-h-10 w-20 !px-2 text-right"
                    aria-label={`Preço de ${i.nome}`}
                  />
                  /{i.unidade}
                </span>
              </li>
            ))}
            <li className="flex items-center gap-2 px-3 py-2.5">
              <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Outro serviço ou produto" className="campo !min-h-10 flex-1 !px-2 text-sm" aria-label="Nome do novo item" />
              <input value={novoPreco} onChange={(e) => setNovoPreco(e.target.value)} placeholder="R$" inputMode="decimal" className="campo tabular !min-h-10 w-20 !px-2 text-right text-sm" aria-label="Preço do novo item" />
              <button type="button" onClick={adicionarItem} className="botao-secundario !min-h-10 !w-auto px-3 text-sm">
                +
              </button>
            </li>
          </ul>
          <p className="ajuda mt-2">{(itens ?? []).filter((i) => i.marcado).length} itens serão salvos. Preço vazio = “a combinar”. Exemplo: {formatarReais(90)}.</p>
          {erroGeral && (
            <p role="alert" className="mt-4 rounded-xl bg-[#FDECEF] px-3 py-2 text-sm text-recusado">
              {erroGeral}
            </p>
          )}
          <Rodape voltar={5}>
            <button type="button" onClick={() => concluir(true)} className="botao-secundario !w-auto px-4" disabled={salvando}>
              Pular
            </button>
            <button type="button" onClick={() => concluir(false)} className="botao-primario" disabled={salvando}>
              {salvando ? "Salvando…" : "Concluir cadastro"}
            </button>
          </Rodape>
        </section>
      )}
    </main>
  );
}
