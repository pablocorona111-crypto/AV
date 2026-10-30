import { addDoc, collection, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { siguienteFolio } from "@/lib/folio";
import {
  DEMO_COLABORADORES,
  DEMO_EQUIPO_AV,
  DEMO_SALIDAS,
  DEMO_USUARIOS,
} from "@/data/demoData";
import { demoEntregablesActuales } from "@/services/entregablesService";
import type {
  Colaborador,
  Entregable,
  EquipoAV,
  EstadoAutorizacionSalida,
  SalidaGrabacion,
  Usuario,
} from "@/types";

/** Una salida solo se resuelve hacia autorizada o rechazada — nunca "de vuelta a pendiente". */
export type DecisionSalida = Exclude<EstadoAutorizacionSalida, "pendiente">;

async function listar<T>(coleccion: string, demo: T[]): Promise<T[]> {
  // Copia: si se devuelve el mismo arreglo, react-query no detecta los cambios hechos en demo.
  if (!isFirebaseConfigured || !db) return [...demo];
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

/** Resuelve la autorizacion de una salida. Sin esto, toda salida creada se quedaba en
 * "Pendiente" para siempre: las reglas de Firestore ya lo permitian, pero no habia forma
 * de dispararlo desde la aplicacion. */
export async function autorizarSalida(id: string, estadoAutorizacion: DecisionSalida): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    demoSalidas = demoSalidas.map((s) => (s.id === id ? { ...s, estadoAutorizacion } : s));
    return;
  }
  await updateDoc(doc(db, "salidas", id), { estadoAutorizacion });
}

export const listarEntregables = () => listar<Entregable>("entregables", demoEntregablesActuales());
export const listarEquipoAV = () => listar<EquipoAV>("equipo_av", DEMO_EQUIPO_AV);
export const listarUsuarios = () => listar<Usuario>("usuarios", DEMO_USUARIOS);

let demoColaboradores: Colaborador[] = [...DEMO_COLABORADORES];

export const listarColaboradores = async (): Promise<Colaborador[]> => {
  if (!isFirebaseConfigured || !db) return [...demoColaboradores];
  const snap = await getDocs(collection(db, "colaboradores"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Colaborador);
};

/** No existia ninguna forma de dar de alta un colaborador — por eso la carga del equipo en
 * Inicio/Equipo se quedaba siempre en 0 en cuentas reales (la coleccion "colaboradores" nunca
 * se llenaba, a diferencia de modo demo que trae datos de muestra fijos). */
export async function crearColaborador(
  data: Omit<Colaborador, "id" | "tareasPendientes" | "cargaEstimada" | "cargaReal" | "proyectosAsignados">
): Promise<Colaborador> {
  const nuevo = { ...data, tareasPendientes: 0, cargaEstimada: 0, cargaReal: 0, proyectosAsignados: [] };
  if (!isFirebaseConfigured || !db) {
    const conId: Colaborador = { ...nuevo, id: `col-${Date.now()}` };
    demoColaboradores = [conId, ...demoColaboradores];
    return conId;
  }
  const ref = await addDoc(collection(db, "colaboradores"), nuevo);
  return { ...nuevo, id: ref.id };
}

export async function actualizarGestorRequisiciones(
  usuarioId: string,
  gestorRequisiciones: Usuario["gestorRequisiciones"]
) {
  if (!isFirebaseConfigured || !db) return;
  await updateDoc(doc(db, "usuarios", usuarioId), { gestorRequisiciones });
}

/** Especialidades/puesto que el lider asigna en Equipo. Cuenta real -> "usuarios" (lo que lee
 * todo el sistema); externo sin cuenta -> su doc en "colaboradores". */
export async function actualizarPerfilColaborador(
  colaborador: Pick<Colaborador, "id" | "tieneCuenta">,
  cambios: { especialidades: string[]; puesto: string }
) {
  if (!isFirebaseConfigured || !db) {
    // Objeto nuevo (no mutar el existente) para que react-query vea el cambio y re-renderice.
    if (colaborador.tieneCuenta) {
      const i = DEMO_USUARIOS.findIndex((u) => u.id === colaborador.id);
      if (i >= 0) DEMO_USUARIOS[i] = { ...DEMO_USUARIOS[i], ...cambios };
    } else {
      demoColaboradores = demoColaboradores.map((c) => (c.id === colaborador.id ? { ...c, ...cambios } : c));
    }
    return;
  }
  await updateDoc(doc(db, colaborador.tieneCuenta ? "usuarios" : "colaboradores", colaborador.id), cambios);
}

export async function actualizarRolUsuario(usuarioId: string, rol: Usuario["rol"]) {
  if (!isFirebaseConfigured || !db) return;
  await updateDoc(doc(db, "usuarios", usuarioId), { rol });
}
