import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Tour interativo: um "celular" com telas simplificadas do app e um cursor que mostra onde tocar,
 * passo a passo: cadastrar cliente → montar orçamento → enviar → cliente aprova → contrato e recibo.
 * Auto-reproduz; dá para pausar, avançar e recomeçar. Respeita "reduzir movimento".
 */

type Tela = "clientes" | "orcamento" | "enviar" | "aprovado" | "fechar";

interface Passo {
  tela: Tela;
  alvo?: string; // data-alvo do elemento a clicar
  legenda: string;
  efeito?: string; // mudança de estado após o clique
  espera: number; // ms até o próximo passo
}

const PASSOS: Passo[] = [
  { tela: "clientes", alvo: "novo-cliente", legenda: "Na aba Clientes, toque em + para cadastrar um cliente.", efeito: "abrir-form", espera: 1500 },
  { tela: "clientes", alvo: "campo-nome", legenda: "Digite o nome e o WhatsApp. Só isso é obrigatório.", efeito: "digitar-nome", espera: 1900 },
  { tela: "clientes", alvo: "salvar-cliente", legenda: "Salve. O cliente fica no seu banco para sempre.", efeito: "cliente-salvo", espera: 1500 },
  { tela: "orcamento", alvo: "do-catalogo", legenda: "Novo orçamento: toque em “Do catálogo” e escolha um serviço já cadastrado.", efeito: "abrir-catalogo", espera: 1500 },
  { tela: "orcamento", alvo: "item-chuveiro", legenda: "Um toque e o item entra com preço e unidade. O total atualiza na hora.", efeito: "item-adicionado", espera: 1700 },
  { tela: "orcamento", alvo: "frete", legenda: "Precisa cobrar deslocamento? “Frete” calcula a distância pelo mapa.", efeito: "frete-on", espera: 1700 },
  { tela: "orcamento", alvo: "salvar-orc", legenda: "Salve o rascunho.", efeito: "orc-salvo", espera: 1200 },
  { tela: "enviar", alvo: "modelo-completo", legenda: "Antes de enviar, escolha o modelo e veja a prévia exatamente como o cliente vai receber.", efeito: "modelo-3", espera: 1800 },
  { tela: "enviar", alvo: "enviar-whats", legenda: "Enviar no WhatsApp: a mensagem já vai pronta com o link.", efeito: "enviado", espera: 1600 },
  { tela: "aprovado", alvo: "aprovar", legenda: "No celular do cliente: ele lê e toca em “Aprovar orçamento”. Sem app, sem cadastro.", efeito: "carimbo", espera: 1900 },
  { tela: "aprovado", legenda: "Aprovou, apareceu o Pix. Você recebe a notificação no app.", espera: 1900 },
  { tela: "fechar", alvo: "gerar-contrato", legenda: "O app sugere o contrato já preenchido. O cliente assina pelo link.", efeito: "contrato", espera: 1900 },
  { tela: "fechar", alvo: "marcar-pago", legenda: "Recebeu? “Marcar como pago” e o recibo em PDF sai com sua logo e garantia.", efeito: "pago", espera: 2200 },
];

const VEL_PADRAO = 1;

export default function TourInterativo() {
  const [i, setI] = useState(0);
  const [tocando, setTocando] = useState(true);
  const [estado, setEstado] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState({ x: 160, y: 300, visivel: false, clicando: false });
  const [onda, setOnda] = useState<{ x: number; y: number; k: number } | null>(null);
  const telaRef = useRef<HTMLDivElement>(null);
  const reduzir = useRef(false);

  useEffect(() => {
    reduzir.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const passo = PASSOS[i]!;

  // Posiciona o cursor sobre o alvo e simula o clique
  const executar = useCallback(
    (p: Passo) => {
      const tela = telaRef.current;
      if (!tela) return;
      const alvo = p.alvo ? tela.querySelector<HTMLElement>(`[data-alvo="${p.alvo}"]`) : null;
      if (!alvo) {
        setCursor((c) => ({ ...c, visivel: false }));
        return;
      }
      const rt = tela.getBoundingClientRect();
      const ra = alvo.getBoundingClientRect();
      const x = ra.left - rt.left + ra.width * 0.6;
      const y = ra.top - rt.top + ra.height * 0.55;
      setCursor({ x, y, visivel: true, clicando: false });
      const atraso = reduzir.current ? 50 : 800;
      const t1 = setTimeout(() => {
        setCursor((c) => ({ ...c, clicando: true }));
        alvo.classList.add("alvo-destaque");
        setOnda({ x, y, k: Date.now() });
        if (p.efeito) setEstado((s) => new Set(s).add(p.efeito!));
      }, atraso);
      const t2 = setTimeout(() => {
        setCursor((c) => ({ ...c, clicando: false }));
        alvo.classList.remove("alvo-destaque");
      }, atraso + 250);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    },
    [],
  );

  useEffect(() => {
    const limpar = executar(passo);
    return () => limpar?.();
  }, [passo, executar]);

  useEffect(() => {
    if (!tocando) return;
    const total = (reduzir.current ? 400 : 900) + passo.espera;
    const t = setTimeout(() => {
      if (i >= PASSOS.length - 1) {
        setTocando(false);
      } else setI(i + 1);
    }, total / VEL_PADRAO);
    return () => clearTimeout(t);
  }, [i, tocando, passo.espera]);

  function reiniciar() {
    setEstado(new Set());
    setI(0);
    setTocando(true);
  }
  function irPara(n: number) {
    // Reconstrói o estado até o passo n
    const s = new Set<string>();
    for (let k = 0; k < n; k++) {
      const e = PASSOS[k]!.efeito;
      if (e) s.add(e);
    }
    setEstado(s);
    setI(n);
  }
  const tem = (k: string) => estado.has(k);

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* Painel de texto */}
      <div className="order-2 lg:order-1">
        <p className="titulo-secao">Tour guiado · passo {i + 1} de {PASSOS.length}</p>
        <p className="mt-3 min-h-[4.5rem] text-xl font-semibold leading-snug sm:text-2xl" aria-live="polite">
          {passo.legenda}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setTocando((v) => !v)} className="botao-primario !min-h-11 !px-5 text-sm">
            {tocando ? "Pausar" : i >= PASSOS.length - 1 ? "Ver de novo" : "Continuar"}
          </button>
          <button type="button" onClick={() => irPara(Math.max(0, i - 1))} className="botao-secundario !min-h-11 !px-4 text-sm" disabled={i === 0}>
            ← Anterior
          </button>
          <button type="button" onClick={() => irPara(Math.min(PASSOS.length - 1, i + 1))} className="botao-secundario !min-h-11 !px-4 text-sm" disabled={i >= PASSOS.length - 1}>
            Próximo →
          </button>
          <button type="button" onClick={reiniciar} className="inline-flex min-h-11 items-center px-3 text-sm font-medium text-grafite hover:text-carbono">
            Recomeçar
          </button>
        </div>
        <ol className="mt-5 flex flex-wrap gap-1.5" aria-label="Passos">
          {PASSOS.map((p, k) => (
            <li key={k}>
              <button type="button" onClick={() => irPara(k)} aria-label={`Passo ${k + 1}`} aria-current={k === i ? "step" : undefined} className={`h-2.5 rounded-full transition-all ${k === i ? "w-8 bg-carbono" : k < i ? "w-2.5 bg-carbono/40" : "w-2.5 bg-pauta"}`} />
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-grafite">É uma simulação. No app de verdade cada passo leva alguns segundos.</p>
      </div>

      {/* Celular */}
      <div className="order-1 flex justify-center lg:order-2">
        <div className="relative">
          <span className="mancha" aria-hidden="true" />
          <div className="telefone" style={{ maxWidth: 300 }}>
            <div ref={telaRef} className="tela relative select-none text-[13px] leading-snug">
              {/* Cursor e onda */}
              {cursor.visivel && (
                <svg className={`cursor-tour ${cursor.clicando ? "clicando" : ""}`} style={{ left: cursor.x, top: cursor.y }} viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 3l14 8-6 1.5L16 20l-3 1.3-3-7.3L5 18z" fill="#fff" stroke="#1A1D23" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
              )}
              {onda && <span key={onda.k} className="onda-clique" style={{ left: onda.x, top: onda.y }} aria-hidden="true" />}

              {/* Barra de status */}
              <div className="flex h-10 items-end justify-between px-5 pb-1 text-[10px] font-semibold text-grafite">
                <span>9:41</span>
                <span>●●● ▲ ▮</span>
              </div>

              {passo.tela === "clientes" && (
                <div className="px-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-lg font-bold">Clientes</p>
                      <p className="text-[11px] text-grafite">{tem("cliente-salvo") ? "5 clientes" : "4 clientes"}</p>
                    </div>
                    <span data-alvo="novo-cliente" className="flex h-9 w-9 items-center justify-center rounded-xl bg-carbono text-lg text-white">+</span>
                  </div>
                  {!tem("abrir-form") ? (
                    <ul className="cartao mt-3 divide-y divide-pauta text-[12px]">
                      {["Ana Pereira", "Carlos Lima", "Fernanda Costa", "Roberto Alves"].map((n) => (
                        <li key={n} className="flex items-center gap-2 px-3 py-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-pauta font-bold text-carbono">{n[0]}</span>
                          <span className="flex-1 font-medium">{n}</span>
                          <span className="text-[10px] text-grafite">›</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="cartao mt-3 space-y-2 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-grafite">Novo cliente</p>
                      <div>
                        <p className="text-[10px] text-grafite">Nome</p>
                        <div data-alvo="campo-nome" className="flex h-9 items-center rounded-lg border border-pauta bg-folha px-2">
                          {tem("digitar-nome") ? <span>Maria Souza</span> : <span className="h-4 w-0.5 animate-pulse bg-carbono" />}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-grafite">WhatsApp</p>
                        <div className="flex h-9 items-center rounded-lg border border-pauta bg-folha px-2">{tem("digitar-nome") ? "(61) 98888-7777" : ""}</div>
                      </div>
                      <div data-alvo="salvar-cliente" className={`mt-1 flex h-9 items-center justify-center rounded-lg font-semibold text-white ${tem("cliente-salvo") ? "bg-pago" : "bg-carbono"}`}>
                        {tem("cliente-salvo") ? "Salvo ✓" : "Salvar"}
                      </div>
                    </div>
                  )}
                  <Abas ativa="Clientes" />
                </div>
              )}

              {passo.tela === "orcamento" && (
                <div className="px-3">
                  <p className="text-lg font-bold">Novo orçamento</p>
                  <div className="cartao mt-2 p-3 text-[12px]">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-grafite">Cliente</p>
                    <p className="mt-1 font-medium">Maria Souza · (61) 98888-7777</p>
                  </div>
                  <div className="cartao mt-2 p-3 text-[12px]">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-grafite">Itens</p>
                    {tem("item-adicionado") ? (
                      <div className="mt-1 flex justify-between border-b border-pauta pb-1.5">
                        <span>
                          Instalação de chuveiro elétrico
                          <span className="block text-[10px] text-grafite">1 un × R$ 120,00</span>
                        </span>
                        <span className="font-semibold">R$ 120,00</span>
                      </div>
                    ) : (
                      <div className="mt-1 h-8 rounded-lg border border-dashed border-pauta" />
                    )}
                    <div className="mt-2 flex gap-2">
                      <span className="flex h-8 flex-1 items-center justify-center rounded-lg border border-pauta text-[11px] font-semibold text-carbono">+ Adicionar item</span>
                      <span data-alvo="do-catalogo" className="flex h-8 flex-1 items-center justify-center rounded-lg border border-pauta text-[11px] font-semibold text-carbono">+ Do catálogo</span>
                    </div>
                    {tem("abrir-catalogo") && !tem("item-adicionado") && (
                      <ul className="mt-2 divide-y divide-pauta rounded-lg border border-pauta text-[11px]">
                        <li data-alvo="item-chuveiro" className="flex justify-between px-2 py-1.5">
                          <span>Instalação de chuveiro elétrico</span>
                          <span className="text-grafite">R$ 120,00/un</span>
                        </li>
                        <li className="flex justify-between px-2 py-1.5">
                          <span>Troca de disjuntor</span>
                          <span className="text-grafite">R$ 90,00/un</span>
                        </li>
                        <li className="flex justify-between px-2 py-1.5">
                          <span>Visita técnica</span>
                          <span className="text-grafite">R$ 80,00/un</span>
                        </li>
                      </ul>
                    )}
                  </div>
                  <div className="cartao mt-2 p-3 text-[12px]">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-grafite">Frete / deslocamento</p>
                      <span data-alvo="frete" className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tem("frete-on") ? "border-carbono bg-carbono text-white" : "border-pauta text-grafite"}`}>
                        {tem("frete-on") ? "Remover frete" : "+ Adicionar frete"}
                      </span>
                    </div>
                    {tem("frete-on") && (
                      <p className="mt-1.5 text-[11px] text-grafite">
                        QNM 36, Taguatinga · <span className="font-semibold text-tinta">23,3 km</span> · R$ 20 + 23,3 × R$ 2,50 = <span className="font-semibold text-tinta">R$ 78,25</span>
                      </p>
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 border-t-2 border-double border-tinta bg-folha p-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[12px] font-medium">Total</span>
                      <span className="text-xl font-bold">{tem("item-adicionado") ? (tem("frete-on") ? "R$ 198,25" : "R$ 120,00") : "R$ 0,00"}</span>
                    </div>
                    <div data-alvo="salvar-orc" className={`mt-2 flex h-9 items-center justify-center rounded-lg text-[12px] font-semibold text-white ${tem("orc-salvo") ? "bg-pago" : "bg-carbono"}`}>
                      {tem("orc-salvo") ? "Salvo ✓" : "Salvar rascunho"}
                    </div>
                  </div>
                </div>
              )}

              {passo.tela === "enviar" && (
                <div className="px-3">
                  <p className="text-base font-bold">Como o cliente vai ver</p>
                  <div className="mt-2 grid grid-cols-3 gap-1.5 text-[10px]">
                    {["Simples", "Detalhado", "Completo"].map((m, k) => (
                      <span key={m} data-alvo={m === "Completo" ? "modelo-completo" : undefined} className={`rounded-lg border px-2 py-1.5 font-semibold ${(tem("modelo-3") ? k === 2 : k === 1) ? "border-carbono bg-carbono-claro text-carbono" : "border-pauta"}`}>
                        {m}
                      </span>
                    ))}
                  </div>
                  <div className="mx-auto mt-3 w-[200px] rounded-[1.4rem] border-4 border-tinta bg-fundo p-1.5">
                    <div className="overflow-hidden rounded-xl border border-pauta bg-folha text-[9px]">
                      <div className={`flex items-center justify-between p-2 ${tem("modelo-3") ? "bg-carbono text-white" : "border-b border-pauta"}`}>
                        <span className="font-bold">JS Elétrica</span>
                        <span className="font-bold">Nº 0009</span>
                      </div>
                      <div className="p-2">
                        <p className="text-grafite">Cliente</p>
                        <p className="font-medium">Maria Souza</p>
                        <div className="mt-1.5 flex justify-between border-t border-pauta pt-1.5">
                          <span>Instalação de chuveiro</span>
                          <span>R$ 120,00</span>
                        </div>
                        <div className="flex justify-between text-grafite">
                          <span>Frete (23,3 km)</span>
                          <span>R$ 78,25</span>
                        </div>
                        <div className="mt-1 flex justify-between border-t border-tinta pt-1 font-bold">
                          <span>Total</span>
                          <span className={tem("modelo-3") ? "text-carbono" : ""}>R$ 198,25</span>
                        </div>
                        {tem("modelo-3") && <p className="mt-1 text-grafite">Pagamento: Pix ou Crédito</p>}
                      </div>
                    </div>
                    <div className="mt-1.5 flex h-6 items-center justify-center rounded-lg bg-pago text-[9px] font-semibold text-white">Aprovar orçamento</div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 space-y-1.5 border-t border-pauta bg-folha p-3">
                    <div data-alvo="enviar-whats" className={`flex h-9 items-center justify-center gap-1.5 rounded-lg text-[12px] font-semibold text-white ${tem("enviado") ? "bg-pago" : "bg-carbono"}`}>
                      {tem("enviado") ? "Enviado ✓" : "Enviar no WhatsApp"}
                    </div>
                    <div className="flex h-9 items-center justify-center rounded-lg border border-pauta text-[12px] font-semibold text-carbono">Baixar em PDF</div>
                  </div>
                </div>
              )}

              {passo.tela === "aprovado" && (
                <div className="px-3">
                  <p className="text-center text-[11px] text-grafite">JS Elétrica enviou um orçamento para você</p>
                  <div className="relative mt-2 overflow-hidden rounded-xl border border-pauta bg-folha text-[11px]">
                    <div className="flex items-center justify-between bg-carbono p-2.5 text-white">
                      <span className="font-bold">JS Elétrica</span>
                      <span className="font-bold">Nº 0009</span>
                    </div>
                    {tem("carimbo") && <span className="absolute right-3 top-10 rotate-[-12deg] rounded border-[3px] border-pago bg-white/85 px-2 py-0.5 text-sm font-extrabold tracking-widest text-pago">APROVADO</span>}
                    <div className="p-2.5">
                      <p className="text-grafite">Preparado para</p>
                      <p className="font-medium">Maria Souza</p>
                      <div className="mt-2 flex justify-between border-t border-pauta pt-2">
                        <span>Instalação de chuveiro elétrico</span>
                        <span>R$ 120,00</span>
                      </div>
                      <div className="flex justify-between text-grafite">
                        <span>Frete (23,3 km)</span>
                        <span>R$ 78,25</span>
                      </div>
                      <div className="mt-1 flex justify-between border-t border-tinta pt-1 text-base font-bold">
                        <span className="text-[12px] font-medium">Total</span>
                        <span className="text-carbono">R$ 198,25</span>
                      </div>
                    </div>
                  </div>
                  {tem("carimbo") ? (
                    <div className="cartao mt-2 p-3 text-[11px]">
                      <p className="font-bold text-pago">Pague com Pix</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="grid h-14 w-14 shrink-0 grid-cols-6 gap-px rounded bg-white p-1">
                          {Array.from({ length: 36 }, (_, k) => (
                            <span key={k} className={`${(k * 7) % 3 === 0 || k % 5 === 0 ? "bg-tinta" : "bg-white"}`} />
                          ))}
                        </span>
                        <div className="flex-1">
                          <p className="text-grafite">R$ 198,25 para João Silva</p>
                          <div className="mt-1 flex h-7 items-center justify-center rounded-lg bg-carbono text-[10px] font-semibold text-white">Copiar código Pix</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-x-0 bottom-0 space-y-1.5 border-t border-pauta bg-folha p-3">
                      <div data-alvo="aprovar" className="flex h-9 items-center justify-center rounded-lg bg-pago text-[12px] font-semibold text-white">Aprovar orçamento</div>
                      <p className="text-center text-[11px] text-grafite">Recusar</p>
                    </div>
                  )}
                </div>
              )}

              {passo.tela === "fechar" && (
                <div className="px-3">
                  <div className="flex items-center justify-between">
                    <p className="text-base font-bold">Orçamento nº 0009</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tem("pago") ? "bg-pago text-white" : "bg-[#E6F4EA] text-pago"}`}>{tem("pago") ? "Pago" : "Aprovado"}</span>
                  </div>
                  <div data-alvo="gerar-contrato" className={`cartao mt-2 flex items-center gap-2 border-dashed p-2.5 text-[11px] ${tem("contrato") ? "!border-pago" : ""}`}>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E6F4EA] text-pago">✎</span>
                    <span>
                      <span className="block font-semibold">{tem("contrato") ? "Contrato nº 0003 · assinado" : "Sugestão: gerar contrato"}</span>
                      <span className="block text-grafite">{tem("contrato") ? "Assinado por Maria Souza · PDF disponível" : "Já preenchido, para o cliente assinar pelo celular."}</span>
                    </span>
                  </div>
                  <div className="cartao mt-2 p-3 text-[11px]">
                    <p className="text-grafite">Total aprovado</p>
                    <p className="text-xl font-bold">R$ 198,25</p>
                    {tem("pago") && <p className="mt-1 font-semibold text-pago">Recibo nº 0003 emitido · enviar no WhatsApp</p>}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 space-y-1.5 border-t border-pauta bg-folha p-3">
                    <div data-alvo="marcar-pago" className={`flex h-9 items-center justify-center rounded-lg text-[12px] font-semibold text-white ${tem("pago") ? "bg-carbono" : "bg-pago"}`}>
                      {tem("pago") ? "Gerar recibo" : "Marcar como pago"}
                    </div>
                    <div className="flex gap-1.5">
                      <span className="flex h-8 flex-1 items-center justify-center rounded-lg border border-pauta text-[11px] font-semibold text-carbono">Cobrar</span>
                      <span className="flex h-8 flex-1 items-center justify-center rounded-lg border border-pauta text-[11px] font-semibold text-carbono">Copiar link</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Abas({ ativa }: { ativa: string }) {
  const abas = ["Início", "Orçamentos", "Clientes", "Contratos", "Mais"];
  return (
    <div className="absolute inset-x-0 bottom-0 grid grid-cols-5 border-t border-pauta bg-folha py-2 text-[8px] font-semibold leading-none">
      {abas.map((a) => (
        <span key={a} className={`flex flex-col items-center gap-0.5 ${a === ativa ? "text-carbono" : "text-grafite"}`}>
          <span className={`h-4 w-6 rounded-full ${a === ativa ? "bg-carbono-claro" : ""}`} />
          {a}
        </span>
      ))}
    </div>
  );
}
