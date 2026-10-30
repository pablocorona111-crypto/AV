import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Clock, Loader2 } from "lucide-react";
import { useIdToken } from "@/hooks/useIdToken";
import { cn } from "@/lib/utils";

export type MotivoErrorDrive = "sin_acceso" | "no_encontrado" | "desconocido";

/** Lo que el padre puede pedirle al reproductor desde afuera — ej. saltar al minuto exacto de
 * una observacion al tocarla (ver RevisarEntregableDialog.tsx). */
export interface DriveVideoPlayerHandle {
  seekTo: (segundos: number) => void;
}

/**
 * El <video> del navegador solo avisa "fallo" sin decir por que (403 sin acceso, 404 borrado,
 * credenciales invalidas...) — antes de rendirse se le pregunta al propio proxy (`/api/drive-video`,
 * ver ese archivo) el motivo real, leyendo el JSON de error que si expone el status HTTP.
 *
 * Aqui si se puede mandar el token por header (es un fetch, no un tag HTML), pero el 401 por
 * sesion vencida tambien se contempla: se trata como "sin_acceso" para que el mensaje al usuario
 * hable de permisos y no de un error generico.
 */
async function diagnosticarProxyDrive(fileId: string, idToken: string | null): Promise<MotivoErrorDrive> {
  try {
    const res = await fetch(`/api/drive-video?id=${encodeURIComponent(fileId)}`, {
      method: "HEAD",
      headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined,
    });
    if (res.status === 401 || res.status === 403) return "sin_acceso";
    if (res.status === 404) return "no_encontrado";
    return "desconocido";
  } catch {
    return "desconocido";
  }
}

export function formatoTiempo(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Como se dimensiona el escenario del video (aqui estuvieron varios bugs: "se ve chueco",
 * "no se ve nada", "se desajusta en otra pantalla").
 *
 * Version anterior: calculaba el ancho de la columna con una formula de `vh` que ADIVINABA
 * cuanto alto ocupaban el titulo/subtitulo/barras del reproductor (un numero fijo restado).
 * En una pantalla distinta (mas angosta, con el titulo envolviendo a 2 lineas, con otra fuente
 * del sistema) ese numero quedaba mal y el video se desbordaba o se encogia de mas.
 *
 * Version actual: ya no se adivina nada.
 * - En pantallas grandes (`lg:` — la fila de video+observaciones queda lado a lado con
 *   `items-stretch` en RevisarEntregableDialog.tsx), el ESCENARIO mide su alto al 100% de esa
 *   fila (una medida real, resuelta por el navegador con el espacio que de verdad sobra) y de
 *   ahi deriva su ancho con `aspect-ratio`. `max-width:100%` es solo un techo de seguridad.
 * - En pantallas angostas (video y observaciones apilados), no hay una fila con alto definido
 *   para heredar — ahi se mide al reves: ancho 100% (de columna apilada) con alto derivado,
 *   topado a `60vh` para no tapar toda la pantalla.
 * - `min-height` evita que la caja colapse a 0 en cualquier caso raro.
 * - El <video> usa `h-full w-full object-cover` mas `scale-[1.03]` (3% de "overscan"): Chrome
 *   puede renderizar una linea de 1px en un borde cuando un <video> esta en un contenedor con
 *   `overflow-hidden` + esquinas redondeadas (bug de compositing conocido). El 3% extra empuja
 *   ese borde fuera del area visible recortada, sin notarse como zoom.
 * - `origin-bottom`: sin esto, el escalado crece parejo hacia los 4 lados desde el centro — el
 *   borde DE ABAJO (donde el navegador dibuja los controles nativos: play, tiempo, volumen,
 *   pantalla completa) se empuja hacia afuera igual que los demas y el `overflow-hidden` del
 *   contenedor recorta un pedazo de esa barra ("se ve cortado debajo"). Con el origen del escalado
 *   anclado abajo, el borde inferior NO se mueve — los controles quedan completos — y el 3% de
 *   overscan se va todo hacia arriba/lados, donde no hay nada que se note cortado.
 */
const ESCENARIO_BASE =
  "relative flex items-center justify-center overflow-hidden bg-black " +
  "w-full max-h-[60vh] min-h-[180px] " +
  "lg:h-full lg:w-auto lg:max-w-full lg:max-h-none lg:min-h-[160px]";
export const DriveVideoPlayer = forwardRef<
  DriveVideoPlayerHandle,
  {
    fileId: string;
    orientacion?: "vertical" | "horizontal" | null;
    onMomentoPausa?: (tiempo: string) => void;
    onError?: (motivo: MotivoErrorDrive) => void;
    onOrientacion?: (orientacion: "vertical" | "horizontal") => void;
    onRatio?: (ratio: number) => void;
  }
>(function DriveVideoPlayer({ fileId, orientacion, onMomentoPausa, onError, onOrientacion, onRatio }, ref) {
  const [cargando, setCargando] = useState(true);
  const [bufereando, setBufereando] = useState(false);
  const [ratio, setRatio] = useState<number | null>(null);
  const [intento, setIntento] = useState(0);
  // El <video> real (vertical u horizontal, solo uno montado a la vez) — expone `seekTo` al
  // padre para saltar al minuto exacto de una observacion con un clic (ver
  // RevisarEntregableDialog.tsx).
  const videoRef = useRef<HTMLVideoElement>(null);
  useImperativeHandle(ref, () => ({
    seekTo: (segundos: number) => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = segundos;
      v.play().catch(() => {
        // autoplay bloqueado o similar — el usuario igual ve el video ya posicionado, le da play el mismo.
      });
    },
  }));
  // Solo para no llamar a `onMomentoPausa` en cada frame (timeupdate dispara varias veces por
  // segundo) — se avisa al padre nada mas cuando el segundo ENTERO realmente cambio.
  const ultimoSegundoRef = useRef<number | null>(null);
  const alActualizarTiempo = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    const segundo = Math.floor(v.currentTime);
    if (segundo !== ultimoSegundoRef.current) {
      ultimoSegundoRef.current = segundo;
      onMomentoPausa?.(formatoTiempo(v.currentTime));
    }
  };
  // El video ya no sale directo de Drive con el token OAuth del usuario (se vencia cada ~1h y
  // fallaba si el archivo no estaba compartido con esa cuenta) — sale del propio dominio,
  // vía `/api/drive-video`, que lo pide con una cuenta de servicio fija (ver ese archivo).
  // Ese proxy exige sesion de AV Control: el ID token de Firebase viaja como query param porque
  // un <video src> no puede mandar headers. Mientras no haya token, `src` es null y el <video>
  // ni se monta — con `src=""` el navegador dispara `error` de inmediato y caeria al visor de
  // respaldo sin motivo real.
  const { token: idToken, listo: sesionLista } = useIdToken();
  const src = idToken
    ? `/api/drive-video?id=${encodeURIComponent(fileId)}&token=${encodeURIComponent(idToken)}`
    : null;

  // Sin esto, el contador de reintentos de un video anterior se arrastraba al siguiente —
  // un video nuevo con mala suerte se quedaba sin su propio reintento. Y `ratio` TAMBIEN tenia
  // que resetearse aqui: al agregar la pestaña horizontal/vertical (misma instancia de
  // DriveVideoPlayer, solo cambia el `fileId` prop), el `ratio` detectado del video ANTERIOR se
  // quedaba pegado mientras el nuevo cargaba — `esVertical` lo usaba para decidir que rama de
  // JSX dibujar, asi que un video vertical se renderizaba un instante con la forma del horizontal
  // anterior (o viceversa), aplastando/recortando el video de mas hasta que llegara la metadata
  // real. Volver a `null` hace que mientras tanto se use el fallback por `orientacion` (la
  // etiqueta ya guardada de ESTE video), no la medida del otro.
  useEffect(() => {
    setIntento(0);
    setRatio(null);
    setCargando(true);
  }, [fileId]);

  // Sin sesion de Firebase no hay forma de pedirle el video al proxy — mejor avisar al padre
  // (que muestra el visor de respaldo de Drive) que dejar el spinner girando para siempre.
  useEffect(() => {
    if (sesionLista && !idToken) onError?.("sin_acceso");
    // `onError` suele venir como funcion nueva en cada render del padre; se deja fuera a
    // proposito para no reavisar en bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesionLista, idToken]);

  // Un primer error (ej. un hipo de red pidiendole el video al proxy) no tira la toalla de una:
  // se reintenta una vez solita (remontando el <video> con una key distinta) antes de avisarle
  // al padre que use el visor de respaldo. Asi un hipo pasajero no te saca del reproductor propio.
  const manejarError = async () => {
    if (intento < 1) {
      setIntento((n) => n + 1);
      setCargando(true);
      return;
    }
    onError?.(await diagnosticarProxyDrive(fileId, idToken));
  };

  // Mientras no se conoce la proporcion real se usa una de referencia segun la orientacion ya
  // etiquetada — asi la caja no da un salto grande cuando el video carga.
  const esVertical = ratio != null ? ratio < 1 : orientacion === "vertical";
  const ratioDetectado = ratio ?? (esVertical ? 9 / 16 : 16 / 9);
  // En vertical, la proporcion real (9:16) deja la caja muy angosta. Se pone un piso mas ancho
  // a proposito — el `object-cover` del <video> ya recorta para llenar la caja, asi que esto
  // solo significa un poco mas de recorte a los lados a cambio de una caja mas grande.
  const ratioCaja = esVertical ? Math.max(ratioDetectado, 0.65) : ratioDetectado;

  // En vertical, header y pie eran barras solidas separadas del video — en una columna angosta
  // se leian como si fueran bandas negras (letterbox) encima del propio video. Aqui en cambio
  // van flotando SOBRE el video (degradado, sin fondo solido), como en cualquier app de reels:
  // no le quitan alto al video y no se confunden con un margen.
  if (esVertical) {
    return (
      <div
        className={cn(ESCENARIO_BASE, "mx-auto rounded-lg shadow-card ring-1 ring-black/10")}
        style={{ aspectRatio: String(ratioCaja) }}
      >
        {(cargando || bufereando) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-white/50" />
            <span className="text-[11px] text-white/40">
              {cargando ? "Cargando video..." : "Recuperando buffer..."}
            </span>
          </div>
        )}
        {src && (
          <video
            ref={videoRef}
            key={`${fileId}-${intento}`}
            src={src}
            controls
            playsInline
            preload="metadata"
            className={cn(
              "h-full w-full scale-[1.03] origin-bottom object-cover [accent-color:#FB670B]",
              "[&:fullscreen]:scale-100 [&:fullscreen]:object-contain [&:fullscreen]:bg-black",
              "[&:-webkit-full-screen]:scale-100 [&:-webkit-full-screen]:object-contain [&:-webkit-full-screen]:bg-black",
              cargando && "invisible"
            )}
            onError={manejarError}
            onCanPlay={() => setCargando(false)}
            onWaiting={() => setBufereando(true)}
            onPlaying={() => setBufereando(false)}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              setCargando(false);
              const r = v.videoWidth / v.videoHeight;
              if (!Number.isFinite(r) || r <= 0) return;
              setRatio(r);
              onOrientacion?.(r < 1 ? "vertical" : "horizontal");
              onRatio?.(r);
            }}
            onTimeUpdate={alActualizarTiempo}
            onPause={(e) => {
              const v = e.currentTarget;
              if (onMomentoPausa && !v.ended) onMomentoPausa(formatoTiempo(v.currentTime));
            }}
          />
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-black/70 to-transparent px-2.5 pb-5 pt-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#C1EB1F]" />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-5">
          <Clock className="h-3 w-3 shrink-0 text-white/50" />
          <span className="truncate text-[10.5px] leading-tight text-white/60">
            El minuto se sigue solo mientras reproduces.
          </span>
        </div>
      </div>
    );
  }

  return (
    // Sin `lg:h-full`: ese forzaba esta columna a estirarse a la altura de observaciones (ver el
    // comentario en RevisarEntregableDialog.tsx sobre `lg:self-start`) y dejaba espacio en blanco
    // debajo del footer, porque header+video(aspect-ratio)+footer no llenan una altura ajena a
    // su propio contenido. Sin esa altura forzada, la columna solo ocupa lo que necesita.
    <div className="flex w-full flex-col overflow-hidden rounded-lg bg-[#0B0B0C] shadow-card ring-1 ring-black/10 lg:w-auto">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#141416] px-2.5 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#C1EB1F]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.09em] text-white/55">Visor</span>
        </div>
      </div>

      {/* A diferencia de ESCENARIO_BASE (usado en la rama vertical), esta caja NO usa
          `lg:h-full`/`flex-1`: el wrapper de arriba ya no se estira a la altura de observaciones
          (ver comentario del wrapper), asi que no hay una altura externa de la cual derivar el
          ancho via aspect-ratio — colgarse de flex-grow sin esa altura externa colapsaba la caja
          a su min-height (video minusculo). En vez de eso, esta caja se acota con un ANCHO maximo
          fijo (mismo criterio que ya usa el preview de diseño grafico mas abajo en este archivo,
          `lg:max-w-2xl`) y aspect-ratio deriva el ALTO a partir de ese ancho — tamaño predecible,
          sin pelear con el flexbox de la columna. */}
      <div
        className="relative flex w-full min-h-[180px] max-h-[60vh] items-center justify-center overflow-hidden bg-black lg:max-h-[55vh] lg:max-w-2xl"
        style={{ aspectRatio: String(ratioCaja) }}
      >
        {(cargando || bufereando) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-white/50" />
            <span className="text-[11px] text-white/40">
              {cargando ? "Cargando video..." : "Recuperando buffer..."}
            </span>
          </div>
        )}
        {src && (
          <video
            ref={videoRef}
            key={`${fileId}-${intento}`}
            src={src}
            controls
            playsInline
            preload="metadata"
            className={cn(
              "h-full w-full scale-[1.03] origin-bottom object-cover [accent-color:#FB670B]",
              "[&:fullscreen]:scale-100 [&:fullscreen]:object-contain [&:fullscreen]:bg-black",
              "[&:-webkit-full-screen]:scale-100 [&:-webkit-full-screen]:object-contain [&:-webkit-full-screen]:bg-black",
              cargando && "invisible"
            )}
            onError={manejarError}
            // Red de seguridad: si por lo que sea no llego `loadedmetadata`, el video no se queda invisible.
            onCanPlay={() => setCargando(false)}
            onWaiting={() => setBufereando(true)}
            onPlaying={() => setBufereando(false)}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              setCargando(false);
              const r = v.videoWidth / v.videoHeight;
              // Un ratio no finito (metadata incompleta) romperia `aspect-ratio` y dejaria la caja sin forma.
              if (!Number.isFinite(r) || r <= 0) return;
              setRatio(r);
              onOrientacion?.(r < 1 ? "vertical" : "horizontal");
              onRatio?.(r);
            }}
            onTimeUpdate={alActualizarTiempo}
            onPause={(e) => {
              const v = e.currentTarget;
              if (onMomentoPausa && !v.ended) onMomentoPausa(formatoTiempo(v.currentTime));
            }}
          />
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 border-t border-white/10 bg-[#141416] px-2.5 py-1.5">
        <Clock className="h-3 w-3 shrink-0 text-white/35" />
        <span className="truncate text-[10.5px] leading-tight text-white/45">
          El minuto se sigue solo mientras reproduces, segundo a segundo.
        </span>
      </div>
    </div>
  );
});
