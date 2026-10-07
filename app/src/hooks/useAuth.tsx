import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { observarPerfil } from "@/lib/usuario";
import type { Usuario } from "@/tipos";

interface EstadoAuth {
  usuario: User | null;
  perfil: Usuario | null;
  /** true enquanto não sabemos se há login e, havendo, se há perfil */
  carregando: boolean;
  erro: string | null;
}

const Contexto = createContext<EstadoAuth>({ usuario: null, perfil: null, carregando: true, erro: null });

export function ProvedorAuth({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [loginResolvido, setLoginResolvido] = useState(false);
  const [perfilResolvido, setPerfilResolvido] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUsuario(u);
      setLoginResolvido(true);
      if (!u) {
        setPerfil(null);
        setPerfilResolvido(true);
      } else {
        setPerfilResolvido(false);
      }
    });
  }, []);

  const uid = usuario?.uid;
  useEffect(() => {
    if (!uid) return;
    setErro(null);
    return observarPerfil(
      uid,
      (p) => {
        setPerfil(p);
        setPerfilResolvido(true);
      },
      (e) => {
        console.error(e);
        setErro("Não deu para carregar seus dados. Confira a internet e recarregue a página.");
        setPerfilResolvido(true);
      },
    );
  }, [uid]);

  const carregando = !loginResolvido || (Boolean(usuario) && !perfilResolvido);

  return <Contexto.Provider value={{ usuario, perfil, carregando, erro }}>{children}</Contexto.Provider>;
}

export function useAuth(): EstadoAuth {
  return useContext(Contexto);
}
