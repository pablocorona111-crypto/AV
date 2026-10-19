import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { puedeVerRuta } from "@/lib/roles";

/** Bloquea el acceso directo por URL a rutas que el rol del usuario no deberia ver. */
export function RutaProtegida({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const { pathname } = useLocation();

  if (!puedeVerRuta(usuario, pathname)) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        No tienes permiso para ver esta seccion.
      </div>
    );
  }

  return <>{children}</>;
}
