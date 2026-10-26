import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adjuntarMaterialHistorico,
  agregarComentario,
  aprobarEntregable,
  asignarProyectoEntregable,
  cambiarEstadoEntregableDirecto,
  renombrarEntregable,
  crearEntregable,
  crearEntregableHistorico,
  enviarARevision,
  etiquetarOrientacion,
  listarComentarios,
  marcarEntregado,
  solicitarCorrecciones,
} from "@/services/entregablesService";
import type { Entregable, EstadoEntregable } from "@/types";

export function useCrearEntregable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Entregable, "id" | "version" | "estado" | "creadoEn">) => crearEntregable(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entregables"] }),
  });
}

export function useCrearEntregableHistorico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      opciones,
    }: {
      data: Parameters<typeof crearEntregableHistorico>[0];
      opciones: Parameters<typeof crearEntregableHistorico>[1];
    }) => crearEntregableHistorico(data, opciones),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entregables"] }),
  });
}

export function useEnviarARevision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; urlRevision: string; orientacionVideo?: "vertical" | "horizontal" }) =>
      enviarARevision(data.id, data.urlRevision, data.orientacionVideo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entregables"] }),
  });
}

export function useAsignarProyectoEntregable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, proyectoId }: { id: string; proyectoId: string | null }) =>
      asignarProyectoEntregable(id, proyectoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entregables"] }),
  });
}

export function useRenombrarEntregable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, nombre }: { id: string; nombre: string }) => renombrarEntregable(id, nombre),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entregables"] }),
  });
}

export function useCambiarEstadoEntregableDirecto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      estado,
      actual,
    }: {
      id: string;
      estado: EstadoEntregable;
      actual: Pick<Entregable, "fechaAprobado" | "fechaEntregado">;
    }) => cambiarEstadoEntregableDirecto(id, estado, actual),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entregables"] }),
  });
}

export function useAdjuntarMaterialHistorico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; urlFinal: string; orientacionVideo?: "vertical" | "horizontal" }) =>
      adjuntarMaterialHistorico(data.id, data.urlFinal, data.orientacionVideo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entregables"] }),
  });
}

export function useAprobarEntregable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, aprobadorId, urlFinal }: { id: string; aprobadorId: string; urlFinal: string }) =>
      aprobarEntregable(id, aprobadorId, urlFinal),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entregables"] }),
  });
}

export function useSolicitarCorrecciones() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => solicitarCorrecciones(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entregables"] }),
  });
}

export function useMarcarEntregado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => marcarEntregado(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entregables"] }),
  });
}

export function useEtiquetarOrientacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, orientacionVideo }: { id: string; orientacionVideo: "vertical" | "horizontal" }) =>
      etiquetarOrientacion(id, orientacionVideo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entregables"] }),
  });
}

export const useComentarios = (entregableId: string) =>
  useQuery({
    queryKey: ["comentarios", entregableId],
    queryFn: () => listarComentarios(entregableId),
    enabled: Boolean(entregableId),
  });

export function useAgregarComentario(entregableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { autorId: string; autorNombre: string; texto: string; momento?: string }) =>
      agregarComentario(entregableId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comentarios", entregableId] }),
  });
}
