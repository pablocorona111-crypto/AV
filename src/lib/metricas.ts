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

/** Para cuando todavia no hay ni un solo cumplido — sin esto la grafica desaparecia por
 * completo (array vacio) en vez de mostrar su estructura (ejes, meses) para ver el diseño. */
export function mesesVacios(cantidad: number, ahora: Date = new Date()): { mes: string; total: number }[] {
  const meses: { mes: string; total: number }[] = [];
  for (let i = cantidad - 1; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 2);
    meses.push({ mes: d.toLocaleDateString("es-MX", { month: "short" }), total: 0 });
  }
  return meses;
}
