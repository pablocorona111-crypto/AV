import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { puedeVerTodasLasRequisiciones } from "@/lib/roles";
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
 * Solo superadmin/lider/aprobador (o un gestor delegado con `verRequisicionesDeOtros`) piden la
 * coleccion sin filtro. Todos los demas — solicitante, colaborador_audiovisual, community, o un
 * gestor delegado sin ese permiso — leen con queries acotadas por campo (creado por el o
 * asignado a el), porque asi lo exige la regla de lectura de Firestore (ver `listarRequisiciones`
 * y `puedeVerTodasLasRequisiciones`). Antes esto se decidia con `gestorTienePermiso`, que es
 * permisivo por defecto para cualquiera que no sea gestor delegado — eso dejaba a solicitante/
 * colaborador/community pidiendo la coleccion entera sin filtro, y Firestore les rechazaba el
 * listado COMPLETO con permission-denied.
 */
export function useRequisiciones() {
  const { usuario } = useAuth();
  const alcance: AlcanceRequisiciones =
    usuario && !puedeVerTodasLasRequisiciones(usuario) ? { uid: usuario.id } : null;

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
