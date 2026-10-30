import { forwardRef } from "react";
import { iniciales } from "@/lib/avatar";
import { paletaSlide, SLIDE_H, SLIDE_W } from "@/components/reportes/SlideRendimiento";

/**
 * Slide "Plan de trabajo del área" para entregar a la encargada del departamento. Es un PLAN (como
 * vamos a trabajar y que meta tiene cada quien al mes), NO un reporte de avance: por eso no lleva
 * porcentajes, reales ni semaforos — eso vive en "Reportes". Una tarjeta por persona con sus metas
 * mensuales en grande. 1280x720, identidad GO, sigue el tema claro/oscuro.
 */
export interface MetaPlan {
  /** Cantidad al mes (ej. 12). */
  mes: number;
  /** "videos", "sesiones de foto"... ya en singular/plural segun `mes`. */
  unidad: string;
  porSemana: number;
}

export interface PersonaPlan {
  nombre: string;
  puesto: string;
  esLider: boolean;
  responsabilidad: string;
  metas: MetaPlan[];
  proyectos: string[];
}

export interface DatosEstructura {
  /** "Noviembre 2026" */
  mesLabel: string;
  lider: string;
  generado: string;
  objetivo: string;
  /** Metas mensuales sumadas de toda el area. */
  totales: MetaPlan[];
  personas: PersonaPlan[];
  /** Flujo de una solicitud de principio a fin (requisicion -> entrega). */
  flujo: PasoFlujo[];
  /** Lo que llega al area al mes (promedio): requisiciones, salidas, foraneas. */
  demanda: { valor: number; label: string }[];
  /** Reglas de operacion y compromisos del lider. */
  reglas: string[];
}

export interface PasoFlujo {
  paso: string;
  quien: string;
  plazo: string;
  que: string;
}

export const SlideEstructura = forwardRef<HTMLDivElement, { datos: DatosEstructura; oscuro?: boolean }>(
  ({ datos, oscuro = false }, ref) => {
    const C = paletaSlide(oscuro);
    const personas = datos.personas.slice(0, 5);

    return (
      <div
        ref={ref}
        className="flex flex-col gap-3 p-7"
        style={{ width: SLIDE_W, height: SLIDE_H, backgroundColor: C.fondo, color: C.texto, fontFamily: "Inter, sans-serif" }}
      >
        {/* Encabezado (mismo estilo que el reporte de rendimiento) */}
        <div className="relative flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${C.borde}` }}>
          <div className="flex items-center gap-4">
            <img src={C.logo} alt="GO" className="h-12 w-12 object-contain" />
            <div className="h-10 w-px" style={{ backgroundColor: C.borde }} />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: C.suave }}>
                Grupo Ortiz · Departamento Audiovisual
              </p>
              <h2 className="text-[26px] font-bold leading-tight tracking-tight">Plan de trabajo y metas del área</h2>
            </div>
          </div>
          <div className="text-right text-[11px]" style={{ color: C.suave }}>
            <p className="text-lg font-bold capitalize leading-tight" style={{ color: C.texto }}>
              Plan mensual · {datos.mesLabel}
            </p>
            <p>
              Líder: <b style={{ color: C.texto }}>{datos.lider}</b> · {datos.generado}
            </p>
            <p className="text-[9px] uppercase tracking-widest">Documento interno</p>
          </div>
          <div className="absolute -bottom-px left-0 h-[3px] w-24 rounded-full" style={{ backgroundColor: C.marca }} />
        </div>

        {/* Objetivo + metas totales del area */}
        <div className="flex items-stretch gap-3">
          <div className="flex-1 rounded-xl px-4 py-2.5" style={{ backgroundColor: C.marcaSuave, borderLeft: `4px solid ${C.marca}` }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.marca }}>
              Objetivo del área
            </p>
            <p className="text-[12.5px] font-medium leading-snug">{datos.objetivo}</p>
          </div>
          <div className="flex items-center gap-4 rounded-xl px-4 py-2" style={{ backgroundColor: C.fondoSuave }}>
            <p className="text-[10px] font-semibold uppercase leading-tight tracking-wide" style={{ color: C.suave }}>
              Meta del
              <br />
              área al mes
            </p>
            {datos.totales.map((t) => (
              <div key={t.unidad} className="text-center leading-none">
                <p className="text-[26px] font-bold">{t.mes}</p>
                <p className="mt-0.5 text-[9.5px]" style={{ color: C.suave }}>
                  {t.unidad}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Una tarjeta por persona con sus metas del mes */}
        <div
          // Ancho fijo por tarjeta + centrado: con 4 personas llenan la fila; con 3 o menos quedan
          // centradas en vez de estirarse a todo el ancho.
          className="flex h-[268px] justify-center gap-3"
        >
          {personas.map((p) => {
            const acento = p.esLider ? C.marca : C.avatar;
            return (
              <div
                key={p.nombre}
                className="flex w-[295px] shrink-0 flex-col overflow-hidden rounded-2xl"
                style={{ border: `${p.esLider ? 1.5 : 1}px solid ${p.esLider ? C.marca : C.borde}` }}
              >
                {/* Cabecera de la tarjeta */}
                <div className="flex items-center gap-2.5 px-3.5 py-3" style={{ backgroundColor: p.esLider ? C.marcaSuave : C.fondoSuave }}>
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
                    style={{ backgroundColor: acento, color: p.esLider ? "#FFFFFF" : C.avatarTexto }}
                  >
                    {iniciales(p.nombre)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold leading-tight">{p.nombre}</p>
                    <span
                      className="mt-0.5 inline-block rounded-full px-2 py-px text-[10px] font-semibold"
                      style={{ backgroundColor: p.esLider ? C.marca : C.marcaSuave, color: p.esLider ? "#FFFFFF" : C.marcaTexto }}
                    >
                      {p.esLider ? "Líder del área" : p.puesto}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col px-3.5 py-3">
                  <p className="text-[9.5px] font-semibold uppercase tracking-wide" style={{ color: C.suave }}>
                    Se encarga de
                  </p>
                  <p className="line-clamp-2 text-[11px] leading-snug">{p.responsabilidad || "—"}</p>

                  <p className="mt-2 text-[9.5px] font-semibold uppercase tracking-wide" style={{ color: C.suave }}>
                    Metas del mes
                  </p>
                  <div className="mt-1 space-y-1.5">
                    {p.metas.map((m) => (
                      <div key={m.unidad} className="flex items-center gap-2.5 rounded-xl px-2.5 py-1" style={{ backgroundColor: C.fondoSuave }}>
                        <span className="w-10 text-center text-[23px] font-bold leading-none" style={{ color: p.esLider ? C.marca : C.texto }}>
                          {m.mes}
                        </span>
                        <div className="min-w-0 leading-tight">
                          <p className="truncate text-[11.5px] font-semibold">{m.unidad}</p>
                          <p className="text-[9.5px]" style={{ color: C.suave }}>
                            {m.porSemana} por semana
                          </p>
                        </div>
                      </div>
                    ))}
                    {p.metas.length === 0 && (
                      <p className="text-[10.5px]" style={{ color: C.suave }}>
                        Coordinación y revisión del equipo.
                      </p>
                    )}
                  </div>

                  {p.proyectos.length > 0 && (
                    <p className="mt-auto truncate pt-1.5 text-[9.5px]" style={{ color: C.suave }}>
                      <b style={{ color: C.texto }}>A cargo:</b> {p.proyectos.join(" · ")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Flujo de trabajo: de la requisicion a la entrega, con responsable y plazo por paso */}
        <div className="rounded-xl px-3.5 py-2.5" style={{ border: `1px solid ${C.borde}` }}>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.suave }}>
            Cómo trabajaremos · de la solicitud a la entrega
          </p>
          <div className="flex items-stretch">
            {datos.flujo.map((f, i) => (
              <div key={f.paso} className="flex min-w-0 flex-1 items-stretch">
                <div className="min-w-0 flex-1 rounded-lg px-2.5 py-1.5" style={{ backgroundColor: i === 0 ? C.marcaSuave : C.fondoSuave }}>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: C.marca }}
                    >
                      {i + 1}
                    </span>
                    <b className="truncate text-[11.5px]">{f.paso}</b>
                  </div>
                  <p className="mt-1 text-[9.5px] leading-snug" style={{ color: C.suave }}>
                    {f.que}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-1.5 text-[9.5px] font-semibold">
                    <span style={{ color: C.texto }}>{f.quien}</span>
                    <span style={{ color: C.marcaTexto }}>· {f.plazo}</span>
                  </p>
                </div>
                {i < datos.flujo.length - 1 && (
                  <div className="flex w-4 shrink-0 items-center justify-center text-[13px] font-bold" style={{ color: C.marca }}>
                    ›
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Demanda esperada + reglas + firmas */}
        <div className="grid flex-1 grid-cols-12 gap-3">
          <div className="col-span-3 rounded-xl px-3.5 py-2" style={{ border: `1px solid ${C.borde}` }}>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.suave }}>
              Lo que recibimos al mes
            </p>
            <div className="flex justify-between gap-2">
              {datos.demanda.map((d) => (
                <div key={d.label} className="leading-none">
                  <p className="text-[22px] font-bold">≈{d.valor}</p>
                  <p className="mt-0.5 text-[9.5px] leading-tight" style={{ color: C.suave }}>
                    {d.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-6 rounded-xl px-3.5 py-2" style={{ border: `1px solid ${C.borde}` }}>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.suave }}>
              Reglas y compromisos
            </p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9.8px] leading-snug">
              {datos.reglas.map((r) => (
                <li key={r} className="flex gap-1.5">
                  <span style={{ color: C.marca }}>■</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-3 flex flex-col justify-end gap-3 rounded-xl px-3.5 py-2" style={{ border: `1px solid ${C.borde}` }}>
            {[
              { rol: "Elaboró", nombre: `${datos.lider} · Líder audiovisual` },
              { rol: "Revisó y aprobó", nombre: "Encargada del departamento" },
            ].map((f) => (
              <div key={f.rol}>
                <div className="h-px" style={{ backgroundColor: C.suave }} />
                <p className="mt-0.5 text-[9.5px]">
                  <b>{f.rol}:</b> <span style={{ color: C.suave }}>{f.nombre}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
);
SlideEstructura.displayName = "SlideEstructura";
