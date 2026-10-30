import { useEffect, useState } from "react";
import { useActualizarAvance } from "@/hooks/useEntregables";
import { avanceDe } from "@/lib/rendimiento";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import type { Entregable } from "@/types";

function colorAvance(p: number) {
  return p >= 80 ? "bg-green-500" : p >= 40 ? "bg-amber-500" : "bg-red-500";
}

/**
 * Barra de avance real de un entregable. Si `editable` (lo ve su responsable), se arrastra para
 * reportar cuanto lleva — se guarda al soltar, no en cada movimiento. Aprobado/entregado quedan
 * fijos en 100% (ya no hay nada que avanzar).
 */
export function AvanceEntregable({ entregable, editable = false }: { entregable: Entregable; editable?: boolean }) {
  const actual = avanceDe(entregable);
  const [valor, setValor] = useState(actual);
  const guardar = useActualizarAvance();
  const cerrado = entregable.estado === "aprobado" || entregable.estado === "entregado";
  const estimado = entregable.porcentajeAvance === undefined && !cerrado;

  // Si cambia desde otra sesion (listener en vivo) se refleja aqui.
  useEffect(() => setValor(actual), [actual]);

  const [error, setError] = useState(false);
  const confirmar = () => {
    if (valor === actual) return;
    setError(false);
    guardar.mutate(
      { id: entregable.id, porcentajeAvance: valor },
      {
        onError: () => {
          setValor(actual);
          setError(true);
        },
      }
    );
  };

  return (
    <div className="flex min-w-0 items-center gap-2">
      {editable && !cerrado ? (
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={valor}
          onChange={(e) => setValor(Number(e.target.value))}
          onPointerUp={confirmar}
          onKeyUp={confirmar}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Avance de ${entregable.nombre}`}
          // Pista pintada con gradiente (relleno verde hasta el valor) — el range nativo se veia
          // como una barra negra gruesa en Chrome.
          style={{
            background: `linear-gradient(to right, #22C55E ${valor}%, rgb(var(--av-bg-secondary)) ${valor}%)`,
          }}
          className="h-2 w-full min-w-24 cursor-pointer appearance-none rounded-full [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-green-500 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-green-500 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow"
        />
      ) : (
        <Progress value={valor} indicadorClassName={colorAvance(valor)} className="h-2 min-w-24" />
      )}
      <span
        className={cn("w-10 shrink-0 text-right text-xs font-bold", estimado && "font-normal text-muted-foreground")}
        title={estimado ? "Estimado por el estado — aun no se reporta el avance real" : undefined}
      >
        {guardar.isPending ? "…" : `${valor}%`}
      </span>
      {error && <span className="shrink-0 text-[10px] text-destructive">No se guardó</span>}
    </div>
  );
}
