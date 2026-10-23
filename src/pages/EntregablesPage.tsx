import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useEntregables } from "@/hooks/useCatalogos";
import { useProyectos } from "@/hooks/useProyectos";
import { useUsuarios } from "@/hooks/useCatalogos";
import { useGuiones } from "@/hooks/useGuiones";
import { useAuth } from "@/context/AuthContext";
import { puedeAsignarEntregables } from "@/lib/roles";
import { aFecha, inicioDeSemana } from "@/lib/periodo";
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
import { CargarEntregableHistoricoDialog } from "@/components/entregables/CargarEntregableHistoricoDialog";
import { RevisarEntregableDialog } from "@/components/entregables/RevisarEntregableDialog";
import { NuevoGuionDialog } from "@/components/guiones/NuevoGuionDialog";
import { RevisarGuionDialog } from "@/components/guiones/RevisarGuionDialog";
import { MiniaturaVideo } from "@/components/entregables/MiniaturaVideo";
import type { Entregable, EstadoEntregable, EstadoGuion } from "@/types";

/** Fecha real a usar para ordenar/agrupar un entregable — la de cuando paso lo que paso
 * (se entrego, se aprobo) y si no hay ninguna todavia, la de compromiso. */
function fechaDeOrden(e: Entregable): string {
  return e.fechaEntregado ?? e.fechaAprobado ?? e.fechaCompromiso;
}

function etiquetaSemana(inicio: Date): string {
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  return `${fmt(inicio)} – ${fmt(fin)}`;
}

/** Con pocos entregables (pendiente/en proceso/revision) esto da un solo grupo — no estorba.
 * Con muchos (aprobado/entregado acumulado de meses) parte la columna en semanas, mas reciente
 * primero, para que no sea una sola lista larguisima de tarjetas minusculas. */
function agruparPorSemana(items: Entregable[]) {
  const grupos = new Map<number, Entregable[]>();
  items.forEach((e) => {
    const inicio = inicioDeSemana(aFecha(fechaDeOrden(e))).getTime();
    if (!grupos.has(inicio)) grupos.set(inicio, []);
    grupos.get(inicio)!.push(e);
  });
  return [...grupos.entries()]
    .sort(([a], [b]) => b - a)
    .map(([inicioMs, itemsSemana]) => ({ inicio: new Date(inicioMs), items: itemsSemana }));
}

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

  // Al venir de una notificacion ("tu video se aprobo", etc.) con ?abrir=<id>, abre ese
  // entregable de una vez en vez de dejar que lo busque a mano en el Kanban.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const abrir = searchParams.get("abrir");
    if (abrir && entregables.some((e) => e.id === abrir)) {
      setSeleccionadoId(abrir);
      setSearchParams((p) => {
        p.delete("abrir");
        return p;
      }, { replace: true });
    }
  }, [searchParams, entregables, setSearchParams]);

  const proyectoDe = (id: string | undefined) =>
    id ? proyectos.find((p) => p.id === id)?.nombre ?? "Proyecto eliminado" : "Sin proyecto";
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
          <div className="flex justify-end gap-2">
            {usuario?.rol === "superadmin" && <CargarEntregableHistoricoDialog />}
            {puedeAsignarEntregables(usuario) && <NuevoEntregableDialog />}
          </div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
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
                    {/* Alto fijo con scroll (no "achicar hasta desaparecer"): con pocas tarjetas
                        (pendiente/en proceso/...) cabe todo sin scroll. Con muchas acumuladas
                        (aprobado/entregado de meses) se parte por semana para navegarlo rapido
                        en vez de una sola lista larguisima de tarjetas minusculas. */}
                    <CardContent className="max-h-[60vh] space-y-3 overflow-y-auto p-3 pt-0">
                      {agruparPorSemana(items).map(({ inicio, items: itemsSemana }) => (
                        <div key={inicio.getTime()}>
                          <p className="sticky top-0 z-10 -mx-3 bg-white px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                            {etiquetaSemana(inicio)} · {itemsSemana.length}
                          </p>
                          <div className="space-y-1.5">
                            {itemsSemana.map((e) => (
                              <button
                                key={e.id}
                                onClick={() => setSeleccionadoId(e.id)}
                                className="flex w-full items-center gap-2 rounded-md border border-border bg-white p-1.5 text-left text-xs transition-colors hover:bg-bg-secondary"
                              >
                                <MiniaturaVideo
                                  url={e.urlRevision || e.urlFinal}
                                  orientacion={e.orientacionVideo}
                                  llenarAlto
                                  className="h-12 w-12 shrink-0 rounded"
                                />
                                <div className="min-w-0 flex-1 overflow-hidden">
                                  <p className="truncate font-medium text-text-primary">{e.nombre}</p>
                                  <p className="truncate text-muted-foreground">{proyectoDe(e.proyectoId)}</p>
                                  <div className="mt-0.5 flex items-center justify-between gap-1">
                                    <span className="truncate text-muted-foreground">{nombreDe(e.responsableId)}</span>
                                    <Badge variant="outline" className="shrink-0 text-[10px]">
                                      {formatFecha(fechaDeOrden(e))}
                                    </Badge>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
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
        nombreAprobador={seleccionado?.aprobadorId ? nombreDe(seleccionado.aprobadorId) : undefined}
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
