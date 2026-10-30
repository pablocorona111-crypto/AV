import { collection, getDocs, writeBatch, type DocumentData, type QueryDocumentSnapshot } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";

/**
 * Boton de superadmin "vaciar toda la info" (Configuracion) — deja la app como recien
 * instalada. A proposito NO toca `usuarios` ni `contadores`/`audit_log`: borrar `usuarios`
 * dejaria a todo el equipo (incluido quien ejecuta esto) sin acceso en el siguiente refresh,
 * ya que `AuthContext` resuelve el rol leyendo ese documento.
 */
const COLECCIONES_A_VACIAR = [
  "requisiciones",
  "proyectos",
  "entregables",
  "guiones",
  "salidas",
  "notificaciones",
  "equipo_av",
  "colaboradores",
  "invitaciones",
  "metas",
];

// entregables y guiones tienen una subcoleccion "comentarios" por documento — Firestore no
// borra subcolecciones solo porque se borro el doc padre, hay que ir por ellas aparte.
const SUBCOLECCIONES: Record<string, string[]> = {
  entregables: ["comentarios"],
  guiones: ["comentarios"],
};

const TAMANO_LOTE = 450; // limite real de Firestore es 500 operaciones por batch

async function borrarColeccion(ruta: string): Promise<QueryDocumentSnapshot<DocumentData>[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, ruta));
  for (let i = 0; i < snap.docs.length; i += TAMANO_LOTE) {
    const lote = writeBatch(db);
    for (const d of snap.docs.slice(i, i + TAMANO_LOTE)) lote.delete(d.ref);
    await lote.commit();
  }
  return snap.docs;
}

export async function vaciarTodaLaInfo(): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    throw new Error("Esto solo aplica con Firebase real conectado (no en modo demo).");
  }
  for (const nombre of COLECCIONES_A_VACIAR) {
    const docsBorrados = await borrarColeccion(nombre);
    const subcolecciones = SUBCOLECCIONES[nombre];
    if (!subcolecciones) continue;
    for (const doc of docsBorrados) {
      for (const sub of subcolecciones) {
        await borrarColeccion(`${nombre}/${doc.id}/${sub}`);
      }
    }
  }
}
