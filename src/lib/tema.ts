export type Tema = "claro" | "oscuro";

export const TEMA_STORAGE_KEY = "av-control:tema";

/** Lee la preferencia guardada; si no hay, cae al `prefers-color-scheme` del sistema.
 * Tiene que dar el MISMO resultado que el script inline de `index.html` (el que pinta antes de
 * que React monte) o se veria un parpadeo al hidratar. */
export function temaInicial(): Tema {
  if (typeof window === "undefined") return "claro";
  if (document.documentElement.classList.contains("dark")) return "oscuro";
  try {
    const guardado = window.localStorage.getItem(TEMA_STORAGE_KEY);
    if (guardado === "claro" || guardado === "oscuro") return guardado;
  } catch {
    /* localStorage bloqueado (modo privado / cookies off): se usa el default del sistema. */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro";
}

/* Store minimo compartido por todos los `useTema()`.
 *
 * Hace falta que sea un store y no `useState` por componente: el toggle vive en el Header pero
 * las graficas (Recharts) tambien necesitan saber el tema para pintar ejes y tooltips. Con
 * estado local cada componente tendria su propia copia y las graficas se quedarian con el tema
 * viejo al cambiar. */
let temaActual: Tema = typeof window === "undefined" ? "claro" : temaInicial();
const suscriptores = new Set<() => void>();

export function suscribirTema(cb: () => void) {
  suscriptores.add(cb);
  return () => {
    suscriptores.delete(cb);
  };
}

export function leerTema(): Tema {
  return temaActual;
}

/** Aplica el tema al `<html>`: la clase `dark` que lee Tailwind y el `color-scheme` que usan
 * los controles nativos (scrollbars, inputs de fecha, autofill). */
function pintarTema(tema: Tema) {
  const raiz = document.documentElement;
  raiz.classList.toggle("dark", tema === "oscuro");
  raiz.style.colorScheme = tema === "oscuro" ? "dark" : "light";
}

export function establecerTema(tema: Tema, persistir = true) {
  if (persistir) {
    try {
      window.localStorage.setItem(TEMA_STORAGE_KEY, tema);
    } catch {
      /* Sin persistencia disponible: el tema igual aplica en esta sesion. */
    }
  }
  if (tema === temaActual) return;
  temaActual = tema;
  pintarTema(tema);
  suscriptores.forEach((cb) => cb());
}

export function alternarTemaGlobal() {
  establecerTema(temaActual === "oscuro" ? "claro" : "oscuro");
}
