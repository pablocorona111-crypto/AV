import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Invitacion } from "@/types";

function normalizarCorreo(correo: string) {
  return correo.trim().toLowerCase();
}

export async function crearInvitacion(data: Omit<Invitacion, "creadoEn"> & { creadoEn?: string }) {
  if (!db) throw new Error("Firebase no configurado");
  const correo = normalizarCorreo(data.correo);
  await setDoc(doc(db, "invitaciones", correo), {
    ...data,
    correo,
    creadoEn: new Date().toISOString(),
  });
}

export async function buscarInvitacionPorCorreo(correo: string): Promise<Invitacion | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, "invitaciones", normalizarCorreo(correo)));
  return snap.exists() ? (snap.data() as Invitacion) : null;
}

export async function eliminarInvitacion(correo: string) {
  if (!db) return;
  await deleteDoc(doc(db, "invitaciones", normalizarCorreo(correo)));
}
