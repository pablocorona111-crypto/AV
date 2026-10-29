import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useProyectos, useActualizarProyecto, useEliminarProyecto } from "@/hooks/useProyectos";
import { useEliminarEntregable } from "@/hooks/useEntregables";
import { useEntregables, useUsuarios } from "@/hooks/useCatalogos";
import { useGuiones } from "@/hooks/useGuiones";
import { useAuth } from "@/context/AuthContext";
import { puedeCrearProyectos } from "@/lib/roles";
import { ETAPAS_ORDEN, ETAPA_PROYECTO_LABELS, PRIORIDAD_BADGE, PRIORIDAD_LABELS } from "@/lib/labels";
import { cn, formatFecha } from "@/lib/utils";
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
  // Por default un entregable ligado se queda huerfano (sin proyecto) al borrar el proyecto —
  // esta casilla es para cuando de plano ya no se quiere nada de eso tampoco (ej. se cancelo todo
  // el trabajo), no solo el proyecto.
  const [tambienEntregables, setTambienEntregables] = useState(false);
  const eliminar = useEliminarProyecto();
  const eliminarEntregableLigado = useEliminarEntregable();
  const actualizarProyecto = useActualizarProyecto();

  const nombreDe = (id: string) => usuarios.find((u) => u.id === id)?.nombre ?? "Usuario eliminado";

  const confirmarEliminar = () => {
    if (!aEliminar) return;
    if (tambienEntregables) {
      entregables.filter((e) => e.proyectoId === aEliminar.id).forEach((e) => eliminarEntregableLigado.mutate(e.id));
    }
    eliminar.mutate(aEliminar.id);
    setAEliminar(null);
    setTambienEntregables(false);
    setSeleccionado(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                {/* Un proyecto "recurrente" (sin fechaCompromiso — ver NuevoProyectoDialog, ej.
                    "Video redes sociales" que se reusa cada semana) no tiene un final definido:
                    una barra de avance ahi no significa nada ("0%" de que si nunca termina). */}
                {p.fechaCompromiso ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>{ETAPA_PROYECTO_LABELS[p.etapaActual]}</span>
                      <span className="font-medium">{p.porcentajeAvance}%</span>
                    </div>
                    <Progress value={p.porcentajeAvance} />
                  </div>
                ) : (
                  <Badge variant="accent" className="text-[10px]">
                    Recurrente — sin fecha fija
                  </Badge>
                )}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex -space-x-2">
                    {p.colaboradoresIds.slice(0, 4).map((id) => (
                      <Avatar key={id} className="h-7 w-7 border-2 border-card">
                        <AvatarFallback className="text-[10px]">{iniciales(nombreDe(id))}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  {p.fechaCompromiso && (
                    <span className="text-xs text-muted-foreground">Entrega {formatFecha(p.fechaCompromiso)}</span>
                  )}
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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground">{seleccionado.folio}</p>
                    <DialogTitle>{seleccionado.nombre}</DialogTitle>
                  </div>
                  {puedeCrearProyectos(usuario) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="self-start text-destructive hover:bg-red-50 dark:hover:bg-red-400/10"
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
                    <p className="font-medium">
                      {seleccionado.responsablePrincipalId ? nombreDe(seleccionado.responsablePrincipalId) : "Sin asignar"}
                    </p>
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
                  <p className="mb-2 text-xs text-muted-foreground">
                    Etapas
                    {usuario?.rol === "superadmin" && " · toca una etapa para corregirla"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ETAPAS_ORDEN.map((etapa, i) => {
                      const idxActual = ETAPAS_ORDEN.indexOf(seleccionado.etapaActual);
                      const completada = i < idxActual;
                      const actual = etapa === seleccionado.etapaActual;
                      const clases =
                        "rounded-full px-2.5 py-1 text-[11px] font-medium " +
                        (actual
                          ? "bg-accent text-accent-foreground"
                          : completada
                          ? "bg-green-100 text-green-800 dark:bg-green-400/15 dark:text-green-300"
                          : "bg-bg-secondary text-muted-foreground");
                      if (usuario?.rol !== "superadmin") {
                        return (
                          <span key={etapa} className={clases}>
                            {ETAPA_PROYECTO_LABELS[etapa]}
                          </span>
                        );
                      }
                      return (
                        <button
                          key={etapa}
                          type="button"
                          onClick={() => {
                            const porcentajeAvance = Math.round(((i + 1) / ETAPAS_ORDEN.length) * 100);
                            actualizarProyecto.mutate({
                              id: seleccionado.id,
                              cambios: { etapaActual: etapa, porcentajeAvance },
                            });
                            setSeleccionado({ ...seleccionado, etapaActual: etapa, porcentajeAvance });
                          }}
                          className={cn(clases, "cursor-pointer hover:ring-2 hover:ring-accent/40")}
                        >
                          {ETAPA_PROYECTO_LABELS[etapa]}
                        </button>
                      );
                    })}
                  </div>
                  {usuario?.rol === "superadmin" && (
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      El porcentaje de avance se ajusta solo segun la etapa que elijas — no hace falta ponerlo a
                      mano. Util para videos historicos ya entregados: toca directo "Entregado"/"Cerrado".
                    </p>
                  )}
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
        onOpenChange={(v) => {
          if (!v) {
            setAEliminar(null);
            setTambienEntregables(false);
          }
        }}
        title={`¿Eliminar el proyecto "${aEliminar?.nombre}"?`}
        description={
          aEliminar && (
            <>
              {(() => {
                const entregablesLigados = entregables.filter((e) => e.proyectoId === aEliminar.id);
                const guionesLigados = guiones.filter((g) => g.proyectoId === aEliminar.id).length;
                if (entregablesLigados.length === 0 && guionesLigados === 0) return null;
                return (
                  <div className="space-y-2">
                    <p>
                      Tiene {guionesLigados} guion(es) y {entregablesLigados.length} entregable(s) ligados.
                    </p>
                    {entregablesLigados.length > 0 && (
                      <label className="flex items-start gap-2 rounded-md border border-border bg-bg-secondary/40 p-2 text-sm">
                        <input
                          type="checkbox"
                          checked={tambienEntregables}
                          onChange={(e) => setTambienEntregables(e.target.checked)}
                          className="mt-0.5"
                        />
                        <span>
                          Tambien eliminar sus {entregablesLigados.length} entregable(s) (material, galeria de
                          fotos y observaciones). Sin marcar, se quedan huerfanos (sin proyecto) en vez de
                          borrarse.
                        </span>
                      </label>
                    )}
                  </div>
                );
              })()}
              <p className="mt-2">Esta accion no se puede deshacer.</p>
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
