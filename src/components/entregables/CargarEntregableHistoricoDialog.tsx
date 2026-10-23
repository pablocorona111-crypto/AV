import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { History } from "lucide-react";
import { useProyectos } from "@/hooks/useProyectos";
import { useUsuarios } from "@/hooks/useCatalogos";
import { useCrearEntregableHistorico } from "@/hooks/useEntregables";
import { useAuth } from "@/context/AuthContext";
import { CATEGORIA_CONTENIDO_LABELS } from "@/lib/labels";
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
import type { CategoriaContenido } from "@/types";

const SIN_PROYECTO = "sin-proyecto";

const schema = z.object({
  nombre: z.string().min(3, "Minimo 3 caracteres"),
  proyectoId: z.string().min(1, "Requerido"),
  responsableId: z.string().min(1, "Requerido"),
  tipo: z.custom<CategoriaContenido>((v) => typeof v === "string" && v.length > 0, "Requerido"),
  estadoFinal: z.enum(["aprobado", "entregado"]),
  fecha: z.string().min(1, "Requerido"),
  urlFinal: z.string().min(1, "Pega el link del video ya confirmado"),
});

type FormValues = z.infer<typeof schema>;

/**
 * Solo superadmin — para meter de una vez trabajos/videos que ya estaban confirmados de antes
 * (una semana, un mes...) y nunca se registraron aqui. A diferencia de "Nuevo entregable" (que
 * siempre nace "Pendiente" y pasa por todo el flujo de revision), esto nace YA aprobado o
 * entregado, con la fecha real que se elija — no la fecha de hoy — para que el control y las
 * graficas reflejen cuando de verdad paso.
 */
export function CargarEntregableHistoricoDialog() {
  const { usuario } = useAuth();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: proyectos = [] } = useProyectos();
  const { data: usuarios = [] } = useUsuarios();
  const crear = useCrearEntregableHistorico();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { proyectoId: SIN_PROYECTO, estadoFinal: "entregado" },
  });

  const colaboradores = usuarios.filter(
    (u) => u.rol === "colaborador_audiovisual" || u.rol === "lider_audiovisual" || u.rol === "superadmin"
  );

  const onSubmit = async (values: FormValues) => {
    if (!usuario) return;
    setError(null);
    try {
      await crear.mutateAsync({
        data: {
          nombre: values.nombre,
          ...(values.proyectoId !== SIN_PROYECTO ? { proyectoId: values.proyectoId } : {}),
          responsableId: values.responsableId,
          tipo: values.tipo,
          fechaCompromiso: values.fecha,
        },
        opciones: {
          estadoFinal: values.estadoFinal,
          fecha: values.fecha,
          urlFinal: values.urlFinal,
          aprobadorId: usuario.id,
        },
      });
      reset({ proyectoId: SIN_PROYECTO, estadoFinal: "entregado" });
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el historico.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <History className="h-4 w-4" /> Cargar historico
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cargar entregable historico</DialogTitle>
          <DialogDescription>
            Para videos/trabajos ya confirmados de antes que nunca se registraron — nace directo
            como Aprobado o Entregado, con la fecha real que elijas (no la de hoy).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre del entregable</Label>
            <Input id="nombre" {...register("nombre")} placeholder="Ej. Video institucional planta - corte 1" />
            {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Proyecto (opcional)</Label>
            <Controller
              control={control}
              name="proyectoId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SIN_PROYECTO}>Sin proyecto (trabajo directo)</SelectItem>
                    {proyectos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Responsable</Label>
              <Controller
                control={control}
                name="responsableId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Quien lo hizo" />
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
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Controller
                control={control}
                name="tipo"
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
              {errors.tipo && <p className="text-xs text-destructive">{errors.tipo.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ya quedo</Label>
              <Controller
                control={control}
                name="estadoFinal"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aprobado">Aprobado (listo para subir)</SelectItem>
                      <SelectItem value="entregado">Entregado (ya publicado)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha real</Label>
              <Controller
                control={control}
                name="fecha"
                render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
              />
              {errors.fecha && <p className="text-xs text-destructive">{errors.fecha.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="urlFinal">Link del video (Drive, ya confirmado)</Label>
            <Input id="urlFinal" {...register("urlFinal")} placeholder="https://drive.google.com/file/d/..." />
            {errors.urlFinal && <p className="text-xs text-destructive">{errors.urlFinal.message}</p>}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crear.isPending}>
              {crear.isPending ? "Cargando..." : "Cargar al historico"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
