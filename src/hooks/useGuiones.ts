import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  agregarComentarioGuion,
  aprobarGuion,
  crearGuion,
  enviarGuionARevision,
  listarComentariosGuion,
  listarGuiones,
  solicitarCorreccionesGuion,
} from "@/services/guionesService";
import type { Guion } from "@/types";

export const useGuiones = () => useQuery({ queryKey: ["guiones"], queryFn: listarGuiones });

export function useCrearGuion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Guion, "id" | "folio" | "estado" | "creadoEn">) => crearGuion(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guiones"] }),
  });
}

export function useEnviarGuionARevision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => enviarGuionARevision(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guiones"] }),
  });
}

export function useAprobarGuion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, aprobadorId }: { id: string; aprobadorId: string }) => aprobarGuion(id, aprobadorId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guiones"] }),
  });
}

export function useSolicitarCorreccionesGuion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => solicitarCorreccionesGuion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guiones"] }),
  });
}

export const useComentariosGuion = (guionId: string) =>
  useQuery({
    queryKey: ["comentariosGuion", guionId],
    queryFn: () => listarComentariosGuion(guionId),
    enabled: Boolean(guionId),
  });

export function useAgregarComentarioGuion(guionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { autorId: string; autorNombre: string; texto: string }) =>
      agregarComentarioGuion(guionId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comentariosGuion", guionId] }),
  });
}
