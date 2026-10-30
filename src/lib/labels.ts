import type {
  CategoriaContenido,
  EstadoAutorizacionSalida,
  EstadoEntregable,
  EstadoGuion,
  EstadoRequisicion,
  EtapaProyecto,
  Prioridad,
  TipoActividadSalida,
} from "@/types";
import type { BadgeVariant } from "@/components/ui/badge";

export const ESTADO_REQUISICION_LABELS: Record<EstadoRequisicion, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  en_evaluacion: "En evaluación",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  requiere_informacion: "Requiere información",
  en_planeacion: "En planeación",
};

export const ESTADO_REQUISICION_BADGE: Record<EstadoRequisicion, BadgeVariant> = {
  borrador: "default",
  enviada: "info",
  en_evaluacion: "warning",
  aprobada: "success",
  rechazada: "danger",
  requiere_informacion: "warning",
  en_planeacion: "accent",
};

export const CATEGORIA_CONTENIDO_LABELS: Record<CategoriaContenido, string> = {
  video_institucional: "Video institucional",
  video_industrial: "Video industrial",
  video_producto: "Video de producto",
  fotografia: "Fotografía",
  fotografia_producto: "Fotografía de producto",
  fotografia_industrial: "Fotografía industrial",
  cobertura_evento: "Cobertura de evento",
  diseno_grafico: "Diseño gráfico",
  animacion_2d_3d: "Animación 2D/3D",
  motion_graphics: "Motion Graphics",
  contenido_redes_sociales: "Contenido para redes sociales",
  entrevistas: "Entrevistas",
  capacitacion: "Capacitación",
  otros: "Otros",
};

/** Para la actividad reciente del dashboard ("Fulano marco X como ___") — "entregado" generico
 * no describe que se hizo de verdad. Una grabacion quedo grabada, una foto quedo fotografiada. */
export const ACCION_ENTREGA_LABELS: Record<CategoriaContenido, string> = {
  video_institucional: "grabado",
  video_industrial: "grabado",
  video_producto: "grabado",
  cobertura_evento: "grabado",
  entrevistas: "grabado",
  capacitacion: "grabado",
  motion_graphics: "animado",
  animacion_2d_3d: "animado",
  fotografia: "fotografiado",
  fotografia_producto: "fotografiado",
  fotografia_industrial: "fotografiado",
  diseno_grafico: "diseñado",
  contenido_redes_sociales: "entregado",
  otros: "entregado",
};

/** Fotografia (generica, producto o industrial) usa galeria ordenada de imagenes en vez de un
 * solo archivo de video — nada de orientacion horizontal/vertical ni reproductor de video. */
export function esCategoriaFotografia(tipo: CategoriaContenido): boolean {
  return tipo.startsWith("fotografia");
}

export const PRIORIDAD_LABELS: Record<Prioridad, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
};

export const PRIORIDAD_BADGE: Record<Prioridad, BadgeVariant> = {
  baja: "default",
  media: "info",
  alta: "warning",
  critica: "danger",
};

export const ETAPA_PROYECTO_LABELS: Record<EtapaProyecto, string> = {
  planeacion: "Planeación",
  preproduccion: "Preproducción",
  produccion: "Producción",
  ingesta_respaldo: "Ingesta y respaldo",
  edicion: "Edición",
  animacion_acabados: "Animación / Acabados",
  revision: "Revisión",
  correcciones: "Correcciones",
  aprobado: "Aprobado",
  entregado: "Entregado",
  cerrado: "Cerrado",
};

export const ESTADO_GUION_LABELS: Record<EstadoGuion, string> = {
  borrador: "Borrador",
  en_revision: "En revisión",
  correcciones: "Correcciones",
  aprobado: "Aprobado",
};

export const ESTADO_GUION_BADGE: Record<EstadoGuion, BadgeVariant> = {
  borrador: "default",
  en_revision: "warning",
  correcciones: "danger",
  aprobado: "success",
};

export const ESTADO_ENTREGABLE_LABELS: Record<EstadoEntregable, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  en_revision: "En revisión",
  correcciones: "Correcciones",
  aprobado: "Aprobado",
  entregado: "Entregado",
};

export const ESTADO_ENTREGABLE_BADGE: Record<EstadoEntregable, BadgeVariant> = {
  pendiente: "default",
  en_proceso: "info",
  en_revision: "warning",
  correcciones: "danger",
  aprobado: "success",
  entregado: "accent",
};

/** Etiqueta de estado para UN entregable puntual (badge, encabezado de dialogo, calendario).
 * "Entregado" generico no describe que se hizo de verdad — una grabacion quedo grabada, una
 * foto quedo fotografiada. Usa ESTADO_ENTREGABLE_LABELS tal cual para el resto de estados, y
 * para columnas/agrupaciones que mezclan tipos (ej. el Kanban de Entregables). */
export function etiquetaEstadoEntregable(e: { estado: EstadoEntregable; tipo: CategoriaContenido }): string {
  if (e.estado !== "entregado") return ESTADO_ENTREGABLE_LABELS[e.estado];
  const accion = ACCION_ENTREGA_LABELS[e.tipo];
  return accion.charAt(0).toUpperCase() + accion.slice(1);
}

export const TIPO_ACTIVIDAD_SALIDA_LABELS: Record<TipoActividadSalida, string> = {
  levantamiento_contenido: "Levantamiento de contenido",
  grabacion_proceso_industrial: "Grabación de proceso industrial",
  fotografia_maquinaria: "Fotografía de maquinaria",
  fotografia_producto: "Fotografía de producto",
  entrevista: "Entrevista",
  recorrido_reconocimiento: "Recorrido de reconocimiento",
  grabacion_dron: "Grabación con dron",
  cobertura_evento: "Cobertura de evento",
  grabacion_institucional: "Grabación institucional",
  visita_tecnica: "Visita técnica",
};

/** Unica fuente del texto/color del estado de autorizacion de una salida — lo usan la pagina
 * de Salidas (badge de la tarjeta) y el Calendario (badge del evento del dia). */
export const ETIQUETA_AUTORIZACION_SALIDA: Record<EstadoAutorizacionSalida, string> = {
  pendiente: "Pendiente",
  autorizada: "Autorizada",
  rechazada: "Rechazada",
};

export const BADGE_AUTORIZACION_SALIDA: Record<EstadoAutorizacionSalida, BadgeVariant> = {
  pendiente: "warning",
  autorizada: "success",
  rechazada: "danger",
};

export const ETAPAS_ORDEN: EtapaProyecto[] = [
  "planeacion",
  "preproduccion",
  "produccion",
  "ingesta_respaldo",
  "edicion",
  "animacion_acabados",
  "revision",
  "correcciones",
  "aprobado",
  "entregado",
  "cerrado",
];
