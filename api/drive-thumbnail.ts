import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleAuth } from "google-auth-library";

/**
 * Igual que `drive-video.ts` pero para la miniatura: antes se pedia con el `driveToken` del
 * usuario logueado (`MiniaturaVideo.tsx` -> `obtenerMiniaturaDrive`), asi que si esa persona
 * nunca habia conectado su Drive, la card se quedaba en "Sin vista previa" para siempre aunque
 * el video si cargara. Con la cuenta de servicio, cualquiera ve la miniatura real sin conectar nada.
 *
 * Solo pide los metadatos (`thumbnailLink`) y redirige ahi — el link de miniatura de Drive ya
 * es publico una vez generado, no hace falta bajar y reenviar los bytes nosotros mismos.
 *
 * El helper de token esta duplicado aqui y en `drive-video.ts` — ver el comentario en ese
 * archivo (Vercel no empaqueta imports relativos fuera de `api/` en runtime ESM).
 */

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
