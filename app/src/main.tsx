import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Carregando from "./componentes/Carregando";
import { registrarServiceWorker } from "./lib/pwa";

const raiz = document.getElementById("raiz");
if (!raiz) throw new Error("Elemento #raiz não encontrado em index.html");

// As páginas públicas (/o/:id orçamento, /c/:id contrato, /v/:uid cartão) são um pacote separado:
// não carregam Auth, roteador nem o painel.
const ehPublica = /^\/(o|c|v)\//.test(window.location.pathname);
const App = lazy(() => (ehPublica ? import("./publico/AppPublico") : import("./App")));

createRoot(raiz).render(
  <StrictMode>
    <Suspense fallback={<Carregando />}>
      <App />
    </Suspense>
  </StrictMode>,
);

registrarServiceWorker();
