import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleAuth, OAuth2Client } from "google-auth-library";
import { createPublicKey, createVerify } from "node:crypto";

/**
 * Manda un archivo (o carpeta) de Drive a la papelera — no borrado permanente, Drive la vacia
 * sola a los 30 dias, asi que si fue un error se puede recuperar desde la papelera de Drive
 * mientras tanto. Usa la cuenta central del dueño (mismo refresh token que
 * `drive-upload-session.ts`/`drive-share.ts` — ver ese archivo para el detalle completo del
 * setup). Si el archivo es de ANTES de centralizar (vive en el Drive personal de quien lo subio
 * entonces), la cuenta central solo tiene permiso de lector publico y esto falla con 403 — eso se
 * reporta tal cual, no hay forma de borrarlo sin acceso de edicion sobre el archivo original.
 *
 * Los helpers de auth estan DUPLICADOS aqui y en los demas `api/*.ts` (Vercel no empaqueta
 * imports relativos fuera de `api/` en runtime ESM). Si tocas uno, toca los demas.
 */

class ErrorAuth extends Error {
  constructor(readonly status: number, mensaje: string) {
    super(mensaje);
  }
}

const URL_CERTS_FIREBASE =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let certsCacheados: { certs: Record<string, string>; vence: number } | null = null;

async function obtenerCertsFirebase(): Promise<Record<string, string>> {
  if (certsCacheados && certsCacheados.vence > Date.now()) return certsCacheados.certs;
  let res: Response;
  try {
    res = await fetch(URL_CERTS_FIREBASE);
  } catch {
    throw new ErrorAuth(503, "No se pudieron leer las llaves publicas de Google.");
  }
  if (!res.ok) throw new ErrorAuth(503, "Google no entrego sus llaves publicas.");
  const certs = (await res.json()) as Record<string, string>;
  const maxAge = /max-age=(\d+)/.exec(res.headers.get("cache-control") ?? "");
  const segundos = maxAge ? Number(maxAge[1]) : 3600;
  certsCacheados = { certs, vence: Date.now() + segundos * 1000 };
  return certs;
}

function decodificarBase64Url(valor: string): Buffer {
  return Buffer.from(valor.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

async function verificarIdTokenFirebase(req: VercelRequest): Promise<string> {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new ErrorAuth(500, "Falta la variable FIREBASE_PROJECT_ID / VITE_FIREBASE_PROJECT_ID.");
  }

  const header = req.headers.authorization;
  const idToken =
    header && header.startsWith("Bearer ")
      ? header.slice(7)
      : typeof req.body?.token === "string"
        ? req.body.token
        : null;
  if (!idToken) throw new ErrorAuth(401, "Falta tu sesion de AV Control.");

  const partes = idToken.split(".");
  if (partes.length !== 3) throw new ErrorAuth(401, "Token de sesion mal formado.");
  const [cabecera, cuerpo, firma] = partes;

  let alg: unknown;
  let kid: unknown;
  let datos: { aud?: unknown; iss?: unknown; sub?: unknown; exp?: unknown; iat?: unknown };
  try {
    ({ alg, kid } = JSON.parse(decodificarBase64Url(cabecera).toString("utf8")));
    datos = JSON.parse(decodificarBase64Url(cuerpo).toString("utf8"));
  } catch {
    throw new ErrorAuth(401, "Token de sesion ilegible.");
  }

  if (alg !== "RS256") throw new ErrorAuth(401, "Firma del token con algoritmo no permitido.");
  if (typeof kid !== "string" || !kid) throw new ErrorAuth(401, "Token sin identificador de llave.");
  if (datos.aud !== projectId) throw new ErrorAuth(401, "El token es de otro proyecto.");
  if (datos.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new ErrorAuth(401, "Emisor del token invalido.");
  }
  if (typeof datos.sub !== "string" || !datos.sub) throw new ErrorAuth(401, "Token sin usuario.");

  const ahora = Math.floor(Date.now() / 1000);
  const HOLGURA = 60;
  if (typeof datos.exp !== "number" || datos.exp <= ahora - HOLGURA) {
    throw new ErrorAuth(401, "Tu sesion expiro. Recarga la pagina.");
  }
  if (typeof datos.iat !== "number" || datos.iat > ahora + HOLGURA) {
    throw new ErrorAuth(401, "Token emitido en el futuro.");
  }

  const certs = await obtenerCertsFirebase();
  const cert = certs[kid];
  if (!cert) throw new ErrorAuth(401, "La llave del token no esta entre las publicadas por Google.");

  let valida = false;
  try {
    const verificador = createVerify("RSA-SHA256");
    verificador.update(`${cabecera}.${cuerpo}`);
    verificador.end();
    valida = verificador.verify(createPublicKey(cert), decodificarBase64Url(firma));
  } catch {
    valida = false;
  }
  if (!valida) throw new ErrorAuth(401, "La firma del token no es valida.");

  return datos.sub;
}

let clienteCacheado: { token: string; vence: number } | null = null;

async function obtenerTokenPropietario(): Promise<string> {
  if (clienteCacheado && clienteCacheado.vence > Date.now() + 60_000) return clienteCacheado.token;

  const clientId = process.env.GOOGLE_DRIVE_OWNER_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_OWNER_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_OWNER_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Faltan GOOGLE_DRIVE_OWNER_CLIENT_ID / GOOGLE_DRIVE_OWNER_CLIENT_SECRET / GOOGLE_DRIVE_OWNER_REFRESH_TOKEN."
    );
  }

  const cliente = new OAuth2Client(clientId, clientSecret);
  cliente.setCredentials({ refresh_token: refreshToken });
  const { token } = await cliente.getAccessToken();
  if (!token) throw new Error("Google no entrego token para la cuenta del dueño.");

  clienteCacheado = { token, vence: Date.now() + 55 * 60 * 1000 };
  return token;
}

const ROLES_PUEDEN_SUBIR_MATERIAL = new Set(["superadmin", "lider_audiovisual", "colaborador_audiovisual"]);

let tokenFirestoreCacheado: { token: string; vence: number } | null = null;

async function obtenerTokenFirestore(): Promise<string> {
  if (tokenFirestoreCacheado && tokenFirestoreCacheado.vence > Date.now() + 60_000) return tokenFirestoreCacheado.token;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const clavePrivada = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  if (!email || !clavePrivada) {
    throw new Error("Faltan las variables GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.");
  }

  const auth = new GoogleAuth({
    credentials: { client_email: email, private_key: clavePrivada },
    scopes: ["https://www.googleapis.com/auth/datastore"],
  });
  const cliente = await auth.getClient();
  const { token } = await cliente.getAccessToken();
  if (!token) throw new Error("Google no entrego token para leer Firestore.");

  tokenFirestoreCacheado = { token, vence: Date.now() + 55 * 60 * 1000 };
  return token;
}

/**
 * El rol vive en Firestore (`usuarios/{uid}.rol`), no en el ID token — se lee por REST con la
 * cuenta de servicio (scope `datastore`), sin depender de `firebase-admin`. Antes este endpoint
 * solo exigia estar logueado: cualquier rol (hasta "solicitante") podia mandar a la papelera
 * CUALQUIER archivo de Drive con solo conocer su `fileId`. Mismo filtro que ya aplica el cliente
 * en `puedeSubirVideos` (`src/lib/roles.ts`), pero ahora tambien server-side.
 */
async function verificarRolAutorizado(uid: string): Promise<void> {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) throw new ErrorAuth(500, "Falta la variable FIREBASE_PROJECT_ID / VITE_FIREBASE_PROJECT_ID.");

  const token = await obtenerTokenFirestore();
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/usuarios/${uid}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new ErrorAuth(403, "No se pudo verificar tu rol.");
  const data = (await res.json()) as { fields?: { rol?: { stringValue?: string } } };
  const rol = data.fields?.rol?.stringValue;
  if (!rol || !ROLES_PUEDEN_SUBIR_MATERIAL.has(rol)) {
    throw new ErrorAuth(403, "Tu rol no tiene permiso para borrar material en Drive.");
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Metodo no permitido." });
    return;
  }

  try {
    const uid = await verificarIdTokenFirebase(req);
    await verificarRolAutorizado(uid);
  } catch (err) {
    const e = err as ErrorAuth;
    res.status(e.status ?? 401).json({ error: e.message });
    return;
  }

  const id = (req.body as { id?: string })?.id;
  if (!id) {
    res.status(400).json({ error: "Falta el id del archivo." });
    return;
  }

  let token: string;
  try {
    token = await obtenerTokenPropietario();
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "No se pudo autenticar con Drive." });
    return;
  }

  try {
    const trashRes = await fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ trashed: true }),
    });
    if (!trashRes.ok) {
      res.status(trashRes.status).json({
        error:
          trashRes.status === 403 || trashRes.status === 404
            ? "No se pudo borrar en Drive (es de antes de centralizar y la cuenta central no tiene permiso de edicion sobre ese archivo)."
            : "No se pudo borrar el archivo en Drive.",
      });
      return;
    }
    res.status(200).json({ ok: true });
  } catch {
    res.status(502).json({ error: "No se pudo hablar con Drive." });
  }
}
