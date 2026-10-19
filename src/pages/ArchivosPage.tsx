import { useState } from "react";
import { FileImage, FileVideo, FileText as FileIcon } from "lucide-react";
import { useProyectos } from "@/hooks/useProyectos";
import { useEntregables, useUsuarios } from "@/hooks/useCatalogos";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DemoBadge } from "@/components/DemoBadge";
import { RevisarEntregableDialog } from "@/components/entregables/RevisarEntregableDialog";

const ICONOS = { video: FileVideo, imagen: FileImage, doc: FileIcon } as const;

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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {referencias.map((e) => {
          const Icono = ICONOS.video;
          const proyecto = proyectos.find((p) => p.id === e.proyectoId);
          return (
            <Card
              key={e.id}
              className="cursor-pointer hover:shadow-md"
              onClick={() => setSeleccionadoId(e.id)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-bg-secondary">
                  <Icono className="h-5 w-5 text-text-primary/70" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.nombre}</p>
                  <p className="truncate text-xs text-muted-foreground">{proyecto?.nombre ?? "Proyecto eliminado"}</p>
                </div>
                <Badge variant="outline">{e.version}</Badge>
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
