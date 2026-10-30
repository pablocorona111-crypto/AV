import { useMemo, useRef, useState } from "react";
import { CalendarCheck, Crown, FileDown, FolderKanban, Loader2, Target } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useEntregables, useSalidas, useUsuarios } from "@/hooks/useCatalogos";
import { useRequisiciones } from "@/hooks/useRequisiciones";
import { useColaboradoresDelEquipo } from "@/hooks/useColaboradoresDelEquipo";
import { useMetas } from "@/hooks/useMetas";
import { useProyectos } from "@/hooks/useProyectos";
import { coloresDelEquipo, iniciales } from "@/lib/avatar";
import { aCatalogo } from "@/lib/especialidades";
import { avanceKpis, cumplimientoKpi, demandaMensual, describirMetas, GRUPOS_KPI, unidadDe, type AvanceKpi } from "@/lib/kpi";
import { etiquetaRango, rangoPeriodo, rendimientoSemanal, type PeriodoReporte } from "@/lib/rendimiento";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemoBadge } from "@/components/DemoBadge";
import { EditarMetasDialog } from "@/components/estructura/EditarMetasDialog";
import { SlideEstructura, type DatosEstructura } from "@/components/estructura/SlideEstructura";
import { VistaPreviaEscalada } from "@/components/reportes/VistaPreviaEscalada";
import { fondoSlide } from "@/components/reportes/SlideRendimiento";
import { Button } from "@/components/ui/button";
import { useTema } from "@/hooks/useTema";
import { descargarComoPdf } from "@/lib/pdf";
import type { MetaColaborador } from "@/types";

function colorBarra(p: number | null) {
  if (p === null) return "bg-bg-secondary";
  return p >= 80 ? "bg-green-500" : p >= 50 ? "bg-amber-500" : "bg-red-500";
}

/** Flujo de una solicitud de principio a fin — lo mismo en pantalla y en el PDF del plan. */
const FLUJO = [
  { paso: "Solicitud", quien: "Cualquier área", plazo: "≥ 5 días hábiles", que: "Se pide el video, foto o diseño con una requisición en el sistema." },
  { paso: "Aprobación", quien: "Líder", plazo: "≤ 48 h", que: "Se evalúa, se prioriza y se vincula a un proyecto." },
  { paso: "Asignación", quien: "Líder", plazo: "Lunes", que: "Se asigna por especialidad y carga, con fecha compromiso." },
  { paso: "Producción y salidas", quien: "Colaborador", plazo: "Según fecha", que: "Grabación o foto en planta; fuera de Morelia se agenda y autoriza antes." },
  { paso: "Revisión", quien: "Community", plazo: "≤ 48 h", que: "Se aprueba o se piden correcciones sobre el material." },
  { paso: "Entrega y reporte", quien: "Líder", plazo: "Viernes / mes", que: "Se entrega lo aprobado y se reporta el avance a dirección." },
];

/** Reglas de operacion y compromisos del lider (valores por defecto, ajustables). */
const REGLAS = [
  "Toda petición entra como requisición (nada \"de palabra\").",
  "Urgentes: máximo 1 por semana y con aviso a dirección.",
  "Salidas fuera de Morelia: se agendan 1 semana antes y se autorizan.",
  "Salidas foráneas: incluir traslado, viáticos y equipo.",
  "Cada quien actualiza su % de avance diario.",
  "Líder: equipo ≥ 80% y ≤ 2 tareas atrasadas por semana.",
];

interface Persona {
  id: string;
  nombre: string;
  puesto: string;
  especialidades: string[];
  color: string;
  meta: MetaColaborador | undefined;
  kpis: AvanceKpi[];
  cumplimiento: number | null;
  proyectos: string[];
}

/** Pestaña del lider: organigrama, metas (KPI) por persona y "como trabajamos" generado. */
export function EstructuraPage() {
  const { usuario } = useAuth();
  const [periodo, setPeriodo] = useState<PeriodoReporte>("semana");
  const { data: entregables = [] } = useEntregables();
  const { data: usuarios = [] } = useUsuarios();
  const { data: equipo = [], isLoading } = useColaboradoresDelEquipo();
  const { data: metas = [] } = useMetas();
  const { data: proyectos = [] } = useProyectos();
  const { data: requisiciones = [] } = useRequisiciones();
  const { data: salidas = [] } = useSalidas();
  const demanda = useMemo(() => demandaMensual(requisiciones, salidas), [requisiciones, salidas]);

  const hoyKey = new Date().toDateString();
  const rango = useMemo(() => rangoPeriodo(periodo, 0), [periodo, hoyKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const semanas = periodo === "semana" ? 1 : 4;

  const { lider, integrantes, resumenArea, equipoPeriodo } = useMemo(() => {
    const color = coloresDelEquipo(equipo.map((c) => c.nombre));
    const nombreProyecto = (id: string) => proyectos.find((p) => p.id === id)?.nombre ?? "Proyecto eliminado";
    const liderId =
      usuario?.rol === "lider_audiovisual" ? usuario.id : usuarios.find((u) => u.rol === "lider_audiovisual")?.id;

    const personas: Persona[] = equipo.map((c) => {
      const meta = metas.find((m) => m.id === c.id);
      const kpis = avanceKpis(entregables, meta, rango, semanas);
      return {
        id: c.id,
        nombre: c.nombre,
        puesto: c.puesto,
        especialidades: aCatalogo(c.especialidades),
        color: color(c.nombre),
        meta,
        kpis,
        cumplimiento: cumplimientoKpi(kpis),
        proyectos: (meta?.proyectosACargo ?? []).map(nombreProyecto),
      };
    });

    // Suma de metas vs hecho por grupo, de todo el area.
    const resumenArea = GRUPOS_KPI.map((g) => {
      const filas = personas.flatMap((p) => p.kpis.filter((k) => k.grupo === g.id));
      const meta = filas.reduce((s, k) => s + k.meta, 0);
      const hecho = filas.reduce((s, k) => s + k.hecho, 0);
      return { ...g, meta, hecho, porcentaje: meta ? Math.min(100, Math.round((hecho / meta) * 100)) : null };
    }).filter((g) => g.meta > 0);

    return {
      lider: personas.find((p) => p.id === liderId),
      integrantes: personas.filter((p) => p.id !== liderId),
      resumenArea,
      equipoPeriodo: rendimientoSemanal(entregables, rango),
    };
  }, [equipo, metas, entregables, proyectos, usuarios, usuario, rango, semanas]);

  const cumplimientoMetas = cumplimientoKpi(
    resumenArea.map((g) => ({ grupo: g.id, label: g.label, unidad: g.unidad, meta: g.meta, hecho: g.hecho, porcentaje: 0 }))
  );
  const textoPeriodo = periodo === "semana" ? "esta semana" : "este mes";
  const { esOscuro } = useTema();
  const slideRef = useRef<HTMLDivElement>(null);
  const [descargando, setDescargando] = useState(false);
  const [errorPdf, setErrorPdf] = useState<string | null>(null);

  // El slide es un PLAN mensual (metas de cada quien), no un avance: sale de las metas definidas,
  // sin depender del periodo elegido arriba ni de lo entregado.
  const datosSlide: DatosEstructura = useMemo(() => {
    const metasDe = (meta: MetaColaborador | undefined) =>
      GRUPOS_KPI.filter((g) => (meta?.metasSemanales?.[g.id] ?? 0) > 0).map((g) => {
        const porSemana = meta?.metasSemanales?.[g.id] ?? 0;
        return { mes: porSemana * 4, unidad: unidadDe(g.id, porSemana * 4), porSemana };
      });
    const aPlan = (p: Persona, esLider: boolean) => ({
      nombre: p.nombre,
      puesto: p.puesto,
      esLider,
      responsabilidad: p.meta?.responsabilidad ?? "",
      metas: metasDe(p.meta),
      proyectos: p.proyectos,
    });
    const todos = [...(lider ? [lider] : []), ...integrantes];
    const totales = GRUPOS_KPI.map((g) => {
      const porSemana = todos.reduce((s, p) => s + (p.meta?.metasSemanales?.[g.id] ?? 0), 0);
      return { mes: porSemana * 4, unidad: unidadDe(g.id, porSemana * 4), porSemana };
    }).filter((t) => t.mes > 0);
    const objetivo = totales.length
      ? `Producir y entregar a tiempo el contenido audiovisual del grupo: ${totales
          .map((t) => `${t.mes} ${t.unidad}`)
          .join(", ")} al mes, con al menos 80% de cumplimiento del equipo.`
      : "Definir las metas del equipo para establecer el objetivo del área.";
    const hoy = new Date();
    return {
      mesLabel: hoy.toLocaleDateString("es-MX", { month: "long", year: "numeric" }),
      lider: lider?.nombre ?? usuario?.nombre ?? "—",
      generado: hoy.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }),
      objetivo,
      totales,
      personas: [...(lider ? [aPlan(lider, true)] : []), ...integrantes.map((p) => aPlan(p, false))],
      flujo: FLUJO,
      demanda: [
        { valor: demanda.requisiciones, label: "requisiciones" },
        { valor: demanda.salidas, label: "salidas a grabar" },
        { valor: demanda.foraneas, label: "fuera de Morelia" },
      ],
      reglas: REGLAS,
    };
  }, [lider, integrantes, usuario, demanda]);

  const onDescargar = async () => {
    if (!slideRef.current) return;
    setDescargando(true);
    setErrorPdf(null);
    try {
      await descargarComoPdf(slideRef.current, `estructura-plan-de-trabajo-${new Date().toISOString().slice(0, 10)}.pdf`, fondoSlide(esOscuro));
    } catch (e) {
      setErrorPdf(e instanceof Error ? e.message : "No se pudo generar el PDF.");
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Estructura y KPI</h1>
          <p className="text-sm text-muted-foreground">
            Quién hace qué, cuánto debe entregar cada quien y cómo vamos contra la meta.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DemoBadge />
          <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoReporte)}>
            <TabsList>
              <TabsTrigger value="semana">Esta semana</TabsTrigger>
              <TabsTrigger value="mes">Este mes</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={onDescargar} disabled={descargando}>
            {descargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {descargando ? "Generando..." : "Descargar PDF"}
          </Button>
        </div>
      </div>

      {/* Metas del area */}
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 pb-3">
          <div>
            <CardTitle>Metas del área · {etiquetaRango(periodo, rango)}</CardTitle>
            <p className="text-xs text-muted-foreground">Suma de las metas de todo el equipo contra lo entregado {textoPeriodo}.</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold leading-none">{cumplimientoMetas === null ? "—" : `${cumplimientoMetas}%`}</p>
            <p className="text-[11px] text-muted-foreground">de las metas cumplidas</p>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 pt-0 md:grid-cols-5">
          {resumenArea.map((g) => (
            <div key={g.id} className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">{g.label}</p>
              <p className="text-xl font-bold">
                {g.hecho}
                <span className="text-sm font-normal text-muted-foreground"> / {g.meta}</span>
              </p>
              <Progress value={g.porcentaje ?? 0} indicadorClassName={colorBarra(g.porcentaje)} className="mt-1.5 h-2" />
            </div>
          ))}
          {resumenArea.length === 0 && (
            <p className="col-span-full py-4 text-center text-sm text-muted-foreground">
              Aún no hay metas. Usa el botón “Metas” de cada persona para definirlas.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Organigrama */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Organigrama del equipo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {isLoading && <p className="text-sm text-muted-foreground">Cargando equipo…</p>}
          {lider && (
            <div className="flex flex-col items-center">
              <div className="w-full max-w-md">
                <TarjetaPersona persona={lider} esLider />
              </div>
              {integrantes.length > 0 && <div className="h-6 w-px bg-border" />}
            </div>
          )}
          {integrantes.length > 0 && (
            <div className="pt-6">
              {/* Contenedor centrado del ancho exacto de las tarjetas: la linea horizontal va del
                  centro de la primera al de la ultima, sean 1, 2, 3 o mas integrantes. */}
              <div className="relative mx-auto flex w-fit max-w-full flex-col gap-4 md:flex-row md:flex-wrap md:justify-center">
                {lider && integrantes.length > 1 && (
                  <div
                    className="absolute -top-6 hidden h-px bg-border md:block"
                    style={{ left: `${50 / integrantes.length}%`, right: `${50 / integrantes.length}%` }}
                  />
                )}
                {integrantes.map((p) => (
                  <div key={p.id} className="relative w-full md:w-[300px]">
                    {lider && <div className="absolute -top-6 left-1/2 hidden h-6 w-px bg-border md:block" />}
                    <TarjetaPersona persona={p} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Como trabajamos (generado) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Cómo trabajamos</CardTitle>
          <p className="text-xs text-muted-foreground">
            Estructura generada a partir de las metas y proyectos que asignaste. Se actualiza sola al cambiarlas.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {lider && (
            <div className="rounded-lg border-2 border-[#FB670B]/40 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Crown className="h-4 w-4 text-[#FB670B]" /> {lider.nombre} · Líder
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>Planea y asigna el trabajo de la semana con fechas compromiso (lunes).</li>
                <li>Revisa el avance diario de cada integrante en Rendimiento.</li>
                <li>Da retroalimentación y libera revisiones en menos de 48 h.</li>
                <li>Envía el reporte semanal (viernes) y el mensual a dirección.</li>
                {lider.meta?.responsabilidad && <li>{lider.meta.responsabilidad}</li>}
                {describirMetas(lider.meta).map((m) => (
                  <li key={m}>Producción propia: {m}.</li>
                ))}
              </ul>
              <p className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">KPI del líder · {textoPeriodo}</p>
              <div className="space-y-2">
                <KpiLinea label="Cumplimiento del equipo" meta="≥ 80%" valor={equipoPeriodo.porcentaje} />
                <KpiLinea label="Metas del área cumplidas" meta="≥ 90%" valor={cumplimientoMetas} umbral={90} />
                <KpiLinea
                  label="Tareas atrasadas"
                  meta="≤ 2"
                  valorTexto={String(equipoPeriodo.atrasadas)}
                  ok={equipoPeriodo.atrasadas <= 2}
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            {integrantes.map((p) => (
              <div key={p.id} className="rounded-lg border border-border p-4">
                <p className="text-sm font-semibold">
                  {p.nombre} · <span className="font-normal text-muted-foreground">{p.puesto}</span>
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
                  <li>{p.meta?.responsabilidad || "Responsabilidad sin definir — usa “Metas” en su tarjeta."}</li>
                  {describirMetas(p.meta).map((m) => (
                    <li key={m}>Meta: {m}.</li>
                  ))}
                  {p.proyectos.length > 0 && <li>A cargo de: {p.proyectos.join(", ")}.</li>}
                  <li>Actualiza su % de avance diario y entrega en la fecha compromiso.</li>
                </ul>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <CalendarCheck className="h-4 w-4" /> Flujo de trabajo · de la solicitud a la entrega
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {FLUJO.map((f, i) => (
                <div key={f.paso} className="relative rounded-lg bg-bg-secondary p-3">
                  <span className="absolute right-3 top-2 text-2xl font-bold text-text-primary/10">{i + 1}</span>
                  <p className="text-xs font-semibold text-[#FB670B]">{f.paso}</p>
                  <p className="mt-0.5 text-xs">{f.que}</p>
                  <p className="mt-1 text-[11px] font-semibold">
                    {f.quien} <span className="font-normal text-muted-foreground">· {f.plazo}</span>
                  </p>
                </div>
              ))}
            </div>
            <ul className="mt-3 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
              {REGLAS.map((r) => (
                <li key={r} className="flex gap-1.5">
                  <span className="text-[#FB670B]">■</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Lo que se entrega a la encargada del departamento */}
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 pb-3">
          <div>
            <CardTitle>Slide para entregar a dirección</CardTitle>
            <p className="text-xs text-muted-foreground">
              Así se verá el PDF: el plan mensual — qué hace cada quien, sus metas, la demanda que recibimos y cómo trabajaremos. Sigue el tema activo.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onDescargar} disabled={descargando}>
            <FileDown className="h-3.5 w-3.5" /> Descargar PDF
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 p-3 pt-0 sm:p-5 sm:pt-0">
          {errorPdf && <p className="text-xs text-destructive">{errorPdf}</p>}
          <VistaPreviaEscalada>
            <SlideEstructura ref={slideRef} datos={datosSlide} oscuro={esOscuro} />
          </VistaPreviaEscalada>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiLinea({
  label,
  meta,
  valor,
  valorTexto,
  ok,
  umbral = 80,
}: {
  label: string;
  meta: string;
  valor?: number | null;
  valorTexto?: string;
  ok?: boolean;
  umbral?: number;
}) {
  const cumple = ok ?? (valor !== null && valor !== undefined && valor >= umbral);
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span>
        {label} <span className="text-xs text-muted-foreground">(meta {meta})</span>
      </span>
      <Badge variant={cumple ? "success" : "warning"}>
        {valorTexto ?? (valor === null || valor === undefined ? "—" : `${valor}%`)}
      </Badge>
    </div>
  );
}

function TarjetaPersona({ persona: p, esLider = false }: { persona: Persona; esLider?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-4", esLider ? "border-[#FB670B]/50 bg-[#FB670B]/5" : "border-border")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: esLider ? "#FB670B" : p.color }}
          >
            {iniciales(p.nombre)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {p.nombre}
              {esLider && <span className="ml-1.5 rounded-full bg-[#FB670B] px-1.5 py-px text-[10px] font-semibold text-white">Líder</span>}
            </p>
            <p className="truncate text-xs text-muted-foreground">{p.puesto}</p>
          </div>
        </div>
        <EditarMetasDialog personaId={p.id} nombre={p.nombre} meta={p.meta} />
      </div>

      {p.meta?.responsabilidad && <p className="mt-2 text-xs">{p.meta.responsabilidad}</p>}

      {p.especialidades.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {p.especialidades.map((e) => (
            <Badge key={e} variant="accent" className="px-2 py-0 text-[10px]">
              {e}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-3 space-y-2">
        {p.kpis.map((k) => (
          <div key={k.grupo}>
            <div className="mb-0.5 flex items-baseline justify-between text-xs">
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3 text-muted-foreground" /> {k.label}
              </span>
              <span>
                <b>{k.hecho}</b>
                <span className="text-muted-foreground"> / {k.meta} {k.unidad}</span>
              </span>
            </div>
            <Progress value={k.porcentaje} indicadorClassName={colorBarra(k.porcentaje)} className="h-2" />
          </div>
        ))}
        {p.kpis.length === 0 && <p className="text-xs text-muted-foreground">Sin metas definidas todavía.</p>}
      </div>

      {p.proyectos.length > 0 && (
        <div className="mt-3 border-t border-border pt-2">
          <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <FolderKanban className="h-3 w-3" /> Proyectos a cargo
          </p>
          <div className="flex flex-wrap gap-1">
            {p.proyectos.map((n) => (
              <span key={n} className="rounded-md bg-bg-secondary px-2 py-0.5 text-[11px]">
                {n}
              </span>
            ))}
          </div>
        </div>
      )}

      {p.cumplimiento !== null && (
        <p className="mt-2 text-right text-[11px] text-muted-foreground">
          Cumplimiento de metas: <b className="text-text-primary">{p.cumplimiento}%</b>
        </p>
      )}
    </div>
  );
}
