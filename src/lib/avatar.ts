/** Paleta de personas — 10 tonos bien distintos entre si (y del verde/ambar/rojo de estados). */
export const COLORES_PERSONA = [
  "#6366F1",
  "#0EA5E9",
  "#EC4899",
  "#8B5CF6",
  "#14B8A6",
  "#2563EB", // (sin naranja: reservado para la marca GO)
  "#84CC16",
  "#E11D48",
  "#0891B2",
  "#A16207",
];

/**
 * Color por persona SIN repetir: se asigna por orden alfabetico del equipo completo (no por hash
 * del nombre, que chocaba — dos personas salian del mismo naranja en las donas). Mientras el
 * equipo no cambie, cada quien conserva su color en avatares, donas y PDF.
 */
/** Version de identidad GO para reportes: tonos de naranja, grises y negro. */
export const COLORES_PERSONA_MARCA = [
  "#FB670B",
  "#262626",
  "#9CA3AF",
  "#C2410C",
  "#525252",
  "#FDA46C",
  "#737373",
  "#7C2D12",
  "#D4D4D4",
  "#FED7B8",
];

export function coloresDelEquipo(nombres: string[], paleta: string[] = COLORES_PERSONA): (nombre: string) => string {
  const orden = [...new Set(nombres)].sort((a, b) => a.localeCompare(b));
  const mapa = new Map(orden.map((n, i) => [n, paleta[i % paleta.length]]));
  return (nombre) => mapa.get(nombre) ?? "#94A3B8";
}

export function iniciales(nombre: string): string {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Texto legible sobre el color del avatar (los tonos claros de la paleta GO necesitan texto oscuro). */
export function textoSobre(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const luz = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return luz > 0.65 ? "#171717" : "#FFFFFF";
}
