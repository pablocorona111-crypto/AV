import { onIdTokenChanged } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebase";

/**
 * ID token de Firebase del usuario logueado, para firmar las URLs de `/api/drive-video` y
 * `/api/drive-thumbnail` (esos endpoints ahora exigen sesion — ver `api/drive-video.ts`).
 * Va como query param porque un <video src>, un <img src> y un <a href> no pueden mandar
 * el header `Authorization`.
 *
 * Detalles que importan:
 * - Se escucha `onIdTokenChanged` en vez de leer `auth.currentUser` de una: al recargar la
 *   pagina, Firebase todavia no restauro la sesion cuando el componente monta, y `currentUser`
 *   seria null — el token nunca llegaria y el video se quedaria cargando para siempre.
 * - Una vez que hay token, se CONGELA para el resto de la vida del componente. Firebase renueva
 *   el token solo cada ~55 min; si se dejara actualizar, cambiaria el `src` del <video> a mitad
 *   de reproduccion y el navegador recargaria el video desde cero. Cada vez que se abre el
 *   dialogo el componente vuelve a montar y pide uno fresco (`getIdToken()` ya cachea solo,
 *   sin ir a la red, mientras no este vencido). Un token dura ~1h: de sobra para una revision.
 * - `listo` avisa que Firebase ya dijo la ultima palabra. Sirve para distinguir "todavia no se
 *   sabe" de "no hay sesion" y no dejar un spinner eterno.
 * - Modo demo (`auth` null, sin proyecto Firebase): `listo` true y token null de inmediato.
 *   Ahi los entregables de ejemplo no tienen fileId de Drive, asi que nunca se piden archivos.
 */
export function useIdToken(): { token: string | null; listo: boolean } {
  const [token, setToken] = useState<string | null>(null);
  const [listo, setListo] = useState(!auth);
  const congeladoRef = useRef(false);

  useEffect(() => {
    if (!auth) return;
    let vivo = true;

    const cancelar = onIdTokenChanged(auth, async (usuario) => {
      if (!usuario) {
        congeladoRef.current = false;
        if (!vivo) return;
        setToken(null);
        setListo(true);
        return;
      }
      if (congeladoRef.current) return;
      try {
        const fresco = await usuario.getIdToken();
        if (!vivo) return;
        congeladoRef.current = true;
        setToken(fresco);
      } catch {
        if (vivo) setToken(null);
      } finally {
        if (vivo) setListo(true);
      }
    });

    return () => {
      vivo = false;
      cancelar();
    };
  }, []);

  return { token, listo };
}
