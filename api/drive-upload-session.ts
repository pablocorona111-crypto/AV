import type { VercelRequest, VercelResponse } from "@vercel/node";
import { OAuth2Client } from "google-auth-library";
import { createPublicKey, createVerify } from "node:crypto";

/**
 * Centraliza TODAS las subidas en el Drive PERSONAL de pablocorona111@gmail.com, en vez de la
 * cuenta de quien este logueado en ese momento — antes cada quien subia con SU PROPIO permiso de
 * Drive (pedido via Firebase al conectar), asi que el material de la empresa quedaba repartido en
 * el Drive personal de cada colaborador que subiera algo.
 *
 * Como es una cuenta Gmail normal (no Workspace), no aplica domain-wide delegation — se usa un
 * REFRESH TOKEN que pablocorona111 genero UNA sola vez autorizando el acceso (ver
 * `api/drive-authorize.ts`). Ese token no vence solo; el backend lo cambia por un access token
 * nuevo cada vez que hace falta. Requiere `GOOGLE_DRIVE_OWNER_CLIENT_ID`,
 * `GOOGLE_DRIVE_OWNER_CLIENT_SECRET` y `GOOGLE_DRIVE_OWNER_REFRESH_TOKEN` configuradas — sin eso
 * esto falla con un error claro, no es un bug de este codigo, es el setup pendiente.
 *
 * Flujo completo (ver tambien `src/services/driveService.ts` -> `subirArchivoCentralizado`):
 * este endpoint resuelve/crea la carpeta destino y abre una SESION de subida reanudable
 * (`uploadType=resumable`) con la cuenta del dueño. El NAVEGADOR sube los bytes del archivo
 * DIRECTO a esa URL (PUT) — un video grande nunca pasa por esta funcion serverless (evita el
 * limite de tamaño de body de Vercel) y de todos modos el archivo queda en la cuenta central, no
 * en la de quien subio.
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

let clienteCacheado: { token: string; vence: number } | null = null;

async function obtenerTokenPropietario(): Promise<string> {
  if (clienteCacheado && clienteCacheado.vence > Date.now() + 60_000) return clienteCacheado.token;

  const clientId = process.env.GOOGLE_DRIVE_OWNER_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_OWNER_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_OWNER_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Faltan GOOGLE_DRIVE_OWNER_CLIENT_ID / GOOGLE_DRIVE_OWNER_CLIENT_SECRET / GOOGLE_DRIVE_OWNER_REFRESH_TOKEN. Corre /api/drive-authorize primero."
    );
  }

  const cliente = new OAuth2Client(clientId, clientSecret);
  cliente.setCredentials({ refresh_token: refreshToken });
  const { token } = await cliente.getAccessToken();
  if (!token) throw new Error("Google no entrego token para la cuenta del dueño.");

  clienteCacheado = { token, vence: Date.now() + 55 * 60 * 1000 };
  return token;
}

const CARPETA_RAIZ = "AV Control";

async function buscarCarpeta(nombre: string, token: string, parentId: string | null): Promise<string | null> {
  const escapado = nombre.replace(/'/g, "\\'");
  const condiciones = [
    `name='${escapado}'`,
    "mimeType='application/vnd.google-apps.folder'",
    "trashed=false",
    parentId ? `'${parentId}' in parents` : "'root' in parents",
  ];
  const q = encodeURIComponent(condiciones.join(" and "));
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`No se pudo buscar la carpeta "${nombre}" (${res.status}).`);
  const data = (await res.json()) as { files?: { id: string }[] };
  return data.files?.[0]?.id ?? null;
}

async function crearCarpeta(nombre: string, token: string, parentId: string | null): Promise<string> {
  const res = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: nombre,
      mimeType: "application/vnd.google-apps.folder",
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  });
  if (!res.ok) throw new Error(`No se pudo crear la carpeta "${nombre}" (${res.status}).`);
  const data = (await res.json()) as { id: string };
  return data.id;
}

async function obtenerOCrearCarpeta(nombre: string, token: string, parentId: string | null = null): Promise<string> {
  const existente = await buscarCarpeta(nombre, token, parentId);
  if (existente) return existente;
  return crearCarpeta(nombre, token, parentId);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Metodo no permitido." });
    return;
  }

  try {
    await verificarIdTokenFirebase(req);
  } catch (err) {
    const e = err as ErrorAuth;
    res.status(e.status ?? 401).json({ error: e.message });
    return;
  }

  const body = req.body as {
    nombre?: string;
    nombreCarpeta?: string;
    subcarpeta?: string;
    carpetaIdDestino?: string;
    fileIdExistente?: string;
  };
  if (!body?.nombre) {
    res.status(400).json({ error: "Falta el nombre del archivo." });
    return;
  }

  let token: string;
  try {
    token = await obtenerTokenPropietario();
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "No se pudo autenticar con la cuenta central de Drive.",
    });
    return;
  }

  try {
    // Reemplazar contenido de un archivo YA existente: sesion reanudable con PATCH, sin tocar
    // carpeta (el archivo ya vive donde vive).
    if (body.fileIdExistente) {
      const sesionRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${body.fileIdExistente}?uploadType=resumable&fields=id`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" },
          body: JSON.stringify({ name: body.nombre }),
        }
      );
      if (!sesionRes.ok) {
        res.status(sesionRes.status).json({ error: "No se pudo abrir la sesion de subida (reemplazo)." });
        return;
      }
      const sessionUrl = sesionRes.headers.get("location");
      if (!sessionUrl) {
        res.status(502).json({ error: "Drive no entrego la URL de sesion." });
        return;
      }
      res.status(200).json({ sessionUrl, carpetaId: null });
      return;
    }

    let carpetaId = body.carpetaIdDestino ?? null;
    if (!carpetaId) {
      const raizId = await obtenerOCrearCarpeta(CARPETA_RAIZ, token);
      const carpetaProyectoId = await obtenerOCrearCarpeta(body.nombreCarpeta || "Sin proyecto", token, raizId);
      carpetaId = body.subcarpeta
        ? await obtenerOCrearCarpeta(body.subcarpeta, token, carpetaProyectoId)
        : carpetaProyectoId;
    }

    const sesionRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ name: body.nombre, parents: [carpetaId] }),
    });
    if (!sesionRes.ok) {
      res.status(sesionRes.status).json({ error: "No se pudo abrir la sesion de subida." });
      return;
    }
    const sessionUrl = sesionRes.headers.get("location");
    if (!sessionUrl) {
      res.status(502).json({ error: "Drive no entrego la URL de sesion." });
      return;
    }
    res.status(200).json({ sessionUrl, carpetaId });
  } catch {
    res.status(502).json({ error: "No se pudo hablar con Drive." });
  }
}
