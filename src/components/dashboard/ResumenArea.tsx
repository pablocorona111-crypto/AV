import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTemaGrafica } from "@/lib/chartTheme";

export interface Rebanada {
  nombre: string;
  valor: number;
  color: string;
}

export interface ExplicacionArea {
  texto: string;
  color: string;
  explicacion: string;
  segmentos: Rebanada[];
  total: number;
}

/** Barra segmentada (entregadas / en curso / atrasadas) con su leyenda — el "de que esta hecho" el %. */
export function BarraSegmentos({ segmentos, total, claro = false }: { segmentos: Rebanada[]; total: number; claro?: boolean }) {
  return (
    <div>
      <div className={`flex h-2.5 overflow-hidden rounded-full ${claro ? "bg-white/15" : "bg-bg-secondary"}`}>
        {total > 0 &&
          segmentos.map((s) =>
            s.valor > 0 ? (
              <div key={s.nombre} style={{ width: `${(s.valor / total) * 100}%`, backgroundColor: s.color }} title={`${s.nombre}: ${s.valor}`} />
            ) : null
          )}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
        {segmentos.map((s) => (
          <span key={s.nombre} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            <b>{s.valor}</b> {s.nombre.toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Tarjeta "Area Audiovisual 80% · Bien": anillo + explicacion en palabras de que significa el %. */
export function AnilloArea({
  avance,
  cumplimiento,
  aTiempo,
  explicacion,
}: {
  avance: number | null;
  cumplimiento: number | null;
  aTiempo: number | null;
  explicacion: ExplicacionArea;
}) {
  const g = useTemaGrafica();
  const v = avance ?? 0;
  return (
    <Card className="bg-text-primary text-bg-primary">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-4">
          <div className="relative h-24 w-24 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[{ v }, { v: 100 - v }]}
                  dataKey="v"
                  innerRadius="78%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                >
                  <Cell fill={explicacion.color} />
                  <Cell fill={g.vacio} />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
              <b className="text-2xl">{avance === null ? "—" : `${avance}%`}</b>
              <span className="mt-0.5 text-[10px] font-semibold" style={{ color: explicacion.color }}>
                {explicacion.texto}
              </span>
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#C1EB1F]">Area Audiovisual</p>
            <p className="text-base font-bold leading-tight">Avance general del departamento</p>
            <p className="mt-1 text-xs opacity-80">{explicacion.explicacion}</p>
          </div>
        </div>

        <BarraSegmentos segmentos={explicacion.segmentos} total={explicacion.total} claro />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/15 pt-2 text-[11px] opacity-80">
          <span>
            Cumplimiento <b>{cumplimiento === null ? "—" : `${cumplimiento}%`}</b> · A tiempo{" "}
            <b>{aTiempo === null ? "—" : `${aTiempo}%`}</b>
          </span>
          <span title="Como leer el porcentaje">
            <span className="text-green-400">80%+ bien</span> · <span className="text-amber-400">50–79 regular</span> ·{" "}
            <span className="text-red-400">&lt;50 bajo</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/** Dona con total al centro y leyenda con % de cada rebanada. */
export function DonaResumen({ titulo, datos, centro }: { titulo: string; datos: Rebanada[]; centro: string }) {
  const g = useTemaGrafica();
  const total = datos.reduce((s, d) => s + d.valor, 0);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4 pt-2">
        <div className="relative h-32 w-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={total ? datos : [{ nombre: "Sin datos", valor: 1, color: g.vacio }]}
                dataKey="valor"
                nameKey="nombre"
                innerRadius="62%"
                outerRadius="100%"
                paddingAngle={total ? 2 : 0}
                stroke="none"
              >
                {(total ? datos : [{ nombre: "Sin datos", color: g.vacio }]).map((d) => (
                  <Cell key={d.nombre} fill={d.color} />
                ))}
              </Pie>
              {total > 0 && <Tooltip {...g.tooltip} />}
            </PieChart>
          </ResponsiveContainer>
          <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center leading-none">
            <b className="text-xl">{total}</b>
            <span className="text-[10px] text-muted-foreground">{centro}</span>
          </span>
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          {datos.map((d) => (
            <div key={d.nombre} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="min-w-0 flex-1 truncate">{d.nombre}</span>
              <span className="text-muted-foreground">{d.valor}</span>
              <b className="w-9 text-right">{Math.round((d.valor / total) * 100)}%</b>
            </div>
          ))}
          {total === 0 && <p className="text-xs text-muted-foreground">Sin datos en este periodo.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
