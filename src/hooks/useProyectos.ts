import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { actualizarProyecto, crearProyecto, eliminarProyecto, listarProyectos } from "@/services/proyectosService";
import type { Proyecto } from "@/types";

export function useProyectos() {
  return useQuery({ queryKey: ["proyectos"], queryFn: listarProyectos });
}

export function useCrearProyecto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      data: Omit<Proyecto, "id" | "folio" | "etapaActual" | "porcentajeAvance" | "creadoEn" | "actualizadoEn">
    ) => crearProyecto(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proyectos"] }),
  });
}

export function useActualizarProyecto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cambios }: { id: string; cambios: Partial<Proyecto> }) => actualizarProyecto(id, cambios),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proyectos"] }),
  });
}

export function useEliminarProyecto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eliminarProyecto(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proyectos"] }),
  });
}
