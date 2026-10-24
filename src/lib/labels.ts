import type {
  CategoriaContenido,
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
  en_evaluacion: "En evaluacion",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  requiere_informacion: "Requiere informacion",
  en_planeacion: "En planeacion",
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
  fotografia_producto: "Fotografia de producto",
  fotografia_industrial: "Fotografia industrial",
  cobertura_evento: "Cobertura de evento",
  diseno_grafico: "Diseño grafico",
  animacion_2d_3d: "Animacion 2D/3D",
  motion_graphics: "Motion Graphics",
  contenido_redes_sociales: "Contenido para redes sociales",
  entrevistas: "Entrevistas",
  capacitacion: "Capacitacion",
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
  fotografia_producto: "fotografiado",
  fotografia_industrial: "fotografiado",
  diseno_grafico: "diseñado",
  contenido_redes_sociales: "entregado",
  otros: "entregado",
};

export const PRIORIDAD_LABELS: Record<Prioridad, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Critica",
};

export const PRIORIDAD_BADGE: Record<Prioridad, BadgeVariant> = {
  baja: "default",
  media: "info",
  alta: "warning",
  critica: "danger",
};

export const ETAPA_PROYECTO_LABELS: Record<EtapaProyecto, string> = {
  planeacion: "Planeacion",
  preproduccion: "Preproduccion",
  produccion: "Produccion",
  ingesta_respaldo: "Ingesta y respaldo",
  edicion: "Edicion",
  animacion_acabados: "Animacion / Acabados",
  revision: "Revision",
  correcciones: "Correcciones",
  aprobado: "Aprobado",
  entregado: "Entregado",
  cerrado: "Cerrado",
};

export const ESTADO_GUION_LABELS: Record<EstadoGuion, string> = {
  borrador: "Borrador",
  en_revision: "En revision",
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
  en_revision: "En revision",
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

export const TIPO_ACTIVIDAD_SALIDA_LABELS: Record<TipoActividadSalida, string> = {
  levantamiento_contenido: "Levantamiento de contenido",
  grabacion_proceso_industrial: "Grabacion de proceso industrial",
  fotografia_maquinaria: "Fotografia de maquinaria",
  fotografia_producto: "Fotografia de producto",
  entrevista: "Entrevista",
  recorrido_reconocimiento: "Recorrido de reconocimiento",
  grabacion_dron: "Grabacion con dron",
  cobertura_evento: "Cobertura de evento",
  grabacion_institucional: "Grabacion institucional",
  visita_tecnica: "Visita tecnica",
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
