import { useMemo } from "react";
import { useRequisiciones } from "@/hooks/useRequisiciones";
import { useSalidas, useEntregables } from "@/hooks/useCatalogos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoBadge } from "@/components/DemoBadge";

const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];
const MES_REFERENCIA = new Date("2026-10-14T00:00:00");

type EventoCalendario = { fecha: string; tipo: "entrega" | "salida" | "requisicion"; titulo: string };

const COLOR_TIPO: Record<EventoCalendario["tipo"], string> = {
  entrega: "bg-accent",
  salida: "bg-blue-400",
  requisicion: "bg-purple-400",
};

function isoLocal(d: Date) {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function construirDiasDelMes(ref: Date) {
  const anio = ref.getFullYear();
  const mes = ref.getMonth();
  const primerDia = new Date(anio, mes, 1);
  const ultimoDia = new Date(anio, mes + 1, 0);
  // Lunes = 0 ... Domingo = 6
  const offsetInicio = (primerDia.getDay() + 6) % 7;
  const dias: (Date | null)[] = Array(offsetInicio).fill(null);
  for (let d = 1; d <= ultimoDia.getDate(); d++) {
    dias.push(new Date(anio, mes, d));
  }
  return dias;
}

export function CalendarioPage() {
  const { data: requisiciones = [] } = useRequisiciones();
  const { data: salidas = [] } = useSalidas();
  const { data: entregables = [] } = useEntregables();

  const eventos = useMemo<EventoCalendario[]>(() => {
    const e: EventoCalendario[] = [];
    requisiciones.forEach((r) => e.push({ fecha: r.fechaRequerida, tipo: "requisicion", titulo: r.titulo }));
    salidas.forEach((s) => e.push({ fecha: s.fecha, tipo: "salida", titulo: s.nombreJornada }));
    entregables.forEach((en) => e.push({ fecha: en.fechaCompromiso, tipo: "entrega", titulo: en.nombre }));
    return e;
  }, [requisiciones, salidas, entregables]);

  const dias = useMemo(() => construirDiasDelMes(MES_REFERENCIA), []);
  const hoy = isoLocal(MES_REFERENCIA);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Calendario general</h1>
          <p className="text-sm text-muted-foreground">
            Grabaciones, salidas, entregas y fechas de requisiciones.
          </p>
        </div>
        <DemoBadge />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {MES_REFERENCIA.toLocaleDateString("es-MX", { month: "long", year: "numeric" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
              {DIAS_SEMANA.map((d, i) => (
                <div key={i} className="py-1 font-medium">
                  {d}
                </div>
              ))}
              {dias.map((dia, i) => {
                if (!dia) return <div key={i} />;
                const iso = isoLocal(dia);
                const eventosDia = eventos.filter((e) => e.fecha === iso);
                const esHoy = iso === hoy;
                return (
                  <div
                    key={i}
                    className={
                      "flex min-h-16 flex-col items-center gap-1 rounded-md border border-transparent p-1.5 text-sm " +
                      (esHoy ? "border-accent bg-accent/20 font-bold" : "hover:bg-bg-secondary")
                    }
                  >
                    <span>{dia.getDate()}</span>
                    <div className="flex gap-0.5">
                      {eventosDia.slice(0, 3).map((e, idx) => (
                        <span
                          key={idx}
                          title={e.titulo}
                          className={`h-1.5 w-1.5 rounded-full ${COLOR_TIPO[e.tipo]}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent" /> Entrega
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-400" /> Salida
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-purple-400" /> Requisicion
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proximos eventos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {eventos
              .sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
              .slice(0, 8)
              .map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${COLOR_TIPO[e.tipo]}`} />
                  <div>
                    <p className="font-medium leading-tight">{e.titulo}</p>
                    <p className="text-xs text-muted-foreground">{e.fecha}</p>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
