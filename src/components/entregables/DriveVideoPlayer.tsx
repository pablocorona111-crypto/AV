import { useRef, useState } from "react";
import { Loader2, Maximize2, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

function formatoTiempo(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Reproductor propio (no el iframe de Drive). El video se transmite directo desde Drive
 * (el navegador pide por partes, como streaming) en vez de descargarse completo antes de
 * poder verse — esto es lo que hace que abra rapido. El token va como query param porque
 * un <video src> normal no puede mandar el header de autorizacion.
 *
 * Chrome tipo "visor" de editor profesional: barra superior oscura + video abajo a todo
 * el ancho. El ancho siempre es 100% de su columna (nunca se queda chico aunque el archivo
 * sea de baja resolucion) y el alto se calcula solo para respetar su relacion real de
 * aspecto — con tope de 70vh. Asi nunca salen barras negras ni se ve diminuto.
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const src = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&access_token=${encodeURIComponent(accessToken)}`;
  const vertical = orientacion === "vertical";

  return (
    <div className="mx-auto flex w-full flex-col overflow-hidden rounded-lg border border-black/40 bg-black shadow-lg">
      <div className="flex items-center justify-between bg-[#1c1c1e] px-3 py-1.5">
        <SlidersHorizontal className="h-3.5 w-3.5 text-white/50" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-white/60">Visor</span>
        <button
          type="button"
          onClick={() => videoRef.current?.requestFullscreen?.()}
          className="text-white/50 transition-colors hover:text-white"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="relative flex items-center justify-center bg-black">
        {cargando && (
          <div
            className={cn(
              "flex items-center justify-center",
              vertical ? "aspect-[9/16] h-[55vh]" : "aspect-video w-full"
            )}
          >
            <Loader2 className="h-6 w-6 animate-spin text-white/60" />
          </div>
        )}
        <video
          key={fileId}
          ref={videoRef}
          src={src}
          controls
          preload="metadata"
          className={cn("block", cargando && "hidden")}
          style={{ width: "100%", height: "auto", maxHeight: "70vh" }}
          onError={() => onError?.()}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            setCargando(false);
            onOrientacion?.(v.videoHeight > v.videoWidth ? "vertical" : "horizontal");
            onRatio?.(v.videoWidth / v.videoHeight);
          }}
          onPause={(e) => {
            const v = e.currentTarget;
            if (onMomentoPausa && !v.ended) onMomentoPausa(formatoTiempo(v.currentTime));
          }}
        />
      </div>
    </div>
  );
}
