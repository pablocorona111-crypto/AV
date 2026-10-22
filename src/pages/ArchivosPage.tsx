import { useState } from "react";
import { useProyectos } from "@/hooks/useProyectos";
import { useEntregables, useUsuarios } from "@/hooks/useCatalogos";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DemoBadge } from "@/components/DemoBadge";
import { RevisarEntregableDialog } from "@/components/entregables/RevisarEntregableDialog";
import { MiniaturaVideo } from "@/components/entregables/MiniaturaVideo";
import { ESTADO_ENTREGABLE_BADGE, ESTADO_ENTREGABLE_LABELS } from "@/lib/labels";
import type { EstadoEntregable } from "@/types";

export function ArchivosPage() {
  const { data: proyectos = [] } = useProyectos();
  const { data: entregables = [] } = useEntregables();
  const { data: usuarios = [] } = useUsuarios();
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoEntregable | "todos">("todos");

  const seleccionado = entregables.find((e) => e.id === seleccionadoId) ?? null;
  const proyectoDe = (id: string | undefined) =>
    id ? proyectos.find((p) => p.id === id)?.nombre ?? "Proyecto eliminado" : "Sin proyecto";
  const nombreDe = (id: string) => usuarios.find((u) => u.id === id)?.nombre ?? id;

  const terminoBusqueda = busqueda.trim().toLowerCase();
  const referencias = entregables.filter((e) => {
    if (!(e.urlRevision || e.urlFinal)) return false;
    if (filtroEstado !== "todos" && e.estado !== filtroEstado) return false;
    if (!terminoBusqueda) return true;
    const nombreProyecto = proyectoDe(e.proyectoId).toLowerCase();
    return e.nombre.toLowerCase().includes(terminoBusqueda) || nombreProyecto.includes(terminoBusqueda);
  });

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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o proyecto..."
          className="sm:max-w-xs"
        />
        <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as EstadoEntregable | "todos")}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {Object.entries(ESTADO_ENTREGABLE_LABELS).map(([valor, etiqueta]) => (
              <SelectItem key={valor} value={valor}>
                {etiqueta}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {referencias.map((e) => {
          return (
            <Card
              key={e.id}
              className="cursor-pointer overflow-hidden hover:shadow-md"
              onClick={() => setSeleccionadoId(e.id)}
            >
              <MiniaturaVideo url={e.urlRevision || e.urlFinal} orientacion={e.orientacionVideo} />
              <CardContent className="space-y-1 p-2">
                <div className="flex items-start justify-between gap-1">
                  <p className="truncate text-xs font-medium">{e.nombre}</p>
                  <Badge variant="outline" className="shrink-0 text-[10px]">{e.version}</Badge>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">{proyectoDe(e.proyectoId)}</p>
                <div className="flex flex-wrap items-center gap-1">
                  <Badge variant={ESTADO_ENTREGABLE_BADGE[e.estado]} className="text-[10px]">
                    {ESTADO_ENTREGABLE_LABELS[e.estado]}
                  </Badge>
                  {e.estado === "aprobado" && (
                    <Badge variant="success" className="text-[10px]">
                      Listo para subir
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {referencias.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
            {busqueda || filtroEstado !== "todos"
              ? "Sin resultados para ese filtro."
              : "Sin referencias de archivo registradas."}
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
