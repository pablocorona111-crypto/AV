import { useState } from "react";
import { useEntregables } from "@/hooks/useCatalogos";
import { useProyectos } from "@/hooks/useProyectos";
import { useUsuarios } from "@/hooks/useCatalogos";
import { useGuiones } from "@/hooks/useGuiones";
import { useAuth } from "@/context/AuthContext";
import { puedeAsignarEntregables } from "@/lib/roles";
import {
  CATEGORIA_CONTENIDO_LABELS,
  ESTADO_ENTREGABLE_LABELS,
  ESTADO_GUION_LABELS,
} from "@/lib/labels";
import { formatFecha } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemoBadge } from "@/components/DemoBadge";
import { NuevoEntregableDialog } from "@/components/entregables/NuevoEntregableDialog";
import { RevisarEntregableDialog } from "@/components/entregables/RevisarEntregableDialog";
import { NuevoGuionDialog } from "@/components/guiones/NuevoGuionDialog";
import { RevisarGuionDialog } from "@/components/guiones/RevisarGuionDialog";
import type { EstadoEntregable, EstadoGuion } from "@/types";

const COLUMNAS: EstadoEntregable[] = [
  "pendiente",
  "en_proceso",
  "en_revision",
  "correcciones",
  "aprobado",
  "entregado",
];

const COLUMNAS_GUION: EstadoGuion[] = ["borrador", "en_revision", "correcciones", "aprobado"];

export function EntregablesPage() {
  const { usuario } = useAuth();
  const { data: entregables = [], isLoading } = useEntregables();
  const { data: guiones = [] } = useGuiones();
  const { data: proyectos = [] } = useProyectos();
  const { data: usuarios = [] } = useUsuarios();
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [guionSeleccionadoId, setGuionSeleccionadoId] = useState<string | null>(null);
  const seleccionado = entregables.find((e) => e.id === seleccionadoId) ?? null;
  const guionSeleccionado = guiones.find((g) => g.id === guionSeleccionadoId) ?? null;

  const proyectoDe = (id: string) => proyectos.find((p) => p.id === id)?.nombre ?? "Proyecto eliminado";
  const nombreDe = (id: string) => usuarios.find((u) => u.id === id)?.nombre ?? id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Postproduccion y entregables</h1>
          <p className="text-sm text-muted-foreground">Guiones y versionado de entregables por proyecto.</p>
        </div>
        <DemoBadge />
      </div>

      <Tabs defaultValue="entregables">
        <TabsList>
          <TabsTrigger value="guiones">Guiones</TabsTrigger>
          <TabsTrigger value="entregables">Entregables</TabsTrigger>
        </TabsList>

        <TabsContent value="guiones" className="space-y-4">
          <div className="flex justify-end">{puedeAsignarEntregables(usuario) && <NuevoGuionDialog />}</div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNAS_GUION.map((estado) => {
              const items = guiones.filter((g) => g.estado === estado);
              return (
                <Card key={estado} className="min-w-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm">
                      {ESTADO_GUION_LABELS[estado]}
                      <span className="text-xs font-normal text-muted-foreground">{items.length}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 p-3 pt-0">
                    {items.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setGuionSeleccionadoId(g.id)}
                        className="w-full rounded-md border border-border bg-white p-2.5 text-left text-xs transition-colors hover:bg-bg-secondary"
                      >
                        <p className="font-medium text-text-primary">
                          <span className="text-muted-foreground">{g.folio}</span> {g.titulo}
                        </p>
                        <p className="truncate text-muted-foreground">{proyectoDe(g.proyectoId)}</p>
                        <p className="mt-1 text-muted-foreground">{nombreDe(g.responsableId)}</p>
                      </button>
                    ))}
                    {items.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">—</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="entregables" className="space-y-4">
          <div className="flex justify-end">{puedeAsignarEntregables(usuario) && <NuevoEntregableDialog />}</div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {COLUMNAS.map((estado) => {
                const items = entregables.filter((e) => e.estado === estado);
                return (
                  <Card key={estado} className="min-w-0">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between text-sm">
                        {ESTADO_ENTREGABLE_LABELS[estado]}
                        <span className="text-xs font-normal text-muted-foreground">{items.length}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 p-3 pt-0">
                      {items.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => setSeleccionadoId(e.id)}
                          className="w-full rounded-md border border-border bg-white p-2.5 text-left text-xs transition-colors hover:bg-bg-secondary"
                        >
                          <p className="font-medium text-text-primary">{e.nombre}</p>
                          <p className="truncate text-muted-foreground">{proyectoDe(e.proyectoId)}</p>
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-muted-foreground">{nombreDe(e.responsableId)}</span>
                            <Badge variant="outline">{formatFecha(e.fechaCompromiso)}</Badge>
                          </div>
                        </button>
                      ))}
                      {items.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">—</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <RevisarEntregableDialog
        entregable={seleccionado}
        open={Boolean(seleccionadoId)}
        onOpenChange={(open) => !open && setSeleccionadoId(null)}
        nombreResponsable={seleccionado ? nombreDe(seleccionado.responsableId) : ""}
        nombreProyecto={seleccionado ? proyectoDe(seleccionado.proyectoId) : undefined}
      />
      <RevisarGuionDialog
        guion={guionSeleccionado}
        open={Boolean(guionSeleccionadoId)}
        onOpenChange={(open) => !open && setGuionSeleccionadoId(null)}
        nombreResponsable={guionSeleccionado ? nombreDe(guionSeleccionado.responsableId) : ""}
        nombreProyecto={guionSeleccionado ? proyectoDe(guionSeleccionado.proyectoId) : undefined}
      />
    </div>
  );
}
