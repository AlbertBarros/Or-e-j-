import { BrowserRouter, Routes, Route } from "react-router";
import { lazy, Suspense, type ReactNode } from "react";
import Carregando from "@/componentes/Carregando";
import { ProvedorAuth } from "@/hooks/useAuth";
import { ExigePerfil, ExigeLoginSemPerfil, SoDeslogado } from "@/rotas/Guardas";
import Entrar from "@/paginas/Entrar";
import Comecar from "@/paginas/Comecar";
import Inicio from "@/paginas/Inicio";
import Orcamentos from "@/paginas/Orcamentos";
import NovoOrcamento from "@/paginas/NovoOrcamento";
import DetalheOrcamento from "@/paginas/DetalheOrcamento";
import Cobrar from "@/paginas/Cobrar";
import EmitirRecibo from "@/paginas/EmitirRecibo";
import Clientes from "@/paginas/Clientes";
import ClienteDetalhe from "@/paginas/ClienteDetalhe";
import EnviarMensagem from "@/paginas/EnviarMensagem";
import Contratos from "@/paginas/Contratos";
import NovoContrato from "@/paginas/NovoContrato";
import DetalheContrato from "@/paginas/DetalheContrato";
import Catalogo from "@/paginas/Catalogo";
import Cartao from "@/paginas/Cartao";
import Mais from "@/paginas/Mais";
import Conta from "@/paginas/Conta";
import Ajuda from "@/paginas/Ajuda";
import NovoRecibo from "@/paginas/NovoRecibo";
import { ProvedorTour } from "@/tour/Tour";

// Painel administrativo: pacote separado, só baixa para quem abre /admin
const Admin = lazy(() => import("@/paginas/admin/Admin"));
import NaoEncontrada from "@/paginas/NaoEncontrada";
import { capturarRascunhoDaUrl } from "@/lib/rascunhoImportado";

// Veio do gerador do site com ?rascunho=? Guarda antes de qualquer redirecionamento de login.
capturarRascunhoDaUrl();

const P = ({ children }: { children: ReactNode }) => <ExigePerfil>{children}</ExigePerfil>;

export default function App() {
  return (
    <ProvedorAuth>
      <BrowserRouter>
        <ProvedorTour>
        <Routes>
          <Route path="/entrar" element={<SoDeslogado><Entrar /></SoDeslogado>} />
          <Route path="/comecar" element={<ExigeLoginSemPerfil><Comecar /></ExigeLoginSemPerfil>} />

          {/* Abas */}
          <Route path="/" element={<P><Inicio /></P>} />
          <Route path="/orcamentos" element={<P><Orcamentos /></P>} />
          <Route path="/clientes" element={<P><Clientes /></P>} />
          <Route path="/contratos" element={<P><Contratos /></P>} />
          <Route path="/mais" element={<P><Mais /></P>} />

          {/* Orçamentos */}
          <Route path="/orcamentos/novo" element={<P><NovoOrcamento /></P>} />
          <Route path="/orcamentos/:id" element={<P><DetalheOrcamento /></P>} />
          <Route path="/orcamentos/:id/editar" element={<P><NovoOrcamento /></P>} />
          <Route path="/orcamentos/:id/cobrar" element={<P><Cobrar /></P>} />
          <Route path="/orcamentos/:id/recibo" element={<P><EmitirRecibo /></P>} />

          {/* Clientes */}
          <Route path="/clientes/mensagem" element={<P><EnviarMensagem /></P>} />
          <Route path="/clientes/:id" element={<P><ClienteDetalhe /></P>} />

          {/* Contratos */}
          <Route path="/contratos/novo" element={<P><NovoContrato /></P>} />
          <Route path="/contratos/:id" element={<P><DetalheContrato /></P>} />

          {/* Mais */}
          <Route path="/catalogo" element={<P><Catalogo /></P>} />
          <Route path="/cartao" element={<P><Cartao /></P>} />
          <Route path="/conta" element={<P><Conta /></P>} />
          <Route path="/ajuda" element={<P><Ajuda /></P>} />
          <Route path="/admin" element={<P><Suspense fallback={<Carregando />}><Admin /></Suspense></P>} />

          {/* Recibo avulso (sem orçamento) */}
          <Route path="/recibos/novo" element={<P><NovoRecibo /></P>} />

          {/* /o/:id, /c/:id e /v/:uid (páginas públicas) são um pacote separado, decidido em main.tsx */}
          <Route path="*" element={<NaoEncontrada />} />
        </Routes>
        </ProvedorTour>
      </BrowserRouter>
    </ProvedorAuth>
  );
}
