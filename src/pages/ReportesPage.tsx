import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { FileSpreadsheet, FileDown, Loader2 } from "lucide-react";
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

/** Captura el nodo del reporte a PNG (html-to-image) y lo mete como imagen en un PDF de una
 * sola pagina (jsPDF) — mismo patron que ya se usa en el proyecto GO2026 para sus reportes
 * ejecutivos: 100% en el navegador, sin backend ni Cloud Function. */
async function descargarComoPdf(nodo: HTMLElement, nombreArchivo: string) {
  const { width: cssW, height: cssH } = nodo.getBoundingClientRect();
  const dataUrl = await toPng(nodo, { pixelRatio: 2, backgroundColor: "#ffffff", width: cssW, height: cssH });
  const wMm = cssW * PX_A_MM;
  const hMm = cssH * PX_A_MM;
  const pdf = new jsPDF({ unit: "mm", format: [wMm, hMm] });
  pdf.addImage(dataUrl, "PNG", 0, 0, wMm, hMm, "", "FAST");
  pdf.save(nombreArchivo);
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
        <div ref={reporteRef} className="space-y-4 bg-white p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Grupo Ortiz · Audiovisual
            </p>
            <h2 className="text-lg font-bold">Reporte de contenido — {etiquetaPeriodo(periodo)}</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-md border border-border p-3">
              <p className="text-2xl font-bold">{entregadosEnPeriodo.length}</p>
              <p className="text-xs text-muted-foreground">Entregados en el periodo</p>
            </div>
            {[...porTipo.entries()].slice(0, 3).map(([tipo, total]) => (
              <div key={tipo} className="rounded-md border border-border p-3">
                <p className="text-2xl font-bold">{total}</p>
                <p className="truncate text-xs text-muted-foreground">{CATEGORIA_CONTENIDO_LABELS[tipo]}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Detalle</p>
            {entregadosEnPeriodo.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Sin entregables marcados como entregados en este periodo.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-1.5 font-medium">Entregable</th>
                    <th className="py-1.5 font-medium">Tipo</th>
                    <th className="py-1.5 font-medium">Proyecto</th>
                    <th className="py-1.5 font-medium">Responsable</th>
                    <th className="py-1.5 font-medium">Entregado</th>
                  </tr>
                </thead>
                <tbody>
                  {entregadosEnPeriodo.map((e) => (
                    <tr key={e.id} className="border-b border-border last:border-0">
                      <td className="py-1.5">{e.nombre}</td>
                      <td className="py-1.5 text-muted-foreground">{CATEGORIA_CONTENIDO_LABELS[e.tipo]}</td>
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
