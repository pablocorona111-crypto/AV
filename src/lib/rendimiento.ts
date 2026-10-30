import { fechaDeEntrega, yaEntregoMaterial } from "@/lib/metricas";
import { aFecha, inicioDeSemana } from "@/lib/periodo";
import type { Entregable } from "@/types";

/** "2026-10-17" como fecha LOCAL (no UTC) — mismo criterio que formatFecha() en utils.ts. */
export function fechaLocal(iso: string): Date {
  const [anio, mes, dia] = iso.split("T")[0].split("-").map(Number);
  return new Date(anio, (mes ?? 1) - 1, dia ?? 1);
}

export interface SemanaRango {
  inicio: Date;
  /** Exclusivo: lunes siguiente a las 00:00. */
  fin: Date;
}

/** Semana Lun-Dom desplazada `offset` semanas desde la de `ahora` (0 = esta, -1 = la pasada). */
export function semana(offset: number, ahora: Date = new Date()): SemanaRango {
  const inicio = inicioDeSemana(ahora);
  inicio.setDate(inicio.getDate() + offset * 7);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 7);
  return { inicio, fin };
}

function enSemana(fecha: Date, s: SemanaRango) {
  return fecha >= s.inicio && fecha < s.fin;
}

export type EstadoTareaSemana = "a_tiempo" | "tarde" | "atrasada" | "pendiente";

export interface TareaSemana {
  entregable: Entregable;
  estado: EstadoTareaSemana;
}

/** Avance estimado por estado cuando el responsable todavia no captura su % real. */
const AVANCE_POR_ESTADO: Record<Entregable["estado"], number> = {
  pendiente: 0,
  en_proceso: 40,
  correcciones: 75,
  en_revision: 90,
  aprobado: 100,
  entregado: 100,
};

/** Avance real de un entregable: lo capturado por el responsable; aprobado/entregado siempre 100. */
export function avanceDe(e: Entregable): number {
  if (e.estado === "aprobado" || e.estado === "entregado") return 100;
  return e.porcentajeAvance ?? AVANCE_POR_ESTADO[e.estado];
}

export interface RendimientoSemanal {
  /** Entregables con fecha compromiso dentro de la semana — la "meta" de la semana. */
  asignadas: number;
  /** De esas, cuantas ya tienen material subido (sin importar si community pidio cambios). */
  entregadas: number;
  aTiempo: number;
  /** Ya pasaron su fecha compromiso y siguen sin material. */
  atrasadas: number;
  aprobadas: number;
  enCorrecciones: number;
  /** entregadas / asignadas (0-100). null si no tuvo nada asignado esa semana. */
  porcentaje: number | null;
  /** Promedio del avance REAL (%) de sus tareas del periodo — refleja trabajo a medias. */
  avance: number | null;
  tareas: TareaSemana[];
}

/** Clasifica un entregable con compromiso en la semana. "a_tiempo" = material subido a mas tardar
 * el dia de su fecha compromiso; "atrasada" = sin material y la fecha ya paso. */
function clasificar(e: Entregable, ahora: Date): EstadoTareaSemana {
  const limite = fechaLocal(e.fechaCompromiso);
  limite.setDate(limite.getDate() + 1); // cuenta todo el dia compromiso
  if (yaEntregoMaterial(e)) {
    const entrega = fechaDeEntrega(e);
    return entrega && aFecha(entrega) >= limite ? "tarde" : "a_tiempo";
  }
  return ahora >= limite ? "atrasada" : "pendiente";
}

export function rendimientoSemanal(
  entregables: Entregable[],
  s: SemanaRango,
  ahora: Date = new Date()
): RendimientoSemanal {
  const tareas = entregables
    .filter((e) => e.fechaCompromiso && enSemana(fechaLocal(e.fechaCompromiso), s))
    .map((entregable) => ({ entregable, estado: clasificar(entregable, ahora) }))
    .sort((a, b) => a.entregable.fechaCompromiso.localeCompare(b.entregable.fechaCompromiso));

  const entregadas = tareas.filter((t) => t.estado === "a_tiempo" || t.estado === "tarde").length;
  return {
    asignadas: tareas.length,
    entregadas,
    aTiempo: tareas.filter((t) => t.estado === "a_tiempo").length,
    atrasadas: tareas.filter((t) => t.estado === "atrasada").length,
    aprobadas: tareas.filter((t) => ["aprobado", "entregado"].includes(t.entregable.estado)).length,
    enCorrecciones: tareas.filter((t) => t.entregable.estado === "correcciones").length,
    porcentaje: tareas.length ? Math.round((entregadas / tareas.length) * 100) : null,
    avance: tareas.length
      ? Math.round(tareas.reduce((suma, t) => suma + avanceDe(t.entregable), 0) / tareas.length)
      : null,
    tareas,
  };
}

/** Agrupa por responsable en un solo recorrido (evita filtrar la lista completa por persona). */
export function entregablesPorResponsable(entregables: Entregable[]): Map<string, Entregable[]> {
  const mapa = new Map<string, Entregable[]>();
  for (const e of entregables) {
    if (!e.responsableId) continue;
    const lista = mapa.get(e.responsableId);
    if (lista) lista.push(e);
    else mapa.set(e.responsableId, [e]);
  }
  return mapa;
}

/** Semaforo de cumplimiento: >=80 bien, 50-79 en riesgo, <50 bajo. */
export type NivelCumplimiento = "bien" | "riesgo" | "bajo" | "sin_datos";

export function nivelCumplimiento(porcentaje: number | null): NivelCumplimiento {
  if (porcentaje === null) return "sin_datos";
  if (porcentaje >= 80) return "bien";
  if (porcentaje >= 50) return "riesgo";
  return "bajo";
}

/** Tareas activas que una persona puede llevar en paralelo sin saturarse — base del % de carga. */
export const CAPACIDAD_TAREAS = 6;

export interface CargaTrabajo {
  /** Sin material subido todavia, o devueltas a correcciones (vuelve a ser trabajo pendiente). */
  activas: number;
  atrasadas: number;
  porcentaje: number;
  nivel: "libre" | "ocupado" | "saturado";
}

/** Carga REAL calculada de sus entregables — no un numero capturado a mano. */
export function cargaDeTrabajo(entregables: Entregable[], ahora: Date = new Date()): CargaTrabajo {
  const activas = entregables.filter((e) => !yaEntregoMaterial(e) || e.estado === "correcciones");
  const atrasadas = activas.filter((e) => {
    if (!e.fechaCompromiso) return false;
    const limite = fechaLocal(e.fechaCompromiso);
    limite.setDate(limite.getDate() + 1);
    return ahora >= limite;
  }).length;
  const porcentaje = Math.round((activas.length / CAPACIDAD_TAREAS) * 100);
  return {
    activas: activas.length,
    atrasadas,
    porcentaje,
    nivel: porcentaje >= 100 ? "saturado" : porcentaje >= 50 ? "ocupado" : "libre",
  };
}

export type PeriodoReporte = "semana" | "mes";

/** Rango de la semana o mes desplazado `offset` periodos (0 = actual, -1 = anterior). */
export function rangoPeriodo(periodo: PeriodoReporte, offset: number, ahora: Date = new Date()): SemanaRango {
  if (periodo === "semana") return semana(offset, ahora);
  const inicio = new Date(ahora.getFullYear(), ahora.getMonth() + offset, 1);
  return { inicio, fin: new Date(inicio.getFullYear(), inicio.getMonth() + 1, 1) };
}

export function etiquetaRango(periodo: PeriodoReporte, r: SemanaRango): string {
  if (periodo === "mes") return r.inicio.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  const fin = new Date(r.fin);
  fin.setDate(fin.getDate() - 1);
  const fmt = (d: Date) => d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  return `${fmt(r.inicio)} – ${fmt(fin)} ${fin.getFullYear()}`;
}

/** Entregables cuyo material se entrego DENTRO del rango, con si fue a tiempo vs su compromiso. */
export function entregasEnRango(entregables: Entregable[], r: SemanaRango) {
  const resultado: { entregable: Entregable; fecha: Date; aTiempo: boolean }[] = [];
  for (const e of entregables) {
    if (!yaEntregoMaterial(e)) continue;
    const iso = fechaDeEntrega(e);
    if (!iso) continue;
    const fecha = aFecha(iso);
    if (!enSemana(fecha, r)) continue;
    const limite = e.fechaCompromiso ? fechaLocal(e.fechaCompromiso) : null;
    if (limite) limite.setDate(limite.getDate() + 1);
    resultado.push({ entregable: e, fecha, aTiempo: !limite || fecha < limite });
  }
  return resultado;
}

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

/** Serie por dia de CUANDO se entrego (a tiempo vs tarde) — semana: Lun..Dom, mes: 1..N. */
export function entregasPorDia(entregas: ReturnType<typeof entregasEnRango>, periodo: PeriodoReporte, r: SemanaRango) {
  const dias: { dia: string; aTiempo: number; tarde: number }[] = [];
  const indice = new Map<string, number>();
  for (const d = new Date(r.inicio); d < r.fin; d.setDate(d.getDate() + 1)) {
    indice.set(d.toDateString(), dias.length);
    dias.push({ dia: periodo === "semana" ? `${DIAS_CORTOS[d.getDay()]} ${d.getDate()}` : String(d.getDate()), aTiempo: 0, tarde: 0 });
  }
  for (const e of entregas) {
    const i = indice.get(e.fecha.toDateString());
    if (i === undefined) continue;
    if (e.aTiempo) dias[i].aTiempo++;
    else dias[i].tarde++;
  }
  return dias;
}

/** Dias promedio desde que se asigno (creadoEn) hasta que se entrego el material. */
export function diasPromedioEntrega(entregas: ReturnType<typeof entregasEnRango>): number | null {
  const dias = entregas
    .map((e) => (e.fecha.getTime() - aFecha(e.entregable.creadoEn).getTime()) / 86_400_000)
    .filter((d) => d >= 0 && d < 365);
  if (!dias.length) return null;
  return Math.round((dias.reduce((a, b) => a + b, 0) / dias.length) * 10) / 10;
}

/** Entregables creados (asignados por el lider) dentro del rango. */
export function asignadosEnRango(entregables: Entregable[], r: SemanaRango): number {
  return entregables.filter((e) => e.creadoEn && enSemana(aFecha(e.creadoEn), r)).length;
}

export function aprobadosEnRango(entregables: Entregable[], r: SemanaRango): number {
  return entregables.filter((e) => e.fechaAprobado && enSemana(aFecha(e.fechaAprobado), r)).length;
}

/** Colores semanticos de estado — iguales en la app y en el PDF. */
export const COLOR_ESTADO_TAREA: Record<EstadoTareaSemana, string> = {
  a_tiempo: "#22C55E",
  tarde: "#EAB308",
  atrasada: "#EF4444",
  pendiente: "#94A3B8",
};

/** Paleta de IDENTIDAD GO para reportes: solo negro, grises y naranja (sin verde/rojo).
 * Barras en negro para lo que va bien; el naranja de marca resalta lo que pide atencion. */
export const PALETA_MARCA: Record<EstadoTareaSemana, string> = {
  a_tiempo: "#262626",
  tarde: "#B8BCC4",
  atrasada: "#FB670B",
  pendiente: "#E5E7EB",
};

/** Version para reporte en modo oscuro: lo bueno en gris muy claro (el grafito no se ve sobre negro). */
export const PALETA_MARCA_OSCURA: Record<EstadoTareaSemana, string> = {
  a_tiempo: "#E5E5E5",
  tarde: "#6B6B6B",
  atrasada: "#FB670B",
  pendiente: "#333333",
};

export type PaletaEstados = Record<EstadoTareaSemana, string>;
/** false = colores de la app; true = identidad GO claro; "oscuro" = identidad GO oscuro. */
export type ModoMarca = boolean | "oscuro";

export const ETIQUETA_ESTADO_TAREA: Record<EstadoTareaSemana, string> = {
  a_tiempo: "A tiempo",
  tarde: "Fuera de fecha",
  atrasada: "Atrasadas",
  pendiente: "En curso",
};

/** Rebanadas de la dona "Estado de las tareas" (solo estados con al menos 1). */
export function donaEstados(r: RendimientoSemanal, paleta: PaletaEstados = COLOR_ESTADO_TAREA) {
  return (Object.keys(paleta) as EstadoTareaSemana[])
    .map((estado) => ({
      nombre: ETIQUETA_ESTADO_TAREA[estado],
      valor: r.tareas.filter((t) => t.estado === estado).length,
      color: paleta[estado],
    }))
    .filter((d) => d.valor > 0);
}

/** Calificacion en palabras del % del area — mismos cortes que los colores (80 / 50). */
export function calificacionArea(avance: number | null, marca: ModoMarca = false): { texto: string; color: string } {
  // marca = paleta GO (naranja / gris / negro) para los reportes; "oscuro" = su version en fondo negro.
  const [sin, bien, regular, bajo] =
    marca === "oscuro"
      ? ["#333333", "#E5E5E5", "#8A8A8A", "#FB670B"]
      : marca
        ? ["#E5E7EB", "#262626", "#9CA3AF", "#FB670B"]
        : ["#94A3B8", "#22C55E", "#EAB308", "#EF4444"];
  if (avance === null) return { texto: "Sin tareas", color: sin };
  if (avance >= 80) return { texto: "Bien", color: bien };
  if (avance >= 50) return { texto: "Regular", color: regular };
  return { texto: "Bajo", color: bajo };
}

/**
 * Explicacion en lenguaje simple del % del area, para quien lea el numero sin contexto:
 * "De 69 tareas con fecha en octubre, el area lleva el 80% del trabajo: 54 entregadas,
 * 4 en curso y 11 atrasadas". Mas la barra segmentada con esas mismas cantidades.
 */
export function explicarArea(r: RendimientoSemanal, cuando: string, marca: ModoMarca = false) {
  const paleta = marca === "oscuro" ? PALETA_MARCA_OSCURA : marca ? PALETA_MARCA : COLOR_ESTADO_TAREA;
  const enCurso = r.tareas.filter((t) => t.estado === "pendiente").length;
  const segmentos = [
    { nombre: "Entregadas", valor: r.entregadas, color: paleta.a_tiempo },
    { nombre: "En curso", valor: enCurso, color: paleta.pendiente },
    { nombre: "Atrasadas", valor: r.atrasadas, color: paleta.atrasada },
  ];
  const explicacion = r.asignadas
    ? `De ${r.asignadas} tareas con fecha ${cuando}, el area lleva el ${r.avance}% del trabajo hecho.`
    : `No hay tareas con fecha ${cuando}.`;
  return { ...calificacionArea(r.avance, marca), explicacion, segmentos, total: r.asignadas };
}

/** Entregas del MES agrupadas por semana (Lun-Dom, recortadas al mes): 4-5 barras anchas que se
 * leen de un vistazo, en vez de 31 barras delgadas por dia que saturaban la grafica del reporte. */
export function entregasPorSemanaDelMes(entregas: ReturnType<typeof entregasEnRango>, r: SemanaRango) {
  const grupos: { dia: string; aTiempo: number; tarde: number; inicio: Date; fin: Date }[] = [];
  const fmt = (d: Date) => d.toLocaleDateString("es-MX", { day: "numeric" });
  let inicio = new Date(r.inicio);
  while (inicio < r.fin) {
    const lunesSig = inicioDeSemana(inicio);
    lunesSig.setDate(lunesSig.getDate() + 7);
    const fin = lunesSig < r.fin ? lunesSig : new Date(r.fin);
    const ultimo = new Date(fin);
    ultimo.setDate(ultimo.getDate() - 1);
    const mes = ultimo.toLocaleDateString("es-MX", { month: "short" }).replace(".", "");
    grupos.push({ dia: `${fmt(inicio)}–${fmt(ultimo)} ${mes}`, aTiempo: 0, tarde: 0, inicio: new Date(inicio), fin });
    inicio = fin;
  }
  for (const e of entregas) {
    const g = grupos.find((x) => e.fecha >= x.inicio && e.fecha < x.fin);
    if (!g) continue;
    if (e.aTiempo) g.aTiempo++;
    else g.tarde++;
  }
  return grupos.map(({ dia, aTiempo, tarde }) => ({ dia, aTiempo, tarde }));
}
