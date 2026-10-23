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
  Video,
  CheckCircle2,
  Clock,
  Camera,
  Users,
  AlertTriangle,
  Film,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { puedeVerMetricasGlobales } from "@/lib/roles";
import { useRequisiciones } from "@/hooks/useRequisiciones";
import { useProyectos } from "@/hooks/useProyectos";
import { useColaboradores, useEntregables, useSalidas } from "@/hooks/useCatalogos";
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
import { cumplidosPorMes } from "@/lib/metricas";

const PRODUCCION_SEMANAL = [
  { dia: "Lun", entregados: 11, solicitudes: 8 },
  { dia: "Mar", entregados: 15, solicitudes: 13 },
  { dia: "Mie", entregados: 10, solicitudes: 14 },
  { dia: "Jue", entregados: 17, solicitudes: 9 },
  { dia: "Vie", entregados: 13, solicitudes: 10 },
];

const TIPO_ENTREGABLES = [
  { name: "Video / Edicion", value: 40, color: "#C1EB1F" },
  { name: "Fotografia", value: 20, color: "#93C5FD" },
  { name: "Diseño grafico", value: 15, color: "#86EFAC" },
  { name: "Animacion", value: 15, color: "#C4B5FD" },
  { name: "Cobertura de evento", value: 10, color: "#FDBA74" },
];

const ACTIVIDAD_RECIENTE = [
  { icono: Camera, texto: "Mariana Lopez subio nuevos archivos", detalle: "Fotografia de producto · AV-1022", hace: "hace 2 h" },
  { icono: CheckCircle2, texto: "Carlos Mendez cambio el estatus a En revision", detalle: "Animacion Stretch Film · AV-1021", hace: "hace 4 h" },
  { icono: FileText, texto: "Luis Ramirez comento en la requisicion", detalle: '"Primera version lista para revision"', hace: "hace 5 h" },
  { icono: Video, texto: "Nuevo comentario de Marketing", detalle: "Video institucional planta · AV-1023", hace: "hace 6 h" },
  { icono: CheckCircle2, texto: "Sofia Herrera marco como entregado", detalle: "Adaptacion redes sociales · AV-1019", hace: "hace 1 dia" },
];

export function DashboardPage() {
  const { usuario } = useAuth();
  const { data: requisiciones = [] } = useRequisiciones();
  const { data: proyectos = [] } = useProyectos();
  const { data: colaboradores = [] } = useColaboradores();
  const { data: entregables = [] } = useEntregables();
  const { data: salidas = [] } = useSalidas();

  const pendientesAprobacion = requisiciones.filter(
    (r) => r.estado === "enviada" || r.estado === "en_evaluacion"
  ).length;
  const enPostproduccion = proyectos.filter((p) =>
    ["edicion", "animacion_acabados", "revision", "correcciones"].includes(p.etapaActual)
  ).length;
  const entregablesFinalizados = entregables.filter((e) => e.estado === "entregado" || e.estado === "aprobado").length;
  const entregasAtrasadas = entregables.filter(
    (e) => new Date(e.fechaCompromiso) < new Date("2026-10-14") && e.estado !== "entregado"
  ).length;
  const colaboradoresDisponibles = colaboradores.filter((c) => c.disponibilidad === "disponible").length;
  const proyectosAtencion = proyectos.filter(
    (p) => (p.prioridad === "critica" || p.prioridad === "alta") && !["entregado", "cerrado"].includes(p.etapaActual)
  ).length;
  const cumplimiento = entregables.length
    ? Math.round((entregablesFinalizados / entregables.length) * 100)
    : 94;

  // Solo para lider/superadmin (`puedeVerMetricasGlobales`).
  const entregadosPorMes = cumplidosPorMes(entregables);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">¡Hola, {usuario?.nombre?.split(" ")[0] ?? "de nuevo"}!</h1>
          <p className="text-sm text-muted-foreground">Aqui tienes el resumen del departamento audiovisual.</p>
        </div>
        <DemoBadge />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={FileText} label="Requisiciones" value={requisiciones.length} hint="Este mes" trend={{ value: "12%", positive: true }} />
        <StatCard icon={Clock} label="Pendientes aprobacion" value={pendientesAprobacion} hint="Requieren revision" />
        <StatCard icon={Film} label="En postproduccion" value={enPostproduccion} hint="Proyectos activos" trend={{ value: "8%", positive: false }} />
        <StatCard icon={CheckCircle2} label="Entregados" value={entregablesFinalizados} hint="Este mes" trend={{ value: "28%", positive: true }} />
        <StatCard icon={AlertTriangle} label="Entregas atrasadas" value={entregasAtrasadas} hint="Requieren atencion" iconBg="bg-red-100" />
        <StatCard icon={Clock} label="Cumplimiento" value={`${cumplimiento}%`} hint="A tiempo" trend={{ value: "6%", positive: true }} />
        <StatCard icon={Camera} label="Salidas programadas" value={salidas.length} hint="Proximos 7 dias" />
        <StatCard icon={Users} label="Colaboradores disponibles" value={colaboradoresDisponibles} hint={`de ${colaboradores.length} totales`} />
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
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PRODUCCION_SEMANAL}>
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
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={TIPO_ENTREGABLES}
                    dataKey="value"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {TIPO_ENTREGABLES.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {TIPO_ENTREGABLES.map((t) => (
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
          <CardContent className="h-56">
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
          {ACTIVIDAD_RECIENTE.map((a, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg-secondary">
                <a.icono className="h-3.5 w-3.5 text-text-primary/70" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm">{a.texto}</p>
                <p className="text-xs text-muted-foreground">{a.detalle}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{a.hace}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
