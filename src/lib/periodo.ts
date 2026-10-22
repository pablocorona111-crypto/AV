export type Periodo = "semana" | "mes";

/** Lunes de la semana de `ahora` (hora 0) — para que "esta semana" no dependa del dia en que se consulte. */
export function inicioDeSemana(ahora: Date): Date {
  const inicio = new Date(ahora);
  const diasDesdeLunes = (inicio.getDay() + 6) % 7;
  inicio.setDate(inicio.getDate() - diasDesdeLunes);
  inicio.setHours(0, 0, 0, 0);
  return inicio;
}

export function inicioDePeriodo(periodo: Periodo, ahora: Date = new Date()): Date {
  if (periodo === "semana") return inicioDeSemana(ahora);
  const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  inicio.setHours(0, 0, 0, 0);
  return inicio;
}

export function dentroDelPeriodo(fechaIso: string, periodo: Periodo | "todos", ahora: Date = new Date()): boolean {
  if (periodo === "todos") return true;
  return new Date(fechaIso) >= inicioDePeriodo(periodo, ahora);
}

export function etiquetaPeriodo(periodo: Periodo, ahora: Date = new Date()): string {
  const inicio = inicioDePeriodo(periodo, ahora);
  if (periodo === "mes") {
    return inicio.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  }
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  return `Semana del ${fmt(inicio)} al ${fmt(fin)}`;
}
