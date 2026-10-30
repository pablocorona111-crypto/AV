import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { collection, onSnapshot } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import {
  actualizarGestorRequisiciones,
  actualizarPerfilColaborador,
  actualizarRolUsuario,
  autorizarSalida,
  crearColaborador,
  crearSalida,
  listarColaboradores,
  listarEntregables,
  listarEquipoAV,
  listarSalidas,
  listarUsuarios,
  type DecisionSalida,
} from "@/services/catalogosService";
import { crearInvitacion } from "@/services/invitacionesService";
import type { Colaborador, Entregable, Invitacion, SalidaGrabacion, Usuario } from "@/types";

/**
 * Un solo onSnapshot por coleccion para TODA la app, con conteo de referencias. Antes cada
 * componente que llamaba useEntregables()/useUsuarios() (paginas, cada dialogo abierto...) abria
 * su PROPIO listener a la coleccion completa: N lecturas de Firestore y N re-renders por cada
 * cambio. Ahora el primero que se monta abre el listener y el ultimo que se desmonta lo cierra.
 */
const suscripcionesEnVivo = new Map<string, { usuarios: number; cerrar: () => void }>();

function useColeccionEnVivo<T>(nombre: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;
    const actual = suscripcionesEnVivo.get(nombre);
    if (actual) {
      actual.usuarios++;
    } else {
      suscripcionesEnVivo.set(nombre, { usuarios: 1, cerrar: abrirListener<T>(qc, nombre) });
    }
    return () => {
      const s = suscripcionesEnVivo.get(nombre);
      if (!s) return;
      if (--s.usuarios === 0) {
        s.cerrar();
        suscripcionesEnVivo.delete(nombre);
      }
    };
  }, [qc, nombre]);
}

function abrirListener<T>(qc: QueryClient, nombre: string) {
  return onSnapshot(collection(db!, nombre), (snap) => {
    qc.setQueryData([nombre], snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T));
  });
}

export const useSalidas = () => useQuery({ queryKey: ["salidas"], queryFn: listarSalidas });

export function useCrearSalida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<SalidaGrabacion, "id" | "folio" | "estadoAutorizacion" | "creadoEn">) =>
      crearSalida(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["salidas"] }),
  });
}

export function useAutorizarSalida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estadoAutorizacion }: { id: string; estadoAutorizacion: DecisionSalida }) =>
      autorizarSalida(id, estadoAutorizacion),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["salidas"] }),
  });
}
/**
 * En vivo (onSnapshot) por la misma razon que useUsuarios(): subir/corregir/aprobar un video
 * pasa en la sesion de quien lo hace, no en la de quien esta viendo el Dashboard en ese momento
 * — con un fetch normal, Inicio se quedaba con numeros viejos hasta refrescar la pagina.
 */
export function useEntregables() {
  useColeccionEnVivo<Entregable>("entregables");
  return useQuery({ queryKey: ["entregables"], queryFn: listarEntregables });
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
  useColeccionEnVivo<Usuario>("usuarios");
  return useQuery({ queryKey: ["usuarios"], queryFn: listarUsuarios });
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

export function useActualizarPerfilColaborador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ colaborador, cambios }: { colaborador: Colaborador; cambios: { especialidades: string[]; puesto: string } }) =>
      actualizarPerfilColaborador(colaborador, cambios),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      qc.invalidateQueries({ queryKey: ["colaboradores"] });
    },
  });
}

export function useActualizarRolUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rol }: { id: string; rol: Usuario["rol"] }) => actualizarRolUsuario(id, rol),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}
