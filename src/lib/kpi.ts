import { aFecha } from "@/lib/periodo";
import { entregasEnRango, type SemanaRango } from "@/lib/rendimiento";
import type { CategoriaContenido, Entregable, GrupoKpi, MetaColaborador } from "@/types";

export const GRUPOS_KPI: { id: GrupoKpi; label: string; unidad: string; unidad1: string }[] = [
  { id: "videos", label: "Videos", unidad: "videos", unidad1: "video" },
  { id: "fotografia", label: "Fotografía", unidad: "sesiones de foto", unidad1: "sesión de foto" },
  { id: "diseno", label: "Diseño", unidad: "piezas de diseño", unidad1: "pieza de diseño" },
  { id: "animacion", label: "Animación", unidad: "animaciones", unidad1: "animación" },
  { id: "web", label: "Web y otros", unidad: "cambios web / otros", unidad1: "cambio web / otro" },
];

/** "1 video" / "3 videos". */
export function unidadDe(grupo: GrupoKpi, n: number): string {
  const g = GRUPOS_KPI.find((x) => x.id === grupo)!;
  return n === 1 ? g.unidad1 : g.unidad;
}

const GRUPO_DE: Record<CategoriaContenido, GrupoKpi> = {
  video_institucional: "videos",
  video_industrial: "videos",
  video_producto: "videos",
  contenido_redes_sociales: "videos",
  entrevistas: "videos",
  capacitacion: "videos",
  cobertura_evento: "videos",
  fotografia: "fotografia",
  fotografia_producto: "fotografia",
  fotografia_industrial: "fotografia",
  diseno_grafico: "diseno",
  animacion_2d_3d: "animacion",
  motion_graphics: "animacion",
  otros: "web",
};

export const grupoDe = (tipo: CategoriaContenido): GrupoKpi => GRUPO_DE[tipo];

export interface AvanceKpi {
  grupo: GrupoKpi;
  label: string;
  unidad: string;
  meta: number;
  hecho: number;
  porcentaje: number;
}

/**
 * Meta vs real de una persona en el rango: cuantas entregas de cada grupo hizo (material
 * entregado DENTRO del rango) contra su meta semanal × semanas del rango (mes = 4 semanas).
 */
export function avanceKpis(
  entregables: Entregable[],
  meta: MetaColaborador | undefined,
  rango: SemanaRango,
  semanas: number
): AvanceKpi[] {
  if (!meta) return [];
  const entregas = entregasEnRango(
    entregables.filter((e) => e.responsableId === meta.id),
    rango
  );
  return GRUPOS_KPI.filter((g) => (meta.metasSemanales?.[g.id] ?? 0) > 0).map((g) => {
    const objetivo = (meta.metasSemanales?.[g.id] ?? 0) * semanas;
    const hecho = entregas.filter((e) => grupoDe(e.entregable.tipo) === g.id).length;
    return {
      grupo: g.id,
      label: g.label,
      unidad: unidadDe(g.id, objetivo),
      meta: objetivo,
      hecho,
      porcentaje: Math.min(100, Math.round((hecho / objetivo) * 100)),
    };
  });
}

/** Cumplimiento total de KPIs de una persona (suma de hechos / suma de metas, tope 100%). */
export function cumplimientoKpi(avances: AvanceKpi[]): number | null {
  const meta = avances.reduce((s, a) => s + a.meta, 0);
  if (!meta) return null;
  const hecho = avances.reduce((s, a) => s + Math.min(a.hecho, a.meta), 0);
  return Math.round((hecho / meta) * 100);
}

/** "3 videos por semana" / "4 sesiones de foto por semana" — para el texto de la estructura. */
export function describirMetas(meta: MetaColaborador | undefined): string[] {
  if (!meta) return [];
  return GRUPOS_KPI.filter((g) => (meta.metasSemanales?.[g.id] ?? 0) > 0).map(
    (g) => {
      const n = meta.metasSemanales?.[g.id] ?? 0;
      return `${n} ${unidadDe(g.id, n)} por semana (${n * 4} al mes)`;
    }
  );
}

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Una salida es "foranea" si su planta/direccion no menciona Morelia (sede del area). */
export function esForanea(s: { planta: string; direccion?: string }): boolean {
  return !sinAcentos(`${s.planta} ${s.direccion ?? ""}`).includes("morelia");
}

/**
 * Demanda que recibe el area, promedio por mes de los ultimos 3 meses: requisiciones (lo que
 * piden otras areas) y salidas de grabacion (con cuantas son fuera de Morelia). Sirve para que
 * el plan diga "esperamos ~15 requisiciones y ~3 salidas al mes".
 */
export function demandaMensual(
  requisiciones: { creadoEn: unknown }[],
  salidas: { fecha: string; planta: string; direccion?: string }[],
  ahora: Date = new Date()
) {
  const desde = new Date(ahora);
  desde.setMonth(desde.getMonth() - 3);
  const enRango = (f: unknown) => {
    const d = aFecha(f);
    return d >= desde && d <= ahora;
  };
  const reqs = requisiciones.filter((r) => enRango(r.creadoEn)).length;
  const sals = salidas.filter((s) => enRango(s.fecha));
  return {
    requisiciones: Math.round(reqs / 3),
    salidas: Math.round(sals.length / 3),
    foraneas: Math.round(sals.filter(esForanea).length / 3),
  };
}
