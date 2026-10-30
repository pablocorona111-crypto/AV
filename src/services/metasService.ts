import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import type { MetaColaborador } from "@/types";

const COLECCION = "metas";

/** Metas de ejemplo del equipo demo (Luis, Mariana, Valeria + la lider). */
// Metas sugeridas para un equipo de 3 + lider (ver la explicacion en la pestaña): ritmo exigente
// pero alcanzable, dejando ~20% del tiempo para salidas, correcciones y urgentes.
let demoStore: MetaColaborador[] = [
  {
    id: "u-ana",
    responsabilidad:
      "Planea y revisa al equipo; edita videos, modifica las páginas web y sale a grabar cuando se puede.",
    metasSemanales: { videos: 1, web: 1 },
    proyectosACargo: ["p-m6"],
  },
  {
    id: "u-luis",
    responsabilidad: "Edición de reels y videos corporativos/de producto; apoya en salidas a grabar.",
    metasSemanales: { videos: 4 },
    proyectosACargo: ["p-m1", "p-m2"],
  },
  {
    id: "u-mariana",
    responsabilidad: "Fotografía de producto, industrial y eventos (sesión = 20–40 fotos editadas). Apoya en grabación.",
    metasSemanales: { fotografia: 3 },
    proyectosACargo: ["p-m3", "p-m8"],
  },
  {
    id: "u-valeria",
    responsabilidad: "Página web, levantamiento de contenido y diseño de piezas para redes.",
    metasSemanales: { web: 2, diseno: 2 },
    proyectosACargo: ["p-m6", "p-m7"],
  },
];

export async function listarMetas(): Promise<MetaColaborador[]> {
  if (!isFirebaseConfigured || !db) return [...demoStore];
  const snap = await getDocs(collection(db, COLECCION));
  return snap.docs.map((d) => ({ ...(d.data() as Omit<MetaColaborador, "id">), id: d.id }));
}

/** Crea o reemplaza la meta de una persona (doc id = id del usuario). */
export async function guardarMeta(meta: MetaColaborador): Promise<void> {
  const conFecha = { ...meta, actualizadoEn: new Date().toISOString() };
  if (!isFirebaseConfigured || !db) {
    demoStore = [...demoStore.filter((m) => m.id !== meta.id), conFecha];
    return;
  }
  const { id, ...datos } = conFecha;
  await setDoc(doc(db, COLECCION, id), datos);
}
