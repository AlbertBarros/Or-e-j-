import { useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import Logo from "@/componentes/Logo";
import Campo from "@/componentes/Campo";
import { useAuth } from "@/hooks/useAuth";
import { criarPerfil } from "@/lib/usuario";
import { comprimirLogo, LOGO_MAX_BYTES } from "@/lib/logo";
import { validarNome, validarWhatsapp, validarChavePix, ROTULO_TIPO_CHAVE } from "@/lib/validacao";
import { detectarTipoChave, type TipoChavePix } from "@shared/src/pix";
import dados from "@shared/data/profissoes.json";

const PROFISSOES = (dados as { profissoes: { slug: string; nome: string }[] }).profissoes.map((p) => ({
  slug: p.slug,
  nome: p.nome,
}));
const TIPOS: TipoChavePix[] = ["cpf", "cnpj", "telefone", "email", "aleatoria"];
const TOTAL_PASSOS = 3;

export default function Comecar() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const [passo, setPasso] = useState(1);

  // Passo 1
  const [profissao, setProfissao] = useState("");
  // Passo 2
  const [nomeNegocio, setNomeNegocio] = useState("");
  const [nomeResponsavel, setNomeResponsavel] = useState(usuario?.displayName ?? "");
  const [whatsapp, setWhatsapp] = useState("");
  const [cidade, setCidade] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [processandoLogo, setProcessandoLogo] = useState(false);
  const campoLogo = useRef<HTMLInputElement>(null);
  // Passo 3
  const [chavePix, setChavePix] = useState("");
  const [tipoManual, setTipoManual] = useState<TipoChavePix | null>(null);
  const [nomePix, setNomePix] = useState("");

  const [erros, setErros] = useState<Record<string, string | null>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const tipoDetectado = useMemo(() => (chavePix.trim() ? detectarTipoChave(chavePix) : null), [chavePix]);
  const tipoChave: TipoChavePix = tipoManual ?? tipoDetectado ?? "cpf";

  function erroDe(campo: string) {
    return erros[campo] ?? null;
  }

  function irParaPasso2() {
    if (!profissao) {
      setErroGeral("Escolha a sua profissão. Se não estiver na lista, toque em \"Outra\".");
      return;
    }
    setErroGeral(null);
    setPasso(2);
  }

  function irParaPasso3(e: FormEvent) {
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
    setErroGeral(null);
    setPasso(3);
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

  async function concluir(e: FormEvent) {
    e.preventDefault();
    if (!usuario) return;
    const novos = {
      chavePix: validarChavePix(chavePix, tipoChave),
      nomePix: validarNome(nomePix, "o nome que aparece no Pix"),
    };
    setErros(novos);
    if (Object.values(novos).some(Boolean)) return;
    setSalvando(true);
    setErroGeral(null);
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
      });
      navegar("/", { replace: true });
    } catch (err) {
      console.error(err);
      setErroGeral("Não deu para salvar seu cadastro. Confira a internet e tente de novo.");
      setSalvando(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 pb-28 pt-6">
      <header className="flex items-center justify-between">
        <Logo tamanho={28} />
        <span className="text-sm text-grafite">
          Passo {passo} de {TOTAL_PASSOS}
        </span>
      </header>
      <div className="mt-4 grid grid-cols-3 gap-1" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`h-1.5 rounded-full ${n <= passo ? "bg-carbono" : "bg-pauta"}`} />
        ))}
      </div>

      {passo === 1 && (
        <section className="mt-6" aria-labelledby="p1">
          <h1 id="p1" className="text-2xl font-bold">
            Qual é a sua profissão?
          </h1>
          <p className="mt-1 text-grafite">Usamos isso para sugerir os itens dos seus orçamentos.</p>
          <div className="mt-5 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Profissão">
            {PROFISSOES.map((p) => (
              <button
                key={p.slug}
                type="button"
                role="radio"
                aria-checked={profissao === p.slug}
                onClick={() => setProfissao(p.slug)}
                className={`opcao ${profissao === p.slug ? "opcao-ativa" : ""}`}
              >
                {p.nome}
              </button>
            ))}
            <button
              type="button"
              role="radio"
              aria-checked={profissao === "outra"}
              onClick={() => setProfissao("outra")}
              className={`opcao ${profissao === "outra" ? "opcao-ativa" : ""}`}
            >
              Outra
            </button>
          </div>
          {erroGeral && (
            <p role="alert" className="erro mt-3">
              {erroGeral}
            </p>
          )}
          <div className="fixed inset-x-0 bottom-0 border-t border-pauta bg-folha p-4">
            <div className="mx-auto max-w-[560px]">
              <button type="button" onClick={irParaPasso2} className="botao-primario">
                Continuar
              </button>
            </div>
          </div>
        </section>
      )}

      {passo === 2 && (
        <form className="mt-6" onSubmit={irParaPasso3} noValidate aria-labelledby="p2">
          <h1 id="p2" className="text-2xl font-bold">
            Seu negócio
          </h1>
          <p className="mt-1 text-grafite">É o que o cliente vê no topo do orçamento.</p>
          <div className="mt-5 space-y-4">
            <Campo
              id="nomeNegocio"
              rotulo="Nome do negócio ou do serviço"
              placeholder="Ex.: JS Elétrica"
              autoComplete="organization"
              value={nomeNegocio}
              onChange={(e) => setNomeNegocio(e.target.value)}
              erro={erroDe("nomeNegocio")}
              ajuda="Pode ser o seu próprio nome, se preferir."
            />
            <Campo
              id="nomeResponsavel"
              rotulo="Seu nome"
              placeholder="Ex.: João Silva"
              autoComplete="name"
              value={nomeResponsavel}
              onChange={(e) => setNomeResponsavel(e.target.value)}
              erro={erroDe("nomeResponsavel")}
            />
            <Campo
              id="whatsapp"
              rotulo="Seu WhatsApp"
              placeholder="(61) 99999-8888"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              erro={erroDe("whatsapp")}
              ajuda="O cliente fala com você por aqui a partir do orçamento."
            />
            <Campo
              id="cidade"
              rotulo="Cidade"
              placeholder="Ex.: Brasília"
              autoComplete="address-level2"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              erro={erroDe("cidade")}
            />

            <div>
              <span className="rotulo">Logo (opcional)</span>
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-pauta bg-folha">
                  {logo ? (
                    <img src={logo} alt="Prévia da sua logo" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-xs text-grafite">sem logo</span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                  <label className="botao-secundario !min-h-11 cursor-pointer text-sm">
                    {processandoLogo ? "Preparando…" : logo ? "Trocar imagem" : "Enviar imagem"}
                    <input
                      ref={campoLogo}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => escolherLogo(e.target.files?.[0])}
                      disabled={processandoLogo}
                    />
                  </label>
                  {logo && (
                    <button type="button" onClick={() => setLogo(null)} className="botao-texto">
                      Remover
                    </button>
                  )}
                </div>
              </div>
              {erroDe("logo") ? (
                <p className="erro" role="alert">
                  {erroDe("logo")}
                </p>
              ) : (
                <p className="ajuda">
                  PNG ou JPG. Reduzimos para até {Math.round(LOGO_MAX_BYTES / 1024)} KB. A logo aparece no orçamento no
                  plano Pro.
                </p>
              )}
            </div>
          </div>

          <div className="fixed inset-x-0 bottom-0 border-t border-pauta bg-folha p-4">
            <div className="mx-auto flex max-w-[560px] gap-2">
              <button type="button" onClick={() => setPasso(1)} className="botao-secundario !w-auto px-4">
                Voltar
              </button>
              <button type="submit" className="botao-primario">
                Continuar
              </button>
            </div>
          </div>
        </form>
      )}

      {passo === 3 && (
        <form className="mt-6" onSubmit={concluir} noValidate aria-labelledby="p3">
          <h1 id="p3" className="text-2xl font-bold">
            Seu Pix
          </h1>
          <p className="mt-1 text-grafite">
            O cliente paga direto para a sua chave. O dinheiro não passa pelo Orça Já.
          </p>
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
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={tipoChave === t}
                    onClick={() => setTipoManual(t)}
                    className={`opcao !min-h-11 px-3 ${tipoChave === t ? "opcao-ativa" : ""}`}
                  >
                    {ROTULO_TIPO_CHAVE[t]}
                  </button>
                ))}
              </div>
              {tipoDetectado && !tipoManual && (
                <p className="ajuda">Detectamos {ROTULO_TIPO_CHAVE[tipoDetectado]}. Se não for, toque no tipo certo.</p>
              )}
            </div>
            <Campo
              id="nomePix"
              rotulo="Nome que aparece no Pix"
              placeholder="Como está no seu banco"
              autoComplete="off"
              value={nomePix}
              onChange={(e) => setNomePix(e.target.value)}
              erro={erroDe("nomePix")}
              ajuda="O banco do cliente mostra esse nome antes de confirmar o pagamento."
            />
          </div>
          {erroGeral && (
            <p role="alert" className="mt-4 rounded-[10px] bg-[#FDECEF] px-3 py-2 text-sm text-recusado">
              {erroGeral}
            </p>
          )}
          <div className="fixed inset-x-0 bottom-0 border-t border-pauta bg-folha p-4">
            <div className="mx-auto flex max-w-[560px] gap-2">
              <button type="button" onClick={() => setPasso(2)} className="botao-secundario !w-auto px-4" disabled={salvando}>
                Voltar
              </button>
              <button type="submit" className="botao-primario" disabled={salvando}>
                {salvando ? "Salvando…" : "Concluir cadastro"}
              </button>
            </div>
          </div>
        </form>
      )}
    </main>
  );
}
