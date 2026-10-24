import { aFecha, inicioDeSemana } from "@/lib/periodo";
import type { Entregable, Requisicion } from "@/types";

const DIAS_SEMANA = ["Lun", "Mar", "Mie", "Jue", "Vie"];

/** El colaborador ya hizo su parte en cuanto sube el video — aunque todavia le falte el visto
 * bueno de community, el material ya se entrego. "Correcciones" NO cuenta: ahi community ya lo
 * reviso y lo regreso, ese material especifico no quedo bien. */
export function yaEntregoMaterial(e: Entregable): boolean {
  return e.estado === "en_revision" || e.estado === "aprobado" || e.estado === "entregado";
}

/** Fecha real de cuando se entrego el material — si todavia no hay fechaEntregado/fechaAprobado
 * (ej. recien subido, en revision) usa creadoEn como mejor aproximacion disponible. `creadoEn`
 * se escribe con `serverTimestamp()` — al leerlo de vuelta es un Timestamp de Firestore, NO un
 * string (a diferencia de fechaEntregado/fechaAprobado, que siempre se guardan como ISO) asi que
 * hay que normalizarlo con `aFecha()` antes de poder hacer `.slice()` sobre el resultado. */
function fechaDeEntrega(e: Entregable): string | undefined {
  if (e.fechaEntregado) return e.fechaEntregado;
  if (e.fechaAprobado) return e.fechaAprobado;
  return yaEntregoMaterial(e) ? aFecha(e.creadoEn).toISOString() : undefined;
}

function mismoDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Entregas y requisiciones reales por dia (Lun-Vie) de la semana de `ahora` — compartido entre
 * DashboardPage y ReportesPage para no duplicar el calculo. Nunca sale vacio (son 5 dias fijos). */
export function produccionSemanal(
  entregables: Entregable[],
  requisiciones: Requisicion[],
  ahora: Date = new Date()
): { dia: string; entregados: number; solicitudes: number }[] {
  const inicioSemana = inicioDeSemana(ahora);
  return DIAS_SEMANA.map((dia, i) => {
    const fechaDia = new Date(inicioSemana);
    fechaDia.setDate(fechaDia.getDate() + i);
    return {
      dia,
      entregados: entregables.filter((e) => {
        const fecha = fechaDeEntrega(e);
        return fecha && mismoDia(aFecha(fecha), fechaDia);
      }).length,
      solicitudes: requisiciones.filter((r) => mismoDia(aFecha(r.creadoEn), fechaDia)).length,
    };
  });
}

/** Agrupa entregables "cumplidos" (material ya entregado — en revision, aprobado o entregado)
 * por mes real. Compartido entre DashboardPage y ReportesPage para no duplicar el calculo. */
export function cumplidosPorMes(entregables: Entregable[]): { mes: string; total: number }[] {
  const mapa = new Map<string, number>();
  entregables.forEach((e) => {
    if (!yaEntregoMaterial(e)) return;
    const fecha = fechaDeEntrega(e);
    if (!fecha) return;
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
