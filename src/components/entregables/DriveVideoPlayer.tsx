import { useEffect, useRef, useState } from "react";
import { Clock, Loader2, Maximize2, Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export function formatoTiempo(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Como se dimensiona el escenario del video (aqui estuvieron varios bugs: "se ve chueco",
 * "no se ve nada", "se desajusta en otra pantalla").
 *
 * Version anterior: calculaba el ancho de la columna con una formula de `vh` que ADIVINABA
 * cuanto alto ocupaban el titulo/subtitulo/barras del reproductor (un numero fijo restado).
 * En una pantalla distinta (mas angosta, con el titulo envolviendo a 2 lineas, con otra fuente
 * del sistema) ese numero quedaba mal y el video se desbordaba o se encogia de mas.
 *
 * Version actual: ya no se adivina nada.
 * - En pantallas grandes (`lg:` — la fila de video+observaciones queda lado a lado con
 *   `items-stretch` en RevisarEntregableDialog.tsx), el ESCENARIO mide su alto al 100% de esa
 *   fila (una medida real, resuelta por el navegador con el espacio que de verdad sobra) y de
 *   ahi deriva su ancho con `aspect-ratio`. `max-width:100%` es solo un techo de seguridad.
 * - En pantallas angostas (video y observaciones apilados), no hay una fila con alto definido
 *   para heredar — ahi se mide al reves: ancho 100% (de columna apilada) con alto derivado,
 *   topado a `60vh` para no tapar toda la pantalla.
 * - `min-height` evita que la caja colapse a 0 en cualquier caso raro.
 * - El <video> usa `h-full w-full object-cover` mas `scale-[1.03]` (3% de "overscan"): Chrome
 *   puede renderizar una linea de 1px en un borde cuando un <video> esta en un contenedor con
 *   `overflow-hidden` + esquinas redondeadas (bug de compositing conocido). El 3% extra empuja
 *   ese borde fuera del area visible recortada, sin notarse como zoom.
 */
const ESCENARIO_BASE =
  "relative flex items-center justify-center overflow-hidden bg-black " +
  "w-full max-h-[60vh] min-h-[180px] " +
  "lg:h-full lg:w-auto lg:max-w-full lg:max-h-none lg:min-h-[160px]";
export function DriveVideoPlayer({
  fileId,
  accessToken,
  orientacion,
  onMomentoPausa,
  onError,
  onOrientacion,
  onRatio,
  onVideoRef,
}: {
  fileId: string;
  accessToken: string;
  orientacion?: "vertical" | "horizontal" | null;
  onMomentoPausa?: (tiempo: string) => void;
  onError?: () => void;
  onOrientacion?: (orientacion: "vertical" | "horizontal") => void;
  onRatio?: (ratio: number) => void;
  /** Entrega el elemento <video> real al padre — asi el boton "usar minuto actual" puede leer
   * `currentTime` bajo demanda, sin depender de que el evento `pause` se haya disparado. */
  onVideoRef?: (video: HTMLVideoElement | null) => void;
}) {
  const [cargando, setCargando] = useState(true);
  const [ratio, setRatio] = useState<number | null>(null);
  const [intento, setIntento] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const asignarRef = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    onVideoRef?.(el);
  };
  const src = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&access_token=${encodeURIComponent(accessToken)}`;

  // Sin esto, el contador de reintentos de un video anterior se arrastraba al siguiente —
  // un video nuevo con mala suerte se quedaba sin su propio reintento.
  useEffect(() => {
    setIntento(0);
  }, [fileId]);

  // Un primer error (ej. un hipo de red pidiendole el video a Drive) no tira la toalla de una:
  // se reintenta una vez solita (remontando el <video> con una key distinta) antes de avisarle
  // al padre que use el visor de respaldo. Asi un hipo pasajero no te saca del reproductor propio.
  const manejarError = () => {
    if (intento < 1) {
      setIntento((n) => n + 1);
      setCargando(true);
    } else {
      onError?.();
    }
  };

  // Mientras no se conoce la proporcion real se usa una de referencia segun la orientacion ya
  // etiquetada — asi la caja no da un salto grande cuando el video carga.
  const esVertical = ratio != null ? ratio < 1 : orientacion === "vertical";
  const ratioCaja = ratio ?? (esVertical ? 9 / 16 : 16 / 9);
  const IconoOrientacion = esVertical ? Smartphone : Monitor;

  const formatoChip = (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white/70">
      <IconoOrientacion className="h-3 w-3" />
      {esVertical ? "9:16" : "16:9"}
    </span>
  );

  const botonFullscreen = (
    <button
      type="button"
      title="Pantalla completa"
      onClick={() => videoRef.current?.requestFullscreen?.()}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10 hover:text-white"
    >
      <Maximize2 className="h-3.5 w-3.5" />
    </button>
  );

  // En vertical, header y pie eran barras solidas separadas del video — en una columna angosta
  // se leian como si fueran bandas negras (letterbox) encima del propio video. Aqui en cambio
  // van flotando SOBRE el video (degradado, sin fondo solido), como en cualquier app de reels:
  // no le quitan alto al video y no se confunden con un margen.
  if (esVertical) {
    return (
      <div
        className={cn(ESCENARIO_BASE, "mx-auto rounded-lg shadow-card ring-1 ring-black/10")}
        style={{ aspectRatio: String(ratioCaja) }}
      >
        {cargando && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-white/50" />
            <span className="text-[11px] text-white/40">Cargando video...</span>
          </div>
        )}
        <video
          key={`${fileId}-${intento}`}
          ref={asignarRef}
          src={src}
          controls
          preload="metadata"
          className={cn("h-full w-full scale-[1.03] object-cover", cargando && "invisible")}
          onError={manejarError}
          onCanPlay={() => setCargando(false)}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            setCargando(false);
            const r = v.videoWidth / v.videoHeight;
            if (!Number.isFinite(r) || r <= 0) return;
            setRatio(r);
            onOrientacion?.(r < 1 ? "vertical" : "horizontal");
            onRatio?.(r);
          }}
          onPause={(e) => {
            const v = e.currentTarget;
            if (onMomentoPausa && !v.ended) onMomentoPausa(formatoTiempo(v.currentTime));
          }}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent px-2.5 pb-5 pt-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#C1EB1F]" />
            {formatoChip}
          </div>
          <div className="pointer-events-auto">{botonFullscreen}</div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-5">
          <Clock className="h-3 w-3 shrink-0 text-white/50" />
          <span className="truncate text-[10.5px] leading-tight text-white/60">
            Pausa el video para marcar el minuto.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-lg bg-[#0B0B0C] shadow-card ring-1 ring-black/10 lg:h-full">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#141416] px-2.5 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#C1EB1F]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.09em] text-white/55">Visor</span>
          {formatoChip}
        </div>
        {botonFullscreen}
      </div>

      <div
        className={cn(ESCENARIO_BASE, "lg:min-h-0 lg:flex-1")}
        style={{ aspectRatio: String(ratioCaja) }}
      >
        {cargando && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-white/50" />
            <span className="text-[11px] text-white/40">Cargando video...</span>
          </div>
        )}
        <video
          key={`${fileId}-${intento}`}
          ref={asignarRef}
          src={src}
          controls
          preload="metadata"
          className={cn("h-full w-full scale-[1.03] object-cover", cargando && "invisible")}
          onError={manejarError}
          // Red de seguridad: si por lo que sea no llego `loadedmetadata`, el video no se queda invisible.
          onCanPlay={() => setCargando(false)}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            setCargando(false);
            const r = v.videoWidth / v.videoHeight;
            // Un ratio no finito (metadata incompleta) romperia `aspect-ratio` y dejaria la caja sin forma.
            if (!Number.isFinite(r) || r <= 0) return;
            setRatio(r);
            onOrientacion?.(r < 1 ? "vertical" : "horizontal");
            onRatio?.(r);
          }}
          onPause={(e) => {
            const v = e.currentTarget;
            if (onMomentoPausa && !v.ended) onMomentoPausa(formatoTiempo(v.currentTime));
          }}
        />
      </div>

      <div className="flex shrink-0 items-center gap-1.5 border-t border-white/10 bg-[#141416] px-2.5 py-1.5">
        <Clock className="h-3 w-3 shrink-0 text-white/35" />
        <span className="truncate text-[10.5px] leading-tight text-white/45">
          Pausa el video para marcar el minuto de la observacion.
        </span>
      </div>
    </div>
  );
}
