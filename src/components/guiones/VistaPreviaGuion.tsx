import type { Guion } from "@/types";

/** Como se le muestra el guion a quien aprueba (community) — mismo formato que la plantilla de
 * guion comercial de Grupo Ortiz (logo, objetivo, dialogo numerado), en vez de un cuadro de
 * texto plano. */
export function VistaPreviaGuion({ guion }: { guion: Guion }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 bg-black px-4 py-3 sm:px-5">
        <img src="/LOGO.png" alt="Grupo Ortiz" className="h-7 w-auto" />
        <span className="shrink-0 text-xs font-semibold tracking-wide text-white">
          GUION COMERCIAL / {guion.folio}
        </span>
      </div>

      <div className="space-y-4 p-4 sm:p-6">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground">GUION DE CONTENIDO</p>
          <h2 className="mt-0.5 text-xl font-bold leading-tight sm:text-2xl">{guion.titulo}</h2>
        </div>

        <div className="border-l-4 border-orange-500 bg-bg-secondary p-3">
          <p className="text-xs font-bold tracking-wide text-orange-600">OBJETIVO</p>
          <p className="mt-1 text-sm leading-relaxed">{guion.objetivo}</p>
        </div>

        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-orange-500">01</span>
            <span className="text-sm font-bold uppercase tracking-wide">Dialogo</span>
          </div>
          <div className="mt-1 h-0.5 w-10 bg-orange-500" />
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{guion.contenido}</div>
        </div>
      </div>
    </div>
  );
}
