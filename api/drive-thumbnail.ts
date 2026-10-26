import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleAuth } from "google-auth-library";
import { createPublicKey, createVerify } from "node:crypto";

/**
 * Igual que `drive-video.ts` pero para la miniatura: antes se pedia con el `driveToken` del
 * usuario logueado (`MiniaturaVideo.tsx` -> `obtenerMiniaturaDrive`), asi que si esa persona
 * nunca habia conectado su Drive, la card se quedaba en "Sin vista previa" para siempre aunque
 * el video si cargara. Con la cuenta de servicio, cualquiera ve la miniatura real sin conectar nada.
 *
 * Solo pide los metadatos (`thumbnailLink`) y redirige ahi — el link de miniatura de Drive ya
 * es publico una vez generado, no hace falta bajar y reenviar los bytes nosotros mismos.
 *
 * SEGURIDAD: igual que el video, este endpoint exige el ID token de Firebase del usuario
 * logueado en AV Control (query param `token`, porque un <img src> no manda headers). Sin eso,
 * la cuenta de servicio fija le entregaria la miniatura — y el link publico de Drive al que
 * redirige — a cualquiera que adivine un fileId.
 *
 * Los helpers estan DUPLICADOS aqui y en `drive-video.ts` — ver el comentario en ese archivo
 * (Vercel no empaqueta imports relativos fuera de `api/` en runtime ESM). Si tocas uno, toca el otro.
 */

class ErrorAuth extends Error {
  constructor(readonly status: number, mensaje: string) {
    super(mensaje);
  }
}

/** Llaves publicas con las que Google firma los ID token de Firebase (rotan ~cada dia). */
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
  // Google dice en `Cache-Control` cuanto duran — se respeta en vez de inventar un numero,
  // asi la rotacion de llaves nunca deja el cache con certificados ya retirados.
  const maxAge = /max-age=(\d+)/.exec(res.headers.get("cache-control") ?? "");
  const segundos = maxAge ? Number(maxAge[1]) : 3600;
  certsCacheados = { certs, vence: Date.now() + segundos * 1000 };
  return certs;
}

function decodificarBase64Url(valor: string): Buffer {
  return Buffer.from(valor.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/**
 * Verifica a mano el ID token de Firebase (firma RS256 contra las llaves publicas de Google
 * + aud/iss/exp), sin `firebase-admin`. Ver el comentario largo en `drive-video.ts`.
 */
async function verificarIdTokenFirebase(req: VercelRequest): Promise<string> {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new ErrorAuth(500, "Falta la variable FIREBASE_PROJECT_ID / VITE_FIREBASE_PROJECT_ID.");
  }

  const header = req.headers.authorization;
  const idToken =
    header && header.startsWith("Bearer ")
      ? header.slice(7)
      : typeof req.query.token === "string"
        ? req.query.token
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

  // `alg` se fija a RS256 a proposito: aceptar lo que diga el token dejaria pasar el clasico
  // ataque de "alg: none" (token sin firma) o una firma HMAC hecha con la llave publica.
  if (alg !== "RS256") throw new ErrorAuth(401, "Firma del token con algoritmo no permitido.");
  if (typeof kid !== "string" || !kid) throw new ErrorAuth(401, "Token sin identificador de llave.");
  if (datos.aud !== projectId) throw new ErrorAuth(401, "El token es de otro proyecto.");
  if (datos.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new ErrorAuth(401, "Emisor del token invalido.");
  }
  if (typeof datos.sub !== "string" || !datos.sub) throw new ErrorAuth(401, "Token sin usuario.");

  // 60s de holgura por si el reloj del servidor y el de Google no coinciden exacto.
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

let tokenCacheado: { token: string; vence: number } | null = null;

async function obtenerTokenServicio(): Promise<string> {
  if (tokenCacheado && tokenCacheado.vence > Date.now() + 60_000) return tokenCacheado.token;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const clavePrivada = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  if (!email || !clavePrivada) {
    throw new Error("Faltan las variables GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.");
  }

  const auth = new GoogleAuth({
    credentials: { client_email: email, private_key: clavePrivada },
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  const cliente = await auth.getClient();
  const { token } = await cliente.getAccessToken();
  if (!token) throw new Error("Google no entrego token para la cuenta de servicio.");

  tokenCacheado = { token, vence: Date.now() + 55 * 60 * 1000 };
  return token;
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Primero la sesion: sin usuario valido no se consulta Drive ni se revela el link de miniatura.
  try {
    await verificarIdTokenFirebase(req);
  } catch (err) {
    const e = err as ErrorAuth;
    // El <img> ignora el cuerpo, pero el JSON sirve para diagnosticar desde las herramientas.
    res.status(e.status ?? 401).json({ error: e.message });
    return;
  }

  const fileId = typeof req.query.id === "string" ? req.query.id : null;
  if (!fileId) {
    res.status(400).end();
    return;
  }

  let token: string;
  try {
    token = await obtenerTokenServicio();
  } catch {
    res.status(500).end();
    return;
  }

  let metaRes: Response;
  try {
    metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=thumbnailLink`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    res.status(502).end();
    return;
  }

  if (!metaRes.ok) {
    res.status(metaRes.status).end();
    return;
  }

  const data = (await metaRes.json()) as { thumbnailLink?: string };
  if (!data.thumbnailLink) {
    res.status(404).end();
    return;
  }

  // El link viene con un tamaño chico al final (ej. "=s220") — se cambia por uno mas grande.
  const miniaturaGrande = data.thumbnailLink.replace(/=s\d+$/, "=s400");
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.redirect(302, miniaturaGrande);
}
