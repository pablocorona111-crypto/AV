import { AlertCircle, CheckCircle2, Upload, X } from "lucide-react";
import { useUploadQueue } from "@/context/UploadQueueContext";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/** Tarjetas flotantes de subidas en curso — montado una vez en la raiz de la app (ver main.tsx),
 * asi que se ven sin importar que dialogo este abierto o cerrado en ese momento. */
export function UploadQueuePanel() {
  const { tareas, quitarTarea } = useUploadQueue();

  if (tareas.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex w-72 flex-col gap-2">
      {tareas.map((t) => (
        <div
          key={t.id}
          className="space-y-1.5 rounded-lg border border-border bg-card p-3 shadow-card"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              {t.estado === "lista" ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
              ) : t.estado === "error" ? (
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
              ) : (
                <Upload className="h-3.5 w-3.5 shrink-0 animate-pulse text-accent" />
              )}
              <span className="truncate text-xs font-medium">{t.nombre}</span>
            </div>
            {t.estado !== "subiendo" && (
              <button
                type="button"
                onClick={() => quitarTarea(t.id)}
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-text-primary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {t.estado === "error" ? (
            <p className="text-[11px] text-destructive">{t.error}</p>
          ) : (
            <div className="flex items-center gap-2">
              <Progress value={t.progreso} className={cn("h-1.5", t.estado === "lista" && "opacity-60")} />
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {t.estado === "lista" ? "Listo" : `${t.progreso}%`}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
