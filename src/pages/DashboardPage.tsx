import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  Camera,
  Users,
  AlertTriangle,
  Film,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/context/AuthContext";
import { puedeVerMetricasGlobales } from "@/lib/roles";
import { useRequisiciones } from "@/hooks/useRequisiciones";
import { useProyectos } from "@/hooks/useProyectos";
import { useColaboradores, useEntregables, useSalidas, useUsuarios } from "@/hooks/useCatalogos";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DemoBadge } from "@/components/DemoBadge";
import {
  ESTADO_REQUISICION_BADGE,
  ESTADO_REQUISICION_LABELS,
  CATEGORIA_CONTENIDO_LABELS,
} from "@/lib/labels";
import { formatFecha } from "@/lib/utils";
import { aFecha, inicioDeSemana } from "@/lib/periodo";
import { cumplidosPorMes, mesesVacios } from "@/lib/metricas";
import type { Entregable } from "@/types";

const DIAS_SEMANA = ["Lun", "Mar", "Mie", "Jue", "Vie"];
const COLORES_TIPO = ["#C1EB1F", "#93C5FD", "#86EFAC", "#C4B5FD", "#FDBA74", "#FCA5A5", "#67E8F9"];

function mismoDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function DashboardPage() {
  const { usuario } = useAuth();
  const { data: requisiciones = [] } = useRequisiciones();
  const { data: proyectos = [] } = useProyectos();
  const { data: colaboradores = [] } = useColaboradores();
  const { data: entregables = [] } = useEntregables();
  const { data: salidas = [] } = useSalidas();
  const { data: usuarios = [] } = useUsuarios();

  const ahora = new Date();
  const pendientesAprobacion = requisiciones.filter(
    (r) => r.estado === "enviada" || r.estado === "en_evaluacion"
  ).length;
  const enPostproduccion = proyectos.filter((p) =>
    ["edicion", "animacion_acabados", "revision", "correcciones"].includes(p.etapaActual)
  ).length;
  const entregablesFinalizados = entregables.filter((e) => e.estado === "entregado" || e.estado === "aprobado").length;
  const entregasAtrasadas = entregables.filter(
    (e) => aFecha(e.fechaCompromiso) < ahora && e.estado !== "entregado"
  ).length;
  // "Colaboradores" se cuenta de las cuentas reales (usuarios) por rol — la coleccion aparte
  // "colaboradores" (carga de trabajo/disponibilidad en Equipo) casi nunca esta poblada todavia.
  const colaboradoresDelEquipo = usuarios.filter((u) => u.rol === "colaborador_audiovisual");
  const proyectosAtencion = proyectos.filter(
    (p) => (p.prioridad === "critica" || p.prioridad === "alta") && !["entregado", "cerrado"].includes(p.etapaActual)
  ).length;
  const cumplimiento = entregables.length
    ? Math.round((entregablesFinalizados / entregables.length) * 100)
    : 94;

  // Produccion real de la semana en curso (ya no datos de ejemplo fijos): por cada dia Lun-Vie,
  // cuantos entregables se entregaron ese dia y cuantas requisiciones se crearon ese dia.
  const inicioSemana = inicioDeSemana(ahora);
  const produccionSemanal = DIAS_SEMANA.map((dia, i) => {
    const fechaDia = new Date(inicioSemana);
    fechaDia.setDate(fechaDia.getDate() + i);
    return {
      dia,
      entregados: entregables.filter((e) => e.fechaEntregado && mismoDia(aFecha(e.fechaEntregado), fechaDia)).length,
      solicitudes: requisiciones.filter((r) => mismoDia(aFecha(r.creadoEn), fechaDia)).length,
    };
  });

  // Tipo de entregables del mes en curso, real — si no hay nada todavia, un placeholder gris
  // para que la dona siga mostrando su forma (y no desaparezca el bloque completo).
  const porTipoMap = new Map<Entregable["tipo"], number>();
  entregables
    .filter((e) => {
      const creado = aFecha(e.creadoEn);
      return creado.getFullYear() === ahora.getFullYear() && creado.getMonth() === ahora.getMonth();
    })
    .forEach((e) => porTipoMap.set(e.tipo, (porTipoMap.get(e.tipo) ?? 0) + 1));
  const totalTipoMes = [...porTipoMap.values()].reduce((a, b) => a + b, 0);
  const tipoEntregables =
    totalTipoMes > 0
      ? [...porTipoMap.entries()].map(([tipo, cantidad], i) => ({
          name: CATEGORIA_CONTENIDO_LABELS[tipo],
          value: Math.round((cantidad / totalTipoMes) * 100),
          color: COLORES_TIPO[i % COLORES_TIPO.length],
        }))
      : [{ name: "Sin datos este mes", value: 100, color: "#E5E7EB" }];

  // Solo para lider/superadmin (`puedeVerMetricasGlobales`).
  const entregadosPorMesReal = cumplidosPorMes(entregables);
  const entregadosPorMes = entregadosPorMesReal.length > 0 ? entregadosPorMesReal : mesesVacios(6, ahora);

  const nombreDe = (id: string) => usuarios.find((u) => u.id === id)?.nombre ?? id;
  const proyectoDe = (id: string | undefined) => (id ? proyectos.find((p) => p.id === id)?.nombre : undefined);

  // Actividad real (ya no nombres de ejemplo fijos) — un renglon por cada cambio de estado con
  // fecha conocida (creado/aprobado/entregado), el mas reciente de cada entregable primero.
  const actividadReciente = entregables
    .flatMap((e) => {
      const eventos: { icono: typeof Film; texto: string; cuando: Date }[] = [];
      if (e.fechaEntregado) {
        eventos.push({ icono: CheckCircle2, texto: `${nombreDe(e.responsableId)} marco "${e.nombre}" como entregado`, cuando: aFecha(e.fechaEntregado) });
      }
      if (e.fechaAprobado) {
        eventos.push({ icono: CheckCircle2, texto: `Se aprobo "${e.nombre}"`, cuando: aFecha(e.fechaAprobado) });
      }
      if (e.creadoEn) {
        eventos.push({ icono: Upload, texto: `${nombreDe(e.responsableId)} creo el entregable "${e.nombre}"`, cuando: aFecha(e.creadoEn) });
      }
      const proyecto = proyectoDe(e.proyectoId);
      return eventos.map((ev) => ({ ...ev, detalle: `${CATEGORIA_CONTENIDO_LABELS[e.tipo]}${proyecto ? ` · ${proyecto}` : ""}` }));
    })
    .sort((a, b) => b.cuando.getTime() - a.cuando.getTime())
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">¡Hola, {usuario?.nombre?.split(" ")[0] ?? "de nuevo"}!</h1>
          <p className="text-sm text-muted-foreground">Aqui tienes el resumen del departamento audiovisual.</p>
        </div>
        <DemoBadge />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={FileText} label="Requisiciones" value={requisiciones.length} hint="Este mes" />
        <StatCard icon={Clock} label="Pendientes aprobacion" value={pendientesAprobacion} hint="Requieren revision" />
        <StatCard icon={Film} label="En postproduccion" value={enPostproduccion} hint="Proyectos activos" />
        <StatCard icon={CheckCircle2} label="Entregados" value={entregablesFinalizados} hint="Este mes" />
        <StatCard icon={AlertTriangle} label="Entregas atrasadas" value={entregasAtrasadas} hint="Requieren atencion" iconBg="bg-red-100" />
        <StatCard icon={Clock} label="Cumplimiento" value={`${cumplimiento}%`} hint="A tiempo" />
        <StatCard icon={Camera} label="Salidas programadas" value={salidas.length} hint="Proximos 7 dias" />
        <StatCard icon={Users} label="Colaboradores" value={colaboradoresDelEquipo.length} hint="Audiovisuales en el equipo" />
      </div>

      {proyectosAtencion > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-900">
              {proyectosAtencion} proyecto(s) de prioridad alta/critica requieren atencion.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Produccion semanal</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={produccionSemanal}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="dia" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip cursor={{ fill: "#F6F8FB" }} />
                <Bar dataKey="entregados" name="Entregados" fill="#C1EB1F" radius={[4, 4, 0, 0]} />
                <Bar dataKey="solicitudes" name="Solicitudes" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tipo de entregables (mes)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tipoEntregables}
                    dataKey="value"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {tipoEntregables.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {tipoEntregables.map((t) => (
                <div key={t.name} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="truncate">{t.name}</span>
                  </span>
                  <span className="shrink-0 font-medium">{t.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {puedeVerMetricasGlobales(usuario) && (
        <Card>
          <CardHeader>
            <CardTitle>Trabajos cumplidos por mes</CardTitle>
          </CardHeader>
          <CardContent className="h-48">
            {entregadosPorMes.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Aun no hay entregables marcados como entregados.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={entregadosPorMes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "#F6F8FB" }} />
                  <Bar dataKey="total" name="Cumplidos" fill="#C1EB1F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Requisiciones recientes</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 font-medium">Folio</th>
                  <th className="py-2 font-medium">Titulo</th>
                  <th className="py-2 font-medium">Prioridad</th>
                  <th className="py-2 font-medium">Fecha entrega</th>
                  <th className="py-2 font-medium">Estatus</th>
                </tr>
              </thead>
              <tbody>
                {requisiciones.slice(0, 5).map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 font-medium">{r.folio}</td>
                    <td className="py-2.5">{r.titulo}</td>
                    <td className="py-2.5">{CATEGORIA_CONTENIDO_LABELS[r.tipoContenido]}</td>
                    <td className="py-2.5 text-muted-foreground">{formatFecha(r.fechaRequerida)}</td>
                    <td className="py-2.5">
                      <Badge variant={ESTADO_REQUISICION_BADGE[r.estado]}>
                        {ESTADO_REQUISICION_LABELS[r.estado]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Carga de trabajo del equipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {colaboradores.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Sin colaboradores registrados en Equipo todavia.
              </p>
            )}
            {colaboradores.map((c) => (
              <div key={c.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{c.nombre}</span>
                  <span className="text-muted-foreground">{c.cargaReal}%</span>
                </div>
                <Progress value={c.cargaReal} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actividad reciente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {actividadReciente.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Sin actividad registrada todavia.</p>
          )}
          {actividadReciente.map((a, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg-secondary">
                <a.icono className="h-3.5 w-3.5 text-text-primary/70" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm">{a.texto}</p>
                <p className="text-xs text-muted-foreground">{a.detalle}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDistanceToNow(a.cuando, { addSuffix: true, locale: es })}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
