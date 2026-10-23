import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { FileSpreadsheet, FileDown, Loader2, Film, FolderKanban, CheckCircle2, Users } from "lucide-react";
import { useProyectos } from "@/hooks/useProyectos";
import { useEntregables, useUsuarios } from "@/hooks/useCatalogos";
import { dentroDelPeriodo, etiquetaPeriodo, type Periodo } from "@/lib/periodo";
import { CATEGORIA_CONTENIDO_LABELS } from "@/lib/labels";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DemoBadge } from "@/components/DemoBadge";
import type { Entregable } from "@/types";

const REPORTES_PENDIENTES = [
  { id: "r2", nombre: "Requisiciones por departamento", descripcion: "Volumen y estado por departamento solicitante." },
  { id: "r3", nombre: "Cumplimiento de entregables", descripcion: "Entregas a tiempo vs atrasadas por proyecto." },
  { id: "r4", nombre: "Jornadas de grabacion por planta", descripcion: "Historico de salidas y horas de campo." },
];

const PX_A_MM = 0.2645833333;
const COLORES_TIPO = ["#C1EB1F", "#93C5FD", "#86EFAC", "#C4B5FD", "#FDBA74", "#FCA5A5", "#67E8F9"];

/** Captura el nodo del reporte a PNG (html-to-image) y lo mete como imagen en un PDF de una
 * sola pagina (jsPDF) — mismo patron que ya se usa en el proyecto GO2026 para sus reportes
 * ejecutivos: 100% en el navegador, sin backend ni Cloud Function. El tamano de pagina sale
 * directo del tamano real del nodo (aqui ancho fijo tipo slide) — por eso da landscape solo.*/
async function descargarComoPdf(nodo: HTMLElement, nombreArchivo: string) {
  const { width: cssW, height: cssH } = nodo.getBoundingClientRect();
  const dataUrl = await toPng(nodo, { pixelRatio: 2, backgroundColor: "#ffffff", width: cssW, height: cssH });
  const wMm = cssW * PX_A_MM;
  const hMm = cssH * PX_A_MM;
  const pdf = new jsPDF({ unit: "mm", format: [wMm, hMm] });
  pdf.addImage(dataUrl, "PNG", 0, 0, wMm, hMm, "", "FAST");
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

function ReporteDeContenido() {
  const { data: proyectos = [] } = useProyectos();
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
  const datosDonut = [...porTipo.entries()].map(([tipo, total], i) => ({
    name: CATEGORIA_CONTENIDO_LABELS[tipo],
    value: total,
    color: COLORES_TIPO[i % COLORES_TIPO.length],
  }));

  const proyectosDistintos = new Set(entregadosEnPeriodo.map((e) => e.proyectoId).filter(Boolean)).size;
  const responsablesDistintos = new Set(entregadosEnPeriodo.map((e) => e.responsableId)).size;

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
      <CardContent className="overflow-x-auto">
        {/* Ancho fijo tipo slide (como el Dashboard de Inicio) — por eso el PDF sale horizontal,
            no una hoja vertical tipo carta. En pantallas angostas esta card hace scroll lateral. */}
        <div ref={reporteRef} className="w-[1200px] space-y-4 bg-white p-6">
          <div className="flex items-end justify-between border-b border-border pb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Grupo Ortiz · Audiovisual
              </p>
              <h2 className="text-xl font-bold">Reporte de contenido</h2>
            </div>
            <p className="text-sm text-muted-foreground">{etiquetaPeriodo(periodo)}</p>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <SlideStat icon={CheckCircle2} label="Entregados en el periodo" value={entregadosEnPeriodo.length} />
            <SlideStat icon={FolderKanban} label="Proyectos con entrega" value={proyectosDistintos} iconBg="bg-blue-100" />
            <SlideStat icon={Users} label="Colaboradores que entregaron" value={responsablesDistintos} iconBg="bg-purple-100" />
            <SlideStat icon={Film} label="Tipos de contenido distintos" value={porTipo.size} iconBg="bg-orange-100" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 rounded-lg border border-border p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tipo de entregables
              </p>
              {datosDonut.length === 0 ? (
                <p className="flex h-40 items-center justify-center text-center text-xs text-muted-foreground">
                  Sin entregas en este periodo.
                </p>
              ) : (
                <>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={datosDonut} dataKey="value" innerRadius={35} outerRadius={55} paddingAngle={2}>
                          {datosDonut.map((d) => (
                            <Cell key={d.name} fill={d.color} />
                          ))}
                        </Pie>
                        <Tooltip />
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
                </>
              )}
            </div>

            <div className="col-span-2 rounded-lg border border-border p-4">
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
      </CardContent>
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

      <Card className="border-dashed">
        <CardContent className="p-4 text-xs text-muted-foreground">
          Los reportes de abajo son la interfaz final; falta conectar su contenido real — ver BACKLOG.md.
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {REPORTES_PENDIENTES.map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <CardTitle>{r.nombre}</CardTitle>
              <CardDescription>{r.descripcion}</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                <FileDown className="h-3.5 w-3.5" /> PDF
              </Button>
              <Button variant="outline" size="sm" disabled>
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
