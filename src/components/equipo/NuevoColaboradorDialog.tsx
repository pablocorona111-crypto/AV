import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { useCrearColaborador } from "@/hooks/useCatalogos";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const schema = z.object({
  nombre: z.string().min(3, "Minimo 3 caracteres"),
  puesto: z.string().min(2, "Requerido"),
  especialidades: z.string().optional(),
  disponibilidad: z.enum(["disponible", "en_produccion", "ausente"]),
});

type FormValues = z.infer<typeof schema>;

export function NuevoColaboradorDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const crear = useCrearColaborador();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { disponibilidad: "disponible" } });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      await crear.mutateAsync({
        nombre: values.nombre,
        puesto: values.puesto,
        especialidades: values.especialidades
          ? values.especialidades.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        disponibilidad: values.disponibilidad,
      });
      reset();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar al colaborador.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Nuevo colaborador
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo colaborador</DialogTitle>
          <DialogDescription>
            Solo para alguien externo sin cuenta en el sistema — los colaboradores con cuenta
            (rol Colaborador Audiovisual) ya salen solos aqui.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" {...register("nombre")} placeholder="Ej. Luis Ramirez" />
            {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="puesto">Puesto</Label>
              <Input id="puesto" {...register("puesto")} placeholder="Ej. Editor" />
              {errors.puesto && <p className="text-xs text-destructive">{errors.puesto.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Disponibilidad</Label>
              <Controller
                control={control}
                name="disponibilidad"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disponible">Disponible</SelectItem>
                      <SelectItem value="en_produccion">En produccion</SelectItem>
                      <SelectItem value="ausente">Ausente</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="especialidades">Especialidades (separadas por coma)</Label>
            <Input id="especialidades" {...register("especialidades")} placeholder="Ej. Edicion, Camara" />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crear.isPending}>
              {crear.isPending ? "Guardando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
