import { createContext, forwardRef, useContext } from "react";
import { Area, Bar, CartesianGrid, Cell, ComposedChart, LabelList, Legend, Line, Pie, PieChart, XAxis, YAxis } from "recharts";
import { iniciales } from "@/lib/avatar";

/**
 * Slide del reporte de rendimiento — sigue el tema de la app: claro (fondo blanco) u oscuro, y el
 * PDF se exporta en ese mismo fondo. Colores fijos (hex) por paleta, sin tokens CSS ni variantes
 * `dark:`, para que la captura a PDF sea identica a lo que se ve.
 * Tamaño fijo 1280x720 (16:9) para que el PDF sea exactamente un slide; en pantalla se muestra
 * escalado (ver ReportesPage). Graficas con ancho fijo (sin ResponsiveContainer) porque el slide
 * no cambia de tamaño y ResponsiveContainer mide mal dentro de un `transform: scale`.
 */
export const SLIDE_W = 1280;
export const SLIDE_H = 720;

const CLARO = {
  fondo: "#FFFFFF",
  texto: "#111827",
  suave: "#6B7280",
  borde: "#E5E7EB",
  fondoSuave: "#F6F8FB",
  // Identidad GO: barras en negro; gris = regular; naranja de marca = lo que pide atencion.
  aTiempo: "#262626",
  tarde: "#B8BCC4",
  bajo: "#FB670B",
  /** Naranja de identidad GO (#FB670B). */
  marca: "#FB670B",
  marcaSuave: "#FFF1E7",
  marcaTexto: "#C2410C",
  pista: "#EEF0F3",
  rejilla: "#F1F2F4",
  tickY: "#B0B4BB",
  avatar: "#262626",
  avatarTexto: "#FFFFFF",
  deltaBueno: "#171717",
  logo: "/logo-go.png",
};

/** Modo oscuro: lo "bueno" pasa a gris muy claro (el grafito no se veria sobre negro). */
const OSCURO: typeof CLARO = {
  fondo: "#111111",
  texto: "#F5F5F5",
  suave: "#A3A3A3",
  borde: "#2E2E2E",
  fondoSuave: "#1B1B1B",
  aTiempo: "#E5E5E5",
  tarde: "#6B6B6B",
  bajo: "#FB670B",
  marca: "#FB670B",
  marcaSuave: "#2A1709",
  marcaTexto: "#FD8A47",
  pista: "#262626",
  rejilla: "#1F1F1F",
  tickY: "#6B6B6B",
  avatar: "#E5E5E5",
  avatarTexto: "#111111",
  deltaBueno: "#F5F5F5",
  logo: "/logo-go-blanco.png",
};

/** Paleta del slide (claro u oscuro) — compartida con el slide de "Estructura y KPI". */
export type PaletaSlide = typeof CLARO;
export const paletaSlide = (oscuro: boolean): PaletaSlide => (oscuro ? OSCURO : CLARO);

/** Color de fondo del slide para el PDF (html-to-image necesita saberlo). */
export const fondoSlide = (oscuro: boolean) => (oscuro ? OSCURO : CLARO).fondo;

const PaletaCtx = createContext(CLARO);
const usePaleta = () => useContext(PaletaCtx);

export interface FilaReporte {
  nombre: string;
  /** Puesto y de que se encarga (especialidades) — para que el reporte diga quien hace que. */
  puesto: string;
  encargo: string;
  asignadas: number;
  entregadas: number;
  aTiempo: number;
  porcentaje: number | null;
  /** Avance real promedio (%) de sus tareas — es la barra principal. */
  avance: number | null;
  esLider?: boolean;
  /** Color unico de la persona (avatar = su rebanada en "Quien entrego"). */
  color: string;
}

export interface Comparativo {
  valor: number | null;
  anterior: number | null;
  /** true = subir es bueno (cumplimiento); false = bajar es bueno (dias de entrega). */
  masEsMejor: boolean;
  sufijo?: string;
}

export interface DatosSlide {
  titulo: string;
  periodoLabel: string;
  lider: string;
  generado: string;
  kpis: { label: string; valor: string; detalle?: string; color?: string }[];
  porDia: { dia: string; aTiempo: number; tarde: number }[];
  filas: FilaReporte[];
  gestion: { label: string; dato: Comparativo }[];
  /** Avance general de TODO el departamento (promedio del avance real de sus tareas). */
  area: {
    nombre: string;
    dato: Comparativo;
    /** Calificacion en palabras (Bien / Regular / Bajo) y su color. */
    texto: string;
    color: string;
    /** Frase simple de que significa el %. */
    explicacion: string;
    segmentos: Rebanada[];
    total: number;
  };
  estados: Rebanada[];
  porPersona: Rebanada[];
}

export interface Rebanada {
  nombre: string;
  valor: number;
  color: string;
}

/** Anillo con el % al centro — tamaño fijo (el slide no se redimensiona). */
function Anillo({ valor, tam, color }: { valor: number | null; tam: number; color: string }) {
  const C = usePaleta();
  const v = valor ?? 0;
  return (
    <div className="relative shrink-0" style={{ width: tam, height: tam }}>
      <PieChart width={tam} height={tam}>
        <Pie
          data={[{ v }, { v: 100 - v }]}
          dataKey="v"
          innerRadius={tam / 2 - 9}
          outerRadius={tam / 2}
          startAngle={90}
          endAngle={-270}
          stroke="none"
          isAnimationActive={false}
        >
          <Cell fill={color} />
          <Cell fill={C.fondoSuave} />
        </Pie>
      </PieChart>
      <span className="absolute inset-0 flex items-center justify-center text-lg font-bold" style={{ color: C.texto }}>
        {valor === null ? "—" : `${valor}%`}
      </span>
    </div>
  );
}

/** Dona compacta + leyenda con % — para estados y reparto por persona. */
function DonaConLeyenda({ datos, centro }: { datos: Rebanada[]; centro: string }) {
  const C = usePaleta();
  const total = datos.reduce((s, d) => s + d.valor, 0);
  if (total === 0) {
    return (
      <p className="text-xs" style={{ color: C.suave }}>
        Sin datos en este periodo.
      </p>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: 74, height: 74 }}>
        <PieChart width={74} height={74}>
          <Pie data={datos} dataKey="valor" innerRadius={23} outerRadius={36} paddingAngle={2} stroke="none" isAnimationActive={false}>
            {datos.map((d) => (
              <Cell key={d.nombre} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
        <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <b className="text-sm">{total}</b>
          <span className="text-[8px]" style={{ color: C.suave }}>
            {centro}
          </span>
        </span>
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        {datos.slice(0, 4).map((d) => (
          <div key={d.nombre} className="flex items-center gap-1.5 text-[10px]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="min-w-0 flex-1 truncate">{d.nombre}</span>
            <b>{Math.round((d.valor / total) * 100)}%</b>
          </div>
        ))}
        {datos.length > 4 && (
          <p className="text-[10px]" style={{ color: C.suave }}>
            +{datos.length - 4} mas
          </p>
        )}
      </div>
    </div>
  );
}

function colorPorcentaje(p: number | null, C: typeof CLARO) {
  if (p === null) return C.borde;
  return p >= 80 ? C.aTiempo : p >= 50 ? C.tarde : C.bajo;
}

function Seccion({ titulo, children, className = "" }: { titulo: string; children: React.ReactNode; className?: string }) {
  const C = usePaleta();
  return (
    <div className={`rounded-xl p-4 ${className}`} style={{ border: `1px solid ${C.borde}` }}>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.suave }}>
        {titulo}
      </p>
      {children}
    </div>
  );
}

function Delta({ dato }: { dato: Comparativo }) {
  const C = usePaleta();
  if (dato.valor === null || dato.anterior === null) return null;
  const diff = Math.round((dato.valor - dato.anterior) * 10) / 10;
  if (diff === 0) return <span style={{ color: C.suave }}>= igual</span>;
  const bueno = diff > 0 === dato.masEsMejor;
  return (
    <span style={{ color: bueno ? C.deltaBueno : C.marcaTexto, fontWeight: 700 }}>
      {diff > 0 ? "▲" : "▼"} {Math.abs(diff)}
      {dato.sufijo ?? ""} vs anterior
    </span>
  );
}

const MAX_FILAS = 7;

/** Total por barra + la linea de tendencia que une esos totales (semana: por dia; mes: por semana). */
function conTendencia(porDia: DatosSlide["porDia"]) {
  return porDia.map((d) => ({ ...d, total: d.aTiempo + d.tarde, tendencia: d.aTiempo + d.tarde }));
}

export const SlideRendimiento = forwardRef<HTMLDivElement, { datos: DatosSlide; oscuro?: boolean }>(
  ({ datos, oscuro = false }, ref) => {
  const C = oscuro ? OSCURO : CLARO;
  const sinEntregas = datos.porDia.every((d) => d.aTiempo + d.tarde === 0);

  return (
    <PaletaCtx.Provider value={C}>
    <div
      ref={ref}
      className="flex flex-col gap-4 p-8"
      style={{ width: SLIDE_W, height: SLIDE_H, backgroundColor: C.fondo, color: C.texto, fontFamily: "Inter, sans-serif" }}
    >
      {/* Encabezado ejecutivo con el logotipo GO (identidad). El PNG vive en /public (mismo
          origen), asi html-to-image lo puede incrustar en el PDF sin problemas de CORS. */}
      <div className="relative flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${C.borde}` }}>
        <div className="flex items-center gap-4">
          <img src={C.logo} alt="GO" className="h-12 w-12 object-contain" />
          <div className="h-10 w-px" style={{ backgroundColor: C.borde }} />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: C.suave }}>
              Grupo Ortiz · Departamento Audiovisual
            </p>
            <h2 className="text-[26px] font-bold leading-tight tracking-tight">{datos.titulo}</h2>
          </div>
        </div>
        <div className="text-right text-[11px]" style={{ color: C.suave }}>
          <p className="text-lg font-bold capitalize leading-tight" style={{ color: C.texto }}>
            {datos.periodoLabel}
          </p>
          <p>
            Lider: <b style={{ color: C.texto }}>{datos.lider}</b> · Generado {datos.generado}
          </p>
          <p className="text-[9px] uppercase tracking-widest">Documento interno</p>
        </div>
        {/* Linea de acento de marca bajo el encabezado */}
        <div className="absolute -bottom-px left-0 h-[3px] w-24 rounded-full" style={{ backgroundColor: C.marca }} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-7 gap-3">
        {/* Resumen general del area: el "80%" del departamento, explicado en palabras. */}
        <div
          className="col-span-3 flex items-center gap-3 rounded-xl px-4 py-2.5"
          style={{ backgroundColor: C.marcaSuave, border: `1.5px solid ${C.marca}`, color: C.texto }}
        >
          <div className="relative rounded-full" style={{ backgroundColor: C.fondo }}>
            <Anillo valor={datos.area.dato.valor} tam={70} color={datos.area.color} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.marca }}>
              {datos.area.nombre} ·{" "}
              <span style={{ color: datos.area.color }}>{datos.area.texto}</span>
              <span className="ml-2 normal-case tracking-normal">
                <Delta dato={datos.area.dato} />
              </span>
            </p>
            <p className="text-[11px] leading-snug" style={{ color: C.texto }}>
              {datos.area.explicacion}
            </p>
            {/* Barra segmentada: de que esta hecho el % */}
            <div className="mt-1 flex h-2 overflow-hidden rounded-full" style={{ backgroundColor: C.fondo }}>
              {datos.area.total > 0 &&
                datos.area.segmentos.map((sg) =>
                  sg.valor > 0 ? (
                    <div key={sg.nombre} style={{ width: `${(sg.valor / datos.area.total) * 100}%`, backgroundColor: sg.color }} />
                  ) : null
                )}
            </div>
            <p className="mt-0.5 flex gap-3 whitespace-nowrap text-[10px]" style={{ color: C.suave }}>
              {datos.area.segmentos.map((sg) => (
                <span key={sg.nombre} className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sg.color }} />
                  <b>{sg.valor}</b> {sg.nombre.toLowerCase()}
                </span>
              ))}
            </p>
          </div>
        </div>
        {datos.kpis.map((k) => (
          <div key={k.label} className="rounded-xl px-3 py-3" style={{ backgroundColor: C.fondoSuave }}>
            <p className="text-2xl font-bold leading-tight" style={{ color: k.color ?? C.texto }}>
              {k.valor}
            </p>
            <p className="whitespace-nowrap text-xs font-medium">{k.label}</p>
            {k.detalle && (
              <p className="truncate text-[11px]" style={{ color: C.suave }}>
                {k.detalle}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Graficas principales */}
      {/* Alto fijo: el slide es de 720px exactos y nada debe empujar la fila de abajo fuera. */}
      <div className="grid h-[330px] grid-cols-12 gap-4 overflow-hidden">
        <Seccion titulo="¿Cuando se entrego el contenido?" className="col-span-7">
          {sinEntregas ? (
            <p className="flex h-[255px] items-center justify-center text-sm" style={{ color: C.suave }}>
              Sin entregas en este periodo.
            </p>
          ) : (
            // Barras (cuanto se entrego cada dia) + linea de tendencia en naranja de marca que une
            // los totales: marca de un vistazo las subidas y bajadas de la semana/mes.
            <ComposedChart
              width={660}
              height={255}
              data={conTendencia(datos.porDia)}
              margin={{ top: 26, right: 8, left: -24, bottom: 0 }}
              barCategoryGap="28%"
            >
              <defs>
                {/* Sombreado suave bajo la linea de tendencia (naranja de marca que se desvanece). */}
                <linearGradient id="sombraTendencia" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.marca} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={C.marca} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={C.rejilla} vertical={false} />
              <XAxis
                dataKey="dia"
                tickLine={false}
                axisLine={{ stroke: C.borde }}
                fontSize={11}
                tick={{ fill: C.suave }}
                interval={0}
              />
              <YAxis tickLine={false} axisLine={false} fontSize={10} allowDecimals={false} tick={{ fill: C.tickY }} />
              {/* Leyenda explicita: el sombreado (Area) no debe aparecer como "tendencia" duplicada. */}
              <Legend
                iconSize={8}
                wrapperStyle={{ fontSize: 11, color: C.texto }}
                payload={[
                  { value: "A tiempo", type: "circle", color: C.aTiempo, id: "a" },
                  { value: "Fuera de fecha", type: "circle", color: C.tarde, id: "f" },
                  { value: "Tendencia", type: "line", color: C.marca, id: "t" },
                ]}
              />
              <Area
                type="monotone"
                dataKey="tendencia"
                fill="url(#sombraTendencia)"
                stroke="none"
                legendType="none"
                tooltipType="none"
                isAnimationActive={false}
              />
              <Bar dataKey="aTiempo" name="A tiempo" stackId="e" fill={C.aTiempo} maxBarSize={44} radius={[5, 5, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="tarde" name="Fuera de fecha" stackId="e" fill={C.tarde} maxBarSize={44} radius={[5, 5, 0, 0]} isAnimationActive={false}>
                <LabelList
                  dataKey="total"
                  position="top"
                  offset={12}
                  fontSize={11}
                  fontWeight={700}
                  fill={C.texto}
                  formatter={(v: number) => (v > 0 ? v : "")}
                />
              </Bar>
              <Line
                type="monotone"
                dataKey="tendencia"
                name="Tendencia"
                stroke={C.marca}
                strokeWidth={3}
                strokeLinecap="round"
                dot={{ r: 4.5, fill: C.fondo, stroke: C.marca, strokeWidth: 2.5 }}
                activeDot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          )}
        </Seccion>

        <Seccion titulo="Avance real por colaborador" className="col-span-5">
          <div className="space-y-2">
            {datos.filas.slice(0, MAX_FILAS).map((f) => (
              <div key={f.nombre} className="flex items-center gap-2.5">
                {/* Avatar con iniciales (no foto: una imagen externa rompe la captura del PDF por CORS). */}
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                  style={{ backgroundColor: f.esLider ? C.marca : C.avatar, color: f.esLider ? "#FFFFFF" : C.avatarTexto }}
                >
                  {iniciales(f.nombre)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5 text-xs">
                    <b className="shrink-0">{f.nombre}</b>
                    <span
                      className="shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold"
                      style={{ backgroundColor: f.esLider ? C.marca : C.marcaSuave, color: f.esLider ? "#FFFFFF" : C.marcaTexto }}
                    >
                      {f.esLider && !/lider/i.test(f.puesto) ? `Lider · ${f.puesto}` : f.puesto}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[10px]" style={{ color: C.suave }}>
                      {f.encargo}
                    </span>
                    <span className="shrink-0 text-[10px]" style={{ color: C.suave }}>
                      {f.asignadas ? `${f.entregadas}/${f.asignadas} · ${f.aTiempo} a tiempo` : "Sin tareas"}
                    </span>
                    <b className="w-9 shrink-0 text-right text-[13px]">{f.avance === null ? "—" : `${f.avance}%`}</b>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full" style={{ backgroundColor: C.pista }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${f.avance ?? 0}%`, backgroundColor: colorPorcentaje(f.avance, C) }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {datos.filas.length > MAX_FILAS && (
              <p className="text-[11px]" style={{ color: C.suave }}>
                +{datos.filas.length - MAX_FILAS} colaboradores mas
              </p>
            )}
          </div>
        </Seccion>
      </div>

      {/* Lider + donas */}
      <div className="grid grid-cols-12 gap-4">
        <Seccion titulo="Gestion del lider" className="col-span-6">
          <div className="grid grid-cols-5 gap-2">
            {datos.gestion.map((g) => (
              <div key={g.label}>
                <p className="text-lg font-bold leading-tight">
                  {g.dato.valor === null ? "—" : `${g.dato.valor}${g.dato.sufijo ?? ""}`}
                </p>
                <p className="text-[11px] leading-tight">{g.label}</p>
                <p className="text-[10px]">
                  <Delta dato={g.dato} />
                </p>
              </div>
            ))}
          </div>
        </Seccion>

        <Seccion titulo="Estado de las tareas" className="col-span-3">
          <DonaConLeyenda datos={datos.estados} centro="tareas" />
        </Seccion>

        <Seccion titulo="Quien entrego" className="col-span-3">
          <DonaConLeyenda datos={datos.porPersona} centro="entregas" />
        </Seccion>
      </div>
    </div>
    </PaletaCtx.Provider>
  );
  }
);
SlideRendimiento.displayName = "SlideRendimiento";
