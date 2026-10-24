import { useTema } from "@/hooks/useTema";

/** Paleta de series (donut de tipos de entregable). Son pasteles claros, asi que funcionan
 * igual sobre papel blanco que sobre el fondo oscuro — no hace falta una version por tema. */
export const COLORES_TIPO = [
  "#C1EB1F",
  "#93C5FD",
  "#86EFAC",
  "#C4B5FD",
  "#FDBA74",
  "#FCA5A5",
  "#67E8F9",
];

/** Color de la barra "secundaria" (Solicitudes) y del donut cuando no hay datos. */
type TemaGrafica = {
  grid: string;
  /** `tick` de XAxis/YAxis: sin esto Recharts usa un #666 fijo, ilegible en oscuro. */
  tick: { fill: string; fontSize?: number };
  eje: string;
  cursor: { fill: string };
  tooltip: {
    contentStyle: React.CSSProperties;
    itemStyle: React.CSSProperties;
    labelStyle: React.CSSProperties;
  };
  barraNeutra: string;
  vacio: string;
};

const CLARO: TemaGrafica = {
  grid: "#E5E7EB",
  tick: { fill: "#6B7280" },
  eje: "#E5E7EB",
  cursor: { fill: "#F6F8FB" },
  tooltip: {
    contentStyle: {
      backgroundColor: "#FFFFFF",
      border: "1px solid #E5E7EB",
      borderRadius: 12,
      boxShadow: "0 1px 3px 0 rgba(17,24,39,0.08)",
      fontSize: 12,
    },
    itemStyle: { color: "#111827" },
    labelStyle: { color: "#111827", fontWeight: 600 },
  },
  barraNeutra: "#CBD5E1",
  vacio: "#E5E7EB",
};

const OSCURO: TemaGrafica = {
  grid: "#2E333C",
  tick: { fill: "#9CA3B0" },
  eje: "#2E333C",
  // Un velo claro translucido: el gris solido del tema claro taparia las barras en oscuro.
  cursor: { fill: "rgba(237,240,245,0.06)" },
  tooltip: {
    contentStyle: {
      backgroundColor: "#171A1F",
      border: "1px solid #2E333C",
      borderRadius: 12,
      boxShadow: "0 1px 3px 0 rgba(0,0,0,0.5)",
      fontSize: 12,
    },
    itemStyle: { color: "#EDF0F5" },
    labelStyle: { color: "#EDF0F5", fontWeight: 600 },
  },
  barraNeutra: "#5B6472",
  vacio: "#2E333C",
};

export function useTemaGrafica(): TemaGrafica {
  const { esOscuro } = useTema();
  return esOscuro ? OSCURO : CLARO;
}
