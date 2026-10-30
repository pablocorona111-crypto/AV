import type { CategoriaContenido } from "@/types";

/**
 * Catalogo de especialidades del equipo. Se guardan como la ETIQUETA (string) en
 * `usuarios.especialidades` / `colaboradores.especialidades` — asi los datos viejos capturados a
 * mano ("Fotografia de producto", "Edicion") siguen funcionando: el match es por palabras clave
 * sin acentos, no por igualdad exacta.
 */
export const ESPECIALIDADES = [
  { label: "Fotografia", claves: ["foto"] },
  { label: "Edicion de video", claves: ["edicion", "editor", "postpro"] },
  { label: "Grabacion / camara", claves: ["grabacion", "camara", "video"] },
  { label: "Dron", claves: ["dron"] },
  { label: "Animacion / motion", claves: ["animacion", "motion", "2d", "3d"] },
  { label: "Diseño grafico", claves: ["diseno", "grafico"] },
  { label: "Paginas web", claves: ["web", "pagina"] },
  { label: "Levantamiento de contenido", claves: ["levantamiento"] },
  { label: "Guion", claves: ["guion", "copy", "redaccion"] },
  { label: "Redes sociales", claves: ["redes", "social", "community"] },
] as const;

export type Especialidad = (typeof ESPECIALIDADES)[number]["label"];

/** Que especialidades sirven para cada tipo de entregable (para sugerir a quien asignar). */
const POR_CATEGORIA: Record<CategoriaContenido, Especialidad[]> = {
  video_institucional: ["Grabacion / camara", "Edicion de video"],
  video_industrial: ["Grabacion / camara", "Edicion de video", "Dron"],
  video_producto: ["Grabacion / camara", "Edicion de video"],
  fotografia: ["Fotografia"],
  fotografia_producto: ["Fotografia"],
  fotografia_industrial: ["Fotografia"],
  cobertura_evento: ["Grabacion / camara", "Fotografia"],
  diseno_grafico: ["Diseño grafico"],
  animacion_2d_3d: ["Animacion / motion"],
  motion_graphics: ["Animacion / motion"],
  contenido_redes_sociales: ["Redes sociales", "Edicion de video"],
  entrevistas: ["Grabacion / camara", "Edicion de video"],
  capacitacion: ["Grabacion / camara", "Edicion de video"],
  otros: [],
};

function normalizar(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Convierte lo guardado (catalogo o texto libre viejo) a etiquetas del catalogo, sin repetir. */
export function aCatalogo(guardadas: string[] | undefined): Especialidad[] {
  const resultado = new Set<Especialidad>();
  for (const g of guardadas ?? []) {
    const n = normalizar(g);
    const hit = ESPECIALIDADES.find((e) => normalizar(e.label) === n || e.claves.some((c) => n.includes(c)));
    if (hit) resultado.add(hit.label);
  }
  return [...resultado];
}

/** Especialidades de la persona que encajan con el tipo de trabajo (vacio = no es su fuerte). */
export function especialidadesPara(tipo: CategoriaContenido | undefined, guardadas: string[] | undefined): Especialidad[] {
  if (!tipo) return [];
  const propias = aCatalogo(guardadas);
  return POR_CATEGORIA[tipo].filter((e) => propias.includes(e));
}
