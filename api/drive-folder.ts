import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleAuth } from "google-auth-library";
import { createPublicKey, createVerify } from "node:crypto";

/**
 * Resuelve la carpeta de Drive donde vive un archivo (su `parents[0]`) — para backfill del link
 * de "ver todas las fotos" en entregables de fotografia subidos ANTES de que `carpetaFotosUrl`
 * existiera (ver RevisarEntregableDialog.tsx). Mismo patron de auth que drive-thumbnail.ts:
 * cuenta de servicio de solo lectura, sesion de AV Control obligatoria.
 *
 * Los helpers estan DUPLICADOS aqui, en drive-video.ts y en drive-thumbnail.ts (Vercel no
 * empaqueta imports relativos fuera de `api/` en runtime ESM). Si tocas uno, toca los demas.
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
  try {
    await verificarIdTokenFirebase(req);
  } catch (err) {
    const e = err as ErrorAuth;
    res.status(e.status ?? 401).json({ error: e.message });
    return;
  }

  const fileId = typeof req.query.id === "string" ? req.query.id : null;
  if (!fileId) {
    res.status(400).json({ error: "Falta el id del archivo." });
    return;
  }

  let token: string;
  try {
    token = await obtenerTokenServicio();
  } catch {
    res.status(500).json({ error: "No se pudo autenticar con Drive." });
    return;
  }

  let metaRes: Response;
  try {
    metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    res.status(502).json({ error: "No se pudo consultar Drive." });
    return;
  }

  if (!metaRes.ok) {
    res.status(metaRes.status).json({ error: "Drive no entrego los metadatos del archivo." });
    return;
  }

  const data = (await metaRes.json()) as { parents?: string[] };
  const carpetaId = data.parents?.[0];
  if (!carpetaId) {
    res.status(404).json({ error: "Este archivo no tiene carpeta (o no se pudo leer)." });
    return;
  }

  res.setHeader("Cache-Control", "private, max-age=3600");
  res.status(200).json({ carpetaId, carpetaUrl: `https://drive.google.com/drive/folders/${carpetaId}` });
}
