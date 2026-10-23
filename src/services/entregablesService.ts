import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { DEMO_ENTREGABLES } from "@/data/demoData";
import type { Entregable, EstadoEntregable } from "@/types";

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
  await actualizarEntregable(id, {
    urlRevision,
    estado: "en_revision",
    ...(orientacionVideo ? { orientacionVideo } : {}),
  });
}

export async function aprobarEntregable(id: string, aprobadorId: string, urlFinal: string): Promise<void> {
  await actualizarEntregable(id, {
    estado: "aprobado",
    aprobadorId,
    urlFinal,
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

/** Deja marcar la orientacion a mano cuando no se detecto sola (ej. video viejo sin etiqueta). */
export async function etiquetarOrientacion(id: string, orientacionVideo: "vertical" | "horizontal"): Promise<void> {
  await actualizarEntregable(id, { orientacionVideo });
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

/** Convierte un link normal de Google Drive a su variante embebible (iframe). */
export function driveUrlAPreview(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  return `https://drive.google.com/file/d/${match[1]}/preview`;
}
