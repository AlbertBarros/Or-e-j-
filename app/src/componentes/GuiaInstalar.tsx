import { useEffect, useState } from "react";
import { IconeCelular, IconeCheck, IconeComputador } from "./Icones";
import { aoMudarPedidoInstalacao, instalarAgora, jaInstalado, pedidoInstalacao, plataformaAtual, type Plataforma } from "@/lib/pwa";

const ABAS: { id: Plataforma; rotulo: string }[] = [
  { id: "android", rotulo: "Android" },
  { id: "iphone", rotulo: "iPhone" },
  { id: "computador", rotulo: "Computador" },
];

const PASSOS: Record<Plataforma, { titulo: string; texto: string }[]> = {
  android: [
    { titulo: "Abra no Chrome", texto: "Entre no Preço Fechado pelo Google Chrome do celular." },
    { titulo: "Toque em Instalar", texto: "Use o botão “Instalar agora” aqui embaixo. Se ele não aparecer, toque no menu ⋮ do Chrome e em “Instalar app” (ou “Adicionar à tela inicial”)." },
    { titulo: "Pronto", texto: "O ícone do Preço Fechado aparece na tela inicial e abre sem a barra do navegador." },
  ],
  iphone: [
    { titulo: "Abra no Safari", texto: "No iPhone a instalação é feita pelo Safari. Se estiver em outro navegador, copie o endereço e abra no Safari." },
    { titulo: "Toque em Compartilhar", texto: "É o quadrado com uma seta para cima, na barra de baixo do Safari." },
    { titulo: "Adicionar à Tela de Início", texto: "Role a lista, toque em “Adicionar à Tela de Início” e depois em “Adicionar”." },
    { titulo: "Ligue os avisos", texto: "Abra o app pelo ícone novo e ligue os avisos aqui na Ajuda. No iPhone, os avisos só funcionam com o app instalado." },
  ],
  computador: [
    { titulo: "Abra no Chrome ou no Edge", texto: "Entre no Preço Fechado pelo Google Chrome ou pelo Microsoft Edge." },
    { titulo: "Clique em instalar", texto: "Use o botão “Instalar agora” aqui embaixo, ou o ícone de instalar (um monitor com seta) no fim da barra de endereço." },
    { titulo: "Pronto", texto: "O Preço Fechado abre numa janela própria e fica no menu Iniciar e na área de trabalho." },
  ],
};

/** Passo a passo de instalação por plataforma, com o botão de instalar quando o navegador permite. */
export default function GuiaInstalar() {
  const [aba, setAba] = useState<Plataforma>(() => plataformaAtual());
  const [podeInstalar, setPodeInstalar] = useState(() => Boolean(pedidoInstalacao()));
  const [instalado, setInstalado] = useState(() => jaInstalado());

  useEffect(
    () =>
      aoMudarPedidoInstalacao((e) => {
        setPodeInstalar(Boolean(e));
        if (!e && jaInstalado()) setInstalado(true);
      }),
    [],
  );

  async function instalar() {
    if (await instalarAgora()) setInstalado(true);
  }

  const atual = plataformaAtual();

  return (
    <div>
      {instalado && (
        <p className="mb-3 flex items-center gap-2 rounded-xl bg-[#E6F4EA] px-3 py-2 text-sm font-medium text-pago">
          <IconeCheck tamanho={18} /> O app já está instalado neste aparelho.
        </p>
      )}
      <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-carbono-claro/60 p-1" role="tablist" aria-label="Escolha o aparelho">
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            id={`aba-${a.id}`}
            aria-selected={aba === a.id}
            aria-controls="passos-instalar"
            onClick={() => setAba(a.id)}
            className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors ${aba === a.id ? "bg-white text-carbono shadow-sm" : "text-grafite hover:text-carbono"}`}
          >
            {a.id === "computador" ? <IconeComputador tamanho={16} /> : <IconeCelular tamanho={16} />}
            {a.rotulo}
          </button>
        ))}
      </div>
      <ol id="passos-instalar" role="tabpanel" aria-labelledby={`aba-${aba}`} className="mt-4 space-y-3">
        {PASSOS[aba].map((p, i) => (
          <li key={p.titulo} className="flex gap-3">
            <span className="tabular flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-carbono text-sm font-bold text-white">{i + 1}</span>
            <div>
              <p className="font-semibold leading-tight">{p.titulo}</p>
              <p className="mt-0.5 text-sm text-grafite">{p.texto}</p>
            </div>
          </li>
        ))}
      </ol>
      {!instalado && podeInstalar && aba !== "iphone" && aba === atual && (
        <button type="button" onClick={instalar} className="botao-primario mt-4">
          Instalar agora
        </button>
      )}
    </div>
  );
}
