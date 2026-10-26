import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { siguienteFolio as siguienteFolioReal } from "@/lib/folio";
import { DEMO_REQUISICIONES } from "@/data/demoData";
import type { EstadoRequisicion, Requisicion } from "@/types";

const COLECCION = "requisiciones";

/** En modo demo opera sobre un arreglo en memoria — se reinicia al recargar la pagina. */
let demoStore: Requisicion[] = [...DEMO_REQUISICIONES];

const masNuevaPrimero = (a: Requisicion, b: Requisicion) => (a.creadoEn < b.creadoEn ? 1 : -1);

/**
 * Alcance de lectura cuando el gestor NO tiene `verRequisicionesDeOtros`.
 *
 * Firestore evalua las reglas de una QUERY de coleccion contra la FORMA de la query (sus
 * `where`), no documento por documento: si la regla depende de `resource.data.campo == uid`
 * y la query no trae ese `where`, rechaza la query COMPLETA con permission-denied (no
 * filtra en silencio). Por eso aqui se piden dos queries acotadas — una por cada rama de
 * `allow read` que aplica al gestor — en vez de una sola sin filtro.
 *
 * No se usa un unico `or()` porque cada rama necesita ser probable por separado contra la
 * regla; dos queries acotadas y un merge local es el camino seguro.
 */
export type AlcanceRequisiciones = { uid: string } | null;

export async function listarRequisiciones(alcance: AlcanceRequisiciones = null): Promise<Requisicion[]> {
  if (!isFirebaseConfigured || !db) {
    const visibles = alcance
      ? demoStore.filter((r) => r.solicitanteId === alcance.uid || r.responsableVentaId === alcance.uid)
      : demoStore;
    return [...visibles].sort(masNuevaPrimero);
  }

  const coleccion = collection(db, COLECCION);

  if (!alcance) {
    const snap = await getDocs(query(coleccion, orderBy("creadoEn", "desc")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Requisicion);
  }

  const [propias, asignadas] = await Promise.all([
    getDocs(query(coleccion, where("solicitanteId", "==", alcance.uid), orderBy("creadoEn", "desc"))),
    getDocs(query(coleccion, where("responsableVentaId", "==", alcance.uid), orderBy("creadoEn", "desc"))),
  ]);

  // Una requisicion creada por el gestor y asignada a el mismo cae en las dos queries.
  const porId = new Map<string, Requisicion>();
  [...propias.docs, ...asignadas.docs].forEach((d) => {
    porId.set(d.id, { id: d.id, ...d.data() } as Requisicion);
  });
  return [...porId.values()].sort(masNuevaPrimero);
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
