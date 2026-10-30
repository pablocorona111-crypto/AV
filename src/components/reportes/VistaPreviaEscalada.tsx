import { useEffect, useRef, useState } from "react";
import { SLIDE_H, SLIDE_W } from "@/components/reportes/SlideRendimiento";

/** Muestra el slide de 1280x720 escalado al ancho disponible (vista previa = lo que sale en el PDF). */
export function VistaPreviaEscalada({ children }: { children: React.ReactNode }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);

  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    const obs = new ResizeObserver(([entrada]) => setEscala(Math.min(1, entrada.contentRect.width / SLIDE_W)));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={contenedor} className="w-full overflow-hidden rounded-lg border border-border" style={{ height: SLIDE_H * escala }}>
      <div style={{ transform: `scale(${escala})`, transformOrigin: "top left", width: SLIDE_W }}>{children}</div>
    </div>
  );
}
