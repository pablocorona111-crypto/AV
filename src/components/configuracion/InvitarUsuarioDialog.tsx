import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useInvitarUsuario } from "@/hooks/useCatalogos";
import { ROLE_LABELS } from "@/lib/roles";
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
import type { Role } from "@/types";

const schema = z.object({
  nombre: z.string().min(2, "Requerido"),
  correo: z.string().email("Correo invalido"),
  rol: z.custom<Role>((v) => typeof v === "string" && v.length > 0, "Requerido"),
  gestorRequisiciones: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function InvitarUsuarioDialog() {
  const [open, setOpen] = useState(false);
  const { usuario } = useAuth();
  const invitar = useInvitarUsuario();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rol: "solicitante", gestorRequisiciones: false },
  });

  const rolSeleccionado = watch("rol");

  const onSubmit = async (values: FormValues) => {
    if (!usuario) return;
    await invitar.mutateAsync({
      nombre: values.nombre,
      correo: values.correo.toLowerCase(),
      rol: values.rol,
      creadoPorId: usuario.id,
      ...(values.gestorRequisiciones
        ? {
            gestorRequisiciones: {
              activo: true,
              crearEnNombreDeTerceros: true,
              editarDespuesDeEnviar: true,
              adjuntarArchivos: true,
              verRequisicionesDeOtros: true,
              verInfoSolicitante: true,
              verInfoProyectoVinculado: true,
              verFechasYEstadosProduccion: true,
              notificacionesCorreo: true,
              notificacionesSistema: true,
            },
          }
        : {}),
    });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4" /> Invitar usuario
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar usuario</DialogTitle>
          <DialogDescription>
            Al iniciar sesion con Google por primera vez con este correo, el acceso y rol se asignan automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" {...register("nombre")} placeholder="Nombre completo" />
            {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="correo">Correo</Label>
            <Input id="correo" type="email" {...register("correo")} placeholder="nombre@correo.com" />
            {errors.correo && <p className="text-xs text-destructive">{errors.correo.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Controller
              control={control}
              name="rol"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {rolSeleccionado === "community" ? (
            <p className="text-xs text-muted-foreground">
              El rol Community ya incluye enviar requisiciones, ver todos los guiones/videos y aprobarlos.
            </p>
          ) : (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("gestorRequisiciones")} className="h-4 w-4 rounded border-border" />
              Permiso especial: Gestor de requisiciones (dar el mismo poder de Community a otro rol)
            </label>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={invitar.isPending}>
              {invitar.isPending ? "Invitando..." : "Invitar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
