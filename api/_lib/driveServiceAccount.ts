import { GoogleAuth } from "google-auth-library";

/**
 * Token de acceso de Drive con la cuenta de servicio de Google (no con el OAuth del usuario
 * logueado). Lo usan `drive-video.ts` y `drive-thumbnail.ts` — asi no importa quien este
 * conectado ni si su sesion de Drive se vencio; mientras la carpeta este compartida con la
 * cuenta de servicio, el video y su miniatura siempre cargan.
 */

let tokenCacheado: { token: string; vence: number } | null = null;

export async function obtenerTokenServicio(): Promise<string> {
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

  // El token de una cuenta de servicio dura ~1h — se guarda en memoria del proceso serverless
  // (sobrevive entre invocaciones calientes) para no pedir uno nuevo en cada video/miniatura.
  tokenCacheado = { token, vence: Date.now() + 55 * 60 * 1000 };
  return token;
}
