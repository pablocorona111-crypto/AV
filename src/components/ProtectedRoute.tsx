import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { Role } from "@/types";

export function ProtectedRoute({
  children,
  rolesPermitidos,
}: {
  children: ReactNode;
  rolesPermitidos?: Role[];
}) {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Cargando...
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        No tienes permiso para ver esta seccion.
      </div>
    );
  }

  return <>{children}</>;
}
