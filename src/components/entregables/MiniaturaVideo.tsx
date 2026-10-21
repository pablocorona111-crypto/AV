import { useQuery } from "@tanstack/react-query";
import { FileVideo, Play, Smartphone, Monitor } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { extraerFileIdDrive, obtenerMiniaturaDrive } from "@/services/driveService";
import { cn } from "@/lib/utils";

/**
 * Miniatura real del video (la que ya genera Drive) para usar en tarjetas/listas.
 * Adapta su propia forma segun la orientacion real del video — si es vertical, usa un
 * recuadro alto en vez de forzarlo dentro de uno horizontal (ahi se veia chico con barras negras).
 * object-cover SIEMPRE preserva la proporcion de la imagen (recorta, nunca estira) —
 * por eso nunca se ve deformada, a diferencia del reproductor de video.
 */
export function MiniaturaVideo({
  url,
  orientacion,
  className,
}: {
  url?: string;
  orientacion?: "vertical" | "horizontal";
  className?: string;
}) {
  const { driveToken } = useAuth();
  const fileId = url ? extraerFileIdDrive(url) : null;

  const { data: miniatura } = useQuery({
    queryKey: ["miniaturaDrive", fileId],
    queryFn: () => obtenerMiniaturaDrive(fileId as string, driveToken as string),
    enabled: Boolean(fileId && driveToken),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  const forma = orientacion === "vertical" ? "aspect-[3/4]" : "aspect-video";
  const IconoOrientacion = orientacion === "vertical" ? Smartphone : Monitor;

  return (
    <div className={cn(forma, "group relative w-full overflow-hidden bg-[#0B0B0C]", className)}>
      {miniatura ? (
        <img
          src={miniatura}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-bg-secondary">
          <FileVideo className="h-5 w-5 text-text-primary/30" />
          <span className="text-[10px] font-medium text-muted-foreground">Sin vista previa</span>
        </div>
      )}

      {/* Velo permanente y suave abajo: mantiene legible el badge sobre cualquier fotograma.
          Al pasar el mouse se oscurece todo el recuadro para que resalte el boton de play. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-black/25 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="flex h-10 w-10 scale-75 items-center justify-center rounded-full bg-white/95 opacity-0 shadow-lg ring-1 ring-black/5 transition-all duration-200 ease-out group-hover:scale-100 group-hover:opacity-100">
          <Play className="ml-0.5 h-4 w-4 fill-black text-black" />
        </div>
      </div>

      {orientacion && (
        <div className="pointer-events-none absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-1 backdrop-blur-sm">
          <IconoOrientacion className="h-3 w-3 text-white/90" />
          <span className="text-[9px] font-semibold leading-none tracking-wide text-white/80">
            {orientacion === "vertical" ? "9:16" : "16:9"}
          </span>
        </div>
      )}
    </div>
  );
}
