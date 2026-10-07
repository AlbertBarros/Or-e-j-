import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { registrarServiceWorker } from "./lib/pwa";

const raiz = document.getElementById("raiz");
if (!raiz) throw new Error("Elemento #raiz não encontrado em index.html");

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registrarServiceWorker();
