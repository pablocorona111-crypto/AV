import { useQuery } from "@tanstack/react-query";
import { FileVideo } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { extraerFileIdDrive, obtenerMiniaturaDrive } from "@/services/driveService";
import { cn } from "@/lib/utils";

/**
 * Miniatura real del video (la que ya genera Drive) para usar en tarjetas/listas.
 * Adapta su propia forma segun la orientacion real del video — si es vertical, usa un
 * recuadro alto en vez de forzarlo dentro de uno horizontal (ahi se veia chico con barras negras).
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

  if (miniatura) {
    return (
      <div className={cn(forma, "flex w-full items-center justify-center overflow-hidden bg-black", className)}>
        <img src={miniatura} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        forma,
        "flex w-full items-center justify-center overflow-hidden bg-bg-secondary",
        className
      )}
    >
      <FileVideo className="h-5 w-5 text-text-primary/40" />
    </div>
  );
}
