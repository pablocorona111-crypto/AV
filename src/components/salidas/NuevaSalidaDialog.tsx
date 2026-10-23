import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCrearSalida } from "@/hooks/useCatalogos";
import { TIPO_ACTIVIDAD_SALIDA_LABELS } from "@/lib/labels";
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
import type { TipoActividadSalida } from "@/types";

/** Las salidas casi siempre son en Uber o en auto de empresa — autobus queda de ultimo recurso
 * (viajes grandes/grupales). Antes era texto libre y cada quien ponia algo distinto. */
const OPCIONES_TRANSPORTE = ["Uber", "Auto de empresa", "Autobus"] as const;

const schema = z.object({
  nombreJornada: z.string().min(3, "Requerido"),
  tipoActividad: z.custom<TipoActividadSalida>((v) => typeof v === "string" && v.length > 0, "Requerido"),
  planta: z.string().min(2, "Requerido"),
  direccion: z.string().optional(),
  contactoPlanta: z.string().optional(),
  telefonoContacto: z.string().optional(),
  fecha: z.string().min(1, "Requerido"),
  horaSalida: z.string().min(1, "Requerido"),
  horaEstimadaLlegada: z.string().min(1, "Requerido"),
  transporte: z.string().optional(),
  observaciones: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function NuevaSalidaDialog() {
  const [open, setOpen] = useState(false);
  const { usuario } = useAuth();
  const crear = useCrearSalida();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    if (!usuario) return;
    await crear.mutateAsync({
      nombreJornada: values.nombreJornada,
      proyectosRelacionados: [],
      tipoActividad: values.tipoActividad,
      planta: values.planta,
      direccion: values.direccion,
      contactoPlanta: values.contactoPlanta,
      telefonoContacto: values.telefonoContacto,
      fecha: values.fecha,
      horaSalida: values.horaSalida,
      horaEstimadaLlegada: values.horaEstimadaLlegada,
      personalAsignado: [usuario.id],
      responsableProduccionId: usuario.id,
      equipoRequerido: [],
      transporte: values.transporte,
      observaciones: values.observaciones,
    });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Nueva salida
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva salida de grabacion</DialogTitle>
          <DialogDescription>
            Queda en estado "pendiente" hasta que el lider audiovisual la autorice.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nombreJornada">Nombre de la jornada</Label>
            <Input id="nombreJornada" {...register("nombreJornada")} placeholder="Ej. Visita Planta Stretch Film" />
            {errors.nombreJornada && <p className="text-xs text-destructive">{errors.nombreJornada.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de actividad</Label>
              <Controller
                control={control}
                name="tipoActividad"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPO_ACTIVIDAD_SALIDA_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.tipoActividad && <p className="text-xs text-destructive">{errors.tipoActividad.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="planta">Planta o locacion</Label>
              <Input id="planta" {...register("planta")} />
              {errors.planta && <p className="text-xs text-destructive">{errors.planta.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="direccion">Direccion</Label>
              <Input id="direccion" {...register("direccion")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactoPlanta">Contacto en planta</Label>
              <Input id="contactoPlanta" {...register("contactoPlanta")} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" type="date" {...register("fecha")} />
              {errors.fecha && <p className="text-xs text-destructive">{errors.fecha.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="horaSalida">Hora de salida</Label>
              <Input id="horaSalida" type="time" {...register("horaSalida")} />
              {errors.horaSalida && <p className="text-xs text-destructive">{errors.horaSalida.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="horaEstimadaLlegada">Hora estimada llegada</Label>
              <Input id="horaEstimadaLlegada" type="time" {...register("horaEstimadaLlegada")} />
              {errors.horaEstimadaLlegada && (
                <p className="text-xs text-destructive">{errors.horaEstimadaLlegada.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Transporte</Label>
            <Controller
              control={control}
              name="transporte"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPCIONES_TRANSPORTE.map((op) => (
                      <SelectItem key={op} value={op}>
                        {op}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observaciones">Observaciones / seguridad</Label>
            <Textarea id="observaciones" {...register("observaciones")} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crear.isPending}>
              {crear.isPending ? "Guardando..." : "Crear salida"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
