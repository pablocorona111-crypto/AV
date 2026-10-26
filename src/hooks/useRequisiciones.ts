import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { gestorTienePermiso } from "@/lib/roles";
import {
  asignarGestorRequisicion,
  cambiarEstadoRequisicion,
  crearRequisicion,
  listarRequisiciones,
  type AlcanceRequisiciones,
} from "@/services/requisicionesService";
import type { EstadoRequisicion, Requisicion } from "@/types";

const QUERY_KEY = ["requisiciones"];

/**
 * Sin `verRequisicionesDeOtros`, el gestor lee solo lo suyo (creado por el o asignado a el)
 * con queries acotadas por campo — requisito de las reglas de Firestore, ver
 * `listarRequisiciones`. El resto de roles sigue leyendo la coleccion completa igual que antes.
 */
export function useRequisiciones() {
  const { usuario } = useAuth();
  const alcance: AlcanceRequisiciones =
    usuario && !gestorTienePermiso(usuario, "verRequisicionesDeOtros") ? { uid: usuario.id } : null;

  return useQuery({
    // El alcance entra en la key: si el lider cambia el permiso, se refetchea solo.
    queryKey: [...QUERY_KEY, alcance?.uid ?? "todas"],
    queryFn: () => listarRequisiciones(alcance),
  });
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
