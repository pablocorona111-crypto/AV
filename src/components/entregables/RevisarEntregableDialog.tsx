import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { CheckCircle2, Clock, Download, ExternalLink, RotateCcw, Send, Upload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { puedeAprobarEntregables, puedeSubirVideos, esGestorRequisiciones } from "@/lib/roles";
import {
  useAgregarComentario,
  useAprobarEntregable,
  useComentarios,
  useEnviarARevision,
  useEtiquetarOrientacion,
  useMarcarEntregado,
  useSolicitarCorrecciones,
} from "@/hooks/useEntregables";
import { useUsuarios } from "@/hooks/useCatalogos";
import { crearNotificacion } from "@/services/notificacionesService";
import { driveUrlAPreview } from "@/services/entregablesService";
import { subirArchivoADrive, extraerFileIdDrive } from "@/services/driveService";
import { DriveVideoPlayer, type MotivoErrorDrive } from "@/components/entregables/DriveVideoPlayer";
import { mensajeErrorAuth } from "@/lib/authErrors";
import { cn } from "@/lib/utils";
import { ESTADO_ENTREGABLE_BADGE, ESTADO_ENTREGABLE_LABELS, CATEGORIA_CONTENIDO_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Entregable } from "@/types";

function iniciales(nombre: string) {
  return nombre.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

const MENSAJE_ERROR_PLAYER: Record<MotivoErrorDrive, string> = {
  sin_acceso: "La carpeta de Drive con este video no esta compartida con la cuenta de servicio.",
  no_encontrado: "Este archivo ya no existe en Drive (fue borrado o movido).",
  desconocido: "Visor de respaldo: no detecta el minuto solo.",
};

export function RevisarEntregableDialog({
  entregable,
  open,
  onOpenChange,
  nombreResponsable,
  nombreProyecto,
  nombreAprobador,
}: {
  entregable: Entregable | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nombreResponsable: string;
  nombreProyecto?: string;
  nombreAprobador?: string;
}) {
  const { usuario, driveToken, conectarDrive } = useAuth();
  const { data: usuarios = [] } = useUsuarios();
  const [linkDraft, setLinkDraft] = useState("");
  const [comentario, setComentario] = useState("");
  const [momento, setMomento] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [errorSubida, setErrorSubida] = useState<string | null>(null);
  const [errorPlayerPropio, setErrorPlayerPropio] = useState<MotivoErrorDrive | null>(null);
  const [orientacion, setOrientacion] = useState<"vertical" | "horizontal" | null>(null);
  const [ratioReal, setRatioReal] = useState<number | null>(null);
  const [orientacionSubida, setOrientacionSubida] = useState<"vertical" | "horizontal">("horizontal");
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // `open` tambien dispara el reset: si el reproductor propio fallo una vez (ej. un hipo de
    // red al pedir el video a Drive), sin esto se quedaba en modo "link" para siempre en esa
    // sesion, aunque el motivo haya sido pasajero. Reabrir el dialogo le da otra oportunidad.
    setErrorPlayerPropio(null);
    setRatioReal(null);
    // Si ya quedo etiquetado al subirlo, se usa de una vez — sin esperar a que cargue el video (sin parpadeo).
    setOrientacion(entregable?.orientacionVideo ?? null);
  }, [entregable?.id, entregable?.orientacionVideo, open]);

  const { data: comentarios = [] } = useComentarios(entregable?.id ?? "");
  const agregarComentario = useAgregarComentario(entregable?.id ?? "");
  const enviarARevision = useEnviarARevision();
  const aprobar = useAprobarEntregable();
  const solicitarCorrecciones = useSolicitarCorrecciones();
  const marcarEntregado = useMarcarEntregado();
  const etiquetarOrientacion = useEtiquetarOrientacion();

  if (!entregable || !usuario) return null;

  const esResponsable = entregable.responsableId === usuario.id;
  const esAprobador = puedeAprobarEntregables(usuario);
  // Ya no hay nada que corregir — las observaciones de correcciones pasadas ya no aportan,
  // se reemplazan por la info de que ya quedo aprobado/entregado.
  const yaResuelto = entregable.estado === "aprobado" || entregable.estado === "entregado";
  const puedeComentar = esAprobador || esGestorRequisiciones(usuario) || esResponsable;
  const linkActual = entregable.urlRevision || entregable.urlFinal;
  const preview = linkActual ? driveUrlAPreview(linkActual) : null;
  const fileIdActual = linkActual ? extraerFileIdDrive(linkActual) : null;
  // Ya no hace falta `driveToken` para VER el video — el reproductor propio lo pide via
  // `/api/drive-video` con una cuenta de servicio fija, no con la sesion de Drive del usuario.
  // `driveToken` solo sigue haciendo falta para SUBIR videos nuevos (ver `onSeleccionarArchivo`).
  const usaPlayerPropio = Boolean(fileIdActual && !errorPlayerPropio);
  const modoVisor: "player" | "preview" | "link" | "vacio" = usaPlayerPropio
    ? "player"
    : preview
      ? "preview"
      : linkActual
        ? "link"
        : "vacio";
  // Solo se abre el layout ancho a dos columnas cuando de verdad hay un video que ver.
  // Para un link suelto, un estado vacio o el aviso de conectar Drive, un dialogo angosto se lee mejor.
  const layoutLado = modoVisor === "player" || modoVisor === "preview";

  /** Avisa a quien aprueba (community) que hay material nuevo o actualizado para revisar —
   * no se sabe de antemano quien vera el dialogo, asi que se manda a todos los que podrian
   * aprobar (mismo criterio que el boton Aprobar: `esGestorRequisiciones`/superadmin). */
  const notificarRevisores = (texto: string) => {
    usuarios
      .filter((u) => u.id !== usuario.id && (u.rol === "superadmin" || esGestorRequisiciones(u)))
      .forEach((u) => crearNotificacion({ paraUsuarioId: u.id, texto, entregableId: entregable.id }));
  };

  const onEnviar = async () => {
    const url = linkDraft.trim() || linkActual;
    if (!url) return;
    const yaHabiaVideo = Boolean(linkActual);
    await enviarARevision.mutateAsync({ id: entregable.id, urlRevision: url });
    notificarRevisores(
      `${nombreResponsable} ${yaHabiaVideo ? "actualizo" : "agrego"} el video de "${entregable.nombre}".`
    );
    setLinkDraft("");
  };

  const onSeleccionarArchivo = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const yaHabiaVideo = Boolean(linkActual);
    setErrorSubida(null);
    setSubiendo(true);
    setProgreso(0);
    try {
      const token = driveToken ?? (await conectarDrive());
      if (!token) {
        setErrorSubida("No se pudo conectar con Drive.");
        return;
      }
      const fileIdExistente = linkActual ? extraerFileIdDrive(linkActual) ?? undefined : undefined;
      const subido = await subirArchivoADrive(file, token, {
        nombre: `${nombreProyecto ?? "Sin proyecto"} - ${entregable.nombre}`,
        nombreCarpeta: nombreProyecto ?? "Sin proyecto",
        fileIdExistente,
        onProgress: setProgreso,
      });
      await enviarARevision.mutateAsync({
        id: entregable.id,
        urlRevision: subido.previewUrl,
        orientacionVideo: orientacionSubida,
      });
      notificarRevisores(
        `${nombreResponsable} ${yaHabiaVideo ? "actualizo" : "agrego"} el video de "${entregable.nombre}".`
      );
    } catch (err) {
      setErrorSubida(mensajeErrorAuth(err));
    } finally {
      setSubiendo(false);
    }
  };

  const onAprobar = async () => {
    if (!linkActual) return;
    await aprobar.mutateAsync({ id: entregable.id, aprobadorId: usuario.id, urlFinal: linkActual });
    crearNotificacion({
      paraUsuarioId: entregable.responsableId,
      texto: `Tu video "${entregable.nombre}" fue aprobado.`,
      entregableId: entregable.id,
    });
  };

  const onSolicitarCorrecciones = async () => {
    await solicitarCorrecciones.mutateAsync(entregable.id);
    crearNotificacion({
      paraUsuarioId: entregable.responsableId,
      texto: `Pidieron cambios en tu video "${entregable.nombre}". Revisa las observaciones.`,
      entregableId: entregable.id,
    });
  };

  const onMarcarEntregado = async () => {
    await marcarEntregado.mutateAsync(entregable.id);
    crearNotificacion({
      paraUsuarioId: entregable.responsableId,
      texto: `Tu video "${entregable.nombre}" ya quedo entregado.`,
      entregableId: entregable.id,
    });
  };

  const onComentar = async () => {
    if (!comentario.trim()) return;
    await agregarComentario.mutateAsync({
      autorId: usuario.id,
      autorNombre: usuario.nombre,
      texto: comentario,
      ...(momento.trim() ? { momento: momento.trim() } : {}),
    });
    setComentario("");
    setMomento("");

    if (!esResponsable) {
      crearNotificacion({
        paraUsuarioId: entregable.responsableId,
        texto: `${usuario.nombre} dejo una observacion en "${entregable.nombre}"${momento.trim() ? ` (min ${momento.trim()})` : ""}`,
        entregableId: entregable.id,
      });
    }
  };

  /** Deteccion automatica real (del video, no de la etiqueta). Si no coincide con lo
   * guardado, lo corrige y lo guarda — asi solo hace falta detectar bien una vez. */
  const onOrientacionDetectada = (o: "vertical" | "horizontal") => {
    setOrientacion(o);
    if (entregable.orientacionVideo !== o) {
      etiquetarOrientacion.mutate({ id: entregable.id, orientacionVideo: o });
    }
  };

  // Si el video aun no carga, se usa la proporcion de referencia de su orientacion etiquetada
  // para no dar un salto al cargar.
  const ratioVisor = ratioReal ?? (orientacion === "vertical" ? 9 / 16 : 16 / 9);

  const bloqueVideo = (
    <div
      className={cn(
        "space-y-3",
        // La columna ya NO calcula su ancho con una formula de vh adivinada (eso se desajustaba
        // en pantallas de otro tamaño/alto). Ahora `lg:items-stretch` en la fila le da una altura
        // real y definida (la que sobra del dialogo) — de ahi el video deriva su ancho solo con
        // aspect-ratio. Se adapta a cualquier pantalla porque usa el espacio real, no un numero fijo.
        layoutLado && "w-full lg:w-auto lg:min-w-[160px]"
      )}
    >
      {modoVisor === "player" && fileIdActual && (
        <DriveVideoPlayer
          fileId={fileIdActual}
          orientacion={orientacion}
          onMomentoPausa={setMomento}
          onError={setErrorPlayerPropio}
          onOrientacion={onOrientacionDetectada}
          onRatio={setRatioReal}
        />
      )}

      {modoVisor === "preview" && preview && (
        <div className="flex w-full flex-col gap-2 lg:h-full">
          {/* Si se llega aqui es porque el reproductor propio ya diagnostico el motivo real del
              fallo (sin acceso, archivo borrado, u otra cosa) y no lo pudo reparar solo. Este es
              el visor de Drive de respaldo, y NO puede detectar el minuto al pausar (es un
              iframe de otro dominio). */}
          <div className="flex w-full shrink-0 items-center justify-between gap-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800 ring-1 ring-amber-200">
            <span>{MENSAJE_ERROR_PLAYER[errorPlayerPropio ?? "desconocido"]}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 shrink-0 px-2 text-[11px]"
              onClick={() => setErrorPlayerPropio(null)}
            >
              Reintentar reproductor propio
            </Button>
          </div>
          <div
            className="w-full min-h-[180px] max-h-[60vh] overflow-hidden rounded-lg bg-black ring-1 ring-black/10 lg:w-auto lg:max-w-full lg:max-h-none lg:min-h-0 lg:flex-1"
            style={{ aspectRatio: String(ratioVisor) }}
          >
            <iframe
              src={preview}
              className="h-full w-full"
              allow="autoplay; fullscreen"
              title="Vista previa del video"
            />
          </div>
        </div>
      )}

      {modoVisor === "link" && linkActual && (
        <a
          href={linkActual}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-md border border-border bg-bg-secondary p-3 text-sm font-medium transition-colors hover:bg-border/60"
        >
          <ExternalLink className="h-4 w-4" /> Abrir video en Drive
        </a>
      )}

      {modoVisor === "vacio" && (
        <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          Sin video cargado todavia.
        </p>
      )}
    </div>
  );

  const bloqueSubirVideo = esResponsable && puedeSubirVideos(usuario) && entregable.estado !== "aprobado" && (
    <div className="space-y-2 rounded-md border border-border p-3">
      <Label>Subir video</Label>
      <div className="flex gap-1.5">
        {(["horizontal", "vertical"] as const).map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setOrientacionSubida(o)}
            className={cn(
              "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium capitalize transition-colors",
              orientacionSubida === o
                ? "border-accent bg-accent text-white"
                : "border-border bg-white text-muted-foreground hover:bg-bg-secondary"
            )}
          >
            {o}
          </button>
        ))}
      </div>
      <input
        ref={inputArchivoRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={onSeleccionarArchivo}
      />
      <Button
        type="button"
        className="w-full"
        onClick={() => inputArchivoRef.current?.click()}
        disabled={subiendo}
      >
        <Upload className="h-4 w-4" />
        {subiendo ? `Subiendo... ${progreso}%` : "Subir video a Drive"}
      </Button>
      {errorSubida && <p className="text-xs text-destructive">{errorSubida}</p>}

      <p className="pt-1 text-center text-xs text-muted-foreground">o pega un link ya existente</p>
      <div className="flex gap-2">
        <Input
          value={linkDraft}
          onChange={(e) => setLinkDraft(e.target.value)}
          placeholder="https://drive.google.com/file/d/..."
        />
        <Button type="button" variant="outline" onClick={onEnviar} disabled={enviarARevision.isPending}>
          <Send className="h-4 w-4" /> Enviar
        </Button>
      </div>
    </div>
  );

  // `lg:min-w-[360px]` es el piso del panel: sin el, un video 16:9 ancho aplastaba esta columna
  // hasta desbordar el dialogo. `lg:max-w-md` evita que se estire de mas cuando el dialogo es
  // ancho — la columna de comentarios no necesita todo el espacio sobrante.
  const bloqueObservaciones = (
    <div className={cn("space-y-4", layoutLado && "min-w-0 flex-1 lg:min-w-[360px] lg:max-w-md")}>
      {yaResuelto ? (
        <div className="space-y-2">
          <Label>Estado</Label>
          <div className="flex items-start gap-2.5 rounded-md border border-border bg-bg-secondary/40 p-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">
                {entregable.estado === "entregado" ? "Entregado — ya se publico/entrego." : "Aprobado, listo para subir."}
              </p>
              {nombreAprobador && <p className="text-xs text-muted-foreground">Aprobo: {nombreAprobador}</p>}
              <p className="text-xs text-muted-foreground">Version {entregable.version}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Observaciones</Label>
          <div
            className={cn(
              "space-y-3 overflow-y-auto rounded-md border border-border bg-bg-secondary/40 p-3 scrollbar-thin",
              layoutLado ? "max-h-[46vh]" : "max-h-56"
            )}
          >
            {comentarios.length === 0 && (
              <p className="py-2 text-center text-xs text-muted-foreground">Sin observaciones aun.</p>
            )}
            {comentarios.map((c) => (
              <div key={c.id} className="flex items-start gap-2.5">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-[10px]">{iniciales(c.autorNombre)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 rounded-lg rounded-tl-none bg-white p-2.5 shadow-card">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{c.autorNombre}</span>
                    {c.momento && (
                      <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-text-primary">
                        <Clock className="h-3 w-3" /> min {c.momento}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm">{c.texto}</p>
                </div>
              </div>
            ))}
          </div>
          {puedeComentar && (
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <Input
                  value={momento}
                  onChange={(e) => setMomento(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onComentar();
                  }}
                  placeholder="min (ej. 0:45)"
                  className="w-28 shrink-0"
                />
                <Input
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onComentar();
                  }}
                  placeholder="Ej. En esta toma, encuadre torcido"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onComentar}
                disabled={agregarComentario.isPending}
              >
                Agregar observacion
              </Button>
              <p className="text-[11px] text-muted-foreground">
                {usaPlayerPropio
                  ? "Se llena solo mientras reproduces."
                  : "Anota el minuto donde esta el cambio que pides."}
              </p>
            </div>
          )}
        </div>
      )}

      {esAprobador && (entregable.estado === "en_revision" || entregable.estado === "correcciones") && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onSolicitarCorrecciones}
            disabled={solicitarCorrecciones.isPending}
          >
            <RotateCcw className="h-4 w-4" /> Solicitar cambios
          </Button>
          <Button type="button" onClick={onAprobar} disabled={aprobar.isPending}>
            <CheckCircle2 className="h-4 w-4" /> Aprobar
          </Button>
        </div>
      )}

      {esAprobador && entregable.estado === "aprobado" && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Button type="button" onClick={onMarcarEntregado} disabled={marcarEntregado.isPending}>
            <CheckCircle2 className="h-4 w-4" />
            {marcarEntregado.isPending ? "Marcando..." : "Marcar como entregado"}
          </Button>
        </div>
      )}

      {bloqueSubirVideo}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* layoutLado: el dialogo se ajusta al contenido real (video + panel), ni mas ancho ni mas
          angosto de lo que necesitan (`w-fit`). Y en vez de restarle al alto del dialogo un numero
          de pixeles adivinado para el titulo/subtitulo (eso se desajustaba si el titulo alcanzaba
          a envolver en 2 lineas en una pantalla mas angosta), el titulo/subtitulo quedan con su
          alto natural (`shrink-0`) y la fila de abajo toma `flex-1 min-h-0`: lo que sobra de
          verdad del `max-h-[85vh]` del dialogo, en cualquier pantalla. */}
      <DialogContent
        className={cn(
          "flex flex-col overflow-hidden",
          layoutLado ? "w-fit max-w-[95vw]" : "max-w-3xl"
        )}
      >
        <DialogHeader className="shrink-0">
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <DialogTitle>{entregable.nombre}</DialogTitle>
            <Badge variant={ESTADO_ENTREGABLE_BADGE[entregable.estado]}>
              {ESTADO_ENTREGABLE_LABELS[entregable.estado]}
            </Badge>
            {fileIdActual && (entregable.estado === "aprobado" || entregable.estado === "entregado") && (
              <a
                href={`/api/drive-video?id=${encodeURIComponent(fileIdActual)}&download=1&nombre=${encodeURIComponent(entregable.nombre)}`}
                className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-bg-secondary"
              >
                <Download className="h-3.5 w-3.5" /> Descargar
              </a>
            )}
          </div>
        </DialogHeader>

        <p className="-mt-2 mb-5 shrink-0 text-xs text-muted-foreground">
          {nombreProyecto && <>Proyecto: {nombreProyecto} · </>}
          {CATEGORIA_CONTENIDO_LABELS[entregable.tipo]} · Responsable: {nombreResponsable} · v{entregable.version}
        </p>

        <div
          className={cn(
            layoutLado
              ? "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto lg:flex-row lg:items-stretch lg:gap-6 lg:overflow-visible"
              : "space-y-4 overflow-y-auto"
          )}
        >
          {bloqueVideo}
          {bloqueObservaciones}
        </div>
      </DialogContent>
    </Dialog>
  );
}
