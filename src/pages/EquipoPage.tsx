import { useEquipoAV, useColaboradores } from "@/hooks/useCatalogos";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemoBadge } from "@/components/DemoBadge";
import type { EstadoEquipo } from "@/types";

const ESTADO_EQUIPO_LABELS: Record<EstadoEquipo, string> = {
  disponible: "Disponible",
  en_uso: "En uso",
  mantenimiento: "Mantenimiento",
  baja: "Baja",
};

const ESTADO_EQUIPO_BADGE: Record<EstadoEquipo, "success" | "warning" | "danger" | "default"> = {
  disponible: "success",
  en_uso: "warning",
  mantenimiento: "danger",
  baja: "default",
};

const DISPONIBILIDAD_LABELS = {
  disponible: "Disponible",
  en_produccion: "En produccion",
  ausente: "Ausente",
} as const;

export function EquipoPage() {
  const { data: equipoAV = [], isLoading: cargandoEquipo } = useEquipoAV();
  const { data: colaboradores = [], isLoading: cargandoColaboradores } = useColaboradores();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Equipo</h1>
          <p className="text-sm text-muted-foreground">Inventario audiovisual y equipo humano del departamento.</p>
        </div>
        <DemoBadge />
      </div>

      <Tabs defaultValue="humano">
        <TabsList>
          <TabsTrigger value="humano">Equipo humano</TabsTrigger>
          <TabsTrigger value="av">Equipo audiovisual</TabsTrigger>
        </TabsList>

        <TabsContent value="humano">
          <Card>
            <CardContent className="p-0">
              {cargandoColaboradores ? (
                <p className="p-5 text-sm text-muted-foreground">Cargando...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Puesto</TableHead>
                      <TableHead>Especialidades</TableHead>
                      <TableHead>Tareas activas</TableHead>
                      <TableHead>Carga</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {colaboradores.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nombre}</TableCell>
                        <TableCell className="text-muted-foreground">{c.puesto}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.especialidades.join(", ") || "—"}
                        </TableCell>
                        <TableCell>{c.tareasPendientes}</TableCell>
                        <TableCell className="w-40">
                          <div className="flex items-center gap-2">
                            <Progress value={c.cargaReal} className="w-24" />
                            <span className="text-xs text-muted-foreground">{c.cargaReal}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={c.disponibilidad === "disponible" ? "success" : "warning"}>
                            {DISPONIBILIDAD_LABELS[c.disponibilidad]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="av">
          <Card>
            <CardContent className="p-0">
              {cargandoEquipo ? (
                <p className="p-5 text-sm text-muted-foreground">Cargando...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Codigo</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Marca / Modelo</TableHead>
                      <TableHead>Ubicacion</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipoAV.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.codigoInterno}</TableCell>
                        <TableCell>{e.nombre}</TableCell>
                        <TableCell className="text-muted-foreground">{e.categoria}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {e.marca} {e.modelo}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{e.ubicacion}</TableCell>
                        <TableCell>
                          <Badge variant={ESTADO_EQUIPO_BADGE[e.estado]}>{ESTADO_EQUIPO_LABELS[e.estado]}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
