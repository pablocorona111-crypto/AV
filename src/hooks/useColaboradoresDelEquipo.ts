import { useColaboradores, useUsuarios } from "@/hooks/useCatalogos";
import { ROLE_LABELS } from "@/lib/roles";
import type { Colaborador } from "@/types";

function normalizar(s: string) {
  return s.trim().toLowerCase();
}

/**
 * El equipo humano debe detectarse SOLO con el rol de la cuenta (colaborador_audiovisual /
 * lider_audiovisual) — no depender de que alguien lo de de alta a mano en la coleccion aparte
 * "colaboradores" (esa solo trae carga de trabajo/disponibilidad, info que las cuentas no
 * tienen). Aqui se fusionan: cada usuario con ese rol sale siempre, enriquecido con su carga
 * de trabajo si ya existe un registro para el (por nombre); si no, con valores por defecto.
 * Tambien se incluyen registros de la coleccion aparte que no correspondan a ninguna cuenta —
 * para freelancers/externos sin login que el lider haya dado de alta a mano.
 */
export function useColaboradoresDelEquipo(): { data: Colaborador[]; isLoading: boolean } {
  const { data: usuarios = [], isLoading: cargandoUsuarios } = useUsuarios();
  const { data: colaboradores = [], isLoading: cargandoColaboradores } = useColaboradores();

  const deUsuarios: Colaborador[] = usuarios
    .filter((u) => u.rol === "colaborador_audiovisual" || u.rol === "lider_audiovisual")
    .map((u) => {
      const extra = colaboradores.find((c) => normalizar(c.nombre) === normalizar(u.nombre));
      return {
        id: u.id,
        nombre: u.nombre,
        puesto: extra?.puesto || ROLE_LABELS[u.rol],
        especialidades: extra?.especialidades ?? [],
        disponibilidad: extra?.disponibilidad ?? "disponible",
        proyectosAsignados: extra?.proyectosAsignados ?? [],
        tareasPendientes: extra?.tareasPendientes ?? 0,
        cargaEstimada: extra?.cargaEstimada ?? 0,
        cargaReal: extra?.cargaReal ?? 0,
      };
    });

  const soloEnRoster = colaboradores.filter(
    (c) => !usuarios.some((u) => normalizar(u.nombre) === normalizar(c.nombre))
  );

  return {
    data: [...deUsuarios, ...soloEnRoster],
    isLoading: cargandoUsuarios || cargandoColaboradores,
  };
}
