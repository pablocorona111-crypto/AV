import { useState } from "react";
import { Check, Minus, Pencil, Plus } from "lucide-react";
import { useGuardarMeta } from "@/hooks/useMetas";
import { useProyectos } from "@/hooks/useProyectos";
import { GRUPOS_KPI, unidadDe } from "@/lib/kpi";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { GrupoKpi, MetaColaborador } from "@/types";

/** El lider define de que se encarga cada persona, su meta semanal por tipo de trabajo y que
 * proyectos lleva. Sirve igual para el propio lider (tambien produce). */
export function EditarMetasDialog({
  personaId,
  nombre,
  meta,
}: {
  personaId: string;
  nombre: string;
  meta: MetaColaborador | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [responsabilidad, setResponsabilidad] = useState("");
  const [metas, setMetas] = useState<Partial<Record<GrupoKpi, number>>>({});
  const [proyectosACargo, setProyectosACargo] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { data: proyectos = [] } = useProyectos();
  const guardar = useGuardarMeta();

  const abrir = (v: boolean) => {
    if (v) {
      setResponsabilidad(meta?.responsabilidad ?? "");
      setMetas(meta?.metasSemanales ?? {});
      setProyectosACargo(meta?.proyectosACargo ?? []);
      setError(null);
    }
    setOpen(v);
  };

  const cambiarMeta = (g: GrupoKpi, delta: number) =>
    setMetas((m) => ({ ...m, [g]: Math.max(0, Math.min(30, (m[g] ?? 0) + delta)) }));

  const alternarProyecto = (id: string) =>
    setProyectosACargo((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const onGuardar = async () => {
    setError(null);
    try {
      await guardar.mutateAsync({ id: personaId, responsabilidad: responsabilidad.trim(), metasSemanales: metas, proyectosACargo });
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={abrir}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
          <Pencil className="h-3.5 w-3.5" /> Metas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Metas de {nombre}</DialogTitle>
          <DialogDescription>Define de qué se encarga, cuánto debe entregar por semana y qué proyectos lleva.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="responsabilidad">¿De qué se encarga?</Label>
            <Textarea
              id="responsabilidad"
              value={responsabilidad}
              onChange={(e) => setResponsabilidad(e.target.value)}
              placeholder="Ej. Edición de video y contenido para redes sociales"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Meta por semana</Label>
            <p className="text-[11px] text-muted-foreground">Ej. 3 videos por semana. La meta del mes se calcula sola (× 4).</p>
            <div className="divide-y divide-border rounded-lg border border-border">
              {GRUPOS_KPI.map((g) => {
                const valor = metas[g.id] ?? 0;
                return (
                  <div key={g.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{g.label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {valor ? `${valor} ${unidadDe(g.id, valor)} por semana · ${valor * 4} al mes` : "Sin meta"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => cambiarMeta(g.id, -1)} aria-label={`Menos ${g.label}`}>
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-8 text-center text-base font-bold">{valor}</span>
                      <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => cambiarMeta(g.id, 1)} aria-label={`Más ${g.label}`}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Proyectos a su cargo</Label>
            <div className="flex flex-wrap gap-2">
              {proyectos.map((p) => {
                const activo = proyectosACargo.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => alternarProyecto(p.id)}
                    aria-pressed={activo}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      activo ? "border-accent bg-accent/20 text-text-primary" : "border-border text-muted-foreground hover:bg-bg-secondary"
                    )}
                  >
                    {activo && <Check className="h-3 w-3" />}
                    {p.nombre}
                  </button>
                );
              })}
              {proyectos.length === 0 && <p className="text-xs text-muted-foreground">Aún no hay proyectos creados.</p>}
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={onGuardar} disabled={guardar.isPending}>
            {guardar.isPending ? "Guardando..." : "Guardar metas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
