import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function aIso(d: Date) {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function formatoCorto(iso: string) {
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

function diasDelMes(anio: number, mes: number) {
  const primerDia = new Date(anio, mes, 1);
  const ultimoDia = new Date(anio, mes + 1, 0);
  const offset = (primerDia.getDay() + 6) % 7;
  const dias: (Date | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= ultimoDia.getDate(); d++) dias.push(new Date(anio, mes, d));
  return dias;
}

const ALTO_PANEL_ESTIMADO = 330;

export function DatePicker({
  value,
  onChange,
  placeholder = "Selecciona fecha",
  className,
}: {
  value?: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const seleccionada = value ? new Date(value + "T00:00:00") : null;
  const [vista, setVista] = useState(() => seleccionada ?? new Date());
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [posicion, setPosicion] = useState<{ top: number; left: number; arriba: boolean } | null>(null);

  // El calendario vive en un <div absolute> hijo del propio componente, asi que un
  // `DialogContent` con `max-h-[85vh] overflow-y-auto` (el dialogo de "Nuevo entregable", por
  // ejemplo) lo recortaba cuando se abria cerca del borde inferior. Se saca con un Portal a
  // document.body y se posiciona en `fixed` a partir de la posicion real del boton — ya no
  // depende del overflow de ningun ancestro.
  const recalcularPosicion = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const espacioAbajo = window.innerHeight - rect.bottom;
    const arriba = espacioAbajo < ALTO_PANEL_ESTIMADO && rect.top > espacioAbajo;
    setPosicion({
      left: rect.left,
      top: arriba ? rect.top - 4 : rect.bottom + 4,
      arriba,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    recalcularPosicion();
    const onScrollOrResize = () => recalcularPosicion();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  const dias = diasDelMes(vista.getFullYear(), vista.getMonth());
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-border bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          !value && "text-muted-foreground",
          className
        )}
      >
        {value ? formatoCorto(value) : placeholder}
        <CalendarIcon className="h-4 w-4 opacity-60" />
      </button>

      {open && posicion &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: "fixed",
              top: posicion.arriba ? undefined : posicion.top,
              bottom: posicion.arriba ? window.innerHeight - posicion.top : undefined,
              left: posicion.left,
            }}
            className="z-50 w-64 rounded-md border border-border bg-white p-3 shadow-card"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setVista(new Date(vista.getFullYear(), vista.getMonth() - 1, 1))}
                className="rounded-md p-1 hover:bg-bg-secondary"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold">
                {MESES[vista.getMonth()]} {vista.getFullYear()}
              </p>
              <button
                type="button"
                onClick={() => setVista(new Date(vista.getFullYear(), vista.getMonth() + 1, 1))}
                className="rounded-md p-1 hover:bg-bg-secondary"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
              {DIAS_SEMANA.map((d, i) => (
                <div key={i} className="py-1 font-medium">
                  {d}
                </div>
              ))}
              {dias.map((dia, i) => {
                if (!dia) return <div key={i} />;
                const iso = aIso(dia);
                const esSeleccionado = value === iso;
                const esPasado = dia < hoy;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={esPasado}
                    onClick={() => {
                      onChange(iso);
                      setOpen(false);
                    }}
                    className={cn(
                      "rounded-md py-1.5 text-sm text-text-primary hover:bg-bg-secondary",
                      esPasado && "cursor-not-allowed text-muted-foreground/40 hover:bg-transparent",
                      esSeleccionado && "bg-accent text-white hover:brightness-95"
                    )}
                  >
                    {dia.getDate()}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
