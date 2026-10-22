import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useProyectos, useEliminarProyecto } from "@/hooks/useProyectos";
import { useEntregables, useUsuarios } from "@/hooks/useCatalogos";
import { useGuiones } from "@/hooks/useGuiones";
import { useAuth } from "@/context/AuthContext";
import { puedeCrearProyectos } from "@/lib/roles";
import { ETAPAS_ORDEN, ETAPA_PROYECTO_LABELS, PRIORIDAD_BADGE, PRIORIDAD_LABELS } from "@/lib/labels";
import { formatFecha } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DemoBadge } from "@/components/DemoBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NuevoProyectoDialog } from "@/components/proyectos/NuevoProyectoDialog";
import type { Proyecto } from "@/types";

function iniciales(nombre: string) {
  return nombre.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

export function ProyectosPage() {
  const { usuario } = useAuth();
  const { data: proyectos = [], isLoading } = useProyectos();
  const { data: usuarios = [] } = useUsuarios();
  const { data: entregables = [] } = useEntregables();
  const { data: guiones = [] } = useGuiones();
  const [seleccionado, setSeleccionado] = useState<Proyecto | null>(null);
  const [aEliminar, setAEliminar] = useState<Proyecto | null>(null);
  const eliminar = useEliminarProyecto();

  const nombreDe = (id: string) => usuarios.find((u) => u.id === id)?.nombre ?? id;

  const confirmarEliminar = () => {
    if (!aEliminar) return;
    eliminar.mutate(aEliminar.id);
    setAEliminar(null);
    setSeleccionado(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Proyectos</h1>
          <p className="text-sm text-muted-foreground">Unidades de trabajo nacidas de requisiciones aprobadas.</p>
        </div>
        <div className="flex items-center gap-3">
          <DemoBadge />
          {puedeCrearProyectos(usuario) && <NuevoProyectoDialog />}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {proyectos.map((p) => (
            <Card key={p.id} className="cursor-pointer hover:shadow-md" onClick={() => setSeleccionado(p)}>
              <CardHeader className="flex-row items-start justify-between pb-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">{p.folio}</p>
                  <CardTitle className="mt-0.5">{p.nombre}</CardTitle>
                </div>
                <Badge variant={PRIORIDAD_BADGE[p.prioridad]}>{PRIORIDAD_LABELS[p.prioridad]}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">{p.departamentoSolicitante}</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>{ETAPA_PROYECTO_LABELS[p.etapaActual]}</span>
                    <span className="font-medium">{p.porcentajeAvance}%</span>
                  </div>
                  <Progress value={p.porcentajeAvance} />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex -space-x-2">
                    {p.colaboradoresIds.slice(0, 4).map((id) => (
                      <Avatar key={id} className="h-7 w-7 border-2 border-white">
                        <AvatarFallback className="text-[10px]">{iniciales(nombreDe(id))}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">Entrega {formatFecha(p.fechaCompromiso)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {proyectos.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
              Sin proyectos activos.
            </p>
          )}
        </div>
      )}

      <Dialog open={!!seleccionado} onOpenChange={(v) => !v && setSeleccionado(null)}>
        <DialogContent className="max-w-xl">
          {seleccionado && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">{seleccionado.folio}</p>
                    <DialogTitle>{seleccionado.nombre}</DialogTitle>
                  </div>
                  {puedeCrearProyectos(usuario) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-red-50"
                      onClick={() => setAEliminar(seleccionado)}
                      disabled={eliminar.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </Button>
                  )}
                </div>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Responsable principal</p>
                    <p className="font-medium">{nombreDe(seleccionado.responsablePrincipalId)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Departamento</p>
                    <p className="font-medium">{seleccionado.departamentoSolicitante}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha de inicio</p>
                    <p className="font-medium">{formatFecha(seleccionado.fechaInicio)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha compromiso</p>
                    <p className="font-medium">{formatFecha(seleccionado.fechaCompromiso)}</p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Etapas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ETAPAS_ORDEN.map((etapa, i) => {
                      const idxActual = ETAPAS_ORDEN.indexOf(seleccionado.etapaActual);
                      const completada = i < idxActual;
                      const actual = etapa === seleccionado.etapaActual;
                      return (
                        <span
                          key={etapa}
                          className={
                            "rounded-full px-2.5 py-1 text-[11px] font-medium " +
                            (actual
                              ? "bg-accent text-white"
                              : completada
                              ? "bg-green-100 text-green-800"
                              : "bg-bg-secondary text-muted-foreground")
                          }
                        >
                          {ETAPA_PROYECTO_LABELS[etapa]}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Colaboradores asignados</p>
                  <div className="flex flex-wrap gap-2">
                    {seleccionado.colaboradoresIds.map((id) => (
                      <span key={id} className="flex items-center gap-1.5 rounded-full bg-bg-secondary px-2.5 py-1 text-xs">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[9px]">{iniciales(nombreDe(id))}</AvatarFallback>
                        </Avatar>
                        {nombreDe(id)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(aEliminar)}
        onOpenChange={(v) => !v && setAEliminar(null)}
        title={`¿Eliminar el proyecto "${aEliminar?.nombre}"?`}
        description={
          aEliminar && (
            <>
              {(() => {
                const entregablesLigados = entregables.filter((e) => e.proyectoId === aEliminar.id).length;
                const guionesLigados = guiones.filter((g) => g.proyectoId === aEliminar.id).length;
                return entregablesLigados || guionesLigados ? (
                  <p>
                    Tiene {guionesLigados} guion(es) y {entregablesLigados} entregable(s) ligados — se quedaran
                    huerfanos (sin proyecto).
                  </p>
                ) : null;
              })()}
              <p className="mt-1">Esta accion no se puede deshacer.</p>
            </>
          )
        }
        confirmLabel="Eliminar"
        destructive
        onConfirm={confirmarEliminar}
      />
    </div>
  );
}
