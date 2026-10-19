import { addDoc, collection, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { siguienteFolio } from "@/lib/folio";
import {
  DEMO_COLABORADORES,
  DEMO_ENTREGABLES,
  DEMO_EQUIPO_AV,
  DEMO_SALIDAS,
  DEMO_USUARIOS,
} from "@/data/demoData";
import type { Colaborador, Entregable, EquipoAV, SalidaGrabacion, Usuario } from "@/types";

async function listar<T>(coleccion: string, demo: T[]): Promise<T[]> {
  if (!isFirebaseConfigured || !db) return demo;
  const snap = await getDocs(collection(db, coleccion));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

let demoSalidas: SalidaGrabacion[] = [...DEMO_SALIDAS];

export const listarSalidas = async () => {
  if (!isFirebaseConfigured || !db) {
    return [...demoSalidas].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  }
  const snap = await getDocs(collection(db, "salidas"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SalidaGrabacion);
};

function siguienteFolioSalida(): string {
  const nums = demoSalidas.map((s) => parseInt(s.folio.replace("SAL-", ""), 10)).filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 100;
  return `SAL-${max + 1}`;
}

export async function crearSalida(
  data: Omit<SalidaGrabacion, "id" | "folio" | "estadoAutorizacion" | "creadoEn">
): Promise<SalidaGrabacion> {
  if (!isFirebaseConfigured || !db) {
    const nueva: SalidaGrabacion = {
      ...data,
      id: `s-${Date.now()}`,
      folio: siguienteFolioSalida(),
      estadoAutorizacion: "pendiente",
      creadoEn: new Date().toISOString(),
    };
    demoSalidas = [nueva, ...demoSalidas];
    return nueva;
  }
  const folio = await siguienteFolio("salidas", "SAL", 101);
  const ref = await addDoc(collection(db, "salidas"), {
    ...data,
    folio,
    estadoAutorizacion: "pendiente",
    creadoEn: serverTimestamp(),
  });
  return { ...data, id: ref.id, folio, estadoAutorizacion: "pendiente", creadoEn: new Date().toISOString() };
}

export const listarEntregables = () => listar<Entregable>("entregables", DEMO_ENTREGABLES);
export const listarEquipoAV = () => listar<EquipoAV>("equipo_av", DEMO_EQUIPO_AV);
export const listarColaboradores = () => listar<Colaborador>("colaboradores", DEMO_COLABORADORES);
export const listarUsuarios = () => listar<Usuario>("usuarios", DEMO_USUARIOS);

export async function actualizarGestorRequisiciones(
  usuarioId: string,
  gestorRequisiciones: Usuario["gestorRequisiciones"]
) {
  if (!isFirebaseConfigured || !db) return;
  await updateDoc(doc(db, "usuarios", usuarioId), { gestorRequisiciones });
}

export async function actualizarRolUsuario(usuarioId: string, rol: Usuario["rol"]) {
  if (!isFirebaseConfigured || !db) return;
  await updateDoc(doc(db, "usuarios", usuarioId), { rol });
}
