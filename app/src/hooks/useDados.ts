/** Hooks de dados da V2: todos os orçamentos (gráficos/clientes), catálogo, clientes e contratos. */
import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { observarCatalogo } from "@/lib/catalogo";
import { observarClientes } from "@/lib/clientes";
import { observarContrato, observarContratos } from "@/lib/contratos";
import type { Cliente, Contrato, ItemCatalogo, Orcamento } from "@/tipos";

const ERRO_REDE = "Não deu para carregar. Confira a internet e tente de novo.";

/** Até 500 orçamentos mais recentes, para gráficos e banco de clientes. */
export function useTodosOrcamentos(uid: string | undefined) {
  const [lista, setLista] = useState<Orcamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "orcamentos"), where("ownerId", "==", uid), orderBy("criadoEm", "desc"), limit(500));
    return onSnapshot(
      q,
      (snap) => {
        setLista(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Orcamento, "id">) })));
        setCarregando(false);
      },
      (e) => {
        console.error(e);
        setCarregando(false);
      },
    );
  }, [uid]);
  return { orcamentos: lista, carregando };
}

export function useCatalogo(uid: string | undefined) {
  const [itens, setItens] = useState<ItemCatalogo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    if (!uid) return;
    return observarCatalogo(
      uid,
      (l) => {
        setItens(l);
        setCarregando(false);
      },
      (e) => {
        console.error(e);
        setErro(ERRO_REDE);
        setCarregando(false);
      },
    );
  }, [uid]);
  return { itens, carregando, erro };
}

export function useClientes(uid: string | undefined) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    if (!uid) return;
    return observarClientes(
      uid,
      (l) => {
        setClientes(l);
        setCarregando(false);
      },
      (e) => {
        console.error(e);
        setErro(ERRO_REDE);
        setCarregando(false);
      },
    );
  }, [uid]);
  return { clientes, carregando, erro };
}

export function useContratos(uid: string | undefined) {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    if (!uid) return;
    return observarContratos(
      uid,
      (l) => {
        setContratos(l);
        setCarregando(false);
      },
      (e) => {
        console.error(e);
        setErro(ERRO_REDE);
        setCarregando(false);
      },
    );
  }, [uid]);
  return { contratos, carregando, erro };
}

export function useContrato(id: string | undefined) {
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    return observarContrato(
      id,
      (c) => {
        setContrato(c);
        setCarregando(false);
      },
      (e) => {
        console.error(e);
        setErro("Não deu para abrir este contrato.");
        setCarregando(false);
      },
    );
  }, [id]);
  return { contrato, carregando, erro };
}
