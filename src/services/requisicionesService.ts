import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { siguienteFolio as siguienteFolioReal } from "@/lib/folio";
import { DEMO_REQUISICIONES } from "@/data/demoData";
import type { EstadoRequisicion, Requisicion } from "@/types";

const COLECCION = "requisiciones";

/** En modo demo opera sobre un arreglo en memoria — se reinicia al recargar la pagina. */
let demoStore: Requisicion[] = [...DEMO_REQUISICIONES];

export async function listarRequisiciones(): Promise<Requisicion[]> {
  if (!isFirebaseConfigured || !db) {
    return [...demoStore].sort((a, b) => (a.creadoEn < b.creadoEn ? 1 : -1));
  }
  const snap = await getDocs(query(collection(db, COLECCION), orderBy("creadoEn", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Requisicion);
}

function siguienteFolio(): string {
  const nums = demoStore.map((r) => parseInt(r.folio.replace("AV-", ""), 10)).filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 1000;
  return `AV-${max + 1}`;
}

export async function crearRequisicion(
  data: Omit<Requisicion, "id" | "folio" | "estado" | "creadoEn" | "actualizadoEn">
): Promise<Requisicion> {
  const ahora = new Date().toISOString();

  if (!isFirebaseConfigured || !db) {
    const nueva: Requisicion = {
      ...data,
      id: `r-${Date.now()}`,
      folio: siguienteFolio(),
      estado: "enviada",
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    demoStore = [nueva, ...demoStore];
    return nueva;
  }

  const folio = await siguienteFolioReal("requisiciones", "AV", 1001);

  const ref = await addDoc(collection(db, COLECCION), {
    ...data,
    folio,
    estado: "enviada" as EstadoRequisicion,
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  });
  return { ...data, id: ref.id, folio, estado: "enviada", creadoEn: ahora, actualizadoEn: ahora };
}

export async function cambiarEstadoRequisicion(
  id: string,
  estado: EstadoRequisicion
): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    demoStore = demoStore.map((r) =>
      r.id === id
        ? {
            ...r,
            estado,
            actualizadoEn: new Date().toISOString(),
            ...(estado === "aprobada" ? { aprobadoEn: new Date().toISOString() } : {}),
          }
        : r
    );
    return;
  }
  await updateDoc(doc(db, COLECCION, id), {
    estado,
    actualizadoEn: serverTimestamp(),
  });
}

/** Solo el lider audiovisual asigna/retira al gestor de requisiciones de una solicitud (ver SECURITY.md). */
export async function asignarGestorRequisicion(
  id: string,
  gestor: { id: string; correo: string } | null
): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    demoStore = demoStore.map((r) =>
      r.id === id
        ? {
            ...r,
            responsableVentaId: gestor?.id,
            responsableVentaCorreo: gestor?.correo,
            actualizadoEn: new Date().toISOString(),
          }
        : r
    );
    return;
  }
  await updateDoc(doc(db, COLECCION, id), {
    responsableVentaId: gestor?.id ?? null,
    responsableVentaCorreo: gestor?.correo ?? null,
    actualizadoEn: serverTimestamp(),
  });
}
