import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, onSnapshot } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
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
import type { Colaborador, Entregable, Invitacion, SalidaGrabacion, Usuario } from "@/types";

export const useSalidas = () => useQuery({ queryKey: ["salidas"], queryFn: listarSalidas });

export function useCrearSalida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<SalidaGrabacion, "id" | "folio" | "estadoAutorizacion" | "creadoEn">) =>
      crearSalida(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["salidas"] }),
  });
}
/**
 * En vivo (onSnapshot) por la misma razon que useUsuarios(): subir/corregir/aprobar un video
 * pasa en la sesion de quien lo hace, no en la de quien esta viendo el Dashboard en ese momento
 * — con un fetch normal, Inicio se quedaba con numeros viejos hasta refrescar la pagina.
 */
export function useEntregables() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["entregables"], queryFn: listarEntregables });

  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;
    const unsubscribe = onSnapshot(collection(db, "entregables"), (snap) => {
      const entregables = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Entregable);
      qc.setQueryData(["entregables"], entregables);
    });
    return unsubscribe;
  }, [qc]);

  return query;
}
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
/**
 * En vivo (onSnapshot), no solo al montar — cuando alguien invitado inicia sesion por primera
 * vez, su doc en "usuarios" se crea en ESE momento (AuthContext.tsx) en la sesion de ESA
 * persona, no en la del admin. Con un fetch normal (`listarUsuarios`/getDocs) el admin se
 * quedaba viendo la lista vieja hasta refrescar o que venciera el staleTime — por eso un
 * colaborador recien invitado "no salia solo" en Equipo/Inicio. El onSnapshot empuja el cambio
 * al cache de react-query al instante, sin que nadie tenga que hacer nada manual.
 */
export function useUsuarios() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["usuarios"], queryFn: listarUsuarios });

  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;
    const unsubscribe = onSnapshot(collection(db, "usuarios"), (snap) => {
      const usuarios = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Usuario);
      qc.setQueryData(["usuarios"], usuarios);
    });
    return unsubscribe;
  }, [qc]);

  return query;
}

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
