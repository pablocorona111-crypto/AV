import { useState } from "react";
import { MapPin, Phone, Truck, ShieldCheck, Clock, CalendarPlus, Check } from "lucide-react";
import { useSalidas } from "@/hooks/useCatalogos";
import { useUsuarios } from "@/hooks/useCatalogos";
import { useAuth } from "@/context/AuthContext";
import { puedeAsignarEntregables } from "@/lib/roles";
import { TIPO_ACTIVIDAD_SALIDA_LABELS } from "@/lib/labels";
import { formatFecha } from "@/lib/utils";
import { agregarEventoCalendar } from "@/services/calendarService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NuevaSalidaDialog } from "@/components/salidas/NuevaSalidaDialog";
import { DemoBadge } from "@/components/DemoBadge";
import type { SalidaGrabacion } from "@/types";

const BADGE_AUTORIZACION = {
  pendiente: "warning",
  autorizada: "success",
  rechazada: "danger",
} as const;

/** Exporta UNA salida al Google Calendar personal de quien le da click — nunca automatico,
 * cada quien decide cual agregar a su propia agenda (ver `calendarService.ts`). */
function BotonAgregarCalendar({ salida }: { salida: SalidaGrabacion }) {
  const { driveToken, conectarDrive } = useAuth();
  const [estado, setEstado] = useState<"idle" | "cargando" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setEstado("cargando");
    setError(null);
    try {
      const token = driveToken ?? (await conectarDrive());
      if (!token) {
        setEstado("error");
        setError("No se pudo conectar con Google.");
        return;
      }
      await agregarEventoCalendar(salida, token);
      setEstado("ok");
    } catch (e) {
      setEstado("error");
      setError(e instanceof Error ? e.message : "No se pudo agregar el evento.");
    }
  };

  if (estado === "ok") {
    return (
      <p className="flex items-center gap-1.5 text-xs font-medium text-green-700">
        <Check className="h-3.5 w-3.5" /> Agregada a tu Google Calendar
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClick}
        disabled={estado === "cargando"}
        className="gap-1.5"
      >
        <CalendarPlus className="h-3.5 w-3.5" />
        {estado === "cargando" ? "Agregando..." : "Agregar a mi Google Calendar"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function SalidasPage() {
  const { usuario } = useAuth();
  const { data: salidas = [], isLoading } = useSalidas();
  const { data: usuarios = [] } = useUsuarios();
  const nombreDe = (id: string) => usuarios.find((u) => u.id === id)?.nombre ?? id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Grabaciones y salidas a fabricas</h1>
          <p className="text-sm text-muted-foreground">
            Planeacion de jornadas en planta y locaciones externas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DemoBadge />
          {puedeAsignarEntregables(usuario) && <NuevaSalidaDialog />}
        </div>
      </div>

      <Card className="border-amber-300 bg-amber-50">
        <CardContent className="flex items-start gap-3 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-xs text-amber-900">
            El checklist de seguridad de esta plataforma no sustituye los permisos y procedimientos
            oficiales de cada instalacion. Confirmar siempre con el responsable de planta.
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {salidas.map((s) => (
            <Card key={s.id}>
              <CardHeader className="flex-row items-start justify-between pb-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">{s.folio}</p>
                  <CardTitle className="mt-0.5">{s.nombreJornada}</CardTitle>
                </div>
                <Badge variant={BADGE_AUTORIZACION[s.estadoAutorizacion]}>
                  {s.estadoAutorizacion === "pendiente"
                    ? "Pendiente autorizacion"
                    : s.estadoAutorizacion === "autorizada"
                    ? "Autorizada"
                    : "Rechazada"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <p className="text-xs text-muted-foreground">{TIPO_ACTIVIDAD_SALIDA_LABELS[s.tipoActividad]}</p>

                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{s.planta}</span>
                  {s.direccion && <span className="text-muted-foreground">— {s.direccion}</span>}
                </div>

                {s.contactoPlanta && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{s.contactoPlanta}</span>
                    {s.telefonoContacto && <span className="text-muted-foreground">{s.telefonoContacto}</span>}
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    {formatFecha(s.fecha)} · Salida {s.horaSalida} · Llegada {s.horaEstimadaLlegada}
                  </span>
                </div>

                {s.transporte && (
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{s.transporte}</span>
                  </div>
                )}

                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Personal asignado</p>
                  <div className="flex flex-wrap gap-1.5">
                    {s.personalAsignado.map((id) => (
                      <Badge key={id} variant="default">
                        {nombreDe(id)}
                      </Badge>
                    ))}
                  </div>
                </div>

                {s.observaciones && (
                  <p className="rounded-md bg-bg-secondary p-2 text-xs text-muted-foreground">{s.observaciones}</p>
                )}

                <BotonAgregarCalendar salida={s} />
              </CardContent>
            </Card>
          ))}
          {salidas.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
              Sin salidas programadas.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
