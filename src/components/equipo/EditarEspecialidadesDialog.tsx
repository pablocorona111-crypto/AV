import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import { useActualizarPerfilColaborador } from "@/hooks/useCatalogos";
import { aCatalogo, ESPECIALIDADES, type Especialidad } from "@/lib/especialidades";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Colaborador } from "@/types";

/** El lider define en que es fuerte cada persona — de aqui salen las sugerencias al asignar. */
export function EditarEspecialidadesDialog({ colaborador }: { colaborador: Colaborador }) {
  const [open, setOpen] = useState(false);
  const [seleccion, setSeleccion] = useState<Especialidad[]>([]);
  const [puesto, setPuesto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const guardar = useActualizarPerfilColaborador();

  const abrir = (v: boolean) => {
    if (v) {
      setSeleccion(aCatalogo(colaborador.especialidades));
      setPuesto(colaborador.puesto);
      setError(null);
    }
    setOpen(v);
  };

  const alternar = (e: Especialidad) =>
    setSeleccion((s) => (s.includes(e) ? s.filter((x) => x !== e) : [...s, e]));

  const onGuardar = async () => {
    setError(null);
    try {
      await guardar.mutateAsync({ colaborador, cambios: { especialidades: seleccion, puesto: puesto.trim() } });
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={abrir}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
          <Pencil className="h-3.5 w-3.5" /> Editar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Especialidades de {colaborador.nombre}</DialogTitle>
          <DialogDescription>
            Marca en que es fuerte. Al crear un entregable se le sugerira primero para ese tipo de trabajo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="puesto">Puesto</Label>
            <Input id="puesto" value={puesto} onChange={(e) => setPuesto(e.target.value)} placeholder="Ej. Editor" />
          </div>

          <div className="flex flex-wrap gap-2">
            {ESPECIALIDADES.map(({ label }) => {
              const activa = seleccion.includes(label);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => alternar(label)}
                  aria-pressed={activa}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    activa
                      ? "border-accent bg-accent/25 text-text-primary"
                      : "border-border text-muted-foreground hover:bg-bg-secondary"
                  )}
                >
                  {activa && <Check className="h-3 w-3" />}
                  {label}
                </button>
              );
            })}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={onGuardar} disabled={guardar.isPending}>
            {guardar.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
