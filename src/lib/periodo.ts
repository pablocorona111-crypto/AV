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

/** `creadoEn` se escribe con `serverTimestamp()` de Firestore — al leerlo de vuelta llega como
 * un objeto `Timestamp` (con `.toDate()`), no como el string ISO que se guardo localmente al
 * crearlo. `new Date(timestamp)` da fecha invalida y el filtro de periodo fallaba siempre
 * (nunca entraba nada a "esta semana"/"este mes"). Acepta cualquiera de las dos formas. */
export function aFecha(valor: unknown): Date {
  if (valor instanceof Date) return valor;
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [a, m, d] = valor.split("-").map(Number);
    return new Date(a, m - 1, d);
  }
  if (typeof valor === "string" || typeof valor === "number") return new Date(valor);
  if (valor && typeof valor === "object" && "toDate" in valor && typeof (valor as { toDate: unknown }).toDate === "function") {
    return (valor as { toDate: () => Date }).toDate();
  }
  return new Date(0);
}

export function dentroDelPeriodo(fecha: unknown, periodo: Periodo | "todos", ahora: Date = new Date()): boolean {
  if (periodo === "todos") return true;
  return aFecha(fecha) >= inicioDePeriodo(periodo, ahora);
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
