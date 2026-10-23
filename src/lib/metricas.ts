import type { Entregable } from "@/types";

/** Agrupa entregables "cumplidos" (aprobado o entregado) por mes real — usa fechaEntregado y,
 * si aun no se marca entregado, fechaAprobado (una vez aprobado ya cuenta como cumplido).
 * Compartido entre DashboardPage y ReportesPage para no duplicar el calculo. */
export function cumplidosPorMes(entregables: Entregable[]): { mes: string; total: number }[] {
  const mapa = new Map<string, number>();
  entregables.forEach((e) => {
    const fecha = e.fechaEntregado ?? e.fechaAprobado;
    if (!fecha || (e.estado !== "entregado" && e.estado !== "aprobado")) return;
    const clave = fecha.slice(0, 7); // "2026-10"
    mapa.set(clave, (mapa.get(clave) ?? 0) + 1);
  });
  return [...mapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([clave, total]) => ({
      mes: new Date(`${clave}-02T00:00:00`).toLocaleDateString("es-MX", { month: "short" }),
      total,
    }));
}
