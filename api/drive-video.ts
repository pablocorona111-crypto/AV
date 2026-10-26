import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleAuth } from "google-auth-library";
import { createPublicKey, createVerify } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

/**
 * Sirve el video de Drive desde el propio dominio, con la cuenta de servicio de Google
 * (no con el token OAuth del usuario logueado). Asi no importa quien este conectado ni
 * si su sesion de Drive se vencio (pasaba cada ~1h con el reproductor anterior) — mientras
 * la carpeta de Drive este compartida con la cuenta de servicio, el video siempre carga.
 *
 * Reenvia el header `Range` que manda el <video> al buscar/saltar de posicion, y responde
 * 206 con `Content-Range` — sin esto el navegador no puede saltar a la mitad del video.
 *
 * SEGURIDAD: como la cuenta de servicio es fija, este endpoint le daria el video a CUALQUIERA
 * que adivine un fileId de Drive si no se pidiera sesion. Por eso cada peticion tiene que traer
 * el ID token de Firebase del usuario logueado en AV Control (ver `verificarIdTokenFirebase`).
 * Va como query param `token` porque un <video src>, un <img src> y un <a href> no pueden
 * mandar el header `Authorization` — igual se acepta el header si viene (fetch si puede).
 *
 * Los helpers (`obtenerTokenServicio`, `verificarIdTokenFirebase` y lo que usan) estan
 * DUPLICADOS aqui y en `drive-thumbnail.ts`, no importados de un archivo compartido: Vercel no
 * empaqueta imports relativos fuera de `api/` en runtime ESM ("type":"module" en package.json)
 * — probado, truena con ERR_MODULE_NOT_FOUND en produccion. Si tocas uno, toca el otro igual.
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
 * + aud/iss/exp), sin `firebase-admin`: el SDK admin pesa decenas de MB y castigaria el arranque
 * en frio de una funcion que transmite video, y ademas obligaria a que la cuenta de servicio
 * (hoy solo con scope de Drive readonly) tenga rol sobre el proyecto de Firebase. Esto solo
 * necesita `node:crypto` y el projectId, que es informacion publica.
 */
async function verificarIdTokenFirebase(req: VercelRequest): Promise<string> {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) {
    // Config del servidor, no culpa de quien pide: 500 para que se note y se pueda diagnosticar.
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
  // Primero la sesion: sin usuario valido no se gasta ni un token de la cuenta de servicio ni
  // se revela si un fileId existe o no.
  try {
    await verificarIdTokenFirebase(req);
  } catch (err) {
    const e = err as ErrorAuth;
    res.status(e.status ?? 401).json({ error: e.message });
    return;
  }

  const fileId = typeof req.query.id === "string" ? req.query.id : null;
  if (!fileId) {
    res.status(400).json({ error: "Falta el parametro id." });
    return;
  }

  let token: string;
  try {
    token = await obtenerTokenServicio();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
    return;
  }

  // Tope por tramo para la REPRODUCCION (no para "Descargar"): sin esto, un <video> que pide
  // "el resto del archivo" (Range abierto) obligaba a esta funcion a transmitir sin parar hasta
  // el final del video. 32MB + 60s de tiempo maximo (ver vercel.json, antes el default dejaba
  // esta funcion corta de tiempo bajo cualquier conexion lenta): con ese colchon, un tramo asi
  // siempre termina comodo, y como ahora caben tramos mas grandes, el navegador pide el
  // siguiente con MENOS frecuencia — menos "cortes" perceptibles entre pedazos al reproducir.
  const TRAMO_MAX = 32 * 1024 * 1024;
  const esDescarga = Boolean(req.query.download);
  const rangeCliente = req.headers.range;
  const headersDrive: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (esDescarga) {
    if (typeof rangeCliente === "string") headersDrive.Range = rangeCliente;
  } else {
    let inicio = 0;
    let finPedido: number | null = null;
    if (typeof rangeCliente === "string") {
      const m = /bytes=(\d+)-(\d+)?/.exec(rangeCliente);
      if (m) {
        inicio = Number(m[1]);
        if (m[2]) finPedido = Number(m[2]);
      }
    }
    const fin = finPedido !== null ? Math.min(finPedido, inicio + TRAMO_MAX - 1) : inicio + TRAMO_MAX - 1;
    headersDrive.Range = `bytes=${inicio}-${fin}`;
  }

  let driveRes: Response;
  try {
    driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: headersDrive,
    });
  } catch {
    res.status(502).json({ error: "No se pudo contactar a Google Drive." });
    return;
  }

  if (!driveRes.ok) {
    res.status(driveRes.status).json({ error: motivoError(driveRes.status) });
    return;
  }

  res.status(driveRes.status);
  for (const nombre of ["content-type", "content-length", "content-range", "accept-ranges"]) {
    const valor = driveRes.headers.get(nombre);
    if (valor) res.setHeader(nombre, valor);
  }
  // Se fuerza aunque Drive no lo mande: el navegador necesita saber que puede seguir pidiendo
  // tramos (Range) para no tratar esto como un archivo de una sola pieza.
  if (!esDescarga) res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "private, max-age=3600");

  // Boton "Descargar" de la community (RevisarEntregableDialog.tsx) — con esto el navegador
  // guarda el archivo en vez de intentar reproducirlo inline, sin salir de la app ni pasar por Drive.
  if (req.query.download) {
    const nombreArchivo =
      typeof req.query.nombre === "string" && req.query.nombre.trim()
        ? req.query.nombre.replace(/["\r\n]/g, "")
        : fileId;
    res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo}"`);
  }

  // HEAD es solo para diagnostico (ver `diagnosticarProxyDrive` en DriveVideoPlayer.tsx) — no
  // tiene sentido bajar el archivo completo nada mas para confirmar que si hay acceso.
  if (req.method === "HEAD" || !driveRes.body) {
    res.end();
    return;
  }
  // Antes: loop manual leyendo de a un pedazo (`reader.read()`) y escribiendolo con `res.write()`
  // esperando "drain" a mano. Eso funciona, pero cada vuelta del loop paga el costo de dos
  // promesas (leer + quizas esperar drain) en el event loop de Node — con un stream que entrega
  // muchos pedazos chiquitos (asi llegan los streams HTTP por abajo), eso suma overhead de JS que
  // le resta a la velocidad real de entrega. `pipeline()` es la plomeria nativa de Node para esto:
  // conecta los dos streams a nivel mas bajo, maneja el backpressure el solo (sin pasar cada
  // pedazo por nuestro propio codigo) y si Drive corta a medio stream, cierra todo limpio en vez
  // de dejar la respuesta colgada a medias (que el loop manual anterior no manejaba).
  try {
    await pipeline(Readable.fromWeb(driveRes.body as import("node:stream/web").ReadableStream), res);
  } catch {
    // La conexion con quien pide el video ya se corto (cerro la pestaña, cambio de pagina a
    // medio cargar) — no hay a quien avisarle del error, solo evitar que truene sin capturar.
  }
}

function motivoError(status: number): string {
  if (status === 403) return "La cuenta de servicio no tiene acceso a este archivo. Comparte la carpeta de Drive con ella.";
  if (status === 404) return "El archivo no existe en Drive (fue borrado o movido).";
  if (status === 401) return "Las credenciales de la cuenta de servicio son invalidas.";
  return "No se pudo obtener el video de Drive.";
}

export const config = {
  api: { bodyParser: false, responseLimit: false },
};
