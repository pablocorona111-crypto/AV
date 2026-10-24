import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  alternarTemaGlobal,
  establecerTema,
  leerTema,
  suscribirTema,
  TEMA_STORAGE_KEY,
} from "@/lib/tema";

/** Estado del tema claro/oscuro, compartido por toda la app.
 *
 * El tema YA viene aplicado al `<html>` por el script inline de `index.html` (evita el
 * parpadeo blanco al recargar); aqui solo se lee el store y se expone el toggle. */
export function useTema() {
  const tema = useSyncExternalStore(suscribirTema, leerTema, () => "claro" as const);

  // Si el usuario cambia el tema en otra pestaña, esta lo sigue.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== TEMA_STORAGE_KEY) return;
      if (e.newValue === "claro" || e.newValue === "oscuro") establecerTema(e.newValue, false);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const alternarTema = useCallback(() => alternarTemaGlobal(), []);

  return { tema, alternarTema, esOscuro: tema === "oscuro" };
}
