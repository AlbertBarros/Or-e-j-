import { useEffect, useState } from "react";

/**
 * Depoimentos reais de quem usa o app (coleção depoimentos/, só os publicados).
 * O profissional escreve na tela Ajuda do app; o dono do sistema publica no console do Firebase (publicado = true).
 * Sem depoimentos publicados, a seção não aparece.
 */
interface Depoimento {
  nome: string;
  negocio: string;
  profissao: string;
  cidade: string;
  nota: number;
  texto: string;
}

const projeto = import.meta.env.PUBLIC_FIREBASE_PROJECT_ID;
const chave = import.meta.env.PUBLIC_FIREBASE_API_KEY;

type Valor = { stringValue?: string; integerValue?: string; booleanValue?: boolean };

async function buscar(): Promise<Depoimento[]> {
  if (!projeto || !chave) return [];
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${projeto}/databases/(default)/documents:runQuery?key=${chave}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "depoimentos" }],
        where: { fieldFilter: { field: { fieldPath: "publicado" }, op: "EQUAL", value: { booleanValue: true } } },
        limit: 12,
      },
    }),
  });
  if (!r.ok) return [];
  const linhas = (await r.json()) as { document?: { fields: Record<string, Valor> } }[];
  return linhas
    .filter((l) => l.document)
    .map(({ document }) => {
      const f = document!.fields;
      return {
        nome: f.nome?.stringValue ?? "",
        negocio: f.negocio?.stringValue ?? "",
        profissao: f.profissao?.stringValue ?? "",
        cidade: f.cidade?.stringValue ?? "",
        nota: Number(f.nota?.integerValue ?? 5),
        texto: f.texto?.stringValue ?? "",
      };
    })
    .filter((d) => d.texto);
}

function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function Depoimentos() {
  const [lista, setLista] = useState<Depoimento[]>([]);

  useEffect(() => {
    buscar()
      .then(setLista)
      .catch(() => setLista([]));
  }, []);

  if (lista.length === 0) return null;

  return (
    <section aria-labelledby="dep-titulo" className="mt-24">
      <div className="text-center">
        <p className="titulo-secao">Depoimentos</p>
        <h2 id="dep-titulo" className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Quem usa, recomenda
        </h2>
      </div>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((d, i) => (
          <li key={i} className="cartao cartao-recurso flex flex-col p-5">
            <p className="text-[#F59E0B]" aria-label={`Nota ${d.nota} de 5`}>
              {"★".repeat(Math.max(1, Math.min(5, d.nota)))}
              <span className="text-pauta">{"★".repeat(5 - Math.max(1, Math.min(5, d.nota)))}</span>
            </p>
            <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed">“{d.texto}”</blockquote>
            <div className="mt-4 flex items-center gap-3">
              <span className="icone-profissao !h-10 !w-10 text-sm font-bold">{iniciais(d.nome)}</span>
              <span className="min-w-0">
                <span className="block font-semibold">{d.nome}</span>
                <span className="block truncate text-sm text-grafite">
                  {d.negocio}
                  {d.cidade ? ` · ${d.cidade}` : ""}
                </span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
