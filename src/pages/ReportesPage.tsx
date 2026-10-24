import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { FileDown, Loader2, Film, FolderKanban, CheckCircle2, Users } from "lucide-react";
import { useProyectos } from "@/hooks/useProyectos";
import { useRequisiciones } from "@/hooks/useRequisiciones";
import { useEntregables, useUsuarios } from "@/hooks/useCatalogos";
import { dentroDelPeriodo, etiquetaPeriodo, type Periodo } from "@/lib/periodo";
import { cumplidosPorMes, mesesVacios, produccionSemanal } from "@/lib/metricas";
import { CATEGORIA_CONTENIDO_LABELS } from "@/lib/labels";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DemoBadge } from "@/components/DemoBadge";
import { COLORES_TIPO, useTemaGrafica } from "@/lib/chartTheme";
import type { Entregable } from "@/types";


/** Captura el nodo del reporte a PNG (html-to-image) y lo mete en un PDF de una sola pagina
 * (jsPDF) — mismo patron que el "slide ejecutivo ancho" de GO2026 (ChangelogTab.jsx,
 * handlePresentationPDF): pagina en PIXELES (`unit:"px"`), landscape explicito, y la imagen se
 * carga en un <img> real antes de `addImage` (no se le pasa el dataURL crudo directo) — asi
 * jsPDF siempre recibe una imagen ya completamente decodificada, nunca a medias. */
async function descargarComoPdf(nodo: HTMLElement, nombreArchivo: string) {
  const cssW = Math.round(nodo.scrollWidth);
  const cssH = Math.round(nodo.scrollHeight);
  const dataUrl = await toPng(nodo, {
    pixelRatio: 2,
    // El fondo lo decide el tema activo (el slide usa `bg-card`): hardcodear blanco dejaba
    // el PDF con texto claro sobre blanco cuando la app estaba en modo oscuro.
    backgroundColor: getComputedStyle(nodo).backgroundColor || "#ffffff",
    width: cssW,
    height: cssH,
    style: { width: `${cssW}px`, height: `${cssH}px`, transform: "none" },
  });
  const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [cssW, cssH] });
  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      pdf.addImage(img, "PNG", 0, 0, cssW, cssH, "", "FAST");
      resolve();
    };
    img.onerror = () => reject(new Error("No se pudo cargar la imagen capturada del reporte."));
    img.src = dataUrl;
  });
  pdf.save(nombreArchivo);
}

function SlideStat({
  icon: Icon,
  label,
  value,
  iconBg = "bg-[#C1EB1F]/30",
}: {
  icon: typeof Film;
  label: string;
  value: string | number;
  iconBg?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${iconBg}`}>
        <Icon className="h-5 w-5 text-text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-tight">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

type DatosReporte = {
  periodo: Periodo;
  entregadosEnPeriodo: Entregable[];
  datosDonut: { name: string; value: number; color: string }[];
  produccion: { dia: string; entregados: number; solicitudes: number }[];
  cumplidos: { mes: string; total: number }[];
  proyectosDistintos: number;
  responsablesDistintos: number;
  tiposDistintos: number;
  nombreDe: (id: string) => string;
  proyectoDe: (id: string | undefined) => string;
};

/** El contenido del slide en si — se monta DOS veces: una version visible y responsiva (se ve
 * completa en cualquier pantalla, sin cortarse ni necesitar scroll lateral) y, oculta fuera de
 * pantalla, una version a ancho fijo de 1200px que es la que de verdad se captura para el PDF
 * (asi el PDF siempre sale landscape nitido, sin depender de que tan ancha sea la ventana). */
function ContenidoSlide({ datos }: { datos: DatosReporte }) {
  const g = useTemaGrafica();
  const {
    periodo,
    entregadosEnPeriodo,
    datosDonut,
    produccion,
    cumplidos,
    proyectosDistintos,
    responsablesDistintos,
    tiposDistintos,
    nombreDe,
    proyectoDe,
  } = datos;

  return (
    <div className="space-y-4 bg-card p-6">
      <div className="flex flex-col gap-1 border-b border-border pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Grupo Ortiz · Audiovisual
          </p>
          <h2 className="text-xl font-bold">Reporte de contenido</h2>
        </div>
        <p className="text-sm text-muted-foreground">{etiquetaPeriodo(periodo)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SlideStat icon={CheckCircle2} label="Entregados en el periodo" value={entregadosEnPeriodo.length} />
        <SlideStat icon={FolderKanban} label="Proyectos con entrega" value={proyectosDistintos} iconBg="bg-blue-100 dark:bg-blue-400/20" />
        <SlideStat icon={Users} label="Colaboradores que entregaron" value={responsablesDistintos} iconBg="bg-purple-100 dark:bg-purple-400/20" />
        <SlideStat icon={Film} label="Tipos de contenido distintos" value={tiposDistintos} iconBg="bg-orange-100 dark:bg-orange-400/20" />
      </div>

      <div className="rounded-lg border border-border p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Produccion de esta semana
        </p>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={produccion}>
              <CartesianGrid strokeDasharray="3 3" stroke={g.grid} vertical={false} />
              <XAxis dataKey="dia" tickLine={false} axisLine={false} fontSize={11} tick={g.tick} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} tick={g.tick} />
              <Tooltip cursor={g.cursor} {...g.tooltip} />
              <Bar dataKey="entregados" name="Entregados" fill="#C1EB1F" radius={[4, 4, 0, 0]} />
              <Bar dataKey="solicitudes" name="Solicitudes" fill={g.barraNeutra} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border border-border p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Trabajos cumplidos por mes
        </p>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cumplidos}>
              <CartesianGrid strokeDasharray="3 3" stroke={g.grid} vertical={false} />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={11} tick={g.tick} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} tick={g.tick} />
              <Tooltip cursor={g.cursor} {...g.tooltip} />
              <Bar dataKey="total" name="Cumplidos" fill="#C1EB1F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border p-4 lg:col-span-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tipo de entregables
          </p>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={datosDonut} dataKey="value" innerRadius={35} outerRadius={55} paddingAngle={2}>
                  {datosDonut.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip cursor={g.cursor} {...g.tooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1">
            {datosDonut.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="truncate">{d.name}</span>
                </span>
                <span className="shrink-0 font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border p-4 lg:col-span-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Detalle</p>
          {entregadosEnPeriodo.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Sin entregables marcados como entregados en este periodo.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-1.5 font-medium">Entregable</th>
                  <th className="py-1.5 font-medium">Proyecto</th>
                  <th className="py-1.5 font-medium">Responsable</th>
                  <th className="py-1.5 font-medium">Entregado</th>
                </tr>
              </thead>
              <tbody>
                {entregadosEnPeriodo.slice(0, 10).map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="py-1.5">{e.nombre}</td>
                    <td className="py-1.5 text-muted-foreground">{proyectoDe(e.proyectoId)}</td>
                    <td className="py-1.5 text-muted-foreground">{nombreDe(e.responsableId)}</td>
                    <td className="py-1.5 text-muted-foreground">
                      {new Date(e.fechaEntregado!).toLocaleDateString("es-MX")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {entregadosEnPeriodo.length > 10 && (
            <p className="mt-2 text-xs text-muted-foreground">
              +{entregadosEnPeriodo.length - 10} mas (no caben en el slide).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ReporteDeContenido() {
  const { vacio: vacioGrafica } = useTemaGrafica();
  const { data: proyectos = [] } = useProyectos();
  const { data: requisiciones = [] } = useRequisiciones();
  const { data: entregables = [] } = useEntregables();
  const { data: usuarios = [] } = useUsuarios();
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const [descargando, setDescargando] = useState(false);
  const reporteRef = useRef<HTMLDivElement>(null);

  const nombreDe = (id: string) => usuarios.find((u) => u.id === id)?.nombre ?? id;
  const proyectoDe = (id: string | undefined) =>
    id ? proyectos.find((p) => p.id === id)?.nombre ?? "Proyecto eliminado" : "Sin proyecto";

  const entregadosEnPeriodo = entregables
    .filter((e) => e.estado === "entregado" && e.fechaEntregado && dentroDelPeriodo(e.fechaEntregado, periodo))
    .sort((a, b) => (a.fechaEntregado! < b.fechaEntregado! ? 1 : -1));

  const porTipo = new Map<Entregable["tipo"], number>();
  for (const e of entregadosEnPeriodo) porTipo.set(e.tipo, (porTipo.get(e.tipo) ?? 0) + 1);
  const datosDonutReal = [...porTipo.entries()].map(([tipo, total], i) => ({
    name: CATEGORIA_CONTENIDO_LABELS[tipo],
    value: total,
    color: COLORES_TIPO[i % COLORES_TIPO.length],
  }));
  // Sin esto la dona desaparecia por completo (array vacio) en vez de mostrar su forma — un
  // placeholder gris deja ver la estructura del slide aunque el periodo no tenga entregas.
  const datosDonut = datosDonutReal.length > 0 ? datosDonutReal : [{ name: "Sin datos", value: 1, color: vacioGrafica }];

  const proyectosDistintos = new Set(entregadosEnPeriodo.map((e) => e.proyectoId).filter(Boolean)).size;
  const responsablesDistintos = new Set(entregadosEnPeriodo.map((e) => e.responsableId)).size;
  // Misma grafica que "Trabajos cumplidos por mes" del Dashboard de Inicio — no se filtra por
  // el periodo elegido arriba, es la tendencia historica completa.
  const cumplidosReal = cumplidosPorMes(entregables);
  const cumplidos = cumplidosReal.length > 0 ? cumplidosReal : mesesVacios(6);
  // Misma grafica que "Produccion semanal" de Inicio — siempre son 5 dias fijos (Lun-Vie),
  // nunca sale vacia.
  const produccion = produccionSemanal(entregables, requisiciones);

  const datos: DatosReporte = {
    periodo,
    entregadosEnPeriodo,
    datosDonut,
    produccion,
    cumplidos,
    proyectosDistintos,
    responsablesDistintos,
    tiposDistintos: porTipo.size,
    nombreDe,
    proyectoDe,
  };

  const onDescargar = async () => {
    if (!reporteRef.current) return;
    setDescargando(true);
    try {
      const archivo = `reporte-contenido-${periodo}-${new Date().toISOString().slice(0, 10)}.pdf`;
      await descargarComoPdf(reporteRef.current, archivo);
    } finally {
      setDescargando(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Reporte de contenido</CardTitle>
          <CardDescription>Que se entrego en el periodo — para ver que contenido ya se paso.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semana">Esta semana</SelectItem>
              <SelectItem value="mes">Este mes</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={onDescargar} disabled={descargando}>
            {descargando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            {descargando ? "Generando..." : "Descargar PDF"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Version visible: responsiva, se ve completa en cualquier pantalla sin cortarse. */}
        <ContenidoSlide datos={datos} />
      </CardContent>

      {/* Version oculta a ancho fijo (1200px, como un slide/el Dashboard de Inicio) — nunca se
          ve, solo existe para que el PDF siempre salga horizontal y nitido sin importar el
          ancho real de la ventana del usuario. */}
      <div aria-hidden className="pointer-events-none fixed left-0 top-0 -z-50 h-0 w-0 overflow-hidden opacity-0">
        <div ref={reporteRef} className="w-[1200px]">
          <ContenidoSlide datos={datos} />
        </div>
      </div>
    </Card>
  );
}

export function ReportesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Reportes</h1>
          <p className="text-sm text-muted-foreground">Exportacion ejecutiva en PDF y Excel.</p>
        </div>
        <DemoBadge />
      </div>

      <ReporteDeContenido />
    </div>
  );
}
