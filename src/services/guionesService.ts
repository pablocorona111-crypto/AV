import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { siguienteFolio } from "@/lib/folio";
import type { Guion } from "@/types";

const COLECCION = "guiones";

let demoStore: Guion[] = [];
const demoComentarios: Record<string, ComentarioGuion[]> = {};

export interface ComentarioGuion {
  id: string;
  autorId: string;
  autorNombre: string;
  texto: string;
  creadoEn: string;
}

export async function listarGuiones(): Promise<Guion[]> {
  if (!isFirebaseConfigured || !db) {
    return [...demoStore].sort((a, b) => (a.creadoEn < b.creadoEn ? 1 : -1));
  }
  const snap = await getDocs(query(collection(db, COLECCION), orderBy("creadoEn", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Guion);
}

export async function crearGuion(
  data: Omit<Guion, "id" | "folio" | "estado" | "creadoEn">
): Promise<Guion> {
  if (!isFirebaseConfigured || !db) {
    const nuevo: Guion = {
      ...data,
      id: `g-${Date.now()}`,
      folio: `GN-${101 + demoStore.length}`,
      estado: "borrador",
      creadoEn: new Date().toISOString(),
    };
    demoStore = [nuevo, ...demoStore];
    return nuevo;
  }

  const folio = await siguienteFolio("guiones", "GN", 101);
  const nuevo = {
    ...data,
    folio,
    estado: "borrador" as const,
    creadoEn: new Date().toISOString(),
  };
  const ref = await addDoc(collection(db, COLECCION), { ...nuevo, creadoEn: serverTimestamp() });
  return { ...nuevo, id: ref.id };
}

async function actualizarGuion(id: string, cambios: Partial<Guion>): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    demoStore = demoStore.map((g) => (g.id === id ? { ...g, ...cambios } : g));
    return;
  }
  await updateDoc(doc(db, COLECCION, id), cambios);
}

export const enviarGuionARevision = (id: string) => actualizarGuion(id, { estado: "en_revision" });
export const aprobarGuion = (id: string, aprobadorId: string) =>
  actualizarGuion(id, { estado: "aprobado", aprobadorId });
export const solicitarCorreccionesGuion = (id: string) => actualizarGuion(id, { estado: "correcciones" });

export async function listarComentariosGuion(guionId: string): Promise<ComentarioGuion[]> {
  if (!isFirebaseConfigured || !db) return demoComentarios[guionId] ?? [];
  const snap = await getDocs(query(collection(db, COLECCION, guionId, "comentarios"), orderBy("creadoEn", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ComentarioGuion);
}

export async function agregarComentarioGuion(
  guionId: string,
  data: { autorId: string; autorNombre: string; texto: string }
): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    const lista = demoComentarios[guionId] ?? [];
    demoComentarios[guionId] = [...lista, { id: `c-${Date.now()}`, ...data, creadoEn: new Date().toISOString() }];
    return;
  }
  await addDoc(collection(db, COLECCION, guionId, "comentarios"), { ...data, creadoEn: serverTimestamp() });
}
