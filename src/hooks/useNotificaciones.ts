import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { escucharNotificaciones, marcarNotificacionLeida } from "@/services/notificacionesService";
import type { Notificacion } from "@/types";

export function useNotificaciones() {
  const { usuario } = useAuth();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);

  useEffect(() => {
    if (!usuario) {
      setNotificaciones([]);
      return;
    }
    return escucharNotificaciones(usuario.id, setNotificaciones);
  }, [usuario]);

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  return { notificaciones, noLeidas, marcarLeida: marcarNotificacionLeida };
}
