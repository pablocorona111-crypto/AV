import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { CheckCircle2, Clock, ExternalLink, RotateCcw, Send, Upload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { puedeAprobarEntregables, esGestorRequisiciones } from "@/lib/roles";
import {
  useAgregarComentario,
  useAprobarEntregable,
  useComentarios,
  useEnviarARevision,
  useEtiquetarOrientacion,
  useSolicitarCorrecciones,
} from "@/hooks/useEntregables";
import { crearNotificacion } from "@/services/notificacionesService";
import { driveUrlAPreview } from "@/services/entregablesService";
import { subirArchivoADrive, extraerFileIdDrive } from "@/services/driveService";
import { DriveVideoPlayer } from "@/components/entregables/DriveVideoPlayer";
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

export function RevisarEntregableDialog({
  entregable,
  open,
  onOpenChange,
  nombreResponsable,
  nombreProyecto,
}: {
  entregable: Entregable | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nombreResponsable: string;
  nombreProyecto?: string;
}) {
  const { usuario, driveToken, conectarDrive } = useAuth();
  const [linkDraft, setLinkDraft] = useState("");
  const [comentario, setComentario] = useState("");
  const [momento, setMomento] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [errorSubida, setErrorSubida] = useState<string | null>(null);
  const [playerPropioFallo, setPlayerPropioFallo] = useState(false);
  const [orientacion, setOrientacion] = useState<"vertical" | "horizontal" | null>(null);
  const [orientacionSubida, setOrientacionSubida] = useState<"vertical" | "horizontal">("horizontal");
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPlayerPropioFallo(false);
    // Si ya quedo etiquetado al subirlo, se usa de una vez — sin esperar a que cargue el video (sin parpadeo).
    setOrientacion(entregable?.orientacionVideo ?? null);
  }, [entregable?.id, entregable?.orientacionVideo]);

  const { data: comentarios = [] } = useComentarios(entregable?.id ?? "");
  const agregarComentario = useAgregarComentario(entregable?.id ?? "");
  const enviarARevision = useEnviarARevision();
  const aprobar = useAprobarEntregable();
  const solicitarCorrecciones = useSolicitarCorrecciones();
  const etiquetarOrientacion = useEtiquetarOrientacion();

  if (!entregable || !usuario) return null;

  const esResponsable = entregable.responsableId === usuario.id;
  const esAprobador = puedeAprobarEntregables(usuario);
  const puedeComentar = esAprobador || esGestorRequisiciones(usuario) || esResponsable;
  const linkActual = entregable.urlRevision || entregable.urlFinal;
  const preview = linkActual ? driveUrlAPreview(linkActual) : null;
  const fileIdActual = linkActual ? extraerFileIdDrive(linkActual) : null;
  const layoutLado = orientacion === "vertical";

  const onEnviar = async () => {
    const url = linkDraft.trim() || linkActual;
    if (!url) return;
    await enviarARevision.mutateAsync({ id: entregable.id, urlRevision: url });
    setLinkDraft("");
  };

  const onSeleccionarArchivo = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

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

  const bloqueVideo = (
    <div className={cn("space-y-3", layoutLado && "flex flex-col items-center lg:w-auto lg:max-w-sm lg:shrink-0")}>
      {fileIdActual && driveToken && !playerPropioFallo ? (
        <DriveVideoPlayer
          fileId={fileIdActual}
          accessToken={driveToken}
          onMomentoPausa={setMomento}
          onError={() => setPlayerPropioFallo(true)}
          onOrientacion={onOrientacionDetectada}
        />
      ) : fileIdActual && !driveToken ? (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg bg-black">
          <p className="text-xs text-white/70">Conecta Drive para ver el video aqui, con marcador de minuto.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => conectarDrive()}>
            Conectar Drive
          </Button>
        </div>
      ) : preview ? (
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          <iframe
            src={preview}
            className="h-full w-full"
            allow="autoplay; fullscreen"
            title="Vista previa del video"
          />
        </div>
      ) : linkActual ? (
        <a
          href={linkActual}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-md border border-border bg-bg-secondary p-3 text-sm font-medium"
        >
          <ExternalLink className="h-4 w-4" /> Abrir video en Drive
        </a>
      ) : (
        <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          Sin video cargado todavia.
        </p>
      )}

      {esResponsable && entregable.estado !== "aprobado" && (
        <div className={cn("space-y-2 rounded-md border border-border p-3", layoutLado && "w-full")}>
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
      )}
    </div>
  );

  const bloqueObservaciones = (
    <div className={cn("space-y-4", layoutLado && "min-w-0 flex-1")}>
      <div className="space-y-2">
        <Label>Observaciones</Label>
        <div
          className={cn(
            "space-y-3 overflow-y-auto rounded-md border border-border bg-bg-secondary/40 p-3",
            layoutLado ? "max-h-[45vh]" : "max-h-56"
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
                placeholder="min (ej. 0:45)"
                className="w-28 shrink-0"
              />
              <Input
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
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
              {fileIdActual && driveToken && !playerPropioFallo
                ? "El minuto se llena solo al pausar el video. Puedes editarlo si hace falta."
                : "Anota el minuto donde esta el cambio que pides."}
            </p>
          </div>
        )}
      </div>

      {esAprobador && entregable.estado === "en_revision" && (
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
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={layoutLado ? "max-w-5xl" : "max-w-3xl"}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{entregable.nombre}</DialogTitle>
            <Badge variant={ESTADO_ENTREGABLE_BADGE[entregable.estado]}>
              {ESTADO_ENTREGABLE_LABELS[entregable.estado]}
            </Badge>
          </div>
        </DialogHeader>

        <p className="-mt-2 mb-5 text-xs text-muted-foreground">
          {nombreProyecto && <>Proyecto: {nombreProyecto} · </>}
          {CATEGORIA_CONTENIDO_LABELS[entregable.tipo]} · Responsable: {nombreResponsable} · v{entregable.version}
        </p>

        <div className={cn(layoutLado ? "flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6" : "space-y-4")}>
          {bloqueVideo}
          {bloqueObservaciones}
        </div>
      </DialogContent>
    </Dialog>
  );
}
