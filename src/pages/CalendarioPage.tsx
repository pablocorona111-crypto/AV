import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Film, Camera, FileText, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useRequisiciones } from "@/hooks/useRequisiciones";
import { useSalidas, useEntregables } from "@/hooks/useCatalogos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DemoBadge } from "@/components/DemoBadge";
import { formatFecha } from "@/lib/utils";
import {
  etiquetaEstadoEntregable,
  ESTADO_ENTREGABLE_BADGE,
  ESTADO_REQUISICION_LABELS,
  ESTADO_REQUISICION_BADGE,
  ETIQUETA_AUTORIZACION_SALIDA,
  BADGE_AUTORIZACION_SALIDA,
} from "@/lib/labels";

const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

type TipoEvento = "entrega" | "salida" | "requisicion";
type EventoCalendario = {
  id: string;
  fecha: string;
  tipo: TipoEvento;
  titulo: string;
  hora?: string;
  /** true = ya se hizo/aprobo (dot relleno). false = sigue pendiente/en revision (dot en anillo). */
  terminado: boolean;
  estadoLabel: string;
  estadoBadge: BadgeVariant;
};

/** Al dar clic en la tarjeta: una entrega manda directo al video/material (igual que el link de
 * una notificacion). Salida/requisicion no tienen vista de detalle por id todavia — mandan a su
 * lista general, mejor que no hacer nada. */
function rutaDeEvento(e: EventoCalendario): string {
  if (e.tipo === "entrega") return `/entregables?abrir=${e.id}`;
  if (e.tipo === "salida") return "/salidas";
  return "/requisiciones";
}

const COLOR_TIPO: Record<TipoEvento, string> = {
  entrega: "bg-emerald-500",
  salida: "bg-blue-400",
  requisicion: "bg-purple-400",
};

const BORDE_TIPO: Record<TipoEvento, string> = {
  entrega: "border-emerald-500",
  salida: "border-blue-400",
  requisicion: "border-purple-400",
};

const ETIQUETA_TIPO: Record<TipoEvento, string> = {
  entrega: "Entrega",
  salida: "Salida",
  requisicion: "Requisicion",
};

const ICONO_TIPO: Record<TipoEvento, typeof Film> = {
  entrega: Film,
  salida: Camera,
  requisicion: FileText,
};

function isoLocal(d: Date) {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Punto de cada evento en la celda del dia: relleno si ya se termino, en anillo (hueco) si
 * sigue pendiente/en revision/solicitado — asi se distingue de un vistazo sin abrir el dia. */
function PuntoEvento({ tipo, terminado, titulo }: { tipo: TipoEvento; terminado: boolean; titulo: string }) {
  return (
    <span
      title={titulo}
      className={
        terminado
          ? `h-1.5 w-1.5 rounded-full ${COLOR_TIPO[tipo]}`
          : `h-1.5 w-1.5 rounded-full border-[1.5px] bg-card ${BORDE_TIPO[tipo]}`
      }
    />
  );
}

function TarjetaEvento({ evento }: { evento: EventoCalendario }) {
  const navigate = useNavigate();
  const Icono = ICONO_TIPO[evento.tipo];
  return (
    <button
      type="button"
      onClick={() => navigate(rutaDeEvento(evento))}
      className="flex w-full items-start gap-3 rounded-lg border border-border p-2.5 text-left hover:bg-bg-secondary"
    >
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white ${COLOR_TIPO[evento.tipo]}`}>
        <Icono className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold leading-tight">{evento.titulo}</p>
          <span className="shrink-0 rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {ETIQUETA_TIPO[evento.tipo]}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {formatFecha(evento.fecha)}
            {evento.hora && (
              <>
                <Clock className="ml-1 h-3 w-3" /> {evento.hora}
              </>
            )}
          </p>
          <Badge variant={evento.estadoBadge} className="text-[10px]">
            {evento.estadoLabel}
          </Badge>
        </div>
      </div>
    </button>
  );
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
    requisiciones.forEach((r) =>
      e.push({
        id: r.id,
        fecha: r.fechaRequerida,
        tipo: "requisicion",
        titulo: r.titulo,
        terminado: r.estado === "aprobada",
        estadoLabel: ESTADO_REQUISICION_LABELS[r.estado],
        estadoBadge: ESTADO_REQUISICION_BADGE[r.estado],
      })
    );
    salidas.forEach((s) =>
      e.push({
        id: s.id,
        fecha: s.fecha,
        tipo: "salida",
        titulo: s.nombreJornada,
        hora: s.horaSalida,
        terminado: s.estadoAutorizacion === "autorizada",
        estadoLabel: ETIQUETA_AUTORIZACION_SALIDA[s.estadoAutorizacion],
        estadoBadge: BADGE_AUTORIZACION_SALIDA[s.estadoAutorizacion],
      })
    );
    entregables.forEach((en) =>
      e.push({
        id: en.id,
        fecha: en.fechaCompromiso,
        tipo: "entrega",
        titulo: en.nombre,
        terminado: en.estado === "aprobado" || en.estado === "entregado",
        estadoLabel: etiquetaEstadoEntregable(en),
        estadoBadge: ESTADO_ENTREGABLE_BADGE[en.estado],
      })
    );
    return e;
  }, [requisiciones, salidas, entregables]);

  const hoyDate = useMemo(() => new Date(), []);
  const [mesVista, setMesVista] = useState(() => new Date(hoyDate.getFullYear(), hoyDate.getMonth(), 1));
  const dias = useMemo(() => construirDiasDelMes(mesVista), [mesVista]);
  const hoy = isoLocal(hoyDate);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const eventosDelDiaSeleccionado = diaSeleccionado ? eventos.filter((e) => e.fecha === diaSeleccionado) : [];

  const proximosEventos = useMemo(
    () =>
      eventos
        .filter((e) => e.fecha >= hoy)
        .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0))
        .slice(0, 8),
    [eventos, hoy]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Calendario general</h1>
          <p className="text-sm text-muted-foreground">
            Grabaciones, salidas, entregas y fechas de requisiciones — pendientes y ya terminados.
          </p>
        </div>
        <DemoBadge />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle className="capitalize">
              {MESES[mesVista.getMonth()]} {mesVista.getFullYear()}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                className="h-8 px-2.5 text-xs"
                onClick={() => setMesVista(new Date(hoyDate.getFullYear(), hoyDate.getMonth(), 1))}
              >
                Hoy
              </Button>
              <button
                type="button"
                onClick={() => setMesVista((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))}
                className="rounded-md p-1.5 hover:bg-bg-secondary"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setMesVista((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))}
                className="rounded-md p-1.5 hover:bg-bg-secondary"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-5">
            <div className="grid grid-cols-7 gap-0.5 text-center text-xs text-muted-foreground sm:gap-1">
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
                  <button
                    key={i}
                    type="button"
                    onClick={() => eventosDia.length > 0 && setDiaSeleccionado(iso)}
                    className={
                      "flex min-h-12 flex-col items-center gap-1 rounded-md border border-transparent p-1 text-xs sm:min-h-16 sm:p-1.5 sm:text-sm " +
                      // `text-text-primary` explicito: la celda de hoy aclara su fondo con
                      // `bg-accent/20` y el gris heredado del grid se quedaba corto de contraste.
                      (esHoy
                        ? "border-accent bg-accent/20 font-bold text-text-primary"
                        : "hover:bg-bg-secondary") +
                      (eventosDia.length > 0 ? " cursor-pointer" : " cursor-default")
                    }
                  >
                    <span>{dia.getDate()}</span>
                    <div className="flex flex-wrap justify-center gap-0.5">
                      {eventosDia.slice(0, 4).map((e, idx) => (
                        <PuntoEvento key={idx} tipo={e.tipo} terminado={e.terminado} titulo={`${e.titulo} — ${e.estadoLabel}`} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              {(Object.keys(ETIQUETA_TIPO) as TipoEvento[]).map((tipo) => (
                <span key={tipo} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${COLOR_TIPO[tipo]}`} /> {ETIQUETA_TIPO[tipo]}
                </span>
              ))}
              <span className="h-4 w-px bg-border" />
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-text-primary" /> Terminado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full border-[1.5px] border-text-primary bg-card" /> Pendiente / en revision
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proximos eventos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {proximosEventos.map((e, i) => (
              <TarjetaEvento key={i} evento={e} />
            ))}
            {proximosEventos.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Sin eventos proximos.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(diaSeleccionado)} onOpenChange={(v) => !v && setDiaSeleccionado(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{diaSeleccionado && formatFecha(diaSeleccionado)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {eventosDelDiaSeleccionado.map((e, i) => (
              <TarjetaEvento key={i} evento={e} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
