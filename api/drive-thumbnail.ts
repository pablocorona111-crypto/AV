import type { VercelRequest, VercelResponse } from "@vercel/node";
import { obtenerTokenServicio } from "./_lib/driveServiceAccount";

/**
 * Igual que `drive-video.ts` pero para la miniatura: antes se pedia con el `driveToken` del
 * usuario logueado (`MiniaturaVideo.tsx` -> `obtenerMiniaturaDrive`), asi que si esa persona
 * nunca habia conectado su Drive, la card se quedaba en "Sin vista previa" para siempre aunque
 * el video si cargara. Con la cuenta de servicio, cualquiera ve la miniatura real sin conectar nada.
 *
 * Solo pide los metadatos (`thumbnailLink`) y redirige ahi — el link de miniatura de Drive ya
 * es publico una vez generado, no hace falta bajar y reenviar los bytes nosotros mismos.
 */
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
