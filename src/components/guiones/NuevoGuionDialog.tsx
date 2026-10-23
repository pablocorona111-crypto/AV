import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { useProyectos } from "@/hooks/useProyectos";
import { useUsuarios } from "@/hooks/useCatalogos";
import { useRequisiciones } from "@/hooks/useRequisiciones";
import { useCrearGuion } from "@/hooks/useGuiones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SIN_PROYECTO = "sin-proyecto";

const schema = z.object({
  titulo: z.string().min(3, "Minimo 3 caracteres"),
  proyectoId: z.string().min(1, "Requerido"),
  responsableId: z.string().min(1, "Requerido"),
  contenido: z.string().min(10, "Describe el guion con mas detalle"),
});

type FormValues = z.infer<typeof schema>;

export function NuevoGuionDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: proyectos = [] } = useProyectos();
  const { data: usuarios = [] } = useUsuarios();
  const { data: requisiciones = [] } = useRequisiciones();
  const crear = useCrearGuion();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { proyectoId: SIN_PROYECTO } });

  const colaboradores = usuarios.filter(
    (u) => u.rol === "colaborador_audiovisual" || u.rol === "lider_audiovisual" || u.rol === "superadmin"
  );

  const onSubmit = async (values: FormValues) => {
    const proyecto = proyectos.find((p) => p.id === values.proyectoId);
    const requisicionConGestor = requisiciones.find(
      (r) => proyecto?.requisicionesVinculadas?.includes(r.id) && r.responsableVentaId
    );

    setError(null);
    try {
      await crear.mutateAsync({
        titulo: values.titulo,
        ...(values.proyectoId !== SIN_PROYECTO ? { proyectoId: values.proyectoId } : {}),
        responsableId: values.responsableId,
        contenido: values.contenido,
        ...(requisicionConGestor ? { gestorResponsableId: requisicionConGestor.responsableVentaId } : {}),
      });
      reset({ proyectoId: SIN_PROYECTO });
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el guion.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Nuevo guion
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo guion</DialogTitle>
          <DialogDescription>
            Si el proyecto viene de una requisicion con gestor asignado, el tambien podra aprobarlo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Titulo</Label>
            <Input id="titulo" {...register("titulo")} placeholder="Ej. Guion - Video institucional planta" />
            {errors.titulo && <p className="text-xs text-destructive">{errors.titulo.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Proyecto (opcional)</Label>
              <Controller
                control={control}
                name="proyectoId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SIN_PROYECTO}>Sin proyecto (contenido recurrente)</SelectItem>
                      {proyectos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.proyectoId && <p className="text-xs text-destructive">{errors.proyectoId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Responsable (redactor)</Label>
              <Controller
                control={control}
                name="responsableId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Asignar a" />
                    </SelectTrigger>
                    <SelectContent>
                      {colaboradores.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.responsableId && <p className="text-xs text-destructive">{errors.responsableId.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contenido">Contenido del guion</Label>
            <Textarea id="contenido" {...register("contenido")} rows={6} />
            {errors.contenido && <p className="text-xs text-destructive">{errors.contenido.message}</p>}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crear.isPending}>
              {crear.isPending ? "Creando..." : "Crear guion"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
