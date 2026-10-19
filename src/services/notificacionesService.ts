import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import type { Notificacion } from "@/types";

const COLECCION = "notificaciones";

export async function crearNotificacion(data: Omit<Notificacion, "id" | "leida" | "creadoEn">): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  await addDoc(collection(db, COLECCION), { ...data, leida: false, creadoEn: serverTimestamp() });
}

export async function marcarNotificacionLeida(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  await updateDoc(doc(db, COLECCION, id), { leida: true });
}

/** Escucha en vivo las notificaciones de un usuario. Devuelve la funcion para cancelar. */
export function escucharNotificaciones(
  usuarioId: string,
  onCambio: (notificaciones: Notificacion[]) => void
): () => void {
  if (!isFirebaseConfigured || !db) return () => {};
  const q = query(collection(db, COLECCION), where("paraUsuarioId", "==", usuarioId), orderBy("creadoEn", "desc"));
  return onSnapshot(q, (snap) => {
    onCambio(snap.docs.slice(0, 30).map((d) => ({ id: d.id, ...d.data() }) as Notificacion));
  });
}
