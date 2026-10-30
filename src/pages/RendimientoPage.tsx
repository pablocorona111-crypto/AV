import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ListChecks, Target } from "lucide-react";
import { useEntregables, useUsuarios } from "@/hooks/useCatalogos";
import { useColaboradoresDelEquipo } from "@/hooks/useColaboradoresDelEquipo";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DemoBadge } from "@/components/DemoBadge";
import { AvanceEntregable } from "@/components/entregables/AvanceEntregable";
import { MisAvances } from "@/components/entregables/MisAvances";
import { AnilloArea, DonaResumen } from "@/components/dashboard/ResumenArea";
import { coloresDelEquipo } from "@/lib/avatar";
import { useAuth } from "@/context/AuthContext";
import { useTemaGrafica } from "@/lib/chartTheme";
import { CATEGORIA_CONTENIDO_LABELS, etiquetaEstadoEntregable, ESTADO_ENTREGABLE_BADGE } from "@/lib/labels";
import { cn, formatFecha } from "@/lib/utils";
import {
  avanceDe,
  donaEstados,
  entregasEnRango,
  explicarArea,
  entregablesPorResponsable,
  nivelCumplimiento,
  rendimientoSemanal,
  semana,
  type EstadoTareaSemana,
  type NivelCumplimiento,
  type RendimientoSemanal,
  type SemanaRango,
} from "@/lib/rendimiento";

const SEMANAS_HISTORIAL = 6;

const NIVEL: Record<NivelCumplimiento, { label: string; barra: string; badge: BadgeVariant }> = {
  bien: { label: "Al día", barra: "bg-green-500", badge: "success" },
  riesgo: { label: "En riesgo", barra: "bg-amber-500", badge: "warning" },
  bajo: { label: "Bajo", barra: "bg-red-500", badge: "danger" },
  sin_datos: { label: "Sin tareas", barra: "bg-bg-secondary", badge: "default" },
};

const ESTADO_TAREA: Record<EstadoTareaSemana, { label: string; badge: BadgeVariant }> = {
  a_tiempo: { label: "A tiempo", badge: "success" },
  tarde: { label: "Entregada tarde", badge: "warning" },
  atrasada: { label: "Atrasada", badge: "danger" },
  pendiente: { label: "Por entregar", badge: "default" },
};

function etiquetaSemana(s: SemanaRango) {
  const fin = new Date(s.fin);
  fin.setDate(fin.getDate() - 1);
  const fmt = (d: Date) => d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  return `${fmt(s.inicio)} – ${fmt(fin)}`;
}

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

interface FilaColaborador {
  id: string;
  nombre: string;
  puesto: string;
  color: string;
  actual: RendimientoSemanal;
  historial: { semana: string; porcentaje: number | null }[];
}

export function RendimientoPage() {
  const g = useTemaGrafica();
  const { usuario } = useAuth();
  const [offset, setOffset] = useState(0);
  const [abierto, setAbierto] = useState<string | null>(null);
  const { data: entregables = [], isLoading } = useEntregables();
  const { data: usuarios = [] } = useUsuarios();
  const { data: colaboradores = [] } = useColaboradoresDelEquipo();

  const hoyKey = new Date().toDateString();
  const semanaActual = useMemo(() => semana(offset), [offset, hoyKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const { filas, equipo, tendencia, porPersona, pctATiempo } = useMemo(() => {
    const porResponsable = entregablesPorResponsable(entregables);
    const semanasHist = Array.from({ length: SEMANAS_HISTORIAL }, (_, i) =>
      semana(offset - (SEMANAS_HISTORIAL - 1 - i))
    );

    // Roster del equipo + cualquier responsable con tareas que no este en el (ej. cambio de rol).
    const personas = new Map(colaboradores.map((c) => [c.id, { nombre: c.nombre, puesto: c.puesto }]));
    for (const id of porResponsable.keys()) {
      if (personas.has(id)) continue;
      const u = usuarios.find((x) => x.id === id);
      personas.set(id, { nombre: u?.nombre ?? "Usuario sin cuenta", puesto: u?.puesto ?? "—" });
    }

    const colorPersona = coloresDelEquipo([...personas.values()].map((p) => p.nombre));
    const filas: FilaColaborador[] = [...personas].map(([id, p]) => {
      const propios = porResponsable.get(id) ?? [];
      return {
        id,
        ...p,
        color: colorPersona(p.nombre),
        actual: rendimientoSemanal(propios, semanaActual),
        historial: semanasHist.map((s) => ({
          semana: etiquetaSemana(s),
          porcentaje: rendimientoSemanal(propios, s).porcentaje,
        })),
      };
    });
    // Mejor cumplimiento arriba; quien no tuvo nada asignado va al final.
    filas.sort((a, b) => (b.actual.avance ?? -1) - (a.actual.avance ?? -1) || b.actual.asignadas - a.actual.asignadas);

    const equipo = rendimientoSemanal(entregables, semanaActual);
    const tendencia = semanasHist.map((s) => {
      const r = rendimientoSemanal(entregables, s);
      return { semana: etiquetaSemana(s), cumplimiento: r.porcentaje ?? 0, asignadas: r.asignadas };
    });
    const entregas = entregasEnRango(entregables, semanaActual);
    const cuenta = new Map<string, number>();
    for (const { entregable } of entregas) cuenta.set(entregable.responsableId, (cuenta.get(entregable.responsableId) ?? 0) + 1);
    const porPersona = [...cuenta.entries()]
      .map(([id, valor]) => {
        const nombre = personas.get(id)?.nombre ?? "Otro";
        return { nombre, valor, color: colorPersona(nombre) };
      })
      .sort((a, b) => b.valor - a.valor);
    const pctATiempo = entregas.length
      ? Math.round((entregas.filter((e) => e.aTiempo).length / entregas.length) * 100)
      : null;
    return { filas, equipo, tendencia, porPersona, pctATiempo };
  }, [entregables, usuarios, colaboradores, semanaActual, offset]);

  const nivelEquipo = nivelCumplimiento(equipo.porcentaje);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Rendimiento del equipo</h1>
          <p className="text-sm text-muted-foreground">
            Tareas con fecha compromiso en la semana vs. las que cada colaborador ya entregó.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DemoBadge />
          <Button variant="outline" size="icon" onClick={() => setOffset((o) => o - 1)} aria-label="Semana anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[9.5rem] text-center text-sm font-medium">
            {offset === 0 ? "Esta semana" : offset === -1 ? "Semana pasada" : etiquetaSemana(semanaActual)}
            {offset >= -1 && <p className="text-[11px] font-normal text-muted-foreground">{etiquetaSemana(semanaActual)}</p>}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setOffset((o) => o + 1)}
            disabled={offset >= 0}
            aria-label="Semana siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {/* Siempre ocupa su lugar (invisible en "esta semana") para que las flechas no se muevan al hacer clic. */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOffset(0)}
            className={cn(offset === 0 && "invisible")}
            tabIndex={offset === 0 ? -1 : 0}
          >
            Hoy
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          icon={Target}
          label="Cumplimiento del equipo"
          value={equipo.porcentaje === null ? "—" : `${equipo.porcentaje}%`}
          hint={NIVEL[nivelEquipo].label}
        />
        <StatCard icon={ListChecks} label="Tareas entregadas" value={`${equipo.entregadas}/${equipo.asignadas}`} hint="de la semana" />
        <StatCard icon={CheckCircle2} label="Entregadas a tiempo" value={equipo.aTiempo} hint={`${equipo.aprobadas} ya aprobadas`} />
        <StatCard
          icon={AlertTriangle}
          label="Atrasadas"
          value={equipo.atrasadas}
          hint={`${equipo.enCorrecciones} en correcciones`}
          iconBg="bg-red-500/15"
        />
      </div>

      {/* Resumen general del area + donas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AnilloArea
          avance={equipo.avance}
          cumplimiento={equipo.porcentaje}
          aTiempo={pctATiempo}
          explicacion={explicarArea(
            equipo,
            offset === 0 ? "esta semana" : offset === -1 ? "la semana pasada" : `la semana del ${etiquetaSemana(semanaActual)}`
          )}
        />
        <DonaResumen titulo="Estado de las tareas" datos={donaEstados(equipo)} centro="tareas" />
        <DonaResumen titulo="¿Quién entregó?" datos={porPersona} centro="entregas" />
      </div>

      {usuario && <MisAvances usuarioId={usuario.id} nombre={usuario.nombre} puesto={usuario.puesto} />}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Colaboradores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-3 pt-0 sm:p-5 sm:pt-0">
          {isLoading && <p className="text-sm text-muted-foreground">Cargando rendimiento…</p>}
          {!isLoading && filas.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Sin colaboradores registrados todavía.</p>
          )}
          {filas.map((f) => {
            // La barra es el AVANCE REAL (promedio del % de cada tarea), no solo entregado/no entregado.
            const nivel = nivelCumplimiento(f.actual.avance);
            const expandido = abierto === f.id;
            return (
              <div key={f.id} className="rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setAbierto(expandido ? null : f.id)}
                  aria-expanded={expandido}
                  className="flex w-full flex-col gap-3 p-3 text-left hover:bg-bg-secondary/50 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="flex min-w-0 items-center gap-3 sm:w-56">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: f.color }}
                    >
                      {iniciales(f.nombre)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{f.nombre}</p>
                      <p className="truncate text-xs text-muted-foreground">{f.puesto}</p>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-baseline justify-between text-xs">
                      <span className="text-muted-foreground">
                        {f.actual.asignadas === 0
                          ? "Sin tareas esta semana"
                          : `Avance real · ${f.actual.entregadas} de ${f.actual.asignadas} entregadas`}
                      </span>
                      <span className="font-bold">{f.actual.avance === null ? "—" : `${f.actual.avance}%`}</span>
                    </div>
                    <Progress
                      value={f.actual.avance ?? 0}
                      indicadorClassName={NIVEL[nivel].barra}
                      className="h-2.5"
                      aria-label={`Progreso de ${f.nombre}`}
                    />
                    <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                      <span>{f.actual.aTiempo} a tiempo</span>
                      {f.actual.atrasadas > 0 && (
                        <span className="text-red-600 dark:text-red-400">{f.actual.atrasadas} atrasadas</span>
                      )}
                      {f.actual.enCorrecciones > 0 && <span>{f.actual.enCorrecciones} en correcciones</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <MiniHistorial historial={f.historial} />
                    <Badge variant={NIVEL[nivel].badge} className="w-20 justify-center">
                      {NIVEL[nivel].label}
                    </Badge>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", expandido && "rotate-180")} />
                  </div>
                </button>

                {expandido && (
                  <div className="border-t border-border p-3">
                    {f.actual.tareas.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sin tareas con fecha compromiso en esta semana.</p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {f.actual.tareas.map(({ entregable: e, estado }) => (
                          <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{e.nombre}</p>
                              <p className="text-xs text-muted-foreground">Compromiso: {formatFecha(e.fechaCompromiso)}</p>
                            </div>
                            <div className="w-40">
                              <AvanceEntregable entregable={e} editable={e.responsableId === usuario?.id} />
                            </div>
                            <div className="flex gap-1.5">
                              <Badge variant={ESTADO_ENTREGABLE_BADGE[e.estado]}>{etiquetaEstadoEntregable(e)}</Badge>
                              <Badge variant={ESTADO_TAREA[estado].badge}>{ESTADO_TAREA[estado].label}</Badge>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cumplimiento del equipo — últimas {SEMANAS_HISTORIAL} semanas</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tendencia}>
              <CartesianGrid strokeDasharray="3 3" stroke={g.grid} vertical={false} />
              <XAxis dataKey="semana" fontSize={11} tickLine={false} axisLine={false} tick={g.tick} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" tick={g.tick} />
              <Tooltip
                cursor={g.cursor}
                {...g.tooltip}
                formatter={(v: number, _n, item) => [`${v}% (${item.payload.asignadas} tareas)`, "Cumplimiento"]}
              />
              <Bar dataKey="cumplimiento" fill="#C1EB1F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

/** Barritas de las ultimas semanas por persona — para ver de un vistazo si va mejorando o cayendo. */
function MiniHistorial({ historial }: { historial: FilaColaborador["historial"] }) {
  return (
    <div className="flex h-8 items-end gap-0.5" aria-label="Cumplimiento de las ultimas semanas">
      {historial.map((h) => (
        <div
          key={h.semana}
          title={`${h.semana}: ${h.porcentaje === null ? "sin tareas" : `${h.porcentaje}%`}`}
          className={cn("w-1.5 rounded-sm", NIVEL[nivelCumplimiento(h.porcentaje)].barra)}
          style={{ height: h.porcentaje === null ? "3px" : `${Math.max(h.porcentaje, 8)}%` }}
        />
      ))}
    </div>
  );
}
