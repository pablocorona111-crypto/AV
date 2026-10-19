import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { useRequisiciones } from "@/hooks/useRequisiciones";
import { useCrearProyecto } from "@/hooks/useProyectos";
import { useUsuarios } from "@/hooks/useCatalogos";
import { PRIORIDAD_LABELS } from "@/lib/labels";
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
import { DatePicker } from "@/components/ui/date-picker";
import type { Prioridad } from "@/types";

const SIN_REQUISICION = "ninguna";

const schema = z.object({
  nombre: z.string().min(3, "Minimo 3 caracteres"),
  requisicionId: z.string().min(1, "Requerido"),
  responsablePrincipalId: z.string().min(1, "Requerido"),
  prioridad: z.custom<Prioridad>((v) => typeof v === "string" && v.length > 0, "Requerido"),
  fechaInicio: z.string().min(1, "Requerido"),
  fechaCompromiso: z.string().min(1, "Requerido"),
});

type FormValues = z.infer<typeof schema>;

export function NuevoProyectoDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: requisiciones = [] } = useRequisiciones();
  const { data: usuarios = [] } = useUsuarios();
  const crear = useCrearProyecto();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { requisicionId: SIN_REQUISICION } });

  const aprobadas = requisiciones.filter((r) => r.estado === "aprobada" || r.estado === "en_planeacion");
  const equipo = usuarios.filter(
    (u) => u.rol === "colaborador_audiovisual" || u.rol === "lider_audiovisual" || u.rol === "superadmin"
  );

  const onSubmit = async (values: FormValues) => {
    const requisicion = aprobadas.find((r) => r.id === values.requisicionId);
    setError(null);
    try {
      await crear.mutateAsync({
        nombre: values.nombre,
        requisicionesVinculadas: requisicion ? [requisicion.id] : [],
        responsablePrincipalId: values.responsablePrincipalId,
        colaboradoresIds: [values.responsablePrincipalId],
        departamentoSolicitante: requisicion?.departamentoSolicitante ?? "Marketing",
        prioridad: values.prioridad,
        fechaInicio: values.fechaInicio,
        fechaCompromiso: values.fechaCompromiso,
      });
      reset();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el proyecto.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Nuevo proyecto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo proyecto</DialogTitle>
          <DialogDescription>
            Ligalo a una requisicion aprobada, o dejalo sin requisicion si es contenido recurrente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre del proyecto</Label>
            <Input id="nombre" {...register("nombre")} placeholder="Ej. Video institucional planta Toluca" />
            {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Requisicion de origen (opcional)</Label>
            <Controller
              control={control}
              name="requisicionId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SIN_REQUISICION}>Ninguna — proyecto recurrente</SelectItem>
                    {aprobadas.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.folio} — {r.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Para contenido que se repite cada semana (ej. videos de redes sociales), deja "proyecto recurrente"
              y reusa este mismo proyecto cada vez — no hace falta crear una requisicion nueva.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Responsable principal</Label>
              <Controller
                control={control}
                name="responsablePrincipalId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Asignar a" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipo.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.responsablePrincipalId && (
                <p className="text-xs text-destructive">{errors.responsablePrincipalId.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Prioridad</Label>
              <Controller
                control={control}
                name="prioridad"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORIDAD_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.prioridad && <p className="text-xs text-destructive">{errors.prioridad.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fecha inicio</Label>
              <Controller
                control={control}
                name="fechaInicio"
                render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
              />
              {errors.fechaInicio && <p className="text-xs text-destructive">{errors.fechaInicio.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Fecha compromiso</Label>
              <Controller
                control={control}
                name="fechaCompromiso"
                render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
              />
              {errors.fechaCompromiso && <p className="text-xs text-destructive">{errors.fechaCompromiso.message}</p>}
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crear.isPending}>
              {crear.isPending ? "Creando..." : "Crear proyecto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
