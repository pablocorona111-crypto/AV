import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Paso UNICO de autorizacion para centralizar todas las subidas en el Drive PERSONAL de
 * pablocorona111@gmail.com — a diferencia de una cuenta @grupo-ortiz.com (Workspace), una cuenta
 * Gmail normal no se puede "impersonar" via domain-wide delegation (eso solo lo controla un
 * admin de Workspace sobre SU propio dominio). Para una cuenta personal la unica forma es que
 * pablocorona111 autorice el acceso el mismo, una vez, con `access_type=offline` — eso genera un
 * REFRESH TOKEN que no vence (hasta que se revoque a mano) y que el backend usa para siempre
 * despues, sin volver a pedir login a nadie.
 *
 * Visita este mismo endpoint sin parametros (logueado como pablocorona111@gmail.com): te manda
 * a la pantalla de Google para aceptar el permiso, y al volver te muestra el refresh token UNA
 * sola vez para que lo copies a Vercel (variable `GOOGLE_DRIVE_OWNER_REFRESH_TOKEN`). Nadie mas
 * necesita volver a entrar aqui despues de ese paso.
 *
 * Requiere `GOOGLE_DRIVE_OWNER_CLIENT_ID` / `GOOGLE_DRIVE_OWNER_CLIENT_SECRET` ya configuradas
 * (credenciales OAuth tipo "Web application" creadas en Google Cloud Console, con esta misma URL
 * como "Authorized redirect URI"). Ver `.env.example` para el detalle completo del setup.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const clientId = process.env.GOOGLE_DRIVE_OWNER_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_OWNER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res
      .status(500)
      .send("Faltan GOOGLE_DRIVE_OWNER_CLIENT_ID / GOOGLE_DRIVE_OWNER_CLIENT_SECRET en las variables de entorno.");
    return;
  }

  const protocolo = (req.headers["x-forwarded-proto"] as string) || "https";
  const redirectUri = `${protocolo}://${req.headers.host}/api/drive-authorize`;

  const code = typeof req.query.code === "string" ? req.query.code : null;

  if (!code) {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/drive",
      access_type: "offline",
      prompt: "consent",
    });
    res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
    return;
  }

  let tokenRes: Response;
  try {
    tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
  } catch {
    res.status(502).send("No se pudo hablar con Google para canjear el codigo.");
    return;
  }

  const data = (await tokenRes.json()) as { refresh_token?: string; error?: string; error_description?: string };
  if (!tokenRes.ok || !data.refresh_token) {
    res
      .status(400)
      .send(
        `Google no entrego un refresh token (${data.error ?? tokenRes.status}: ${
          data.error_description ?? "sin detalle"
        }). Si ya habias autorizado antes sin access_type=offline, revoca el acceso en https://myaccount.google.com/permissions e intenta de nuevo.`
      );
    return;
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Listo</title></head>
<body style="font-family:system-ui;max-width:640px;margin:40px auto;padding:0 16px;">
  <h2>Autorizacion lista</h2>
  <p>Copia este refresh token y guardalo en Vercel como <code>GOOGLE_DRIVE_OWNER_REFRESH_TOKEN</code>
  (Project Settings &gt; Environment Variables), luego vuelve a desplegar. Esta pantalla NO vuelve
  a mostrarlo — si lo pierdes, visita este link de nuevo.</p>
  <textarea readonly style="width:100%;height:80px;font-family:monospace;">${data.refresh_token}</textarea>
  <p style="color:#b91c1c;">No compartas este valor — quien lo tenga puede escribir en tu Drive.</p>
</body></html>`);
}
