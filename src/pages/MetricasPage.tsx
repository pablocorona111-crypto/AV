import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useRequisiciones } from "@/hooks/useRequisiciones";
import { useProyectos } from "@/hooks/useProyectos";
import { useEntregables, useSalidas } from "@/hooks/useCatalogos";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoBadge } from "@/components/DemoBadge";
import { FileCheck2, FolderCheck, Timer, Video } from "lucide-react";

export function MetricasPage() {
  const { data: requisiciones = [] } = useRequisiciones();
  const { data: proyectos = [] } = useProyectos();
  const { data: entregables = [] } = useEntregables();
  const { data: salidas = [] } = useSalidas();

  const aprobadas = requisiciones.filter((r) => r.estado === "aprobada").length;
  const finalizados = proyectos.filter((p) => ["entregado", "cerrado"].includes(p.etapaActual)).length;
  const entregablesAprobados = entregables.filter((e) => e.estado === "aprobado" || e.estado === "entregado").length;
  const cumplimiento = entregables.length
    ? Math.round((entregablesAprobados / entregables.length) * 100)
    : 0;

  const jornadasPorPlanta = salidas.reduce<Record<string, number>>((acc, s) => {
    acc[s.planta] = (acc[s.planta] ?? 0) + 1;
    return acc;
  }, {});

  const dataPlanta = Object.entries(jornadasPorPlanta).map(([planta, jornadas]) => ({ planta, jornadas }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Metricas y reportes</h1>
          <p className="text-sm text-muted-foreground">Indicadores calculados desde la informacion registrada.</p>
        </div>
        <DemoBadge />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={FileCheck2} label="Requisiciones aprobadas" value={aprobadas} hint={`de ${requisiciones.length} totales`} />
        <StatCard icon={FolderCheck} label="Proyectos finalizados" value={finalizados} hint={`de ${proyectos.length} totales`} />
        <StatCard icon={Video} label="Entregables aprobados" value={entregablesAprobados} hint={`de ${entregables.length} totales`} />
        <StatCard icon={Timer} label="Cumplimiento de fechas" value={`${cumplimiento}%`} hint="Entregables a tiempo" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Jornadas realizadas por planta</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {dataPlanta.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataPlanta}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="planta" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: "#F6F8FB" }} />
                <Bar dataKey="jornadas" fill="#C1EB1F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">Sin jornadas registradas aun.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="p-5 text-xs text-muted-foreground">
          Pendiente de implementar: tiempo promedio por proyecto, tiempo promedio de revision, horas de
          grabacion/traslado/edicion. Requiere registrar timestamps reales en tareas y jornadas — ver
          BACKLOG.md.
        </CardContent>
      </Card>
    </div>
  );
}
