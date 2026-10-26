import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAsignarGestorRequisicion, useCambiarEstadoRequisicion, useRequisiciones } from "@/hooks/useRequisiciones";
import { useUsuarios } from "@/hooks/useCatalogos";
import { useProyectos } from "@/hooks/useProyectos";
import {
  puedeAprobarRequisiciones,
  puedeGestionarUsuarios,
  esGestorRequisiciones,
  gestorTienePermiso,
} from "@/lib/roles";
import {
  CATEGORIA_CONTENIDO_LABELS,
  ESTADO_REQUISICION_BADGE,
  ESTADO_REQUISICION_LABELS,
  ETAPA_PROYECTO_LABELS,
  PRIORIDAD_BADGE,
  PRIORIDAD_LABELS,
} from "@/lib/labels";
import { formatFecha } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { NuevaRequisicionDialog } from "@/components/requisiciones/NuevaRequisicionDialog";
import { DemoBadge } from "@/components/DemoBadge";
import type { EstadoRequisicion, Requisicion } from "@/types";

/** "enviada" y "en_evaluacion" se tratan igual: ambas esperan decision del aprobador. */
function esPendienteDeAprobar(estado: EstadoRequisicion): boolean {
  return estado === "enviada" || estado === "en_evaluacion";
}

const ESTADOS_KANBAN: EstadoRequisicion[] = [
  "enviada",
  "en_evaluacion",
  "aprobada",
  "en_planeacion",
  "rechazada",
];

/**
 * Firestore no puede tapar campos sueltos de un documento (permite o niega el doc completo),
 * asi que los permisos de VISUALIZACION del gestor (`verInfoSolicitante`,
 * `verInfoProyectoVinculado`, `verFechasYEstadosProduccion`) se aplican aqui, redactando el
 * dato en pantalla. No son una barrera de seguridad — son lo que el lider configura para que
 * el gestor no trabaje con informacion que no le corresponde.
 */
function SinPermiso({ compacto = false }: { compacto?: boolean }) {
  return (
    <span className="text-xs italic text-muted-foreground">
      {compacto ? "Sin permiso" : "Sin permiso para ver esta informacion"}
    </span>
  );
}

function RequisicionCard({
  r,
  mostrarAcciones,
  onAprobar,
  onRechazar,
  onVerDetalle,
}: {
  r: Requisicion;
  mostrarAcciones: boolean;
  onAprobar: () => void;
  onRechazar: () => void;
  onVerDetalle: () => void;
}) {
  return (
    <Card className="cursor-pointer hover:shadow-md" onClick={onVerDetalle}>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">{r.folio}</span>
          <Badge variant={PRIORIDAD_BADGE[r.prioridad]}>{PRIORIDAD_LABELS[r.prioridad]}</Badge>
        </div>
        <p className="text-sm font-semibold leading-tight">{r.titulo}</p>
        <p className="text-xs text-muted-foreground">{CATEGORIA_CONTENIDO_LABELS[r.tipoContenido]}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">{formatFecha(r.fechaRequerida)}</span>
          <span className="text-xs text-muted-foreground">{r.departamentoSolicitante}</span>
        </div>
        {mostrarAcciones && esPendienteDeAprobar(r.estado) && (
          <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" className="flex-1" onClick={onAprobar}>
              <Check className="h-3.5 w-3.5" /> Aprobar
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={onRechazar}>
              <X className="h-3.5 w-3.5" /> Rechazar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RequisicionDetalleDialog({
  r,
  open,
  onOpenChange,
}: {
  r: Requisicion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { usuario } = useAuth();
  const { data: usuarios = [] } = useUsuarios();
  const { data: proyectos = [] } = useProyectos();
  const asignarGestor = useAsignarGestorRequisicion();
  const gestoresDisponibles = usuarios.filter((u) => u.gestorRequisiciones?.activo);
  const veSolicitante = gestorTienePermiso(usuario, "verInfoSolicitante");
  const veProyecto = gestorTienePermiso(usuario, "verInfoProyectoVinculado");
  const veProduccion = gestorTienePermiso(usuario, "verFechasYEstadosProduccion");

  // El vinculo real vive del lado del proyecto (`requisicionesVinculadas`, lo que escribe
  // NuevoProyectoDialog); `proyectosVinculados` de la requisicion se contempla por si algun
  // flujo lo llena mas adelante.
  const proyectosVinculados = r
    ? proyectos.filter(
        (p) => p.requisicionesVinculadas?.includes(r.id) || r.proyectosVinculados?.includes(p.id)
      )
    : [];

  if (!r) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-muted-foreground">{r.folio}</p>
            <Badge variant={ESTADO_REQUISICION_BADGE[r.estado]}>{ESTADO_REQUISICION_LABELS[r.estado]}</Badge>
          </div>
          <DialogTitle>{r.titulo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Solicitado por</p>
              {veSolicitante ? <p className="font-medium">{r.nombreSolicitante}</p> : <SinPermiso />}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Departamento</p>
              {veSolicitante ? <p className="font-medium">{r.departamentoSolicitante}</p> : <SinPermiso />}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tipo de contenido</p>
              <p className="font-medium">{CATEGORIA_CONTENIDO_LABELS[r.tipoContenido]}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Formato</p>
              <p className="font-medium">{r.formatoSolicitado ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Prioridad</p>
              <Badge variant={PRIORIDAD_BADGE[r.prioridad]}>{PRIORIDAD_LABELS[r.prioridad]}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fecha requerida</p>
              {veProduccion ? <p className="font-medium">{formatFecha(r.fechaRequerida)}</p> : <SinPermiso />}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cantidad entregables</p>
              <p className="font-medium">{r.cantidadEntregables}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Necesita grabacion</p>
              <p className="font-medium">{r.necesitaGrabacion ? "Si" : "No"}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Objetivo</p>
            <p>{r.objetivo}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Descripcion</p>
            <p className="whitespace-pre-wrap">{r.descripcion}</p>
          </div>

          {r.ubicacion && (
            <div>
              <p className="text-xs text-muted-foreground">Ubicacion</p>
              <p>{r.ubicacion}</p>
            </div>
          )}

          {r.observaciones && (
            <div>
              <p className="text-xs text-muted-foreground">Observaciones</p>
              <p className="whitespace-pre-wrap">{r.observaciones}</p>
            </div>
          )}

          {/* Si no tiene el permiso, el bloque se muestra igual con el placeholder: ocultarlo
              solo cuando hay proyecto delataria por omision cuales si tienen uno. */}
          {(!veProyecto || proyectosVinculados.length > 0) && (
            <div>
              <p className="text-xs text-muted-foreground">Proyecto vinculado</p>
              {!veProyecto ? (
                <SinPermiso />
              ) : (
                <div className="space-y-1">
                  {proyectosVinculados.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{p.nombre}</span>
                      {veProduccion ? (
                        <>
                          <Badge variant="outline">{ETAPA_PROYECTO_LABELS[p.etapaActual]}</Badge>
                          {p.fechaCompromiso && (
                            <span className="text-xs text-muted-foreground">
                              Compromiso: {formatFecha(p.fechaCompromiso)}
                            </span>
                          )}
                        </>
                      ) : (
                        <SinPermiso compacto />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {puedeGestionarUsuarios(usuario) && (
            <div className="space-y-1.5 border-t border-border pt-4">
              <Label>Gestor de requisiciones asignado</Label>
              <Select
                value={r.responsableVentaId ?? "ninguno"}
                onValueChange={(value) => {
                  const gestor = gestoresDisponibles.find((g) => g.id === value);
                  asignarGestor.mutate({ id: r.id, gestor: gestor ? { id: gestor.id, correo: gestor.correo } : null });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin gestor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ninguno">Sin gestor</SelectItem>
                  {gestoresDisponibles.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                El gestor asignado vera esta requisicion, sus guiones y videos relacionados en su bandeja.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RequisicionesPage() {
  const { usuario } = useAuth();
  const { data: requisiciones = [], isLoading } = useRequisiciones();
  const cambiarEstado = useCambiarEstadoRequisicion();
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const seleccionada = requisiciones.find((r) => r.id === seleccionadaId) ?? null;

  const puedeAprobar = puedeAprobarRequisiciones(usuario);
  const esGestor = esGestorRequisiciones(usuario);
  const veSolicitante = gestorTienePermiso(usuario, "verInfoSolicitante");
  const veProduccion = gestorTienePermiso(usuario, "verFechasYEstadosProduccion");
  // Community genera sus propias requisiciones — "mias" ya incluye lo que le asignen,
  // sin necesidad de una pestaña aparte de "Asignadas a mi".
  const esCommunity = usuario?.rol === "community";

  const misSolicitudes = useMemo(
    () =>
      requisiciones.filter(
        (r) => r.solicitanteId === usuario?.id || (esCommunity && r.responsableVentaId === usuario?.id)
      ),
    [requisiciones, usuario, esCommunity]
  );
  const pendientesAprobacion = useMemo(
    () => requisiciones.filter((r) => esPendienteDeAprobar(r.estado)),
    [requisiciones]
  );
  const asignadasGestor = useMemo(
    () => requisiciones.filter((r) => r.responsableVentaId === usuario?.id),
    [requisiciones, usuario]
  );

  const renderTabla = (lista: Requisicion[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Folio</TableHead>
          <TableHead>Titulo</TableHead>
          <TableHead>Departamento</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Prioridad</TableHead>
          <TableHead>Fecha entrega</TableHead>
          <TableHead>Estatus</TableHead>
          {puedeAprobar && <TableHead className="text-right">Acciones</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {lista.map((r) => (
          <TableRow key={r.id} className="cursor-pointer" onClick={() => setSeleccionadaId(r.id)}>
            <TableCell className="font-medium">{r.folio}</TableCell>
            <TableCell>{r.titulo}</TableCell>
            <TableCell className="text-muted-foreground">
              {veSolicitante ? r.departamentoSolicitante : <SinPermiso compacto />}
            </TableCell>
            <TableCell>{CATEGORIA_CONTENIDO_LABELS[r.tipoContenido]}</TableCell>
            <TableCell>
              <Badge variant={PRIORIDAD_BADGE[r.prioridad]}>{PRIORIDAD_LABELS[r.prioridad]}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {veProduccion ? formatFecha(r.fechaRequerida) : <SinPermiso compacto />}
            </TableCell>
            <TableCell>
              <Badge variant={ESTADO_REQUISICION_BADGE[r.estado]}>{ESTADO_REQUISICION_LABELS[r.estado]}</Badge>
            </TableCell>
            {puedeAprobar && (
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                {esPendienteDeAprobar(r.estado) && (
                  <div className="flex justify-end gap-1.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => cambiarEstado.mutate({ id: r.id, estado: "aprobada" })}
                    >
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => cambiarEstado.mutate({ id: r.id, estado: "rechazada" })}
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
        {lista.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
              Sin requisiciones en esta vista.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Requisiciones</h1>
          <p className="text-sm text-muted-foreground">Recepcion y autorizacion de solicitudes de contenido.</p>
        </div>
        <div className="flex items-center gap-2">
          <DemoBadge />
          <NuevaRequisicionDialog />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : (
        <Tabs defaultValue={puedeAprobar ? "tabla" : "mis"}>
          <TabsList>
            {puedeAprobar && <TabsTrigger value="tabla">Tabla</TabsTrigger>}
            {puedeAprobar && <TabsTrigger value="kanban">Kanban</TabsTrigger>}
            <TabsTrigger value="mis">Mis solicitudes</TabsTrigger>
            {puedeAprobar && <TabsTrigger value="pendientes">Pendientes aprobacion</TabsTrigger>}
            {esGestor && !esCommunity && <TabsTrigger value="gestor">Asignadas a mi</TabsTrigger>}
          </TabsList>

          {puedeAprobar && (
            <TabsContent value="tabla">
              <Card>
                <CardContent className="p-0">{renderTabla(requisiciones)}</CardContent>
              </Card>
            </TabsContent>
          )}

          {puedeAprobar && (
            <TabsContent value="kanban">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {ESTADOS_KANBAN.map((estado) => (
                  <div key={estado} className="space-y-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      {ESTADO_REQUISICION_LABELS[estado]} ·{" "}
                      {requisiciones.filter((r) => r.estado === estado).length}
                    </p>
                    <div className="space-y-3">
                      {requisiciones
                        .filter((r) => r.estado === estado)
                        .map((r) => (
                          <RequisicionCard
                            key={r.id}
                            r={r}
                            mostrarAcciones={puedeAprobar}
                            onAprobar={() => cambiarEstado.mutate({ id: r.id, estado: "aprobada" })}
                            onRechazar={() => cambiarEstado.mutate({ id: r.id, estado: "rechazada" })}
                            onVerDetalle={() => setSeleccionadaId(r.id)}
                          />
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          )}

          <TabsContent value="mis">
            <Card>
              <CardContent className="p-0">{renderTabla(misSolicitudes)}</CardContent>
            </Card>
          </TabsContent>

          {puedeAprobar && (
            <TabsContent value="pendientes">
              <Card>
                <CardContent className="p-0">{renderTabla(pendientesAprobacion)}</CardContent>
              </Card>
            </TabsContent>
          )}

          {esGestor && !esCommunity && (
            <TabsContent value="gestor">
              <Card>
                <CardContent className="p-0">{renderTabla(asignadasGestor)}</CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}

      <RequisicionDetalleDialog
        r={seleccionada}
        open={Boolean(seleccionadaId)}
        onOpenChange={(open) => !open && setSeleccionadaId(null)}
      />
    </div>
  );
}
