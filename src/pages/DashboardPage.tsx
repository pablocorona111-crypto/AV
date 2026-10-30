import { MisAvances } from "@/components/entregables/MisAvances";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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
import { useEntregables, useSalidas, useUsuarios } from "@/hooks/useCatalogos";
import { useColaboradoresDelEquipo } from "@/hooks/useColaboradoresDelEquipo";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DemoBadge } from "@/components/DemoBadge";
import {
  ESTADO_REQUISICION_BADGE,
  ESTADO_REQUISICION_LABELS,
  CATEGORIA_CONTENIDO_LABELS,
  ACCION_ENTREGA_LABELS,
} from "@/lib/labels";
import { formatFecha } from "@/lib/utils";
import { aFecha, inicioDeSemana } from "@/lib/periodo";
import {
  cumplidosPorMes,
  mesesVacios,
  produccionSemanal as calcularProduccionSemanal,
  yaEntregoMaterial,
} from "@/lib/metricas";
import { COLORES_TIPO, useTemaGrafica } from "@/lib/chartTheme";
import type { Entregable } from "@/types";

export function DashboardPage() {
  const g = useTemaGrafica();
  const { usuario } = useAuth();
  const { data: requisiciones = [] } = useRequisiciones();
  const { data: proyectos = [] } = useProyectos();
  const { data: colaboradores = [] } = useColaboradoresDelEquipo();
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
  // "Entregado" para estos stats = el colaborador ya subio el video (en_revision, aprobado o
  // entregado) — aunque falte el visto bueno de community, su parte ya esta hecha y debe
  // sumar. "Correcciones" no cuenta: ahi community ya lo reviso y lo regreso.
  const entregablesFinalizados = entregables.filter(yaEntregoMaterial).length;
  // El stat "Entregados" dice "Este mes" pero sumaba TODO el historico — se nota en cuanto hay
  // carga historica de meses pasados. Filtrado al mes en curso, igual que "Tipo de entregables".
  const entregadosEsteMes = entregables.filter((e) => {
    if (!yaEntregoMaterial(e)) return false;
    const fecha = aFecha(e.fechaEntregado ?? e.fechaAprobado ?? e.creadoEn);
    return fecha.getFullYear() === ahora.getFullYear() && fecha.getMonth() === ahora.getMonth();
  }).length;
  const entregasAtrasadas = entregables.filter(
    (e) => aFecha(e.fechaCompromiso) < ahora && !yaEntregoMaterial(e)
  ).length;
  // "Colaboradores" se cuenta de las cuentas reales (usuarios) por rol — la coleccion aparte
  // "colaboradores" (carga de trabajo/disponibilidad en Equipo) casi nunca esta poblada todavía.
  const colaboradoresDelEquipo = usuarios.filter((u) => u.rol === "colaborador_audiovisual");
  const proyectosAtencion = proyectos.filter(
    (p) => (p.prioridad === "critica" || p.prioridad === "alta") && !["entregado", "cerrado"].includes(p.etapaActual)
  ).length;
  const cumplimiento = entregables.length
    ? Math.round((entregablesFinalizados / entregables.length) * 100)
    : 0;

  // Cumplimiento semanal: aqui se trabaja Lunes a Sabado (no Lun-Dom) — el corte real es el
  // viernes, pero lo que se sube el sabado sigue contando para esa misma semana. Se mide contra
  // lo que tenia fecha compromiso esta semana, no contra todo el historico — por eso puede dar
  // 100% una semana y bajar la siguiente, a diferencia de "Cumplimiento" (ese es acumulado).
  const inicioSemanaActual = inicioDeSemana(ahora);
  const inicioDomingo = new Date(inicioSemanaActual);
  inicioDomingo.setDate(inicioDomingo.getDate() + 6);
  const entregablesDeEstaSemana = entregables.filter((e) => {
    const fecha = aFecha(e.fechaCompromiso);
    return fecha >= inicioSemanaActual && fecha < inicioDomingo;
  });
  const cumplidosEstaSemana = entregablesDeEstaSemana.filter(yaEntregoMaterial).length;
  const cumplimientoSemanal = entregablesDeEstaSemana.length
    ? Math.round((cumplidosEstaSemana / entregablesDeEstaSemana.length) * 100)
    : 100;

  // Produccion real de la semana en curso (ya no datos de ejemplo fijos).
  const produccionSemanal = calcularProduccionSemanal(entregables, requisiciones, ahora);

  // Tipo de entregables del mes en curso, real — si no hay nada todavía, un placeholder gris
  // para que la dona siga mostrando su forma (y no desaparezca el bloque completo).
  const porTipoMap = new Map<Entregable["tipo"], number>();
  entregables
    .filter((e) => {
      const creado = aFecha(e.creadoEn);
      return creado.getFullYear() === ahora.getFullYear() && creado.getMonth() === ahora.getMonth();
    })
    .forEach((e) => porTipoMap.set(e.tipo, (porTipoMap.get(e.tipo) ?? 0) + 1));
  const totalTipoMes = [...porTipoMap.values()].reduce((a, b) => a + b, 0);
  // Top 5 tipos + el resto agrupado: con 14 tipos la paleta (7 colores) se repetia y la
  // leyenda estiraba la tarjeta, deformando la grafica de al lado.
  const TOP_TIPOS = 5;
  const ordenTipos = [...porTipoMap.entries()].sort((a, b) => b[1] - a[1]);
  const restoTipos = ordenTipos.slice(TOP_TIPOS);
  const tipoEntregables =
    totalTipoMes > 0
      ? [
          ...ordenTipos.slice(0, TOP_TIPOS).map(([tipo, cantidad], i) => ({
            name: CATEGORIA_CONTENIDO_LABELS[tipo],
            cantidad,
            value: Math.round((cantidad / totalTipoMes) * 100),
            color: COLORES_TIPO[i],
          })),
          ...(restoTipos.length
            ? [(() => {
                const cantidad = restoTipos.reduce((a, [, c]) => a + c, 0);
                return {
                  name: `Otros ${restoTipos.length} tipos`,
                  cantidad,
                  value: Math.round((cantidad / totalTipoMes) * 100),
                  color: g.barraNeutra,
                };
              })()]
            : []),
        ]
      : [{ name: "Sin datos este mes", cantidad: 0, value: 100, color: g.vacio }];

  // Solo para lider/superadmin (`puedeVerMetricasGlobales`).
  const entregadosPorMesReal = cumplidosPorMes(entregables);
  const entregadosPorMes = entregadosPorMesReal.length > 0 ? entregadosPorMesReal : mesesVacios(6, ahora);

  const nombreDe = (id: string) => usuarios.find((u) => u.id === id)?.nombre ?? "Usuario eliminado";
  const proyectoDe = (id: string | undefined) => (id ? proyectos.find((p) => p.id === id)?.nombre : undefined);

  // Actividad real (ya no nombres de ejemplo fijos) — un renglon por cada cambio de estado con
  // fecha conocida (creado/aprobado/entregado), el mas reciente de cada entregable primero.
  const actividadReciente = entregables
    .flatMap((e) => {
      const eventos: { icono: typeof Film; texto: string; cuando: Date }[] = [];
      if (e.fechaEntregado) {
        eventos.push({
          icono: CheckCircle2,
          texto: `${nombreDe(e.responsableId)} marcó "${e.nombre}" como ${ACCION_ENTREGA_LABELS[e.tipo]}`,
          cuando: aFecha(e.fechaEntregado),
        });
      }
      if (e.fechaAprobado) {
        eventos.push({ icono: CheckCircle2, texto: `Se aprobó "${e.nombre}"`, cuando: aFecha(e.fechaAprobado) });
      }
      if (e.creadoEn) {
        eventos.push({ icono: Upload, texto: `${nombreDe(e.responsableId)} creó el entregable "${e.nombre}"`, cuando: aFecha(e.creadoEn) });
      }
      const proyecto = proyectoDe(e.proyectoId);
      return eventos.map((ev) => ({ ...ev, detalle: `${CATEGORIA_CONTENIDO_LABELS[e.tipo]}${proyecto ? ` · ${proyecto}` : ""}` }));
    })
    .sort((a, b) => b.cuando.getTime() - a.cuando.getTime())
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">¡Hola, {usuario?.nombre?.split(" ")[0] ?? "de nuevo"}!</h1>
          <p className="text-sm text-muted-foreground">Aquí tienes el resumen del departamento audiovisual.</p>
        </div>
        <DemoBadge />
      </div>

      {/* Cada quien reporta aqui su % de avance (antes solo existia en Rendimiento, que es solo del
          lider — los colaboradores no tenian donde actualizarlo). */}
      {usuario && <MisAvances usuarioId={usuario.id} nombre={usuario.nombre} puesto={usuario.puesto} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={FileText} label="Requisiciones" value={requisiciones.length} hint="En total" />
        <StatCard icon={Clock} label="Por aprobar" value={pendientesAprobacion} hint="Requieren revisión" />
        <StatCard icon={Film} label="En postproducción" value={enPostproduccion} hint="Proyectos activos" />
        <StatCard icon={CheckCircle2} label="Entregados" value={entregadosEsteMes} hint="Este mes" />
        <StatCard icon={AlertTriangle} label="Entregas atrasadas" value={entregasAtrasadas} hint="Requieren atención" iconBg="bg-red-100 dark:bg-red-400/20" />
        <StatCard icon={Clock} label="Cumplimiento" value={`${cumplimiento}%`} hint="A tiempo" />
        <StatCard icon={Camera} label="Salidas programadas" value={salidas.length} hint="Registradas" />
        <StatCard icon={Users} label="Colaboradores" value={colaboradoresDelEquipo.length} hint="Audiovisuales en el equipo" />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Cumplimiento semanal</p>
            <p className="text-xs text-muted-foreground">
              Lunes a sábado · {cumplidosEstaSemana} de {entregablesDeEstaSemana.length || 0} con fecha compromiso
              esta semana
            </p>
          </div>
          <div className="flex items-center gap-3 sm:w-64">
            <Progress value={cumplimientoSemanal} className="h-2.5" />
            <span className="w-12 shrink-0 text-right text-lg font-bold">{cumplimientoSemanal}%</span>
          </div>
        </CardContent>
      </Card>

      {proyectosAtencion > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-400/10">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-900 dark:text-amber-200">
              {proyectosAtencion === 1
                ? "1 proyecto de prioridad alta o crítica requiere atención."
                : `${proyectosAtencion} proyectos de prioridad alta o crítica requieren atención.`}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* flex-col + flex-1: la grafica llena la altura de la fila en vez de dejar hueco abajo. */}
        <Card className="flex flex-col lg:col-span-2">
          <CardHeader>
            <CardTitle>Producción semanal</CardTitle>
          </CardHeader>
          <CardContent className="min-h-56 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={produccionSemanal}>
                <CartesianGrid strokeDasharray="3 3" stroke={g.grid} vertical={false} />
                <XAxis dataKey="dia" tickLine={false} axisLine={false} fontSize={12} tick={g.tick} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} tick={g.tick} />
                <Tooltip cursor={g.cursor} {...g.tooltip} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="entregados" name="Entregados" fill="#C1EB1F" radius={[4, 4, 0, 0]} />
                <Bar dataKey="solicitudes" name="Solicitudes" fill={g.barraNeutra} radius={[4, 4, 0, 0]} />
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
                  <Tooltip {...g.tooltip} />
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
                  <span className="shrink-0 font-medium">
                    {t.value}%{t.cantidad > 0 && <span className="ml-1 font-normal text-muted-foreground">({t.cantidad})</span>}
                  </span>
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
                Aún no hay entregables marcados como entregados.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={entregadosPorMes}>
                  <CartesianGrid strokeDasharray="3 3" stroke={g.grid} vertical={false} />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} tick={g.tick} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} tick={g.tick} />
                  <Tooltip cursor={g.cursor} {...g.tooltip} />
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
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 font-medium">Folio</th>
                  <th className="py-2 font-medium">Título</th>
                  <th className="py-2 font-medium">Tipo</th>
                  <th className="py-2 font-medium">Fecha requerida</th>
                  <th className="py-2 font-medium">Estado</th>
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
                Sin colaboradores registrados en Equipo todavía.
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
            <p className="py-6 text-center text-sm text-muted-foreground">Sin actividad registrada todavía.</p>
          )}
          {actividadReciente.map((a, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg-secondary">
                <a.icono className="h-3.5 w-3.5 text-text-primary/70" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm">{a.texto}</p>
                <p className="text-xs text-muted-foreground">{a.detalle}</p>
                <p className="text-xs text-muted-foreground sm:hidden">
                  {formatDistanceToNow(a.cuando, { addSuffix: true, locale: es })}
                </p>
              </div>
              <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                {formatDistanceToNow(a.cuando, { addSuffix: true, locale: es })}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
