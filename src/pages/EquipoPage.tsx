import { useMemo } from "react";
import { useEntregables, useEquipoAV } from "@/hooks/useCatalogos";
import { useColaboradoresDelEquipo } from "@/hooks/useColaboradoresDelEquipo";
import { useAuth } from "@/context/AuthContext";
import { puedeGestionarUsuarios } from "@/lib/roles";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemoBadge } from "@/components/DemoBadge";
import { NuevoColaboradorDialog } from "@/components/equipo/NuevoColaboradorDialog";
import { EditarEspecialidadesDialog } from "@/components/equipo/EditarEspecialidadesDialog";
import { aCatalogo } from "@/lib/especialidades";
import { cargaDeTrabajo, entregablesPorResponsable, nivelCumplimiento, rendimientoSemanal, semana, type CargaTrabajo } from "@/lib/rendimiento";
import type { EstadoEquipo } from "@/types";

const ESTADO_EQUIPO_LABELS: Record<EstadoEquipo, string> = {
  disponible: "Disponible",
  en_uso: "En uso",
  mantenimiento: "Mantenimiento",
  baja: "Baja",
};

const ESTADO_EQUIPO_BADGE: Record<EstadoEquipo, "success" | "warning" | "danger" | "default"> = {
  disponible: "success",
  en_uso: "warning",
  mantenimiento: "danger",
  baja: "default",
};

const NIVEL_CARGA: Record<CargaTrabajo["nivel"], { label: string; barra: string; badge: "success" | "warning" | "danger" }> = {
  libre: { label: "Disponible", barra: "bg-green-500", badge: "success" },
  ocupado: { label: "Ocupado", barra: "bg-amber-500", badge: "warning" },
  saturado: { label: "Saturado", barra: "bg-red-500", badge: "danger" },
};

const BARRA_CUMPLIMIENTO = { bien: "bg-green-500", riesgo: "bg-amber-500", bajo: "bg-red-500", sin_datos: "bg-bg-secondary" };

export function EquipoPage() {
  const { usuario } = useAuth();
  const { data: equipoAV = [], isLoading: cargandoEquipo } = useEquipoAV();
  const { data: colaboradores = [], isLoading: cargandoColaboradores } = useColaboradoresDelEquipo();
  const { data: entregables = [] } = useEntregables();
  const esLider = puedeGestionarUsuarios(usuario);

  // Carga y avance de la semana calculados de los entregables reales de cada persona.
  const filas = useMemo(() => {
    const porResponsable = entregablesPorResponsable(entregables);
    const estaSemana = semana(0);
    return colaboradores
      .map((c) => {
        const propios = porResponsable.get(c.id) ?? [];
        return { c, carga: cargaDeTrabajo(propios), semana: rendimientoSemanal(propios, estaSemana) };
      })
      .sort((a, b) => b.carga.activas - a.carga.activas);
  }, [colaboradores, entregables]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Equipo</h1>
          <p className="text-sm text-muted-foreground">Inventario audiovisual y equipo humano del departamento.</p>
        </div>
        <div className="flex items-center gap-3">
          <DemoBadge />
          {puedeGestionarUsuarios(usuario) && <NuevoColaboradorDialog />}
        </div>
      </div>

      <Tabs defaultValue="humano">
        <TabsList>
          <TabsTrigger value="humano">Equipo humano</TabsTrigger>
          <TabsTrigger value="av">Equipo audiovisual</TabsTrigger>
        </TabsList>

        <TabsContent value="humano">
          <Card>
            <CardContent className="p-0">
              {cargandoColaboradores ? (
                <p className="p-5 text-sm text-muted-foreground">Cargando equipo…</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Especialidades</TableHead>
                      <TableHead>Carga actual</TableHead>
                      <TableHead>Entregadas esta semana</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filas.map(({ c, carga, semana: sem }) => {
                      const especialidades = aCatalogo(c.especialidades);
                      return (
                        <TableRow key={c.id}>
                          <TableCell>
                            <p className="font-medium">{c.nombre}</p>
                            <p className="text-xs text-muted-foreground">{c.puesto}</p>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="flex flex-wrap items-center gap-1">
                              {especialidades.map((e) => (
                                <Badge key={e} variant="accent" className="px-2 py-0 text-[11px]">
                                  {e}
                                </Badge>
                              ))}
                              {especialidades.length === 0 && (
                                <span className="text-xs text-muted-foreground">Sin asignar</span>
                              )}
                              {esLider && <EditarEspecialidadesDialog colaborador={c} />}
                            </div>
                          </TableCell>
                          <TableCell className="w-44">
                            <div className="flex items-center gap-2">
                              <Progress
                                value={Math.min(carga.porcentaje, 100)}
                                indicadorClassName={NIVEL_CARGA[carga.nivel].barra}
                                className="w-24"
                                aria-label={`Carga de ${c.nombre}`}
                              />
                              <span className="whitespace-nowrap text-xs text-muted-foreground">{carga.activas} {carga.activas === 1 ? "tarea" : "tareas"}</span>
                            </div>
                            {carga.atrasadas > 0 && (
                              <p className="mt-0.5 text-[11px] text-red-600 dark:text-red-400">{carga.atrasadas} atrasadas</p>
                            )}
                          </TableCell>
                          <TableCell className="w-44">
                            <div className="flex items-center gap-2">
                              <Progress
                                value={sem.porcentaje ?? 0}
                                indicadorClassName={BARRA_CUMPLIMIENTO[nivelCumplimiento(sem.porcentaje)]}
                                className="w-24"
                                aria-label={`Avance semanal de ${c.nombre}`}
                              />
                              <span className="text-xs text-muted-foreground">
                                {sem.asignadas ? `${sem.entregadas}/${sem.asignadas}` : "—"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={NIVEL_CARGA[carga.nivel].badge}>{NIVEL_CARGA[carga.nivel].label}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              {!cargandoColaboradores && colaboradores.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Aún no hay colaboradores. Cuando invites a alguien con el rol “Colaborador audiovisual”
                  aparecerá aquí. Usa “Nuevo colaborador” solo para alguien externo sin cuenta.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="av">
          <Card>
            <CardContent className="p-0">
              {cargandoEquipo ? (
                <p className="p-5 text-sm text-muted-foreground">Cargando inventario…</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Marca / Modelo</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipoAV.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.codigoInterno}</TableCell>
                        <TableCell>{e.nombre}</TableCell>
                        <TableCell className="text-muted-foreground">{e.categoria}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {e.marca} {e.modelo}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{e.ubicacion}</TableCell>
                        <TableCell>
                          <Badge variant={ESTADO_EQUIPO_BADGE[e.estado]}>{ESTADO_EQUIPO_LABELS[e.estado]}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
