import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import Carregando from "@/componentes/Carregando";

/** Rotas do painel: exigem login e perfil. */
export function ExigePerfil({ children }: { children: ReactNode }) {
  const { usuario, perfil, carregando } = useAuth();
  const local = useLocation();
  if (carregando) return <Carregando />;
  if (!usuario) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />;
  if (!perfil) return <Navigate to="/comecar" replace />;
  return <>{children}</>;
}

/** Onboarding: exige login; quem já tem perfil vai para o painel. */
export function ExigeLoginSemPerfil({ children }: { children: ReactNode }) {
  const { usuario, perfil, carregando } = useAuth();
  if (carregando) return <Carregando />;
  if (!usuario) return <Navigate to="/entrar" replace />;
  if (perfil) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Tela de entrar: quem já está logado segue para o lugar certo. */
export function SoDeslogado({ children }: { children: ReactNode }) {
  const { usuario, perfil, carregando } = useAuth();
  if (carregando) return <Carregando />;
  if (usuario && perfil) return <Navigate to="/" replace />;
  if (usuario && !perfil) return <Navigate to="/comecar" replace />;
  return <>{children}</>;
}
