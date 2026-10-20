import { useState } from "react";
import { useProyectos } from "@/hooks/useProyectos";
import { useEntregables, useUsuarios } from "@/hooks/useCatalogos";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DemoBadge } from "@/components/DemoBadge";
import { RevisarEntregableDialog } from "@/components/entregables/RevisarEntregableDialog";
import { MiniaturaVideo } from "@/components/entregables/MiniaturaVideo";

export function ArchivosPage() {
  const { data: proyectos = [] } = useProyectos();
  const { data: entregables = [] } = useEntregables();
  const { data: usuarios = [] } = useUsuarios();
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);

  const referencias = entregables.filter((e) => e.urlRevision || e.urlFinal);
  const seleccionado = entregables.find((e) => e.id === seleccionadoId) ?? null;
  const proyectoDe = (id: string) => proyectos.find((p) => p.id === id)?.nombre ?? "Proyecto eliminado";
  const nombreDe = (id: string) => usuarios.find((u) => u.id === id)?.nombre ?? id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Archivos</h1>
          <p className="text-sm text-muted-foreground">
            Referencias y vinculos a archivos. El almacenamiento binario vive en Firebase Storage.
          </p>
        </div>
        <DemoBadge />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {referencias.map((e) => {
          const proyecto = proyectos.find((p) => p.id === e.proyectoId);
          return (
            <Card
              key={e.id}
              className="cursor-pointer overflow-hidden hover:shadow-md"
              onClick={() => setSeleccionadoId(e.id)}
            >
              <MiniaturaVideo url={e.urlRevision || e.urlFinal} orientacion={e.orientacionVideo} />
              <CardContent className="space-y-0.5 p-2">
                <div className="flex items-start justify-between gap-1">
                  <p className="truncate text-xs font-medium">{e.nombre}</p>
                  <Badge variant="outline" className="shrink-0 text-[10px]">{e.version}</Badge>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">{proyecto?.nombre ?? "Proyecto eliminado"}</p>
              </CardContent>
            </Card>
          );
        })}
        {referencias.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
            Sin referencias de archivo registradas.
          </p>
        )}
      </div>

      <RevisarEntregableDialog
        entregable={seleccionado}
        open={Boolean(seleccionadoId)}
        onOpenChange={(open) => !open && setSeleccionadoId(null)}
        nombreResponsable={seleccionado ? nombreDe(seleccionado.responsableId) : ""}
        nombreProyecto={seleccionado ? proyectoDe(seleccionado.proyectoId) : undefined}
      />
    </div>
  );
}
