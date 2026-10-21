import { useRef, useState } from "react";
import { Clock, Loader2, Maximize2, Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

function formatoTiempo(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Alto maximo del escenario del video.
 *
 * El dialogo que lo contiene es `max-h-[85vh]` con `p-6`; entre el titulo, el subtitulo y las
 * dos barras del reproductor se van ~200px. Restarlos aqui es lo que garantiza que el visor
 * entre COMPLETO sin que el dialogo haga scroll y corte el video por abajo.
 * Es una medida definida (depende del viewport, no del contenido), asi que nunca se resuelve a 0.
 */
export const ALTO_VISOR = "clamp(260px, calc(85vh - 200px), 820px)";

/**
 * Ancho que debe tener la columna del video para que el escenario llegue justo a `ALTO_VISOR`
 * sin barras negras. Como el escenario deriva su alto del ancho, dar el ancho exacto es lo que
 * hace que el video quede lo mas grande posible dentro del espacio disponible.
 */
export function anchoVisor(ratio: number): string {
  return `calc(${ALTO_VISOR} * ${ratio})`;
}

/**
 * Reproductor propio (no el iframe de Drive). El video se transmite directo desde Drive
 * (el navegador pide por partes, como streaming) en vez de descargarse completo antes de
 * poder verse — esto es lo que hace que abra rapido. El token va como query param porque
 * un <video src> normal no puede mandar el header de autorizacion.
 *
 * Como se dimensiona (importante, aqui estuvo el bug de "se ve chueco / no se ve nada"):
 *
 * 1. El escenario SIEMPRE se mide por el ancho (`width:100%`, que es una medida definida) y de
 *    ahi deriva el alto con `aspect-ratio`. Nunca al reves. Fijar el alto y dejar el ancho en
 *    `auto` hacia que `max-width` recortara el ancho y el navegador RECALCULARA el alto hacia
 *    abajo: el video salia mas chico de lo pedido y se desbordaba del dialogo.
 * 2. `min-height` le pone piso al escenario, asi que la caja no puede colapsar a 0 aunque la
 *    columna se encoja o el ratio llegue raro.
 * 3. El <video> usa `h-full w-full object-cover` MAS `scale-[1.03]` (un 3% de "overscan"). El
 *    `object-cover` ya deberia llenar la caja sin dejar huecos, pero Chrome puede renderizar una
 *    linea de 1px en un borde cuando un <video> esta dentro de un contenedor con `overflow-hidden`
 *    + esquinas redondeadas (bug de compositing conocido, no es un problema de nuestro CSS de
 *    tamaño). El 3% extra empuja ese borde fuera del area visible recortada, sin notarse como zoom.
 */
export function DriveVideoPlayer({
  fileId,
  accessToken,
  orientacion,
  onMomentoPausa,
  onError,
  onOrientacion,
  onRatio,
}: {
  fileId: string;
  accessToken: string;
  orientacion?: "vertical" | "horizontal" | null;
  onMomentoPausa?: (tiempo: string) => void;
  onError?: () => void;
  onOrientacion?: (orientacion: "vertical" | "horizontal") => void;
  onRatio?: (ratio: number) => void;
}) {
  const [cargando, setCargando] = useState(true);
  const [ratio, setRatio] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const src = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&access_token=${encodeURIComponent(accessToken)}`;

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
        className="relative mx-auto flex w-full items-center justify-center overflow-hidden rounded-lg bg-black shadow-card ring-1 ring-black/10"
        style={{ width: "100%", aspectRatio: String(ratioCaja), maxHeight: ALTO_VISOR, minHeight: "220px" }}
      >
        {cargando && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-white/50" />
            <span className="text-[11px] text-white/40">Cargando video...</span>
          </div>
        )}
        <video
          key={fileId}
          ref={videoRef}
          src={src}
          controls
          preload="metadata"
          className={cn("h-full w-full scale-[1.03] object-cover", cargando && "invisible")}
          onError={() => onError?.()}
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
    <div className="flex w-full flex-col overflow-hidden rounded-lg bg-[#0B0B0C] shadow-card ring-1 ring-black/10">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-[#141416] px-2.5 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#C1EB1F]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.09em] text-white/55">Visor</span>
          {formatoChip}
        </div>
        {botonFullscreen}
      </div>

      <div
        className="relative flex items-center justify-center bg-black"
        style={{
          width: "100%",
          aspectRatio: String(ratioCaja),
          maxHeight: ALTO_VISOR,
          minHeight: "220px",
        }}
      >
        {cargando && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-white/50" />
            <span className="text-[11px] text-white/40">Cargando video...</span>
          </div>
        )}
        <video
          key={fileId}
          ref={videoRef}
          src={src}
          controls
          preload="metadata"
          className={cn("h-full w-full scale-[1.03] object-cover", cargando && "invisible")}
          onError={() => onError?.()}
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

      <div className="flex items-center gap-1.5 border-t border-white/10 bg-[#141416] px-2.5 py-1.5">
        <Clock className="h-3 w-3 shrink-0 text-white/35" />
        <span className="truncate text-[10.5px] leading-tight text-white/45">
          Pausa el video para marcar el minuto de la observacion.
        </span>
      </div>
    </div>
  );
}
