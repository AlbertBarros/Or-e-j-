import { lazy, Suspense } from "react";
import Carregando from "@/componentes/Carregando";
import PaginaPublica from "./PaginaPublica";

const PaginaContrato = lazy(() => import("./PaginaContrato"));
const PaginaCartao = lazy(() => import("./PaginaCartao"));

/** Entrada da área pública (/o/:id orçamento, /c/:id contrato, /v/:uid cartão): sem roteador, sem Auth. */
export default function AppPublico() {
  const partes = window.location.pathname.split("/").filter(Boolean);
  const tipo = partes[0];
  const id = partes[1] ?? "";
  return (
    <Suspense fallback={<Carregando />}>
      {tipo === "c" ? <PaginaContrato id={id} /> : tipo === "v" ? <PaginaCartao uid={id} /> : <PaginaPublica id={id} />}
    </Suspense>
  );
}
