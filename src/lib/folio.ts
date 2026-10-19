import { doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Folio secuencial via contador transaccional en `contadores/{nombre}`.
 * No usar getCountFromServer: las reglas de varias colecciones (ej. requisiciones)
 * dependen de resource.data, y Firestore bloquea aggregation queries en ese caso.
 */
export async function siguienteFolio(nombre: string, prefijo: string, inicio: number): Promise<string> {
  if (!db) throw new Error("Firebase no configurado");
  const ref = doc(db, "contadores", nombre);

  const numero = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const actual = snap.exists() ? (snap.data().siguiente as number) : inicio;
    tx.set(ref, { siguiente: actual + 1 }, { merge: true });
    return actual;
  });

  return `${prefijo}-${numero}`;
}
