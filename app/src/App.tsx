import { BrowserRouter, Routes, Route } from "react-router";
import { ProvedorAuth } from "@/hooks/useAuth";
import { ExigePerfil, ExigeLoginSemPerfil, SoDeslogado } from "@/rotas/Guardas";
import Entrar from "@/paginas/Entrar";
import Comecar from "@/paginas/Comecar";
import Painel from "@/paginas/Painel";
import NovoOrcamento from "@/paginas/NovoOrcamento";
import DetalheOrcamento from "@/paginas/DetalheOrcamento";
import Cobrar from "@/paginas/Cobrar";
import EmitirRecibo from "@/paginas/EmitirRecibo";
import Conta from "@/paginas/Conta";
import NaoEncontrada from "@/paginas/NaoEncontrada";
import { capturarRascunhoDaUrl } from "@/lib/rascunhoImportado";

// Veio do gerador do site com ?rascunho=? Guarda antes de qualquer redirecionamento de login.
capturarRascunhoDaUrl();

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
          <Route
            path="/orcamentos/novo"
            element={
              <ExigePerfil>
                <NovoOrcamento />
              </ExigePerfil>
            }
          />
          <Route
            path="/orcamentos/:id"
            element={
              <ExigePerfil>
                <DetalheOrcamento />
              </ExigePerfil>
            }
          />
          <Route
            path="/orcamentos/:id/editar"
            element={
              <ExigePerfil>
                <NovoOrcamento />
              </ExigePerfil>
            }
          />
          <Route
            path="/orcamentos/:id/cobrar"
            element={
              <ExigePerfil>
                <Cobrar />
              </ExigePerfil>
            }
          />
          <Route
            path="/orcamentos/:id/recibo"
            element={
              <ExigePerfil>
                <EmitirRecibo />
              </ExigePerfil>
            }
          />
          <Route
            path="/conta"
            element={
              <ExigePerfil>
                <Conta />
              </ExigePerfil>
            }
          />
          {/* /o/:id (página pública) é um pacote separado, decidido em main.tsx */}
          <Route path="*" element={<NaoEncontrada />} />
        </Routes>
      </BrowserRouter>
    </ProvedorAuth>
  );
}
