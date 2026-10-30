import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  reauthenticateWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { clearIndexedDbPersistence, doc, getDoc, onSnapshot, setDoc, terminate, updateDoc } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";
import { DEMO_USUARIOS } from "@/data/demoData";
import { buscarInvitacionPorCorreo } from "@/services/invitacionesService";
import type { Usuario } from "@/types";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
// drive.file solo deja leer archivos que ESA cuenta subio. Para que cualquiera del equipo
// pueda ver videos subidos por otros (compartidos como "cualquiera con el link") hace
// falta este permiso de lectura mas amplio.
const DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
// Para el boton "Agregar a mi Google Calendar" en cada grabacion — crea el evento en el
// calendario personal de quien le dio click, no en uno compartido ni automatico.
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const DRIVE_TOKEN_KEY = "av-control:drive-token-v2";

interface AuthContextValue {
  usuario: Usuario | null;
  cargando: boolean;
  esModoDemo: boolean;
  /** Login con cualquier cuenta de Google. El acceso real lo da la invitacion por correo. En modo demo entra directo. */
  loginConGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  /** Solo disponible en modo demo — cambia el usuario activo para previsualizar roles. */
  cambiarUsuarioDemo: (usuarioId: string) => void;
  /** Token de acceso a Drive y Calendar (expira ~1h, mismo token para ambos scopes). null si hay que reconectar. */
  driveToken: string | null;
  /** Pide permiso de Drive + Calendar (si hace falta) y refresca el token. */
  conectarDrive: () => Promise<string | null>;
  /** Borra el token guardado (ej. tras un error 401/403 al subir) para forzar reconexion en el siguiente intento. */
  limpiarDriveToken: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_SESSION_KEY = "av-control:demo-usuario-id";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [driveToken, setDriveToken] = useState<string | null>(
    () => sessionStorage.getItem(DRIVE_TOKEN_KEY)
  );

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      const storedId = localStorage.getItem(DEMO_SESSION_KEY);
      const demoUser = DEMO_USUARIOS.find((u) => u.id === storedId) ?? DEMO_USUARIOS[0];
      setUsuario(demoUser);
      setCargando(false);
      return;
    }

    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (!firebaseUser || !db) {
        setUsuario(null);
        setCargando(false);
        return;
      }

      const ref = doc(db, "usuarios", firebaseUser.uid);
      const snap = await getDoc(ref);

      if (!snap.exists() && firebaseUser.email) {
        const invitacion = await buscarInvitacionPorCorreo(firebaseUser.email);
        if (invitacion) {
          await setDoc(ref, {
            nombre: invitacion.nombre || firebaseUser.displayName || firebaseUser.email,
            correo: firebaseUser.email,
            rol: invitacion.rol,
            activo: true,
            creadoEn: new Date().toISOString(),
            ...(firebaseUser.photoURL ? { avatarUrl: firebaseUser.photoURL } : {}),
            ...(invitacion.gestorRequisiciones ? { gestorRequisiciones: invitacion.gestorRequisiciones } : {}),
          });
        }
      } else if (snap.exists() && firebaseUser.photoURL && snap.data().avatarUrl !== firebaseUser.photoURL) {
        // Autocompleta la foto para cuentas creadas antes de que este campo existiera, o la
        // actualiza si cambio en Google — asi el avatar deja de ser solo las iniciales.
        await updateDoc(ref, { avatarUrl: firebaseUser.photoURL });
      }

      // Escucha en vivo: si un admin cambia el rol o permisos, se reflejan al instante sin recargar.
      unsubscribeDoc = onSnapshot(ref, (docSnap) => {
        setUsuario(docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as Usuario) : null);
        setCargando(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const loginConGoogle = async () => {
    if (!isFirebaseConfigured || !auth) {
      const demoUser = DEMO_USUARIOS[0];
      localStorage.setItem(DEMO_SESSION_KEY, demoUser.id);
      setUsuario(demoUser);
      return;
    }
    const provider = new GoogleAuthProvider();
    provider.addScope(DRIVE_SCOPE);
    provider.addScope(DRIVE_READONLY_SCOPE);
    provider.addScope(CALENDAR_SCOPE);
    const credential = await signInWithPopup(auth, provider);

    if (!db || !credential.user.email) return;
    const ref = doc(db, "usuarios", credential.user.uid);
    const snap = await getDoc(ref);
    const invitado = snap.exists() || (await buscarInvitacionPorCorreo(credential.user.email));
    if (!invitado) {
      await firebaseSignOut(auth);
      throw new Error("Este correo no tiene invitacion. Pide a un administrador que te agregue en Configuracion.");
    }

    const token = GoogleAuthProvider.credentialFromResult(credential)?.accessToken ?? null;
    if (token) {
      setDriveToken(token);
      sessionStorage.setItem(DRIVE_TOKEN_KEY, token);
    }
  };

  /** Si el token de Drive (y Calendar) expiro o nunca se pidio, reabre el permiso con un popup. */
  const conectarDrive = async (): Promise<string | null> => {
    if (!isFirebaseConfigured || !auth?.currentUser) return null;
    const provider = new GoogleAuthProvider();
    provider.addScope(DRIVE_SCOPE);
    provider.addScope(DRIVE_READONLY_SCOPE);
    provider.addScope(CALENDAR_SCOPE);
    const result = await reauthenticateWithPopup(auth.currentUser, provider);
    const token = GoogleAuthProvider.credentialFromResult(result)?.accessToken ?? null;
    setDriveToken(token);
    if (token) sessionStorage.setItem(DRIVE_TOKEN_KEY, token);
    return token;
  };

  const logout = async () => {
    setDriveToken(null);
    sessionStorage.removeItem(DRIVE_TOKEN_KEY);
    if (!isFirebaseConfigured || !auth) {
      localStorage.removeItem(DEMO_SESSION_KEY);
      setUsuario(null);
      return;
    }
    await firebaseSignOut(auth);
    // La cache persistente (IndexedDB) guardaba los datos del usuario anterior: en una compu
    // compartida, el siguiente alcanzaba a verlos. Se borra y se recarga limpio.
    if (db) {
      try {
        await terminate(db);
        await clearIndexedDbPersistence(db);
      } catch {
        // Otra pestaña abierta aun usa la cache: se limpiara cuando todas se cierren.
      }
      window.location.reload();
    }
  };

  const cambiarUsuarioDemo = (usuarioId: string) => {
    const demoUser = DEMO_USUARIOS.find((u) => u.id === usuarioId);
    if (!demoUser) return;
    localStorage.setItem(DEMO_SESSION_KEY, demoUser.id);
    setUsuario(demoUser);
  };

  // El token de Drive (~1h de vida) se guardaba pero nunca se limpiaba solo al vencer — un
  // upload fallaba con 401/403 y se quedaba ATORADO ahi para siempre, porque `driveToken ??
  // conectarDrive()` en los dialogos de subida nunca vuelve a pedir permiso mientras el token
  // siga presente (aunque ya este vencido). Esto lo borra para que el SIGUIENTE intento de
  // subir dispare la reconexion sola.
  const limpiarDriveToken = () => {
    setDriveToken(null);
    sessionStorage.removeItem(DRIVE_TOKEN_KEY);
  };

  const value = useMemo(
    () => ({
      usuario,
      cargando,
      esModoDemo: !isFirebaseConfigured,
      loginConGoogle,
      logout,
      cambiarUsuarioDemo,
      driveToken,
      conectarDrive,
      limpiarDriveToken,
    }),
    [usuario, cargando, driveToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
