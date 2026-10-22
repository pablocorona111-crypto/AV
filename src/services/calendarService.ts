import type { SalidaGrabacion } from "@/types";

/**
 * Agrega una grabacion/salida al Google Calendar personal de quien le dio click al boton
 * "Agregar a mi Google Calendar" (`SalidasPage.tsx`) — no es sync automatico ni para todo el
 * equipo, cada quien decide cual exportar a su propia agenda. Usa el mismo `accessToken` de
 * Drive (ver `AuthContext.tsx`, scope `calendar.events` agregado junto a los de Drive) via
 * `fetch` directo a la API, igual que el resto de `driveService.ts`.
 */

const ZONA_HORARIA = "America/Mexico_City";

function horaCombinada(fecha: string, hora?: string): string | null {
  if (!hora) return null;
  const horaNormalizada = hora.length === 5 ? `${hora}:00` : hora;
  return `${fecha}T${horaNormalizada}`;
}

export async function agregarEventoCalendar(salida: SalidaGrabacion, accessToken: string): Promise<void> {
  const inicio = horaCombinada(salida.fecha, salida.horaSalida) ?? `${salida.fecha}T09:00:00`;
  const finHora = salida.horaRegreso ?? salida.horaEstimadaFinalizacion ?? salida.horaEstimadaLlegada;
  const fin = horaCombinada(salida.fecha, finHora) ?? `${salida.fecha}T18:00:00`;

  const evento = {
    summary: salida.nombreJornada,
    location: [salida.planta, salida.direccion].filter(Boolean).join(" — ") || undefined,
    description: [
      salida.folio,
      salida.contactoPlanta ? `Contacto: ${salida.contactoPlanta}` : null,
      salida.telefonoContacto ? `Tel: ${salida.telefonoContacto}` : null,
      salida.observaciones ?? null,
    ]
      .filter(Boolean)
      .join("\n"),
    start: { dateTime: inicio, timeZone: ZONA_HORARIA },
    end: { dateTime: fin, timeZone: ZONA_HORARIA },
  };

  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(evento),
  });

  if (!res.ok) {
    throw new Error(
      res.status === 401
        ? "Tu sesion de Google expiro. Reconecta e intenta de nuevo."
        : "No se pudo agregar el evento a Google Calendar."
    );
  }
}
