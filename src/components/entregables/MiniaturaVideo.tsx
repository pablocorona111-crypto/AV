import { useQuery } from "@tanstack/react-query";
import { FileVideo } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { extraerFileIdDrive, obtenerMiniaturaDrive } from "@/services/driveService";
import { cn } from "@/lib/utils";

/** Miniatura real del video (la que ya genera Drive) para usar en tarjetas/listas. */
export function MiniaturaVideo({ url, className }: { url?: string; className?: string }) {
  const { driveToken } = useAuth();
  const fileId = url ? extraerFileIdDrive(url) : null;

  const { data: miniatura } = useQuery({
    queryKey: ["miniaturaDrive", fileId],
    queryFn: () => obtenerMiniaturaDrive(fileId as string, driveToken as string),
    enabled: Boolean(fileId && driveToken),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  if (miniatura) {
    return (
      <img
        src={miniatura}
        alt=""
        className={cn("h-full w-full object-cover", className)}
        loading="lazy"
      />
    );
  }

  return (
    <div className={cn("flex h-full w-full items-center justify-center bg-bg-secondary", className)}>
      <FileVideo className="h-5 w-5 text-text-primary/40" />
    </div>
  );
}
