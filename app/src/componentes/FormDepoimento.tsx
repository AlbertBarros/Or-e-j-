import { useEffect, useState, type FormEvent } from "react";
import { IconeCheck, IconeEstrela } from "./Icones";
import { buscarMeuDepoimento, salvarDepoimento } from "@/lib/suporte";
import type { Usuario } from "@/tipos";

/** Depoimento do profissional sobre o Preço Fechado. Vai para revisão antes de aparecer no site. */
export default function FormDepoimento({ uid, perfil }: { uid: string; perfil: Usuario }) {
  const [nota, setNota] = useState(5);
  const [texto, setTexto] = useState("");
  const [autorizo, setAutorizo] = useState(true);
  const [estado, setEstado] = useState<"carregando" | "editando" | "enviando" | "enviado" | "publicado">("carregando");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    buscarMeuDepoimento(uid)
      .then((d) => {
        if (d) {
          setNota(d.nota);
          setTexto(d.texto);
        }
        setEstado(d?.publicado ? "publicado" : d ? "enviado" : "editando");
      })
      .catch(() => setEstado("editando"));
  }, [uid]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (texto.trim().length < 10) {
      setErro("Escreva pelo menos uma frase.");
      return;
    }
    if (!autorizo) {
      setErro("Para aparecer no site, precisamos da sua autorização.");
      return;
    }
    setErro(null);
    setEstado("enviando");
    try {
      await salvarDepoimento(uid, perfil, nota, texto);
      setEstado("enviado");
    } catch (e2) {
      console.error(e2);
      setErro("Não deu para enviar agora. Tente de novo.");
      setEstado("editando");
    }
  }

  if (estado === "carregando") return null;

  if (estado === "enviado" || estado === "publicado") {
    return (
      <div className="rounded-xl bg-[#E6F4EA] p-4 text-sm" role="status">
        <p className="flex items-center gap-2 font-semibold text-pago">
          <IconeCheck tamanho={18} /> {estado === "publicado" ? "Seu depoimento está no site. Obrigado!" : "Obrigado! Seu depoimento foi enviado para revisão."}
        </p>
        <p className="mt-1 text-tinta">“{texto}”</p>
        <button type="button" onClick={() => setEstado("editando")} className="botao-texto mt-2 !px-0">
          Editar depoimento
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-3" noValidate>
      <fieldset>
        <legend className="rotulo">Sua nota</legend>
        <div className="flex gap-1" role="radiogroup" aria-label="Nota de 1 a 5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={nota === n}
              aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
              onClick={() => setNota(n)}
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition-transform hover:scale-110 ${n <= nota ? "text-[#F59E0B]" : "text-pauta"}`}
            >
              <IconeEstrela tamanho={28} cheia={n <= nota} />
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="dep-texto" className="rotulo">
          O que mudou no seu trabalho?
        </label>
        <textarea
          id="dep-texto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={600}
          rows={3}
          className="campo min-h-24 py-2"
          placeholder="Ex.: meus clientes aprovam pelo celular e já pagam no Pix. Parei de perder orçamento."
        />
        <p className="ajuda">{600 - texto.length} caracteres restantes</p>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={autorizo} onChange={(e) => setAutorizo(e.target.checked)} className="mt-0.5 h-4 w-4" />
        <span>
          Autorizo mostrar este depoimento no site do Preço Fechado com meu nome ({perfil.nomeResponsavel}), meu negócio e minha cidade.
        </span>
      </label>
      {erro && (
        <p role="alert" className="erro">
          {erro}
        </p>
      )}
      <button type="submit" disabled={estado === "enviando"} className="botao-primario">
        {estado === "enviando" ? "Enviando…" : "Enviar depoimento"}
      </button>
    </form>
  );
}
