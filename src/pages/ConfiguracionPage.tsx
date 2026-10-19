import { useEffect, useState } from "react";
import { useActualizarGestorRequisiciones, useActualizarRolUsuario, useUsuarios } from "@/hooks/useCatalogos";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/lib/roles";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DemoBadge } from "@/components/DemoBadge";
import { InvitarUsuarioDialog } from "@/components/configuracion/InvitarUsuarioDialog";
import type { GestorRequisicionesPermisos } from "@/types";

const PERMISO_LABELS: Record<keyof Omit<GestorRequisicionesPermisos, "activo">, string> = {
  crearEnNombreDeTerceros: "Crear requisiciones en nombre de terceros",
  editarDespuesDeEnviar: "Editar requisiciones despues de enviarlas",
  adjuntarArchivos: "Adjuntar archivos",
  verRequisicionesDeOtros: "Ver requisiciones creadas por otros usuarios",
  verInfoSolicitante: "Ver informacion del solicitante",
  verInfoProyectoVinculado: "Ver informacion del proyecto vinculado",
  verFechasYEstadosProduccion: "Ver fechas y estados de produccion",
  notificacionesCorreo: "Recibir notificaciones por correo",
  notificacionesSistema: "Recibir notificaciones dentro del sistema",
};

export function ConfiguracionPage() {
  const { usuario: usuarioActual } = useAuth();
  const { data: usuarios = [] } = useUsuarios();
  const gestor = usuarios.find((u) => u.gestorRequisiciones?.activo);
  const [permisos, setPermisos] = useState<GestorRequisicionesPermisos | undefined>();
  const actualizarGestor = useActualizarGestorRequisiciones();
  const actualizarRol = useActualizarRolUsuario();

  // usuarios llega de forma asincrona (Firestore/demo) — sincronizar cuando este disponible.
  useEffect(() => {
    if (gestor?.gestorRequisiciones) setPermisos(gestor.gestorRequisiciones);
  }, [gestor]);

  const guardarPermisos = () => {
    if (!gestor || !permisos) return;
    actualizarGestor.mutate({ id: gestor.id, gestorRequisiciones: permisos });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Configuracion</h1>
          <p className="text-sm text-muted-foreground">Usuarios, roles y permisos del sistema.</p>
        </div>
        <div className="flex items-center gap-3">
          <DemoBadge />
          <InvitarUsuarioDialog />
        </div>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-4 text-xs text-muted-foreground">
          La autorizacion real vive en Firestore Security Rules — ver SECURITY.md. Esta vista administra
          invitaciones y el permiso de gestor de requisiciones.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios</CardTitle>
          <CardDescription>Roles asignados dentro del departamento.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Puesto</TableHead>
                <TableHead>Gestor de requisiciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{u.correo}</TableCell>
                  <TableCell>
                    {u.id === usuarioActual?.id ? (
                      <Badge variant="outline">{ROLE_LABELS[u.rol]}</Badge>
                    ) : (
                      <Select
                        value={u.rol}
                        onValueChange={(value) =>
                          actualizarRol.mutate({ id: u.id, rol: value as typeof u.rol })
                        }
                      >
                        <SelectTrigger className="h-8 w-48 text-xs">
                          <SelectValue />
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
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.puesto ?? "—"}</TableCell>
                  <TableCell>
                    {u.gestorRequisiciones?.activo ? (
                      <Badge variant="accent">Activo</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">No</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {gestor && permisos && (
        <Card>
          <CardHeader>
            <CardTitle>Permisos de {gestor.nombre} (gestor de requisiciones)</CardTitle>
            <CardDescription>
              Configurable solo por el Lider Audiovisual. Ver reglas de negocio en SECURITY.md.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {(Object.keys(PERMISO_LABELS) as Array<keyof typeof PERMISO_LABELS>).map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={permisos[key]}
                  onChange={(e) => setPermisos({ ...permisos, [key]: e.target.checked })}
                  className="h-4 w-4 rounded border-border"
                />
                {PERMISO_LABELS[key]}
              </label>
            ))}
          </CardContent>
          <CardFooter>
            <Button onClick={guardarPermisos} disabled={actualizarGestor.isPending}>
              {actualizarGestor.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
