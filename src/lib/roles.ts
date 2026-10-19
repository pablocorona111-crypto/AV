import type { Role, Usuario } from "@/types";

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Superadministrador",
  lider_audiovisual: "Lider Audiovisual",
  colaborador_audiovisual: "Colaborador Audiovisual",
  solicitante: "Solicitante",
  aprobador_departamental: "Aprobador Departamental",
  community: "Community",
};

/**
 * Autorizacion de UI — solo determina que se muestra.
 * La autorizacion real vive en Firestore Security Rules / Cloud Functions (ver SECURITY.md).
 * Nunca tratar estas funciones como control de acceso valido por si solas.
 *
 * "community" es un rol de verdad (no un permiso escondido sobre "solicitante").
 * Es quien envia requisiciones, ve todos los guiones/videos y los aprueba o pide cambios.
 */
export function esGestorRequisiciones(usuario: Usuario | null): boolean {
  if (!usuario) return false;
  return usuario.rol === "community" || Boolean(usuario.gestorRequisiciones?.activo);
}

export function puedeVerMetricasGlobales(usuario: Usuario | null): boolean {
  if (!usuario) return false;
  return usuario.rol === "superadmin" || usuario.rol === "lider_audiovisual";
}

export function puedeAprobarRequisiciones(usuario: Usuario | null): boolean {
  if (!usuario) return false;
  return (
    usuario.rol === "superadmin" ||
    usuario.rol === "lider_audiovisual" ||
    usuario.rol === "aprobador_departamental"
  );
}

export function puedeGestionarUsuarios(usuario: Usuario | null): boolean {
  if (!usuario) return false;
  return usuario.rol === "superadmin" || usuario.rol === "lider_audiovisual";
}

export function puedeCrearProyectos(usuario: Usuario | null): boolean {
  if (!usuario) return false;
  return usuario.rol === "superadmin" || usuario.rol === "lider_audiovisual";
}

/** Lider/superadmin asignan entregables a colaboradores. */
export function puedeAsignarEntregables(usuario: Usuario | null): boolean {
  if (!usuario) return false;
  return usuario.rol === "superadmin" || usuario.rol === "lider_audiovisual";
}

/** Mismos roles que aprueban requisiciones aprueban entregables. */
export function puedeAprobarEntregables(usuario: Usuario | null): boolean {
  return puedeAprobarRequisiciones(usuario);
}

/**
 * Solo la community (gestor de requisiciones) revisa y aprueba guiones.
 * El lider/superadmin crea y asigna el guion, pero no es quien lo aprueba
 * (excepto superadmin, que conserva acceso total sobre todo el sistema).
 */
export function puedeAprobarGuion(usuario: Usuario | null): boolean {
  if (!usuario) return false;
  return usuario.rol === "superadmin" || esGestorRequisiciones(usuario);
}

/**
 * Mapa unico de que rol ve que ruta. null = visible para cualquier rol autenticado.
 * Usado por el Sidebar (ocultar links) y por RutaProtegida (bloquear navegacion directa).
 */
export const RUTA_ROLES: Record<string, Role[] | null> = {
  "/": null,
  "/requisiciones": ["superadmin", "lider_audiovisual", "solicitante", "aprobador_departamental", "community"],
  "/proyectos": ["superadmin", "lider_audiovisual", "colaborador_audiovisual"],
  "/salidas": ["superadmin", "lider_audiovisual", "colaborador_audiovisual"],
  "/calendario": null,
  "/equipo": ["superadmin", "lider_audiovisual"],
  "/entregables": ["superadmin", "lider_audiovisual", "colaborador_audiovisual", "community"],
  "/metricas": ["superadmin", "lider_audiovisual"],
  "/archivos": null,
  "/reportes": ["superadmin", "lider_audiovisual"],
  "/configuracion": ["superadmin", "lider_audiovisual"],
};

/** El gestor de requisiciones (ej. community manager) siempre ve Entregables (su vista de aprobados). */
export function puedeVerRuta(usuario: Usuario | null, ruta: string): boolean {
  if (!usuario) return false;
  if (ruta === "/entregables" && esGestorRequisiciones(usuario)) return true;
  const roles = RUTA_ROLES[ruta];
  return roles === null ? true : roles.includes(usuario.rol);
}
