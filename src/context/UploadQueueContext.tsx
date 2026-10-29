import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export interface TareaSubida {
  id: string;
  nombre: string;
  progreso: number;
  estado: "subiendo" | "lista" | "error";
  error?: string;
}

interface UploadQueueValue {
  tareas: TareaSubida[];
  iniciarTarea: (nombre: string) => string;
  actualizarProgreso: (id: string, progreso: number) => void;
  marcarLista: (id: string) => void;
  marcarError: (id: string, error: string) => void;
  quitarTarea: (id: string) => void;
}

const UploadQueueContext = createContext<UploadQueueValue | null>(null);

/**
 * Cola de subidas GLOBAL (vive en la raiz de la app, no dentro de un dialogo) — para que subir
 * un video/foto siga corriendo aunque la persona cierre el dialogo de revision y se vaya a hacer
 * otra cosa (ver otro entregable, subir algo mas). La subida en si ya era una promesa de JS que
 * segu[i]a corriendo igual aunque se desmontara el componente; lo unico que faltaba era un lugar
 * FUERA de ese componente donde reportar el progreso — eso es esta cola, mostrada por
 * `UploadQueuePanel` como tarjetas flotantes.
 */
export function UploadQueueProvider({ children }: { children: ReactNode }) {
  const [tareas, setTareas] = useState<TareaSubida[]>([]);

  const iniciarTarea = useCallback((nombre: string) => {
    const id = `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setTareas((actual) => [...actual, { id, nombre, progreso: 0, estado: "subiendo" }]);
    return id;
  }, []);

  const actualizarProgreso = useCallback((id: string, progreso: number) => {
    setTareas((actual) => actual.map((t) => (t.id === id ? { ...t, progreso } : t)));
  }, []);

  const marcarLista = useCallback((id: string) => {
    setTareas((actual) => actual.map((t) => (t.id === id ? { ...t, progreso: 100, estado: "lista" } : t)));
    setTimeout(() => setTareas((actual) => actual.filter((t) => t.id !== id)), 4000);
  }, []);

  const marcarError = useCallback((id: string, error: string) => {
    setTareas((actual) => actual.map((t) => (t.id === id ? { ...t, estado: "error", error } : t)));
  }, []);

  const quitarTarea = useCallback((id: string) => {
    setTareas((actual) => actual.filter((t) => t.id !== id));
  }, []);

  return (
    <UploadQueueContext.Provider
      value={{ tareas, iniciarTarea, actualizarProgreso, marcarLista, marcarError, quitarTarea }}
    >
      {children}
    </UploadQueueContext.Provider>
  );
}

export function useUploadQueue() {
  const ctx = useContext(UploadQueueContext);
  if (!ctx) throw new Error("useUploadQueue debe usarse dentro de UploadQueueProvider");
  return ctx;
}
