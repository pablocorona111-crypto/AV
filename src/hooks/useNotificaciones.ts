import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { escucharNotificaciones, marcarNotificacionLeida } from "@/services/notificacionesService";
import type { Notificacion } from "@/types";

export function useNotificaciones() {
  const { usuario } = useAuth();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);

  // Depende del id (no del objeto usuario): AuthContext recrea el objeto en cada snapshot del
  // doc del usuario y eso cerraba/reabria el listener re-descargando todas las notificaciones.
  const uid = usuario?.id;
  useEffect(() => {
    if (!uid) {
      setNotificaciones([]);
      return;
    }
    return escucharNotificaciones(uid, setNotificaciones);
  }, [uid]);

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  return { notificaciones, noLeidas, marcarLeida: marcarNotificacionLeida };
}
