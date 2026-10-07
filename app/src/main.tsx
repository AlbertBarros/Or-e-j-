import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Carregando from "./componentes/Carregando";
import { registrarServiceWorker } from "./lib/pwa";

const raiz = document.getElementById("raiz");
if (!raiz) throw new Error("Elemento #raiz não encontrado em index.html");

// A página pública (/o/:id) é um pacote separado: não carrega Auth, roteador nem o painel.
const ehPublica = window.location.pathname.startsWith("/o/");
const App = lazy(() => (ehPublica ? import("./publico/AppPublico") : import("./App")));

createRoot(raiz).render(
  <StrictMode>
    <Suspense fallback={<Carregando />}>
      <App />
    </Suspense>
  </StrictMode>,
);

registrarServiceWorker();
