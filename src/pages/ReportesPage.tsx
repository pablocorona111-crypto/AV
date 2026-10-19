import { FileSpreadsheet, FileDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DemoBadge } from "@/components/DemoBadge";

const REPORTES = [
  { id: "r1", nombre: "Reporte ejecutivo semanal", descripcion: "Metricas consolidadas de la semana." },
  { id: "r2", nombre: "Requisiciones por departamento", descripcion: "Volumen y estado por departamento solicitante." },
  { id: "r3", nombre: "Cumplimiento de entregables", descripcion: "Entregas a tiempo vs atrasadas por proyecto." },
  { id: "r4", nombre: "Jornadas de grabacion por planta", descripcion: "Historico de salidas y horas de campo." },
];

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

      <Card className="border-dashed">
        <CardContent className="p-4 text-xs text-muted-foreground">
          La generacion real de PDF/Excel requiere una Cloud Function (evita exponer datos sensibles en
          el cliente y permite adjuntar plantillas corporativas). Los botones de abajo son la interfaz
          final; falta conectar el backend — ver BACKLOG.md.
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {REPORTES.map((r) => (
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
