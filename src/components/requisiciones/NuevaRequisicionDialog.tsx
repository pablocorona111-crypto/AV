import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { esGestorRequisiciones } from "@/lib/roles";
import { useCrearRequisicion } from "@/hooks/useRequisiciones";
import { CATEGORIA_CONTENIDO_LABELS, PRIORIDAD_LABELS } from "@/lib/labels";
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
import { DatePicker } from "@/components/ui/date-picker";
import type { CategoriaContenido, Prioridad } from "@/types";

const FORMATOS = ["Horizontal", "Vertical", "Ambos"] as const;

const schema = z.object({
  titulo: z.string().min(3, "Minimo 3 caracteres"),
  nombreSolicitante: z.string().optional(),
  tipoContenido: z.custom<CategoriaContenido>((v) => typeof v === "string" && v.length > 0, "Requerido"),
  formatoSolicitado: z.enum(FORMATOS),
  objetivo: z.string().min(5, "Requerido"),
  descripcion: z.string().min(10, "Describe con mas detalle"),
  cantidadEntregables: z.coerce.number().min(1, "Minimo 1"),
  fechaRequerida: z.string().min(1, "Requerido"),
  prioridad: z.custom<Prioridad>((v) => typeof v === "string" && v.length > 0, "Requerido"),
  ubicacion: z.string().optional(),
  necesitaGrabacion: z.boolean(),
  observaciones: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function NuevaRequisicionDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { usuario } = useAuth();
  const crear = useCrearRequisicion();
  const esGestor = esGestorRequisiciones(usuario);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { necesitaGrabacion: false, cantidadEntregables: 1, formatoSolicitado: "Horizontal" },
  });

  const onSubmit = async (values: FormValues) => {
    if (!usuario) return;
    setError(null);
    try {
      await crear.mutateAsync({
        titulo: values.titulo,
        departamentoSolicitante: "Marketing",
        nombreSolicitante: esGestor && values.nombreSolicitante ? values.nombreSolicitante : usuario.nombre,
        solicitanteId: usuario.id,
        ...(esGestor ? { responsableVentaId: usuario.id, responsableVentaCorreo: usuario.correo } : {}),
        tipoContenido: values.tipoContenido,
        formatoSolicitado: values.formatoSolicitado,
        objetivo: values.objetivo,
        descripcion: values.descripcion,
        cantidadEntregables: values.cantidadEntregables,
        fechaRequerida: values.fechaRequerida,
        prioridad: values.prioridad,
        ubicacion: values.ubicacion,
        necesitaGrabacion: values.necesitaGrabacion,
        observaciones: values.observaciones,
      });
      reset();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar la requisicion.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Nueva requisicion
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva requisicion</DialogTitle>
          <DialogDescription>Folio se asigna automaticamente al enviar.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Titulo</Label>
            <Input id="titulo" {...register("titulo")} placeholder="Ej. Video institucional planta" />
            {errors.titulo && <p className="text-xs text-destructive">{errors.titulo.message}</p>}
          </div>

          {esGestor && (
            <div className="space-y-1.5">
              <Label htmlFor="nombreSolicitante">Solicitado por (nombre de la persona/area)</Label>
              <Input id="nombreSolicitante" {...register("nombreSolicitante")} placeholder="Ej. Equipo de ventas" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Formato</Label>
              <Controller
                control={control}
                name="formatoSolicitado"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMATOS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de contenido</Label>
              <Controller
                control={control}
                name="tipoContenido"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORIA_CONTENIDO_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.tipoContenido && <p className="text-xs text-destructive">{errors.tipoContenido.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="objetivo">Objetivo</Label>
            <Input id="objetivo" {...register("objetivo")} placeholder="Para que se usara este contenido" />
            {errors.objetivo && <p className="text-xs text-destructive">{errors.objetivo.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descripcion">Descripcion detallada</Label>
            <Textarea id="descripcion" {...register("descripcion")} rows={3} />
            {errors.descripcion && <p className="text-xs text-destructive">{errors.descripcion.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cantidadEntregables">Cantidad entregables</Label>
              <Input id="cantidadEntregables" type="number" min={1} {...register("cantidadEntregables")} />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha requerida</Label>
              <Controller
                control={control}
                name="fechaRequerida"
                render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
              />
              {errors.fechaRequerida && <p className="text-xs text-destructive">{errors.fechaRequerida.message}</p>}
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

          <div className="space-y-1.5">
            <Label htmlFor="ubicacion">Ubicacion (opcional)</Label>
            <Input id="ubicacion" {...register("ubicacion")} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("necesitaGrabacion")} className="h-4 w-4 rounded border-border" />
            Necesita grabacion
          </label>

          <div className="space-y-1.5">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea id="observaciones" {...register("observaciones")} rows={2} />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crear.isPending}>
              {crear.isPending ? "Enviando..." : "Enviar requisicion"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
