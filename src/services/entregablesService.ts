import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { DEMO_ENTREGABLES } from "@/data/demoData";
import type { CategoriaContenido, Entregable, EstadoEntregable } from "@/types";

const COLECCION = "entregables";

let demoStore: Entregable[] = [...DEMO_ENTREGABLES];
const demoComentarios: Record<string, ComentarioEntregable[]> = {};

export interface ComentarioEntregable {
  id: string;
  autorId: string;
  autorNombre: string;
  texto: string;
  /** Marcador de tiempo en el video, ej. "0:45" — opcional. */
  momento?: string;
  creadoEn: string;
  /** El responsable ya subio una correccion desde que se dejo esta observacion — no significa
   * que el aprobador ya la revalido, solo que de su lado ya quedo atendida. Se marca solo al
   * subir material de nuevo (ver marcarComentariosCorregidos), nunca a mano. */
  corregido?: boolean;
}

/** Catalogosservice.listarEntregables() lee este mismo arreglo en modo demo — si no, lo creado
 * aqui (crearEntregable/crearEntregableHistorico) nunca aparecia en la lista (cada archivo tenia
 * su propia copia de DEMO_ENTREGABLES, desincronizadas). */
export function demoEntregablesActuales(): Entregable[] {
  return demoStore;
}

export async function crearEntregable(
  data: Omit<Entregable, "id" | "version" | "estado" | "creadoEn">
): Promise<Entregable> {
  const nuevo: Omit<Entregable, "id"> = {
    ...data,
    version: "v1",
    estado: "pendiente",
    creadoEn: new Date().toISOString(),
  };

  if (!isFirebaseConfigured || !db) {
    const conId: Entregable = { ...nuevo, id: `e-${Date.now()}` };
    demoStore = [conId, ...demoStore];
    return conId;
  }
  const ref = await addDoc(collection(db, COLECCION), { ...nuevo, creadoEn: serverTimestamp() });
  return { ...nuevo, id: ref.id };
}

export async function actualizarEntregable(id: string, cambios: Partial<Entregable>): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    demoStore = demoStore.map((e) => (e.id === id ? { ...e, ...cambios } : e));
    return;
  }
  await updateDoc(doc(db, COLECCION, id), cambios);
}

/** Asignar/cambiar el proyecto de un entregable ya creado — hace falta sobre todo para el
 * historico cargado masivo, que nace casi todo "Sin proyecto". `proyectoId` vacio lo deja sin
 * proyecto de nuevo (deleteField(), no basta con mandar undefined: la app ya usa
 * ignoreUndefinedProperties, que OMITE el campo en vez de borrarlo). */
export async function asignarProyectoEntregable(id: string, proyectoId: string | null): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    demoStore = demoStore.map((e) =>
      e.id === id ? { ...e, proyectoId: proyectoId ?? undefined } : e
    );
    return;
  }
  await updateDoc(doc(db, COLECCION, id), { proyectoId: proyectoId ?? deleteField() });
}

/** Vincula (o desvincula, con `null`) un guion ya aprobado a este entregable — para poder ver y
 * copiar el dialogo del guion directo desde el dialogo de revision del video, sin ir a buscarlo
 * a la pestaña de Guiones. */
export async function vincularGuionEntregable(id: string, guionId: string | null): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    demoStore = demoStore.map((e) => (e.id === id ? { ...e, guionId: guionId ?? undefined } : e));
    return;
  }
  await updateDoc(doc(db, COLECCION, id), { guionId: guionId ?? deleteField() });
}

/** Renombrar un entregable ya creado — hace falta sobre todo para el historico cargado masivo,
 * que a veces nacio con un nombre crudo del Sheet original en vez de un nombre bien puesto. */
export async function renombrarEntregable(id: string, nombre: string): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    demoStore = demoStore.map((e) => (e.id === id ? { ...e, nombre } : e));
    return;
  }
  await updateDoc(doc(db, COLECCION, id), { nombre });
}

/** Corregir la categoria de un entregable ya creado (ej. uno que nacio "Otros" porque todavia
 * no existia "Fotografia" como opcion, o se eligio mal) — solo superadmin, desde Archivos. */
export async function cambiarTipoEntregable(id: string, tipo: CategoriaContenido): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    demoStore = demoStore.map((e) => (e.id === id ? { ...e, tipo } : e));
    return;
  }
  await updateDoc(doc(db, COLECCION, id), { tipo });
}

/** Quita TODO el material cargado (video/diseño/galeria de fotos, principal y alterna) y
 * regresa el entregable a "pendiente" — no hay material, no tiene sentido que siga en
 * revision/aprobado/entregado. Solo borra la referencia en el sistema; el archivo real se queda
 * en Drive (no se toca desde aqui). Solo superadmin, desde Archivos. */
export async function eliminarMaterialEntregable(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    demoStore = demoStore.map((e) =>
      e.id === id
        ? {
            ...e,
            estado: "pendiente" as EstadoEntregable,
            urlRevision: undefined,
            urlFinal: undefined,
            urlRevisionAlt: undefined,
            urlFinalAlt: undefined,
            orientacionVideo: undefined,
            orientacionVideoAlt: undefined,
            fotos: undefined,
            aprobadorId: undefined,
            fechaAprobado: undefined,
            fechaEntregado: undefined,
            // Sin esto, enviarARevision() ve que ya existe fechaEnviado y no la actualiza: el
            // reenvio se cuenta como "a tiempo/tarde" contra la fecha del envio ORIGINAL, no la
            // real. Al quitar todo el material, el proximo envio debe contar como el primero.
            fechaEnviado: undefined,
          }
        : e
    );
    return;
  }
  await updateDoc(doc(db, COLECCION, id), {
    estado: "pendiente",
    urlRevision: deleteField(),
    urlFinal: deleteField(),
    urlRevisionAlt: deleteField(),
    urlFinalAlt: deleteField(),
    orientacionVideo: deleteField(),
    orientacionVideoAlt: deleteField(),
    fotos: deleteField(),
    aprobadorId: deleteField(),
    fechaAprobado: deleteField(),
    fechaEntregado: deleteField(),
    fechaEnviado: deleteField(),
  });
}

/** Borra el entregable COMPLETO (no solo su material) — incluye sus comentarios, Firestore no
 * los borra solo por borrar el documento padre. El archivo real en Drive no se toca (igual que
 * `eliminarMaterialEntregable`): esto es "ya no quiero este registro en el sistema", no "borra el
 * archivo". Solo superadmin/lider (ver firestore.rules) — usado desde Archivos y al borrar un
 * proyecto completo con sus entregables ligados (ver eliminarProyecto en proyectosService). */
export async function eliminarEntregable(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    demoStore = demoStore.filter((e) => e.id !== id);
    delete demoComentarios[id];
    return;
  }
  const comentariosSnap = await getDocs(collection(db, COLECCION, id, "comentarios"));
  const batch = writeBatch(db);
  comentariosSnap.docs.forEach((c) => batch.delete(c.ref));
  batch.delete(doc(db, COLECCION, id));
  await batch.commit();
}

/** Reasignar el responsable (quien sube el material) de un entregable ya creado — util sobre
 * todo para el historico cargado masivo, donde el responsable registrado a veces ni es una
 * cuenta real. Solo superadmin lo hace (ver firestore.rules). */
export async function reasignarResponsableEntregable(id: string, responsableId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    demoStore = demoStore.map((e) => (e.id === id ? { ...e, responsableId } : e));
    return;
  }
  await updateDoc(doc(db, COLECCION, id), { responsableId });
}

/**
 * Carga historica (superadmin) — para meter de una vez un video/trabajo que ya estaba
 * confirmado (de hace una semana, un mes, etc.) y que nunca se registro en el sistema. A
 * diferencia de crearEntregable(), que siempre nace "pendiente", este nace YA en el estado
 * final (aprobado o entregado) con la fecha real que el superadmin elija — no "hoy" — para que
 * el control/las graficas reflejen cuando de verdad paso.
 */
export async function crearEntregableHistorico(
  data: Omit<Entregable, "id" | "version" | "estado" | "creadoEn" | "urlFinal" | "aprobadorId" | "fechaAprobado" | "fechaEntregado">,
  opciones: { estadoFinal: "aprobado" | "entregado"; fecha: string; urlFinal: string; aprobadorId: string }
): Promise<Entregable> {
  const nuevo = await crearEntregable(data);
  const cambios: Partial<Entregable> = {
    estado: opciones.estadoFinal,
    urlFinal: opciones.urlFinal,
    aprobadorId: opciones.aprobadorId,
    fechaAprobado: opciones.fecha,
    // crearEntregable() siempre pone creadoEn = ahora — para carga historica eso es incorrecto:
    // donde sea que se agrupe/muestre por creadoEn (la dona de "Tipo de entregables" del mes,
    // "Actividad reciente") tiene que caer en la fecha real elegida, no en hoy.
    creadoEn: opciones.fecha,
    ...(opciones.estadoFinal === "entregado" ? { fechaEntregado: opciones.fecha } : {}),
  };
  await actualizarEntregable(nuevo.id, cambios);
  return { ...nuevo, ...cambios };
}

/** Envia a revision: guarda el link de Drive y mueve el estado. */
export async function enviarARevision(
  id: string,
  urlRevision: string,
  orientacionVideo?: "vertical" | "horizontal"
): Promise<void> {
  // Solo la PRIMERA subida fija fechaEnviado: si luego hay correcciones, la entrega original
  // sigue contando con su fecha (no se vuelve "tarde" por la revision de community).
  const yaEnviado =
    !isFirebaseConfigured || !db
      ? Boolean(demoStore.find((e) => e.id === id)?.fechaEnviado)
      : Boolean((await getDoc(doc(db, COLECCION, id))).data()?.fechaEnviado);
  await actualizarEntregable(id, {
    urlRevision,
    estado: "en_revision",
    ...(yaEnviado ? {} : { fechaEnviado: new Date().toISOString() }),
    ...(orientacionVideo ? { orientacionVideo } : {}),
  });
}

/** Para completar un historico ya aprobado/entregado al que nunca se le adjunto el archivo real
 * (ej. carga masiva sin link) — solo pone el material, sin tocar el estado ni mandarlo de vuelta
 * a revision (a diferencia de enviarARevision, pensado para el flujo normal de trabajo activo). */
export async function adjuntarMaterialHistorico(
  id: string,
  urlFinal: string,
  orientacionVideo?: "vertical" | "horizontal"
): Promise<void> {
  await actualizarEntregable(id, {
    urlFinal,
    ...(orientacionVideo ? { orientacionVideo } : {}),
  });
}

/** Agrega (o reemplaza) la version ALTERNA de un entregable — la misma pieza grabada tambien en
 * la otra orientacion (ej. "Saco" vertical Y horizontal), no un entregable nuevo. No toca
 * `estado`: la version principal ya paso (o esta pasando) por su propio flujo de revision: esta
 * es solo el archivo adicional. `comoHistorico` decide si va a `urlFinalAlt` (completar un
 * historico ya cerrado) o `urlRevisionAlt` (flujo normal, igual que enviarARevision). */
export async function agregarVersionAlterna(
  id: string,
  url: string,
  orientacionVideoAlt: "vertical" | "horizontal",
  comoHistorico: boolean
): Promise<void> {
  await actualizarEntregable(id, {
    orientacionVideoAlt,
    ...(comoHistorico ? { urlFinalAlt: url } : { urlRevisionAlt: url }),
  });
}

export async function aprobarEntregable(
  id: string,
  aprobadorId: string,
  urlFinal: string,
  urlFinalAlt?: string
): Promise<void> {
  await actualizarEntregable(id, {
    estado: "aprobado",
    aprobadorId,
    urlFinal,
    // Si tambien habia una version alterna pendiente de revision, se aprueba junto con la
    // principal — es la misma pieza, no tiene sentido un estado de aprobacion por separado.
    ...(urlFinalAlt ? { urlFinalAlt } : {}),
    fechaAprobado: new Date().toISOString(),
  });
}

export async function solicitarCorrecciones(id: string): Promise<void> {
  await actualizarEntregable(id, { estado: "correcciones" });
}

export async function marcarEntregado(id: string): Promise<void> {
  await actualizarEntregable(id, {
    estado: "entregado" as EstadoEntregable,
    fechaEntregado: new Date().toISOString(),
  });
}

/** Cambio directo de estado (solo superadmin, desde el selector de la columna Estado en
 * Archivos) — para corregir un entregable que quedo en el estado equivocado (ej. historico mal
 * etiquetado) sin tener que pasar por todo el flujo normal de revision/aprobacion. Si el nuevo
 * estado es aprobado/entregado y no tenia la fecha correspondiente, se pone ahora — mismo
 * criterio que aprobarEntregable()/marcarEntregado(), para que las graficas sigan contando bien. */
export async function cambiarEstadoEntregableDirecto(
  id: string,
  estado: EstadoEntregable,
  actual: Pick<Entregable, "fechaAprobado" | "fechaEntregado">
): Promise<void> {
  const cambios: Partial<Entregable> = { estado };
  if (estado === "aprobado" && !actual.fechaAprobado) cambios.fechaAprobado = new Date().toISOString();
  if (estado === "entregado" && !actual.fechaEntregado) cambios.fechaEntregado = new Date().toISOString();
  await actualizarEntregable(id, cambios);
}

/** Guarda la galeria completa de fotos (agregar, borrar o reordenar siempre reescribe el
 * arreglo entero — mas simple que updates incrementales y evita condiciones de carrera entre
 * dos fotos subiendo a la vez). `urlRevision`/`urlFinal` se actualizan para apuntar a la
 * PRIMERA foto como portada, igual que `enviarARevision`/`adjuntarMaterialHistorico` hacen con
 * un video — asi el resto del sistema (miniaturas, metricas de "tiene material") no necesita
 * saber que esto es una galeria. Mismo criterio que completandoHistorico en el dialogo: si el
 * entregable ya estaba cerrado (aprobado/entregado), no se reabre a revision al tocar la galeria. */
/** Backfill de `carpetaFotosUrl` para galerias subidas ANTES de que ese campo existiera — a
 * diferencia de `guardarFotos`, esto NO toca `fotos` ni `estado`: es solo completar un dato que
 * faltaba, no una subida nueva. Cualquiera que pueda ver el entregable puede completarlo (las
 * reglas de Firestore ya exigen ser gestor/responsable/superadmin para `update`). */
export async function actualizarCarpetaFotos(id: string, carpetaFotosUrl: string): Promise<void> {
  await actualizarEntregable(id, { carpetaFotosUrl });
}

/** Marca (o desmarca) fotos "para borrar" — un triage rapido antes de confirmar: no borra nada
 * todavia, solo guarda la lista de cuales se van a eliminar cuando alguien confirme con el
 * boton de borrado masivo (ver bloqueGaleriaFotos en RevisarEntregableDialog.tsx). */
export async function marcarFotosParaBorrar(id: string, fotosParaBorrar: string[]): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    demoStore = demoStore.map((e) => (e.id === id ? { ...e, fotosParaBorrar } : e));
    return;
  }
  await updateDoc(doc(db, COLECCION, id), {
    fotosParaBorrar: fotosParaBorrar.length > 0 ? fotosParaBorrar : deleteField(),
  });
}

export async function guardarFotos(
  id: string,
  fotos: string[],
  opciones: { comoHistorico: boolean; carpetaFotosUrl?: string }
): Promise<void> {
  const campoCover = opciones.comoHistorico ? "urlFinal" : "urlRevision";
  if (!isFirebaseConfigured || !db) {
    demoStore = demoStore.map((e) =>
      e.id === id
        ? {
            ...e,
            fotos,
            [campoCover]: fotos[0],
            ...(opciones.carpetaFotosUrl ? { carpetaFotosUrl: opciones.carpetaFotosUrl } : {}),
            ...(opciones.comoHistorico ? {} : { estado: "en_revision" as EstadoEntregable }),
          }
        : e
    );
    return;
  }
  await updateDoc(doc(db, COLECCION, id), {
    fotos,
    [campoCover]: fotos[0] ?? deleteField(),
    ...(opciones.carpetaFotosUrl ? { carpetaFotosUrl: opciones.carpetaFotosUrl } : {}),
    ...(opciones.comoHistorico ? {} : { estado: "en_revision" }),
  });
}

/** Deja marcar la orientacion a mano cuando no se detecto sola (ej. video viejo sin etiqueta). */
export async function etiquetarOrientacion(id: string, orientacionVideo: "vertical" | "horizontal"): Promise<void> {
  await actualizarEntregable(id, { orientacionVideo });
}

/** Misma correccion automatica que etiquetarOrientacion() pero para la version ALTERNA. */
export async function etiquetarOrientacionAlt(id: string, orientacionVideoAlt: "vertical" | "horizontal"): Promise<void> {
  await actualizarEntregable(id, { orientacionVideoAlt });
}

export async function listarComentarios(entregableId: string): Promise<ComentarioEntregable[]> {
  if (!isFirebaseConfigured || !db) {
    return demoComentarios[entregableId] ?? [];
  }
  const snap = await getDocs(
    query(collection(db, COLECCION, entregableId, "comentarios"), orderBy("creadoEn", "asc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ComentarioEntregable);
}

export async function agregarComentario(
  entregableId: string,
  data: { autorId: string; autorNombre: string; texto: string; momento?: string }
): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    const lista = demoComentarios[entregableId] ?? [];
    demoComentarios[entregableId] = [
      ...lista,
      { id: `c-${Date.now()}`, ...data, creadoEn: new Date().toISOString() },
    ];
    return;
  }
  await addDoc(collection(db, COLECCION, entregableId, "comentarios"), {
    ...data,
    creadoEn: serverTimestamp(),
  });
}

/** Marca TODAS las observaciones pendientes de un entregable como "corregido" — se llama sola
 * al subir material de nuevo (video, diseño o fotos), nunca a mano: el responsable no revisa
 * observacion por observacion, sube la correccion y de ahi se asume que ya atendio todo lo que
 * estaba pendiente hasta ese momento. El aprobador ve la etiqueta al revisar de nuevo. */
export async function marcarComentariosCorregidos(entregableId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    const lista = demoComentarios[entregableId] ?? [];
    demoComentarios[entregableId] = lista.map((c) => (c.corregido ? c : { ...c, corregido: true }));
    return;
  }
  const snap = await getDocs(collection(db, COLECCION, entregableId, "comentarios"));
  const pendientes = snap.docs.filter((d) => !d.data().corregido);
  if (pendientes.length === 0) return;
  const batch = writeBatch(db);
  pendientes.forEach((d) => batch.update(d.ref, { corregido: true }));
  await batch.commit();
}

/** Convierte un link normal de Google Drive a su variante embebible (iframe). */
export function driveUrlAPreview(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  return `https://drive.google.com/file/d/${match[1]}/preview`;
}
