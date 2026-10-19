import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  asignarGestorRequisicion,
  cambiarEstadoRequisicion,
  crearRequisicion,
  listarRequisiciones,
} from "@/services/requisicionesService";
import type { EstadoRequisicion, Requisicion } from "@/types";

const QUERY_KEY = ["requisiciones"];

export function useRequisiciones() {
  return useQuery({ queryKey: QUERY_KEY, queryFn: listarRequisiciones });
}

export function useCrearRequisicion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Requisicion, "id" | "folio" | "estado" | "creadoEn" | "actualizadoEn">) =>
      crearRequisicion(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useCambiarEstadoRequisicion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: EstadoRequisicion }) =>
      cambiarEstadoRequisicion(id, estado),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useAsignarGestorRequisicion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, gestor }: { id: string; gestor: { id: string; correo: string } | null }) =>
      asignarGestorRequisicion(id, gestor),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
