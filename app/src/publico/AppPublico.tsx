import PaginaPublica from "./PaginaPublica";

/** Entrada da área pública (/o/:id): sem roteador, sem Auth, chunk separado e leve. */
export default function AppPublico() {
  const partes = window.location.pathname.split("/").filter(Boolean); // ["o", "{id}"]
  const id = partes[1] ?? "";
  return <PaginaPublica id={id} />;
}
