import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { siguienteFolio } from "@/lib/folio";
import { DEMO_PROYECTOS } from "@/data/demoData";
import type { Proyecto } from "@/types";

const COLECCION = "proyectos";

let demoStore: Proyecto[] = [...DEMO_PROYECTOS];

export async function listarProyectos(): Promise<Proyecto[]> {
  if (!isFirebaseConfigured || !db) {
    return [...demoStore].sort((a, b) => (a.creadoEn < b.creadoEn ? 1 : -1));
  }
  const snap = await getDocs(query(collection(db, COLECCION), orderBy("creadoEn", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Proyecto);
}

function siguienteFolioDemo(): string {
  const nums = demoStore.map((p) => parseInt(p.folio.replace("PRY-", ""), 10)).filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 100;
  return `PRY-${max + 1}`;
}

export async function crearProyecto(
  data: Omit<Proyecto, "id" | "folio" | "etapaActual" | "porcentajeAvance" | "creadoEn" | "actualizadoEn">
): Promise<Proyecto> {
  const ahora = new Date().toISOString();

  if (!isFirebaseConfigured || !db) {
    const nuevo: Proyecto = {
      ...data,
      id: `p-${Date.now()}`,
      folio: siguienteFolioDemo(),
      etapaActual: "planeacion",
      porcentajeAvance: 0,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    demoStore = [nuevo, ...demoStore];
    return nuevo;
  }

  const folio = await siguienteFolio("proyectos", "PRY", 101);
  const nuevo = {
    ...data,
    folio,
    etapaActual: "planeacion" as const,
    porcentajeAvance: 0,
    creadoEn: ahora,
    actualizadoEn: ahora,
  };

  const ref = await addDoc(collection(db, COLECCION), { ...nuevo, creadoEn: serverTimestamp() });
  return { ...nuevo, id: ref.id };
}

/** Corregir etapa/avance de un proyecto directo (solo superadmin) — hace falta sobre todo para
 * un proyecto creado nada mas para agrupar videos historicos ya entregados: nace siempre en
 * "planeacion" 0% (crearProyecto no deja elegir otra cosa) y no habia forma de corregirlo despues. */
export async function actualizarProyecto(id: string, cambios: Partial<Proyecto>): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    demoStore = demoStore.map((p) => (p.id === id ? { ...p, ...cambios } : p));
    return;
  }
  await updateDoc(doc(db, COLECCION, id), { ...cambios, actualizadoEn: new Date().toISOString() });
}

export async function eliminarProyecto(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    demoStore = demoStore.filter((p) => p.id !== id);
    return;
  }
  await deleteDoc(doc(db, COLECCION, id));
}
