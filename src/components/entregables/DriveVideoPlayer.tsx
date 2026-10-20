import { useState } from "react";
import { Loader2 } from "lucide-react";
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
 * El recuadro usa la orientacion ya conocida (de Firestore) para reservar su forma desde
 * el primer render — asi el video vertical ocupa toda la altura disponible (grande) en vez
 * de quedarse en su tamano original pequeno. "object-contain" nunca recorta el cuadro.
 */
export function DriveVideoPlayer({
  fileId,
  accessToken,
  orientacion,
  onMomentoPausa,
  onError,
  onOrientacion,
}: {
  fileId: string;
  accessToken: string;
  orientacion?: "vertical" | "horizontal" | null;
  onMomentoPausa?: (tiempo: string) => void;
  onError?: () => void;
  onOrientacion?: (orientacion: "vertical" | "horizontal") => void;
}) {
  const [cargando, setCargando] = useState(true);
  const src = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&access_token=${encodeURIComponent(accessToken)}`;
  const vertical = orientacion === "vertical";

  return (
    <div
      className={cn(
        "relative mx-auto flex items-center justify-center overflow-hidden rounded-lg bg-black",
        vertical ? "h-[70vh] max-w-full aspect-[9/16]" : "aspect-video max-h-[70vh] w-full"
      )}
    >
      {cargando && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-white/60" />
        </div>
      )}
      <video
        key={fileId}
        src={src}
        controls
        preload="metadata"
        className={cn("h-full w-full object-contain", cargando && "opacity-0")}
        onError={() => onError?.()}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setCargando(false);
          onOrientacion?.(v.videoHeight > v.videoWidth ? "vertical" : "horizontal");
        }}
        onPause={(e) => {
          const v = e.currentTarget;
          if (onMomentoPausa && !v.ended) onMomentoPausa(formatoTiempo(v.currentTime));
        }}
      />
    </div>
  );
}
