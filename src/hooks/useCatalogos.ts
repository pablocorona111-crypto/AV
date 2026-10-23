import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  actualizarGestorRequisiciones,
  actualizarRolUsuario,
  crearColaborador,
  crearSalida,
  listarColaboradores,
  listarEntregables,
  listarEquipoAV,
  listarSalidas,
  listarUsuarios,
} from "@/services/catalogosService";
import { crearInvitacion } from "@/services/invitacionesService";
import type { Colaborador, Invitacion, SalidaGrabacion, Usuario } from "@/types";

export const useSalidas = () => useQuery({ queryKey: ["salidas"], queryFn: listarSalidas });

export function useCrearSalida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<SalidaGrabacion, "id" | "folio" | "estadoAutorizacion" | "creadoEn">) =>
      crearSalida(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["salidas"] }),
  });
}
export const useEntregables = () => useQuery({ queryKey: ["entregables"], queryFn: listarEntregables });
export const useEquipoAV = () => useQuery({ queryKey: ["equipo_av"], queryFn: listarEquipoAV });
export const useColaboradores = () => useQuery({ queryKey: ["colaboradores"], queryFn: listarColaboradores });

export function useCrearColaborador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      data: Omit<Colaborador, "id" | "tareasPendientes" | "cargaEstimada" | "cargaReal" | "proyectosAsignados">
    ) => crearColaborador(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["colaboradores"] }),
  });
}
export const useUsuarios = () => useQuery({ queryKey: ["usuarios"], queryFn: listarUsuarios });

export function useInvitarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Invitacion, "creadoEn">) => crearInvitacion(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}

export function useActualizarGestorRequisiciones() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, gestorRequisiciones }: { id: string; gestorRequisiciones: Usuario["gestorRequisiciones"] }) =>
      actualizarGestorRequisiciones(id, gestorRequisiciones),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}

export function useActualizarRolUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rol }: { id: string; rol: Usuario["rol"] }) => actualizarRolUsuario(id, rol),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}
