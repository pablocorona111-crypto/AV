import { useState } from "react";
import { Loader2 } from "lucide-react";

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
 */
export function DriveVideoPlayer({
  fileId,
  accessToken,
  onMomentoPausa,
  onError,
  onOrientacion,
}: {
  fileId: string;
  accessToken: string;
  onMomentoPausa?: (tiempo: string) => void;
  onError?: () => void;
  onOrientacion?: (orientacion: "vertical" | "horizontal") => void;
}) {
  const [cargando, setCargando] = useState(true);
  const src = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&access_token=${encodeURIComponent(accessToken)}`;

  return (
    <div className="relative flex h-full max-h-[60vh] w-full items-center justify-center overflow-hidden rounded-lg bg-black">
      {cargando && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-white/60" />
        </div>
      )}
      <video
        key={fileId}
        src={src}
        controls
        preload="auto"
        className="max-h-[60vh] w-auto max-w-full"
        onCanPlay={() => setCargando(false)}
        onError={() => onError?.()}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
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
