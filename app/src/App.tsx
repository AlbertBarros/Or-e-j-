import { BrowserRouter, Routes, Route } from "react-router";
import { ProvedorAuth } from "@/hooks/useAuth";
import { ExigePerfil, ExigeLoginSemPerfil, SoDeslogado } from "@/rotas/Guardas";
import Entrar from "@/paginas/Entrar";
import Comecar from "@/paginas/Comecar";
import Painel from "@/paginas/Painel";
import NaoEncontrada from "@/paginas/NaoEncontrada";

export default function App() {
  return (
    <ProvedorAuth>
      <BrowserRouter>
        <Routes>
          <Route
            path="/entrar"
            element={
              <SoDeslogado>
                <Entrar />
              </SoDeslogado>
            }
          />
          <Route
            path="/comecar"
            element={
              <ExigeLoginSemPerfil>
                <Comecar />
              </ExigeLoginSemPerfil>
            }
          />
          <Route
            path="/"
            element={
              <ExigePerfil>
                <Painel />
              </ExigePerfil>
            }
          />
          {/* /o/:id (página pública, chunk separado) entra na Fase 3 */}
          <Route path="*" element={<NaoEncontrada />} />
        </Routes>
      </BrowserRouter>
    </ProvedorAuth>
  );
}
