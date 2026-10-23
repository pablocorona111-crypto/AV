import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { initializeFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const config: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** Sin API key real no hay proyecto Firebase configurado — la app corre en modo demo. */
export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId);

export const firebaseApp = isFirebaseConfigured ? initializeApp(config) : null;

export const auth = firebaseApp ? getAuth(firebaseApp) : null;
// ignoreUndefinedProperties: los formularios mandan campos opcionales (direccion, transporte,
// observaciones...) como `undefined` cuando se dejan en blanco — Firestore por defecto RECHAZA
// ese valor y tira la escritura completa (sin esto, "Nueva salida" y cualquier form con un campo
// opcional vacio fallaba en silencio: el catch no existia y nada avisaba al usuario).
export const db = firebaseApp ? initializeFirestore(firebaseApp, { ignoreUndefinedProperties: true }) : null;
export const storage = firebaseApp ? getStorage(firebaseApp) : null;

if (firebaseApp && import.meta.env.VITE_USE_EMULATORS === "true") {
  if (auth) connectAuthEmulator(auth, "http://localhost:9099");
  if (db) connectFirestoreEmulator(db, "localhost", 8080);
  if (storage) connectStorageEmulator(storage, "localhost", 9199);
}
