import type { GestorRequisicionesPermisos, Role, Usuario } from "@/types";

export type PermisoGestor = keyof Omit<GestorRequisicionesPermisos, "activo">;

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

/**
 * Los 9 sub-permisos del gestor de requisiciones SOLO limitan a quien tiene el permiso
 * delegado encendido (`gestorRequisiciones.activo`). Nadie mas se ve afectado:
 *
 * - superadmin / lider / aprobador departamental: acceso total, nunca se restringen
 *   (aunque alguien les encienda el flag de gestor).
 * - rol "community" sin mapa `gestorRequisiciones`: no hay configuracion granular que
 *   aplicar — se comporta como siempre (sin restricciones nuevas).
 * - usuario desconocido/aun sin cargar: no se aplica restriccion (evita ocultar datos o
 *   bloquear queries por un estado transitorio de carga).
 *
 * Devuelve `true` = "no hay restriccion que lo impida". Es intencional que el caso por
 * defecto sea permisivo para todos los demas roles, y restrictivo SOLO para el gestor
 * delegado: un permiso ausente en su mapa cuenta como denegado.
 *
 * Esto es autorizacion de UI. Lo que tiene valor de seguridad real esta ademas en
 * firestore.rules (crear en nombre de terceros, editar tras enviar, adjuntar, ver de otros).
 */
export function gestorTienePermiso(usuario: Usuario | null | undefined, permiso: PermisoGestor): boolean {
  if (!usuario) return true;
  if (usuario.rol === "superadmin" || puedeAprobarRequisiciones(usuario)) return true;
  const permisos = usuario.gestorRequisiciones;
  if (!permisos?.activo) return true;
  return permisos[permiso] === true;
}

/**
 * Determina si `useRequisiciones()` puede pedir la coleccion SIN filtro, o si tiene que acotar
 * la query por campo (ver `listarRequisiciones`/`AlcanceRequisiciones` en requisicionesService.ts).
 *
 * OJO: esto NO es lo mismo que `gestorTienePermiso` — esa funcion es permisiva por defecto
 * (para no bloquear UI a nadie que no sea gestor delegado), pero usarla para decidir el alcance
 * de la QUERY dejaba a solicitante/colaborador_audiovisual/community pidiendo la coleccion
 * entera sin filtro — Firestore evalua la regla de una query contra la FORMA de la query, y la
 * regla de lectura de esos roles depende de `resource.data` (su propio uid), asi que una query
 * sin `where` les rechaza el listado COMPLETO con permission-denied. Debe reflejar exactamente
 * las ramas de `allow read` en firestore.rules que NO dependen de `resource.data`.
 */
export function puedeVerTodasLasRequisiciones(usuario: Usuario | null): boolean {
  if (!usuario) return false;
  if (puedeAprobarRequisiciones(usuario)) return true;
  return Boolean(usuario.gestorRequisiciones?.activo && usuario.gestorRequisiciones.verRequisicionesDeOtros);
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

/** Solo quien produce video (colaborador, lider, superadmin) sube archivos. Community nunca sube. */
export function puedeSubirVideos(usuario: Usuario | null): boolean {
  if (!usuario) return false;
  return (
    usuario.rol === "superadmin" ||
    usuario.rol === "lider_audiovisual" ||
    usuario.rol === "colaborador_audiovisual"
  );
}

/**
 * Quien aprueba el VIDEO final (entregable) es la community (gestor de requisiciones) — es
 * quien lo publica despues, igual que ya pasa con `puedeAprobarGuion`. No es lo mismo que
 * aprobar la REQUISICION (esa es una etapa distinta, antes de producir, de lider/aprobador
 * departamental) — por eso NO comparte logica con `puedeAprobarRequisiciones`.
 */
export function puedeAprobarEntregables(usuario: Usuario | null): boolean {
  if (!usuario) return false;
  return usuario.rol === "superadmin" || esGestorRequisiciones(usuario);
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
 * Quien comenta/observa el dialogo de un guion — a proposito MAS estricto que
 * `puedeAprobarGuion()`: solo el rol "community" (y superadmin), nunca el permiso delegado de
 * "gestor de requisiciones" ni el redactor del guion. El colaborador que escribe el guion solo
 * lo manda a revision y ve si quedo aprobado — comentar sobre el dialogo es trabajo de community.
 */
export function puedeComentarGuion(usuario: Usuario | null): boolean {
  if (!usuario) return false;
  return usuario.rol === "superadmin" || usuario.rol === "community";
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
  "/rendimiento": ["superadmin", "lider_audiovisual"],
  "/estructura": ["superadmin", "lider_audiovisual"],
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
