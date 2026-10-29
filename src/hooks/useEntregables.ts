import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adjuntarMaterialHistorico,
  agregarComentario,
  agregarVersionAlterna,
  aprobarEntregable,
  asignarProyectoEntregable,
  cambiarEstadoEntregableDirecto,
  actualizarCarpetaFotos,
  cambiarTipoEntregable,
  eliminarEntregable,
  eliminarMaterialEntregable,
  reasignarResponsableEntregable,
  renombrarEntregable,
  crearEntregable,
  crearEntregableHistorico,
  enviarARevision,
  etiquetarOrientacion,
  etiquetarOrientacionAlt,
  guardarFotos,
  listarComentarios,
  marcarComentariosCorregidos,
  marcarEntregado,
  solicitarCorrecciones,
} from "@/services/entregablesService";
import type { CategoriaContenido, Entregable, EstadoEntregable } from "@/types";

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

export function useActualizarCarpetaFotos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, carpetaFotosUrl }: { id: string; carpetaFotosUrl: string }) =>
      actualizarCarpetaFotos(id, carpetaFotosUrl),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entregables"] }),
  });
}

export function useCambiarTipoEntregable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tipo }: { id: string; tipo: CategoriaContenido }) => cambiarTipoEntregable(id, tipo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entregables"] }),
  });
}

export function useEliminarMaterialEntregable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eliminarMaterialEntregable(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entregables"] }),
  });
}

export function useEliminarEntregable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eliminarEntregable(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entregables"] }),
  });
}

export function useReasignarResponsableEntregable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, responsableId }: { id: string; responsableId: string }) =>
      reasignarResponsableEntregable(id, responsableId),
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

export function useAgregarVersionAlterna() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      url,
      orientacionVideoAlt,
      comoHistorico,
    }: {
      id: string;
      url: string;
      orientacionVideoAlt: "vertical" | "horizontal";
      comoHistorico: boolean;
    }) => agregarVersionAlterna(id, url, orientacionVideoAlt, comoHistorico),
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
    mutationFn: ({
      id,
      aprobadorId,
      urlFinal,
      urlFinalAlt,
    }: {
      id: string;
      aprobadorId: string;
      urlFinal: string;
      urlFinalAlt?: string;
    }) => aprobarEntregable(id, aprobadorId, urlFinal, urlFinalAlt),
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

export function useEtiquetarOrientacionAlt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, orientacionVideoAlt }: { id: string; orientacionVideoAlt: "vertical" | "horizontal" }) =>
      etiquetarOrientacionAlt(id, orientacionVideoAlt),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entregables"] }),
  });
}

export function useGuardarFotos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      fotos,
      comoHistorico,
      carpetaFotosUrl,
    }: {
      id: string;
      fotos: string[];
      comoHistorico: boolean;
      carpetaFotosUrl?: string;
    }) => guardarFotos(id, fotos, { comoHistorico, carpetaFotosUrl }),
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

export function useMarcarComentariosCorregidos(entregableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => marcarComentariosCorregidos(entregableId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comentarios", entregableId] }),
  });
}
