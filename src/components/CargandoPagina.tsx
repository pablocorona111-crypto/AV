import { cn } from "@/lib/utils";

/** Fallback de <Suspense> mientras se descarga el chunk de una pagina (rutas con lazy()). */
export function CargandoPagina({ pantallaCompleta = false }: { pantallaCompleta?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center text-sm text-muted-foreground",
        pantallaCompleta ? "h-screen" : "h-64"
      )}
    >
      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      Cargando...
    </div>
  );
}
