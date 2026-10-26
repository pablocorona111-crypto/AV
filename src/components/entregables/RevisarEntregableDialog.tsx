import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  Check,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Link2,
  Monitor,
  Pencil,
  Plus,
  RotateCcw,
  Smartphone,
  Upload,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { puedeAprobarEntregables, puedeSubirVideos, esGestorRequisiciones, gestorTienePermiso } from "@/lib/roles";
import {
  useAdjuntarMaterialHistorico,
  useAgregarComentario,
  useAgregarVersionAlterna,
  useAprobarEntregable,
  useAsignarProyectoEntregable,
  useComentarios,
  useEnviarARevision,
  useEtiquetarOrientacion,
  useEtiquetarOrientacionAlt,
  useMarcarEntregado,
  useReasignarResponsableEntregable,
  useRenombrarEntregable,
  useSolicitarCorrecciones,
} from "@/hooks/useEntregables";
import { useIdToken } from "@/hooks/useIdToken";
import { useProyectos } from "@/hooks/useProyectos";
import { useUsuarios } from "@/hooks/useCatalogos";
import { crearNotificacion } from "@/services/notificacionesService";
import { driveUrlAPreview } from "@/services/entregablesService";
import { subirArchivoADrive, extraerFileIdDrive } from "@/services/driveService";
import { DriveVideoPlayer, type MotivoErrorDrive } from "@/components/entregables/DriveVideoPlayer";
import { mensajeErrorAuth } from "@/lib/authErrors";
import { cn } from "@/lib/utils";
import { ESTADO_ENTREGABLE_BADGE, etiquetaEstadoEntregable, CATEGORIA_CONTENIDO_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Entregable } from "@/types";

const SIN_PROYECTO_VALOR = "sin-proyecto";

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
  const { usuario, driveToken, conectarDrive, limpiarDriveToken } = useAuth();
  const { data: usuarios = [] } = useUsuarios();
  const { data: proyectos = [] } = useProyectos();
  const asignarProyecto = useAsignarProyectoEntregable();
  const reasignarResponsable = useReasignarResponsableEntregable();
  const [comentario, setComentario] = useState("");
  const [momento, setMomento] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [errorSubida, setErrorSubida] = useState<string | null>(null);
  const [errorPlayerPropio, setErrorPlayerPropio] = useState<MotivoErrorDrive | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [orientacion, setOrientacion] = useState<"vertical" | "horizontal" | null>(null);
  const [ratioReal, setRatioReal] = useState<number | null>(null);
  const [orientacionSubida, setOrientacionSubida] = useState<"vertical" | "horizontal">("horizontal");
  // Que version se esta viendo/reproduciendo — "principal" es la de siempre (urlRevision/
  // urlFinal). "alt" es la version adicional en la otra orientacion (ver agregarVersionAlterna).
  const [slotActivo, setSlotActivo] = useState<"principal" | "alt">("principal");
  const inputAltRef = useRef<HTMLInputElement>(null);
  const [subiendoAlt, setSubiendoAlt] = useState(false);
  const [progresoAlt, setProgresoAlt] = useState(0);
  const [errorSubidaAlt, setErrorSubidaAlt] = useState<string | null>(null);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nombreEditado, setNombreEditado] = useState("");
  // El boton "Descargar" apunta a `/api/drive-video`, que ahora exige sesion de AV Control.
  // Un <a href> no manda headers, asi que el ID token va en la URL — mientras no este resuelto
  // el boton queda inerte en vez de llevar a un 401.
  const { token: idToken } = useIdToken();
  const inputArchivoRef = useRef<HTMLInputElement>(null);
  const renombrar = useRenombrarEntregable();
  const agregarVersionAlterna = useAgregarVersionAlterna();
  const etiquetarOrientacionAlt = useEtiquetarOrientacionAlt();

  useEffect(() => {
    // Nuevo entregable o se reabrio el dialogo: siempre arranca viendo la version principal.
    setSlotActivo("principal");
    setEditandoNombre(false);
  }, [entregable?.id, open]);

  useEffect(() => {
    // `slotActivo` tambien dispara el reset: cambiar de pestaña (vertical/horizontal) es, para
    // el reproductor, un video distinto — sin esto se quedaba con el error/ratio del que se
    // estaba viendo antes. Si el reproductor propio fallo una vez (ej. un hipo de red al pedir
    // el video a Drive), sin esto se quedaba en modo "link" para siempre en esa sesion, aunque
    // el motivo haya sido pasajero. Reabrir el dialogo (o cambiar de pestaña) le da otra oportunidad.
    setErrorPlayerPropio(null);
    setRatioReal(null);
    // Si ya quedo etiquetado al subirlo, se usa de una vez — sin esperar a que cargue el video (sin parpadeo).
    setOrientacion((slotActivo === "alt" ? entregable?.orientacionVideoAlt : entregable?.orientacionVideo) ?? null);
  }, [entregable?.id, entregable?.orientacionVideo, entregable?.orientacionVideoAlt, slotActivo, open]);

  const { data: comentarios = [] } = useComentarios(entregable?.id ?? "");
  const agregarComentario = useAgregarComentario(entregable?.id ?? "");
  const enviarARevision = useEnviarARevision();
  const adjuntarMaterialHistorico = useAdjuntarMaterialHistorico();
  const aprobar = useAprobarEntregable();
  const solicitarCorrecciones = useSolicitarCorrecciones();
  const marcarEntregado = useMarcarEntregado();
  const etiquetarOrientacion = useEtiquetarOrientacion();

  if (!entregable || !usuario) return null;

  const esResponsable = entregable.responsableId === usuario.id;
  const esAprobador = puedeAprobarEntregables(usuario);
  // Completar un historico ya cerrado (ej. carga masiva sin link real) — superadmin adjunta el
  // archivo SIN reabrirlo a revision ni tocar su estado, a diferencia del flujo normal donde
  // subir manda de vuelta a revision.
  const completandoHistorico =
    usuario.rol === "superadmin" && (entregable.estado === "aprobado" || entregable.estado === "entregado");
  // Ya no hay nada que corregir — las observaciones de correcciones pasadas ya no aportan,
  // se reemplazan por la info de que ya quedo aprobado/entregado.
  const yaResuelto = entregable.estado === "aprobado" || entregable.estado === "entregado";
  // Solo quien aprueba (community/superadmin) comenta — el colaborador (responsable) solo VE
  // las observaciones que le dejan y sube el video de nuevo si piden cambios, no comenta su
  // propio material. Mismo criterio que ya se aplico en guiones (puedeComentarGuion).
  const puedeComentar = esAprobador;
  // La version ALTERNA es la misma pieza en la otra orientacion (ej. "Saco" vertical Y
  // horizontal) — no un entregable aparte. `slotActivo` decide cual de las dos se esta viendo.
  const linkPrincipal = entregable.urlRevision || entregable.urlFinal;
  const linkAlt = entregable.urlRevisionAlt || entregable.urlFinalAlt;
  const tieneAlt = Boolean(linkAlt);
  const verAlt = slotActivo === "alt" && tieneAlt;
  const linkActual = verAlt ? linkAlt : linkPrincipal;
  const preview = linkActual ? driveUrlAPreview(linkActual) : null;
  const fileIdActual = linkActual ? extraerFileIdDrive(linkActual) : null;
  // Diseño grafico (imagen, PSD, AI, PDF...) no es un video — el reproductor propio
  // (DriveVideoPlayer) asume duracion/orientacion de video y no aplica aqui. Para este tipo se
  // usa directo el iframe de vista previa de Drive (si hay link) — Drive previsualiza imagenes,
  // PDFs y la mayoria de formatos de diseño sin necesitar un visor a la medida.
  const esDiseno = entregable.tipo === "diseno_grafico";
  // Ya no hace falta `driveToken` para VER el video — el reproductor propio lo pide via
  // `/api/drive-video` con una cuenta de servicio fija, no con la sesion de Drive del usuario.
  // `driveToken` solo sigue haciendo falta para SUBIR videos nuevos (ver `onSeleccionarArchivo`).
  const usaPlayerPropio = Boolean(fileIdActual && !errorPlayerPropio && !esDiseno);
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

  /**
   * Respeta `notificacionesSistema` del gestor de requisiciones: si el lider se lo apago, no se
   * le crea la notificacion dentro del sistema. Para cualquier otro rol (y mientras la lista de
   * usuarios aun no carga) no hay restriccion y se notifica igual que siempre.
   */
  const notificarA = (paraUsuarioId: string, texto: string) => {
    const destinatario = usuarios.find((u) => u.id === paraUsuarioId);
    if (!gestorTienePermiso(destinatario, "notificacionesSistema")) return;
    crearNotificacion({ paraUsuarioId, texto, entregableId: entregable.id });
  };

  /** Avisa a quien aprueba (community) que hay material nuevo o actualizado para revisar —
   * no se sabe de antemano quien vera el dialogo, asi que se manda a todos los que podrian
   * aprobar (mismo criterio que el boton Aprobar: `esGestorRequisiciones`/superadmin). */
  const notificarRevisores = (texto: string) => {
    usuarios
      .filter((u) => u.id !== usuario.id && (u.rol === "superadmin" || esGestorRequisiciones(u)))
      .forEach((u) => notificarA(u.id, texto));
  };

  const onSeleccionarArchivo = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    // Este boton es siempre para la version PRINCIPAL, sin importar cual pestaña (vertical/
    // horizontal) se este viendo en ese momento — la version alterna tiene su propio boton
    // (ver onSeleccionarArchivoAlt).
    const yaHabiaVideo = Boolean(linkPrincipal);
    setErrorSubida(null);
    setSubiendo(true);
    setProgreso(0);
    try {
      const token = driveToken ?? (await conectarDrive());
      if (!token) {
        setErrorSubida("No se pudo conectar con Drive.");
        return;
      }
      const fileIdExistente = linkPrincipal ? extraerFileIdDrive(linkPrincipal) ?? undefined : undefined;
      const subido = await subirArchivoADrive(file, token, {
        nombre: `${nombreProyecto ?? "Sin proyecto"} - ${entregable.nombre}`,
        nombreCarpeta: nombreProyecto ?? "Sin proyecto",
        subcarpeta: esDiseno ? "Diseños" : "Videos",
        fileIdExistente,
        onProgress: setProgreso,
      });
      // Si la orientacion ya se sabia (correccion/reemplazo de un video previo) se mantiene esa
      // — solo se usa lo elegido a mano cuando es la primera subida.
      const orientacionAEnviar = entregable.orientacionVideo ?? orientacionSubida;
      if (completandoHistorico) {
        await adjuntarMaterialHistorico.mutateAsync({
          id: entregable.id,
          urlFinal: subido.previewUrl,
          ...(esDiseno ? {} : { orientacionVideo: orientacionAEnviar }),
        });
      } else {
        await enviarARevision.mutateAsync({
          id: entregable.id,
          urlRevision: subido.previewUrl,
          ...(esDiseno ? {} : { orientacionVideo: orientacionAEnviar }),
        });
        notificarRevisores(
          `${nombreResponsable} ${yaHabiaVideo ? "actualizo" : "agrego"} el video de "${entregable.nombre}".`
        );
      }
      setSlotActivo("principal");
    } catch (err) {
      const mensaje = mensajeErrorAuth(err);
      if (/sesion de Drive expiro|403/.test(mensaje)) limpiarDriveToken();
      setErrorSubida(mensaje);
    } finally {
      setSubiendo(false);
    }
  };

  // Version ALTERNA: la misma pieza en la otra orientacion (ej. "Saco" vertical Y horizontal).
  // No manda a revision ni toca `estado` — la version principal ya sigue su propio flujo, esta
  // solo agrega el archivo adicional. Siempre se ofrece la orientacion contraria a la principal
  // por default (para eso existe este boton), pero no se fuerza si el usuario prefiere otra.
  const orientacionAltSugerida: "vertical" | "horizontal" =
    entregable.orientacionVideo === "vertical" ? "horizontal" : "vertical";

  const onSeleccionarArchivoAlt = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setErrorSubidaAlt(null);
    setSubiendoAlt(true);
    setProgresoAlt(0);
    try {
      const token = driveToken ?? (await conectarDrive());
      if (!token) {
        setErrorSubidaAlt("No se pudo conectar con Drive.");
        return;
      }
      const fileIdExistente = linkAlt ? extraerFileIdDrive(linkAlt) ?? undefined : undefined;
      const subido = await subirArchivoADrive(file, token, {
        nombre: `${nombreProyecto ?? "Sin proyecto"} - ${entregable.nombre} (${orientacionAltSugerida})`,
        nombreCarpeta: nombreProyecto ?? "Sin proyecto",
        subcarpeta: "Videos",
        fileIdExistente,
        onProgress: setProgresoAlt,
      });
      await agregarVersionAlterna.mutateAsync({
        id: entregable.id,
        url: subido.previewUrl,
        orientacionVideoAlt: entregable.orientacionVideoAlt ?? orientacionAltSugerida,
        comoHistorico: completandoHistorico,
      });
      setSlotActivo("alt");
      if (!completandoHistorico) {
        notificarRevisores(
          `${nombreResponsable} agrego la version ${orientacionAltSugerida} de "${entregable.nombre}".`
        );
      }
    } catch (err) {
      const mensaje = mensajeErrorAuth(err);
      if (/sesion de Drive expiro|403/.test(mensaje)) limpiarDriveToken();
      setErrorSubidaAlt(mensaje);
    } finally {
      setSubiendoAlt(false);
    }
  };

  const onAprobar = async () => {
    // Siempre aprueba la PRINCIPAL sin importar que pestaña se este viendo — "Aprobar" decide
    // sobre el entregable completo, no sobre una version puntual. Si la alterna tenia una
    // revision pendiente (urlRevisionAlt sin promover a final), se aprueba junto con ella.
    if (!linkPrincipal) return;
    await aprobar.mutateAsync({
      id: entregable.id,
      aprobadorId: usuario.id,
      urlFinal: linkPrincipal,
      ...(entregable.urlRevisionAlt ? { urlFinalAlt: entregable.urlRevisionAlt } : {}),
    });
    notificarA(entregable.responsableId, `Tu video "${entregable.nombre}" fue aprobado.`);
  };

  const onSolicitarCorrecciones = async () => {
    await solicitarCorrecciones.mutateAsync(entregable.id);
    notificarA(
      entregable.responsableId,
      `Pidieron cambios en tu video "${entregable.nombre}". Revisa las observaciones.`
    );
  };

  const onMarcarEntregado = async () => {
    await marcarEntregado.mutateAsync(entregable.id);
    notificarA(entregable.responsableId, `Tu video "${entregable.nombre}" ya quedo entregado.`);
  };

  const onEmpezarRenombrar = () => {
    setNombreEditado(entregable.nombre);
    setEditandoNombre(true);
  };

  const onGuardarNombre = () => {
    const limpio = nombreEditado.trim();
    if (limpio && limpio !== entregable.nombre) {
      renombrar.mutate({ id: entregable.id, nombre: limpio });
    }
    setEditandoNombre(false);
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
      notificarA(
        entregable.responsableId,
        `${usuario.nombre} dejo una observacion en "${entregable.nombre}"${momento.trim() ? ` (min ${momento.trim()})` : ""}`
      );
    }
  };

  /** Deteccion automatica real (del video, no de la etiqueta). Si no coincide con lo
   * guardado, lo corrige y lo guarda — asi solo hace falta detectar bien una vez. */
  const onOrientacionDetectada = (o: "vertical" | "horizontal") => {
    setOrientacion(o);
    if (verAlt) {
      if (entregable.orientacionVideoAlt !== o) {
        etiquetarOrientacionAlt.mutate({ id: entregable.id, orientacionVideoAlt: o });
      }
    } else if (entregable.orientacionVideo !== o) {
      etiquetarOrientacion.mutate({ id: entregable.id, orientacionVideo: o });
    }
  };

  // Si el video aun no carga, se usa la proporcion de referencia de su orientacion etiquetada
  // para no dar un salto al cargar.
  const ratioVisor = ratioReal ?? (orientacion === "vertical" ? 9 / 16 : 16 / 9);

  // El superadmin puede subir/reemplazar el material de CUALQUIER entregable, sin importar
  // quien sea el responsable ni si ya esta aprobado — lo necesita para completar historicos
  // cargados sin link real de video (el responsable registrado puede ni ser una cuenta real).
  // Para el resto, sigue igual: solo el propio responsable, y solo antes de quedar aprobado.
  const puedeEditarMaterial =
    usuario.rol === "superadmin" || (esResponsable && entregable.estado !== "aprobado");
  // La version alterna solo aplica a video (un diseño grafico no tiene "orientacion") y solo
  // tiene sentido ofrecerla cuando ya existe la principal — primero se sube esa.
  const puedeAgregarAlt = puedeEditarMaterial && puedeSubirVideos(usuario) && !esDiseno && Boolean(linkPrincipal);

  const selectorDeVersion = (tieneAlt || puedeAgregarAlt) && !esDiseno && (
    <div className="flex shrink-0 items-center gap-1.5">
      {([
        { slot: "principal" as const, orientacion: entregable.orientacionVideo, disponible: Boolean(linkPrincipal) },
        { slot: "alt" as const, orientacion: entregable.orientacionVideoAlt, disponible: tieneAlt },
      ] as const)
        .filter((v) => v.disponible)
        .map((v) => {
          const Icono = v.orientacion === "vertical" ? Smartphone : Monitor;
          const activo = slotActivo === v.slot;
          return (
            <button
              key={v.slot}
              type="button"
              onClick={() => setSlotActivo(v.slot)}
              className={cn(
                "flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium capitalize transition-colors",
                activo
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-bg-secondary"
              )}
            >
              <Icono className="h-3 w-3" />
              {v.orientacion ?? "video"}
            </button>
          );
        })}
      {puedeAgregarAlt && !tieneAlt && (
        <>
          <input ref={inputAltRef} type="file" accept="video/*" className="hidden" onChange={onSeleccionarArchivoAlt} />
          <button
            type="button"
            onClick={() => inputAltRef.current?.click()}
            disabled={subiendoAlt}
            className="flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-bg-secondary"
            title={`Agregar tambien la version ${orientacionAltSugerida}`}
          >
            <Plus className="h-3 w-3" />
            {subiendoAlt ? `Subiendo... ${progresoAlt}%` : `Agregar ${orientacionAltSugerida}`}
          </button>
        </>
      )}
    </div>
  );

  // Bug: un video HORIZONTAL (ancho, caja naturalmente baja) dejaba espacio en blanco debajo —
  // `lg:items-stretch` en la fila estira esta columna a la altura de observaciones (casi siempre
  // mas alta), y adentro el header/video/footer de DriveVideoPlayer no llenan esa altura forzada
  // (aspect-ratio fija el alto del video, no hay de donde sacar mas para "estirarlo"). Un video
  // VERTICAL (angosto, caja naturalmente alta) no tenia este problema: ahi aspect-ratio deriva el
  // ANCHO a partir del alto ya estirado, asi que si llena el espacio sin que sobre nada. Fix:
  // la columna de un horizontal no se estira (`lg:self-start`), solo ocupa lo que su contenido
  // real necesita — igual que antes de saber la orientacion (metadata sin cargar) se asume
  // horizontal por default, mismo criterio que ya usa `ratioVisor` mas abajo.
  const esVideoVertical = ratioReal != null ? ratioReal < 1 : orientacion === "vertical";
  const bloqueVideo = (
    <div
      className={cn(
        "space-y-3",
        // La columna ya NO calcula su ancho con una formula de vh adivinada (eso se desajustaba
        // en pantallas de otro tamaño/alto). Ahora `lg:items-stretch` en la fila le da una altura
        // real y definida (la que sobra del dialogo) — de ahi el video deriva su ancho solo con
        // aspect-ratio. Se adapta a cualquier pantalla porque usa el espacio real, no un numero fijo.
        layoutLado && "w-full lg:w-auto lg:min-w-[160px]",
        // `esDiseno` queda fuera: su caja de preview (imagen/PDF) si quiere ocupar toda la altura
        // disponible (lg:h-full sin aspect-ratio fijo) — este fix es solo para video, que SI tiene
        // una proporcion fija y por eso puede sobrarle espacio al estirarlo de mas.
        layoutLado && !esDiseno && !esVideoVertical && "lg:self-start"
      )}
    >
      {selectorDeVersion}
      {errorSubidaAlt && <p className="text-xs text-destructive">{errorSubidaAlt}</p>}

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
          {/* Si se llega aqui para un VIDEO es porque el reproductor propio ya diagnostico el
              motivo real del fallo (sin acceso, archivo borrado, u otra cosa) y no lo pudo
              reparar solo. Este es el visor de Drive de respaldo, y NO puede detectar el minuto
              al pausar (es un iframe de otro dominio). Para diseño grafico este es el visor
              normal (no hay reproductor propio que reintentar), asi que no aplica el aviso. */}
          {!esDiseno && (
            <div className="flex w-full shrink-0 items-center justify-between gap-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800 ring-1 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/30">
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
          )}
          <div
            className={cn(
              "w-full overflow-hidden rounded-lg ring-1 ring-black/10 dark:ring-white/10",
              esDiseno
                ? "h-[60vh] bg-white lg:h-full lg:w-[70vw] lg:max-w-2xl"
                : "min-h-[180px] max-h-[60vh] bg-black lg:w-auto lg:max-w-full lg:max-h-none lg:min-h-0 lg:flex-1"
            )}
            style={esDiseno ? undefined : { aspectRatio: String(ratioVisor) }}
          >
            <iframe
              src={preview}
              className="h-full w-full"
              allow="autoplay; fullscreen"
              title={esDiseno ? "Vista previa del diseño" : "Vista previa del video"}
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
          <ExternalLink className="h-4 w-4" /> {esDiseno ? "Abrir diseño en Drive" : "Abrir video en Drive"}
        </a>
      )}

      {modoVisor === "vacio" && (
        <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          {esDiseno ? "Sin diseño cargado todavia." : "Sin video cargado todavia."}
        </p>
      )}
    </div>
  );

  const bloqueSubirVideo = puedeEditarMaterial && puedeSubirVideos(usuario) && (
    <div className="space-y-2 rounded-md border border-border p-3">
      <Label>{esDiseno ? "Subir diseño" : "Subir video"}</Label>
      {/* Solo se pregunta la orientacion la primera vez — en una correccion/reemplazo ya se
          sabe (se detecto sola al reproducir el primer video), no hace falta repetirla. */}
      {!esDiseno && !entregable.orientacionVideo && (
        <div className="flex gap-1.5">
          {(["horizontal", "vertical"] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOrientacionSubida(o)}
              className={cn(
                "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium capitalize transition-colors",
                orientacionSubida === o
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-bg-secondary"
              )}
            >
              {o}
            </button>
          ))}
        </div>
      )}
      <input
        ref={inputArchivoRef}
        type="file"
        accept={esDiseno ? "image/*,.pdf,.ai,.psd,.fig,.sketch,.eps" : "video/*"}
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
        {subiendo ? `Subiendo... ${progreso}%` : esDiseno ? "Subir diseño a Drive" : "Subir video a Drive"}
      </Button>
      {errorSubida && <p className="text-xs text-destructive">{errorSubida}</p>}
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
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">
                {entregable.estado === "entregado"
                  ? `${etiquetaEstadoEntregable(entregable)} — ya se publico/entrego.`
                  : "Aprobado, listo para subir."}
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
                <div className="min-w-0 flex-1 rounded-lg rounded-tl-none bg-card p-2.5 shadow-card dark:bg-bg-secondary">
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
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={momento}
                  onChange={(e) => setMomento(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onComentar();
                  }}
                  placeholder="min (ej. 0:45)"
                  className="w-full shrink-0 sm:w-28"
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
          layoutLado ? "max-w-[95vw] lg:w-fit" : "max-w-3xl"
        )}
      >
        <DialogHeader className="shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {editandoNombre ? (
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <Input
                  autoFocus
                  value={nombreEditado}
                  onChange={(e) => setNombreEditado(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onGuardarNombre();
                    if (e.key === "Escape") setEditandoNombre(false);
                  }}
                  className="h-8 flex-1"
                />
                <button
                  type="button"
                  onClick={onGuardarNombre}
                  disabled={renombrar.isPending}
                  className="shrink-0 rounded-md p-1.5 text-green-600 hover:bg-bg-secondary dark:text-green-400"
                  aria-label="Guardar nombre"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditandoNombre(false)}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-bg-secondary"
                  aria-label="Cancelar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <DialogTitle>{entregable.nombre}</DialogTitle>
                {usuario.rol === "superadmin" && (
                  <button
                    type="button"
                    onClick={onEmpezarRenombrar}
                    className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-bg-secondary hover:text-text-primary"
                    aria-label="Renombrar"
                    title="Renombrar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
            <Badge variant={ESTADO_ENTREGABLE_BADGE[entregable.estado]}>
              {etiquetaEstadoEntregable(entregable)}
            </Badge>
            {fileIdActual && (entregable.estado === "aprobado" || entregable.estado === "entregado") && (
              <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(`https://drive.google.com/file/d/${fileIdActual}/view`);
                    setLinkCopiado(true);
                    setTimeout(() => setLinkCopiado(false), 1500);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-bg-secondary"
                >
                  {linkCopiado ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Copiado
                    </>
                  ) : (
                    <>
                      <Link2 className="h-3.5 w-3.5" /> Copiar link
                    </>
                  )}
                </button>
                <a
                  href={
                    idToken
                      ? `/api/drive-video?id=${encodeURIComponent(fileIdActual)}&download=1&nombre=${encodeURIComponent(entregable.nombre)}&token=${encodeURIComponent(idToken)}`
                      : undefined
                  }
                  aria-disabled={!idToken}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-bg-secondary",
                    !idToken && "pointer-events-none opacity-50"
                  )}
                >
                  <Download className="h-3.5 w-3.5" /> Descargar
                </a>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="-mt-2 mb-5 flex shrink-0 flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
          {usuario.rol === "superadmin" ? (
            <span className="flex items-center gap-1">
              Proyecto:
              <Select
                value={entregable.proyectoId ?? SIN_PROYECTO_VALOR}
                onValueChange={(v) =>
                  asignarProyecto.mutate({ id: entregable.id, proyectoId: v === SIN_PROYECTO_VALOR ? null : v })
                }
              >
                <SelectTrigger className="h-6 w-auto gap-1 border-none bg-transparent px-1.5 py-0 text-xs font-medium text-text-primary shadow-none hover:bg-bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_PROYECTO_VALOR}>Sin proyecto</SelectItem>
                  {proyectos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              ·
            </span>
          ) : (
            nombreProyecto && <span>Proyecto: {nombreProyecto} ·</span>
          )}
          <span className="flex items-center gap-1">
            {CATEGORIA_CONTENIDO_LABELS[entregable.tipo]} ·{" "}
            {usuario.rol === "superadmin" ? (
              <>
                Responsable:
                <Select
                  value={entregable.responsableId}
                  onValueChange={(v) => reasignarResponsable.mutate({ id: entregable.id, responsableId: v })}
                >
                  <SelectTrigger className="h-6 w-auto gap-1 border-none bg-transparent px-1.5 py-0 text-xs font-medium text-text-primary shadow-none hover:bg-bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Candidatos normales: quien puede subir material. Si el responsable actual
                        no esta en ese grupo (ej. su cuenta cambio de rol), se agrega igual para
                        que el Select no se quede sin opcion seleccionada. */}
                    {usuarios
                      .filter((u) => puedeSubirVideos(u) || u.id === entregable.responsableId)
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.nombre}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </>
            ) : (
              `Responsable: ${nombreResponsable}`
            )}{" "}
            · v{entregable.version}
          </span>
        </div>

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
