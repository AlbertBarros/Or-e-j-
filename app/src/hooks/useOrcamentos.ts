import { useEffect, useState } from "react";
import {
  observarOrcamentos,
  observarResumo,
  observarOrcamento,
  type Filtro,
  type Resumo,
} from "@/lib/orcamentos";
import type { Orcamento } from "@/tipos";

const PAGINA = 20;

export function useOrcamentos(uid: string | undefined, filtro: Filtro) {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [limite, setLimite] = useState(PAGINA);
  const [temMais, setTemMais] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setLimite(PAGINA);
  }, [filtro]);

  useEffect(() => {
    if (!uid) return;
    setCarregando(true);
    setErro(null);
    return observarOrcamentos(
      uid,
      filtro,
      limite,
      (lista, mais) => {
        setOrcamentos(lista);
        setTemMais(mais);
        setCarregando(false);
      },
      (e) => {
        console.error(e);
        setErro("Não deu para carregar os orçamentos. Confira a internet e tente de novo.");
        setCarregando(false);
      },
    );
  }, [uid, filtro, limite]);

  return { orcamentos, carregando, erro, temMais, carregarMais: () => setLimite((l) => l + PAGINA) };
}

export function useResumo(uid: string | undefined) {
  const [resumo, setResumo] = useState<Resumo>({ aReceber: 0, recebidoNoMes: 0, atrasados: 0 });
  useEffect(() => {
    if (!uid) return;
    return observarResumo(uid, setResumo, (e) => console.error(e));
  }, [uid]);
  return resumo;
}

export function useOrcamento(id: string | undefined) {
  const [orcamento, setOrcamento] = useState<Orcamento | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    setCarregando(true);
    return observarOrcamento(
      id,
      (o) => {
        setOrcamento(o);
        setCarregando(false);
      },
      (e) => {
        console.error(e);
        setErro("Não deu para abrir este orçamento. Ele pode ter sido excluído ou você não tem acesso.");
        setCarregando(false);
      },
    );
  }, [id]);
  return { orcamento, carregando, erro };
}
