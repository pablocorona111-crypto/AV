import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowLeftCircle,
  ArrowRightCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  Loader2,
  MessageSquarePlus,
  Monitor,
  Pencil,
  Plus,
  RotateCcw,
  SendHorizontal,
  Smartphone,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUploadQueue } from "@/context/UploadQueueContext";
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
  useActualizarCarpetaFotos,
  useGuardarFotos,
  useMarcarComentariosCorregidos,
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
import {
  subirArchivoCentralizado,
  extraerFileIdDrive,
  extraerCarpetaIdDrive,
  compartirArchivo,
  resolverCarpetaDeArchivo,
  moverABasuraDrive,
} from "@/services/driveService";
import {
  DriveVideoPlayer,
  type DriveVideoPlayerHandle,
  type MotivoErrorDrive,
} from "@/components/entregables/DriveVideoPlayer";
import { MiniaturaVideo } from "@/components/entregables/MiniaturaVideo";
import { mensajeErrorAuth } from "@/lib/authErrors";
import { cn } from "@/lib/utils";
import {
  ESTADO_ENTREGABLE_BADGE,
  esCategoriaFotografia,
  etiquetaEstadoEntregable,
  CATEGORIA_CONTENIDO_LABELS,
} from "@/lib/labels";
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

/** "0:45" o "1:05" -> segundos. `null` si no es un minuto de video reconocible (ej. el "Foto 3"
 * de una galeria de fotos) — para ordenar las observaciones por minuto y poder saltar el video
 * ahi con un clic. */
function parsearMomento(momento: string): number | null {
  const m = momento.match(/^(\d+):(\d{1,2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Si una observacion de fotografia ("Foto 5" o "Fotos 2, 5, 9") aplica a la foto `numero` (1-based,
 * igual al numerito que se ve en la esquina de cada miniatura) — para filtrar los comentarios
 * que se muestran dentro de la vista ampliada de esa foto en particular. */
function comentarioAplicaAFoto(momento: string | undefined, numero: number): boolean {
  if (!momento) return false;
  const numeros = momento.match(/\d+/g)?.map(Number) ?? [];
  return numeros.includes(numero);
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
  const { usuario, driveToken, limpiarDriveToken } = useAuth();
  const { iniciarTarea, actualizarProgreso, marcarLista, marcarError } = useUploadQueue();
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
  const [carpetaCopiada, setCarpetaCopiada] = useState(false);
  const [resolviendoCarpeta, setResolviendoCarpeta] = useState(false);
  const [errorCarpeta, setErrorCarpeta] = useState<string | null>(null);
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
  // Para saltar al minuto exacto de una observacion con un clic (ver bloqueObservaciones).
  const videoPlayerRef = useRef<DriveVideoPlayerHandle>(null);
  const renombrar = useRenombrarEntregable();
  const agregarVersionAlterna = useAgregarVersionAlterna();
  const etiquetarOrientacionAlt = useEtiquetarOrientacionAlt();

  useEffect(() => {
    // Nuevo entregable o se reabrio el dialogo: siempre arranca viendo la version principal.
    setSlotActivo("principal");
    setEditandoNombre(false);
    setFotosComentando([]);
    setFotoAmpliadaIndex(null);
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
  const marcarComentariosCorregidos = useMarcarComentariosCorregidos(entregable?.id ?? "");
  const enviarARevision = useEnviarARevision();
  const adjuntarMaterialHistorico = useAdjuntarMaterialHistorico();
  const aprobar = useAprobarEntregable();
  const solicitarCorrecciones = useSolicitarCorrecciones();
  const marcarEntregado = useMarcarEntregado();
  const etiquetarOrientacion = useEtiquetarOrientacion();
  // Galeria de fotos — hooks declarados aqui arriba (antes del `return null`) para no violar
  // las reglas de hooks: todo lo de abajo depende de `entregable`/`usuario` ya existir.
  const inputFotosRef = useRef<HTMLInputElement>(null);
  const [subiendoFotos, setSubiendoFotos] = useState(false);
  const [progresoFotos, setProgresoFotos] = useState<{ actual: number; total: number; pct: number } | null>(null);
  const [errorFotos, setErrorFotos] = useState<string | null>(null);
  const guardarFotos = useGuardarFotos();
  // Se detiene DESPUES de que termine de subir la foto en curso (no a la mitad) — evita dejar un
  // archivo a medio subir en Drive.
  const cancelarFotosRef = useRef(false);
  const actualizarCarpetaFotos = useActualizarCarpetaFotos();
  // Sobre cuales fotos de la galeria es la observacion que se esta escribiendo (indices en
  // `galeriaFotos`, puede ser mas de una) — reemplaza al campo "minuto" de video, que no tiene
  // sentido en una foto. Tocar el icono de una foto la agrega/quita de la seleccion — asi una
  // misma observacion ("estas 3 salen movidas") se amarra a varias de una vez.
  const [fotosComentando, setFotosComentando] = useState<number[]>([]);
  // Vista previa ampliada dentro del mismo dialogo (indice en `galeriaFotos`) — antes tocar una
  // foto mandaba a una pestaña nueva de Drive, sacando a la persona del flujo de revision.
  const [fotoAmpliadaIndex, setFotoAmpliadaIndex] = useState<number | null>(null);
  // Comentario que se esta escribiendo DENTRO de la vista ampliada — separado de `comentario`
  // (el de la columna de Observaciones) para que escribir en uno no pise lo que se tenia
  // empezado en el otro si la persona abre/cierra la vista ampliada a medias.
  const [comentarioLightbox, setComentarioLightbox] = useState("");
  // Antes el <img> de la vista ampliada se insertaba sin alto reservado — hasta que el navegador
  // terminaba de bajar los bytes reales (no solo pedirlos), su caja media ~0px, asi que el
  // dialogo abria colapsado a solo el panel de comentarios de abajo (la imagen "todavia no
  // salia"). Con esto se reserva un alto minimo desde el primer render y se tapa el <img> con un
  // spinner hasta que `onLoad` confirma que si hay algo que mostrar.
  const [fotoAmpliadaCargando, setFotoAmpliadaCargando] = useState(true);

  useEffect(() => {
    // Cambiar de foto en la vista ampliada (flechas) es, para el composer de ahi, una foto
    // distinta — sin esto, un borrador sin enviar en la foto 3 se arrastraba a la foto 4. Y la
    // CARGA es otra foto nueva — sin resetear esto, una foto ya cargada antes se quedaba tapada
    // por el spinner (nunca vuelve a disparar `onLoad` si el navegador la sirve del cache sin
    // red real de por medio en algunos casos) o, al reves, se mostraba la imagen VIEJA mientras
    // cargaba la nueva.
    setComentarioLightbox("");
    setFotoAmpliadaCargando(true);
  }, [fotoAmpliadaIndex]);

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
  // Fotografia (generica, producto o industrial) usa galeria ordenada de imagenes, no un solo
  // archivo de video — nada de orientacion horizontal/vertical ni reproductor de video aplica
  // aqui (ver bloqueGaleriaFotos mas abajo, que reemplaza a bloqueVideo para este tipo).
  const esFoto = esCategoriaFotografia(entregable.tipo);
  // Para notificaciones/mensajes genericos — "tu video" no tiene sentido en un entregable que es
  // una foto o un diseño.
  const sustantivoMaterial = esFoto ? "fotografia" : esDiseno ? "diseño" : "video";
  // En video, las observaciones se leen mejor en el orden en que pasan EN el video, no en el
  // orden en que se escribieron — las sin minuto reconocible (o las de una galeria de fotos,
  // "Foto 3") se quedan al final, sin reordenar entre ellas.
  const comentariosOrdenados = esFoto
    ? comentarios
    : [...comentarios].sort((a, b) => {
        const ta = a.momento ? parsearMomento(a.momento) : null;
        const tb = b.momento ? parsearMomento(b.momento) : null;
        if (ta == null && tb == null) return 0;
        if (ta == null) return 1;
        if (tb == null) return -1;
        return ta - tb;
      });
  // Compatibilidad con entregables de fotografia creados ANTES de que existiera `fotos` (o
  // cargados como historico con un solo archivo): se muestran como galeria de una sola foto en
  // vez de quedar vacios.
  const galeriaFotos = entregable.fotos ?? (linkPrincipal ? [linkPrincipal] : []);
  // Ya no hace falta `driveToken` para VER el video — el reproductor propio lo pide via
  // `/api/drive-video` con una cuenta de servicio fija, no con la sesion de Drive del usuario.
  // `driveToken` solo sigue haciendo falta para SUBIR videos nuevos (ver `onSeleccionarArchivo`).
  const usaPlayerPropio = Boolean(fileIdActual && !errorPlayerPropio && !esDiseno && !esFoto);
  const modoVisor: "player" | "preview" | "link" | "vacio" = usaPlayerPropio
    ? "player"
    : preview
      ? "preview"
      : linkActual
        ? "link"
        : "vacio";
  // Solo se abre el layout ancho a dos columnas cuando de verdad hay un video/foto que ver.
  // Para un link suelto, un estado vacio o el aviso de conectar Drive, un dialogo angosto se lee mejor.
  const layoutLado = modoVisor === "player" || modoVisor === "preview" || esFoto;

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
    if (!idToken) {
      setErrorSubida("Tu sesion no esta lista todavia. Espera un segundo e intenta de nuevo.");
      return;
    }
    setErrorSubida(null);
    setSubiendo(true);
    setProgreso(0);
    // Tarea en la cola GLOBAL (ver UploadQueueContext) — sigue corriendo y mostrando su progreso
    // aunque la persona cierre este dialogo antes de que termine.
    const tareaId = iniciarTarea(`${esDiseno ? "Diseño" : "Video"}: ${entregable.nombre}`);
    try {
      const fileIdExistente = linkPrincipal ? extraerFileIdDrive(linkPrincipal) ?? undefined : undefined;
      const subido = await subirArchivoCentralizado(file, idToken, {
        nombre: `${nombreProyecto ?? "Sin proyecto"} - ${entregable.nombre}`,
        nombreCarpeta: nombreProyecto ?? "Sin proyecto",
        subcarpeta: esDiseno ? "Diseños" : "Videos",
        fileIdExistente,
        onProgress: (pct) => {
          setProgreso(pct);
          actualizarProgreso(tareaId, pct);
        },
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
        // Quien sube ya corrigio lo que se le pidio — las observaciones pendientes quedan
        // marcadas "corregido" para que el aprobador vea de una cuales ya se atendieron al
        // volver a revisar (no significa que el aprobador ya este de acuerdo, solo que del lado
        // del responsable ya quedaron atendidas). Con `await` + catch propio en vez de
        // "mutate()" sin mas: antes, si esto fallaba (ej. permiso), quedaba en silencio total —
        // el video si quedaba subido pero nadie se enteraba de que esto no se marco.
        if (yaHabiaVideo) {
          try {
            await marcarComentariosCorregidos.mutateAsync();
          } catch (err) {
            console.error("No se pudieron marcar las observaciones como corregidas:", err);
          }
        }
        notificarRevisores(
          `${nombreResponsable} ${yaHabiaVideo ? "actualizo" : "agrego"} el video de "${entregable.nombre}".`
        );
      }
      setSlotActivo("principal");
      marcarLista(tareaId);
    } catch (err) {
      const mensaje = mensajeErrorAuth(err);
      if (/sesion de Drive expiro|403/.test(mensaje)) limpiarDriveToken();
      setErrorSubida(mensaje);
      marcarError(tareaId, mensaje);
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

    if (!idToken) {
      setErrorSubidaAlt("Tu sesion no esta lista todavia. Espera un segundo e intenta de nuevo.");
      return;
    }
    setErrorSubidaAlt(null);
    setSubiendoAlt(true);
    setProgresoAlt(0);
    const tareaId = iniciarTarea(`Video (${orientacionAltSugerida}): ${entregable.nombre}`);
    try {
      const fileIdExistente = linkAlt ? extraerFileIdDrive(linkAlt) ?? undefined : undefined;
      const subido = await subirArchivoCentralizado(file, idToken, {
        nombre: `${nombreProyecto ?? "Sin proyecto"} - ${entregable.nombre} (${orientacionAltSugerida})`,
        nombreCarpeta: nombreProyecto ?? "Sin proyecto",
        subcarpeta: "Videos",
        fileIdExistente,
        onProgress: (pct) => {
          setProgresoAlt(pct);
          actualizarProgreso(tareaId, pct);
        },
      });
      await agregarVersionAlterna.mutateAsync({
        id: entregable.id,
        url: subido.previewUrl,
        orientacionVideoAlt: entregable.orientacionVideoAlt ?? orientacionAltSugerida,
        comoHistorico: completandoHistorico,
      });
      setSlotActivo("alt");
      marcarLista(tareaId);
      if (!completandoHistorico) {
        notificarRevisores(
          `${nombreResponsable} agrego la version ${orientacionAltSugerida} de "${entregable.nombre}".`
        );
      }
    } catch (err) {
      const mensaje = mensajeErrorAuth(err);
      if (/sesion de Drive expiro|403/.test(mensaje)) limpiarDriveToken();
      setErrorSubidaAlt(mensaje);
      marcarError(tareaId, mensaje);
    } finally {
      setSubiendoAlt(false);
    }
  };

  // Galeria de fotos: subir siempre AGREGA archivos nuevos al final (nunca reemplaza uno
  // existente, a diferencia del video) — una sesion de fotos crece, no se "corrige" reemplazando
  // la misma foto. Reordenar/quitar reescriben el arreglo completo via guardarFotos.
  const onSeleccionarFotos = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivos = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (archivos.length === 0) return;

    // Carpeta YA conocida (de una subida anterior, o del backfill de "Obtener link") — subir
    // directo ahi evita que una foto mas quede en una carpeta distinta si el proyecto se
    // renombro o se borro desde entonces (`nombreProyecto` resolveria otra cosa, ej.
    // "Proyecto eliminado"). Sin esto, "todas dentro" se rompia con el tiempo.
    const carpetaIdConocida = entregable.carpetaFotosUrl ? extraerCarpetaIdDrive(entregable.carpetaFotosUrl) : null;

    if (!idToken) {
      setErrorFotos("Tu sesion no esta lista todavia. Espera un segundo e intenta de nuevo.");
      return;
    }
    cancelarFotosRef.current = false;
    setErrorFotos(null);
    setSubiendoFotos(true);
    const tareaId = iniciarTarea(
      `${archivos.length > 1 ? `${archivos.length} fotos` : "Foto"}: ${entregable.nombre}`
    );
    try {
      const nuevas: string[] = [];
      let carpetaUrl: string | undefined;
      for (let i = 0; i < archivos.length; i++) {
        if (cancelarFotosRef.current) break;
        setProgresoFotos({ actual: i + 1, total: archivos.length, pct: 0 });
        const subida = await subirArchivoCentralizado(archivos[i], idToken, {
          nombre: `${nombreProyecto ?? "Sin proyecto"} - ${entregable.nombre} (foto ${galeriaFotos.length + nuevas.length + 1})`,
          nombreCarpeta: nombreProyecto ?? "Sin proyecto",
          subcarpeta: "Fotografias",
          carpetaIdDestino: carpetaIdConocida ?? undefined,
          onProgress: (pct) => {
            setProgresoFotos({ actual: i + 1, total: archivos.length, pct });
            actualizarProgreso(tareaId, Math.round(((i + pct / 100) / archivos.length) * 100));
          },
        });
        nuevas.push(subida.previewUrl);
        carpetaUrl ??= subida.carpetaUrl;
      }
      if (nuevas.length > 0) {
        await guardarFotos.mutateAsync({
          id: entregable.id,
          fotos: [...galeriaFotos, ...nuevas],
          comoHistorico: completandoHistorico,
          // Una vez que el entregable ya tiene carpeta conocida, no hace falta pisarla cada vez.
          carpetaFotosUrl: entregable.carpetaFotosUrl ?? carpetaUrl,
        });
        if (!completandoHistorico) {
          if (galeriaFotos.length > 0) {
            try {
              await marcarComentariosCorregidos.mutateAsync();
            } catch (err) {
              console.error("No se pudieron marcar las observaciones como corregidas:", err);
            }
          }
          notificarRevisores(
            `${nombreResponsable} agrego ${nuevas.length > 1 ? `${nuevas.length} fotos` : "una foto"} a "${entregable.nombre}".`
          );
        }
      }
      if (cancelarFotosRef.current && nuevas.length < archivos.length) {
        setErrorFotos(`Detenido: se subieron ${nuevas.length} de ${archivos.length} fotos.`);
        marcarLista(tareaId);
      } else {
        marcarLista(tareaId);
      }
    } catch (err) {
      const mensaje = mensajeErrorAuth(err);
      if (/sesion de Drive expiro|403/.test(mensaje)) limpiarDriveToken();
      setErrorFotos(mensaje);
      marcarError(tareaId, mensaje);
    } finally {
      setSubiendoFotos(false);
      setProgresoFotos(null);
    }
  };

  const onDetenerSubidaFotos = () => {
    cancelarFotosRef.current = true;
  };

  const onEliminarFoto = async (url: string) => {
    setErrorFotos(null);
    guardarFotos.mutate({
      id: entregable.id,
      fotos: galeriaFotos.filter((f) => f !== url),
      comoHistorico: completandoHistorico,
    });
    // La galeria ya se actualiza arriba sin esperar a Drive — "ya no la quiero" se refleja de
    // inmediato aqui. Borrar el archivo de verdad es best-effort: si falla (ej. foto de antes de
    // centralizar, sin permiso de edicion), se avisa pero la foto de todos modos ya desaparecio
    // de la galeria.
    const fileId = extraerFileIdDrive(url);
    if (fileId && idToken) {
      try {
        await moverABasuraDrive(idToken, fileId);
      } catch (err) {
        setErrorFotos(
          `La foto se quito de la galeria, pero no se pudo borrar en Drive: ${
            err instanceof Error ? err.message : "error desconocido"
          }`
        );
      }
    }
  };

  const onMoverFoto = (indice: number, direccion: -1 | 1) => {
    const destino = indice + direccion;
    if (destino < 0 || destino >= galeriaFotos.length) return;
    const reordenadas = [...galeriaFotos];
    [reordenadas[indice], reordenadas[destino]] = [reordenadas[destino], reordenadas[indice]];
    guardarFotos.mutate({ id: entregable.id, fotos: reordenadas, comoHistorico: completandoHistorico });
  };

  // Backfill para galerias subidas ANTES de que `carpetaFotosUrl` existiera: pide la carpeta del
  // archivo via `/api/drive-folder` (cuenta de servicio, cualquiera con sesion puede leerla) y la
  // guarda. Si quien lo hace ya tiene `driveToken` (ya conecto Drive antes para subir), de paso
  // intenta compartir la carpeta publica — sin pedirle conectar Drive solo para esto si no lo
  // tenia ya.
  const onObtenerCarpeta = async () => {
    const primerFileId = galeriaFotos[0] ? extraerFileIdDrive(galeriaFotos[0]) : null;
    if (!primerFileId) return;
    setErrorCarpeta(null);
    setResolviendoCarpeta(true);
    try {
      // Primero con la sesion de Drive de quien esta aqui (si ya conecto antes) — Drive le
      // expone `parents` a quien de verdad tiene acceso al archivo, no solo via el permiso
      // publico "cualquiera con el link" (que es lo unico que tiene la cuenta de servicio para
      // fotos viejas cuya CARPETA nunca se compartio, solo el archivo). Si no hay driveToken o
      // ese intento no resuelve nada, cae al endpoint con la cuenta de servicio.
      let resultado = driveToken ? await resolverCarpetaDeArchivo(primerFileId, driveToken) : null;
      if (!resultado && idToken) {
        const res = await fetch(
          `/api/drive-folder?id=${encodeURIComponent(primerFileId)}&token=${encodeURIComponent(idToken)}`
        );
        const data = (await res.json()) as { carpetaId?: string; carpetaUrl?: string; error?: string };
        if (res.ok && data.carpetaId && data.carpetaUrl) {
          resultado = { carpetaId: data.carpetaId, carpetaUrl: data.carpetaUrl };
        } else if (!driveToken) {
          // Sin driveToken no hubo primer intento que reportar — este SI es el error real.
          throw new Error(data.error || "No se pudo obtener la carpeta.");
        }
      }
      if (!resultado) {
        throw new Error(
          "No se pudo leer la carpeta de este archivo (puede que nunca se haya compartido). Conecta Drive e intenta de nuevo."
        );
      }
      if (driveToken) {
        try {
          await compartirArchivo(resultado.carpetaId, driveToken);
        } catch {
          // si no se pudo compartir, el link igual se guarda — puede que ya estuviera compartida.
        }
      }
      await actualizarCarpetaFotos.mutateAsync({ id: entregable.id, carpetaFotosUrl: resultado.carpetaUrl });
    } catch (err) {
      setErrorCarpeta(err instanceof Error ? err.message : "No se pudo obtener la carpeta.");
    } finally {
      setResolviendoCarpeta(false);
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
    notificarA(entregable.responsableId, `Tu ${sustantivoMaterial} "${entregable.nombre}" fue aprobado.`);
  };

  // Antes se podia pedir cambios sin haber escrito ninguna observacion — el responsable recibia
  // "revisa las observaciones" y no habia ninguna que revisar. Si hay texto sin enviar en el
  // cuadro de comentario, se guarda primero (para no perderlo); el boton en si queda deshabilitado
  // si no hay NADA que explicar (ver el `disabled` en el JSX de abajo).
  const onSolicitarCorrecciones = async () => {
    if (comentario.trim()) await onComentar();
    await solicitarCorrecciones.mutateAsync(entregable.id);
    notificarA(
      entregable.responsableId,
      `Pidieron cambios en tu ${sustantivoMaterial} "${entregable.nombre}". Revisa las observaciones.`
    );
  };

  const onMarcarEntregado = async () => {
    await marcarEntregado.mutateAsync(entregable.id);
    notificarA(entregable.responsableId, `Tu ${sustantivoMaterial} "${entregable.nombre}" ya quedo entregado.`);
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

  // En video `momento` es un minuto escrito a mano ("0:45"). En una foto no hay minuto — lo que
  // identifica a cual observacion se refiere es el (o los) NUMERO(S) de foto, elegidos tocando
  // el icono de comentario en la galeria (`fotosComentando`, ver bloqueGaleriaFotos) — una misma
  // observacion puede amarrarse a varias fotos de un jalon.
  const numerosFotoComentando = [...fotosComentando].sort((a, b) => a - b).map((i) => i + 1);
  const momentoAEnviar = esFoto
    ? numerosFotoComentando.length > 0
      ? numerosFotoComentando.length === 1
        ? `Foto ${numerosFotoComentando[0]}`
        : `Fotos ${numerosFotoComentando.join(", ")}`
      : ""
    : momento.trim();

  const onComentar = async () => {
    if (!comentario.trim()) return;
    await agregarComentario.mutateAsync({
      autorId: usuario.id,
      autorNombre: usuario.nombre,
      texto: comentario,
      ...(momentoAEnviar ? { momento: momentoAEnviar } : {}),
    });
    setComentario("");
    setMomento("");
    setFotosComentando([]);

    if (!esResponsable) {
      notificarA(
        entregable.responsableId,
        `${usuario.nombre} dejo una observacion en "${entregable.nombre}"${
          momentoAEnviar ? ` (${esFoto ? momentoAEnviar : `min ${momentoAEnviar}`})` : ""
        }`
      );
    }
  };

  /** Comentar DESDE la vista ampliada (ver bloque del lightbox mas abajo) — siempre amarrado a
   * la foto que se esta viendo ahi, sin depender de la seleccion de `fotosComentando` de la
   * galeria (son dos composers independientes). */
  const onComentarLightbox = async () => {
    if (!comentarioLightbox.trim() || fotoAmpliadaIndex == null) return;
    const momento = `Foto ${fotoAmpliadaIndex + 1}`;
    await agregarComentario.mutateAsync({
      autorId: usuario.id,
      autorNombre: usuario.nombre,
      texto: comentarioLightbox,
      momento,
    });
    setComentarioLightbox("");
    if (!esResponsable) {
      notificarA(entregable.responsableId, `${usuario.nombre} dejo una observacion en "${entregable.nombre}" (${momento})`);
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
  // La version alterna solo aplica a video (un diseño grafico o una foto no tienen
  // "orientacion") y solo tiene sentido ofrecerla cuando ya existe la principal — primero se sube esa.
  const puedeAgregarAlt =
    puedeEditarMaterial && puedeSubirVideos(usuario) && !esDiseno && !esFoto && Boolean(linkPrincipal);

  const selectorDeVersion = (tieneAlt || puedeAgregarAlt) && !esDiseno && !esFoto && (
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
          ref={videoPlayerRef}
          fileId={fileIdActual}
          orientacion={orientacion}
          onMomentoPausa={setMomento}
          onError={setErrorPlayerPropio}
          onOrientacion={onOrientacionDetectada}
          onRatio={setRatioReal}
        />
      )}

      {modoVisor === "preview" && preview && (
        // `lg:h-full` solo para diseño: esa caja no tiene aspect-ratio fijo, quiere ocupar toda
        // la altura disponible. Para video, igual que en DriveVideoPlayer.tsx, nada de
        // flex-grow/altura forzada — el mismo bug de "se corta" que ya se arreglo ahi (la caja
        // dependia de flex-1 para su alto; sin una altura externa forzada de donde crecer,
        // colapsaba o se desbordaba del dialogo sin aviso) tambien vivia aqui, en el visor de
        // respaldo (modoVisor "preview"), sin que se hubiera tocado la primera vez.
        <div className={cn("flex w-full flex-col gap-2", esDiseno && "lg:h-full")}>
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
                : "min-h-[180px] max-h-[60vh] bg-black lg:max-h-[55vh] lg:max-w-2xl"
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

  // Galeria ordenada: el numero en la esquina y el orden de la cuadricula SON el orden real
  // (el mismo que se guarda en `fotos`) — mover con las flechas o quitar una foto reescribe el
  // arreglo completo via onMoverFoto/onEliminarFoto.
  const bloqueGaleriaFotos = (
    <div
      className={cn(
        "flex flex-col gap-3",
        // Ancho EXPLICITO (no min/max sueltos) — el dialogo (`lg:w-fit` en DialogContent) se
        // ajusta al ancho real de su contenido, y un grid de 3 columnas adentro de un
        // contenedor sin ancho propio (`w-fit`/`w-auto`) se encoge a su "min-content" en vez de
        // usar el espacio que sobra — por eso antes la galeria se veia angosta aunque el
        // `max-w` permitido fuera enorme (nunca se llegaba a usar). `min(1400px,78vw)` le da una
        // base real de la cual el grid si deriva columnas anchas, topada para no desbordar en
        // pantallas chicas.
        layoutLado && "w-full lg:w-[min(1400px,78vw)]"
      )}
    >
      {entregable.carpetaFotosUrl && (
        <div className="flex shrink-0 flex-wrap gap-2">
          <a
            href={entregable.carpetaFotosUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-border bg-bg-secondary px-3 py-1.5 text-xs font-medium transition-colors hover:bg-border/60"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Ver todas las fotos en Drive
          </a>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(entregable.carpetaFotosUrl!);
              setCarpetaCopiada(true);
              setTimeout(() => setCarpetaCopiada(false), 1500);
            }}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-bg-secondary"
          >
            {carpetaCopiada ? (
              <>
                <Check className="h-3.5 w-3.5" /> Copiado
              </>
            ) : (
              <>
                <Link2 className="h-3.5 w-3.5" /> Compartir carpeta
              </>
            )}
          </button>
        </div>
      )}
      {!entregable.carpetaFotosUrl && galeriaFotos.length > 0 && (
        <div className="shrink-0 space-y-1">
          <button
            type="button"
            onClick={onObtenerCarpeta}
            disabled={resolviendoCarpeta || !idToken}
            className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-bg-secondary disabled:opacity-60"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {resolviendoCarpeta ? "Buscando la carpeta..." : "Obtener link para compartir todas las fotos"}
          </button>
          {errorCarpeta && <p className="text-xs text-destructive">{errorCarpeta}</p>}
        </div>
      )}
      <div className={cn(layoutLado && "lg:max-h-[68vh] lg:overflow-y-auto lg:pr-1 scrollbar-thin")}>
      {galeriaFotos.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          Sin fotos cargadas todavia.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {/* Con al menos una foto ya marcada, un clic en CUALQUIER otra foto la suma a la
              seleccion (ya no hace falta acertarle al iconito cada vez) — en vez de abrir la
              vista ampliada, que es lo que hace un clic normal cuando no hay nada marcado
              todavia. Doble clic SIEMPRE abre la vista ampliada, sea cual sea el modo, como
              salida rapida sin tener que vaciar la seleccion primero. */}
          {(() => {
            const modoSeleccion = puedeComentar && !yaResuelto && fotosComentando.length > 0;
            return galeriaFotos.map((url, i) => {
            const totalComentariosFoto = comentarios.filter((c) =>
              comentarioAplicaAFoto(c.momento, i + 1)
            ).length;
            const seleccionada = fotosComentando.includes(i);
            return (
            <div
              key={url}
              className={cn(
                "group relative overflow-hidden rounded-xl ring-1 transition-all duration-200",
                seleccionada
                  ? "ring-2 ring-accent"
                  : "ring-border hover:shadow-lg hover:shadow-black/10 hover:ring-text-primary/25"
              )}
            >
              <button
                type="button"
                onClick={() => {
                  if (modoSeleccion) {
                    setFotosComentando((actual) =>
                      actual.includes(i) ? actual.filter((x) => x !== i) : [...actual, i]
                    );
                  } else {
                    setFotoAmpliadaIndex(i);
                  }
                }}
                onDoubleClick={() => setFotoAmpliadaIndex(i)}
                className="block w-full"
                title={modoSeleccion ? "Clic para sumar/quitar de la seleccion — doble clic para ver" : undefined}
              >
                <MiniaturaVideo url={url} className="aspect-square" ocultarPlay />
              </button>
              <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                {i + 1}
              </span>
              {totalComentariosFoto > 0 && (
                <span className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                  <MessageSquarePlus className="h-3 w-3" /> {totalComentariosFoto}
                </span>
              )}
              {puedeComentar && !yaResuelto && (
                <button
                  type="button"
                  onClick={() =>
                    setFotosComentando((actual) =>
                      actual.includes(i) ? actual.filter((x) => x !== i) : [...actual, i]
                    )
                  }
                  className={cn(
                    "absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition-colors",
                    seleccionada
                      ? "bg-accent text-accent-foreground"
                      : "bg-black/50 text-white hover:bg-black/75"
                  )}
                  title="Marcar esta foto para comentar (toca varias para amarrar la misma observacion a todas)"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                </button>
              )}
              {puedeEditarMaterial && (
                <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => onMoverFoto(i, -1)}
                    disabled={i === 0}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/75 disabled:opacity-30"
                    title="Mover antes"
                  >
                    <ArrowLeftCircle className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoverFoto(i, 1)}
                    disabled={i === galeriaFotos.length - 1}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/75 disabled:opacity-30"
                    title="Mover despues"
                  >
                    <ArrowRightCircle className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEliminarFoto(url)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-destructive"
                    title="Quitar foto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            );
            });
          })()}
        </div>
      )}
      </div>
    </div>
  );

  const bloqueSubirMaterial = puedeEditarMaterial && puedeSubirVideos(usuario) && esFoto && (
    <div className="space-y-2 rounded-md border border-border p-3">
      <Label>Subir fotografias</Label>
      <input
        ref={inputFotosRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onSeleccionarFotos}
      />
      <div className="flex gap-1.5">
        <Button
          type="button"
          className="flex-1"
          onClick={() => inputFotosRef.current?.click()}
          disabled={subiendoFotos}
        >
          <Upload className="h-4 w-4" />
          {subiendoFotos && progresoFotos
            ? `Subiendo foto ${progresoFotos.actual}/${progresoFotos.total}... ${progresoFotos.pct}%`
            : galeriaFotos.length > 0
              ? "Agregar mas fotos"
              : "Subir fotografias a Drive"}
        </Button>
        {subiendoFotos && (
          <Button type="button" variant="outline" onClick={onDetenerSubidaFotos} title="Se detiene al terminar la foto actual">
            Detener
          </Button>
        )}
      </div>
      {errorFotos && <p className="text-xs text-destructive">{errorFotos}</p>}
    </div>
  );

  const bloqueSubirVideo = puedeEditarMaterial && puedeSubirVideos(usuario) && !esFoto && (
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
    <div
      className={cn(
        "space-y-4",
        layoutLado && "min-w-0 flex-1 lg:min-w-[360px] lg:max-w-md",
        // En fotografia, esta columna NO se estira con `items-stretch` (se queda en su alto
        // natural, `lg:self-start`) y tiene su propio tope/scroll en vh — asi queda fija en su
        // lugar mientras la galeria (bloqueGaleriaFotos) se desplaza por su cuenta, en vez de
        // arrastrarse junto con las fotos como un solo bloque.
        esFoto && layoutLado && "lg:self-start lg:max-h-[68vh] lg:overflow-y-auto lg:pr-1 scrollbar-thin"
      )}
    >
      {yaResuelto && (
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
      )}
      {/* El historial de observaciones se muestra SIEMPRE, aprobado/entregado o no — antes
          desaparecia por completo al quedar resuelto (reemplazado por el bloque "Estado" de
          arriba), asi que en un entregable que ya nacio aprobado/entregado (ej. casi toda la
          fotografia, cargada como historico ya cerrado) nunca se alcanzaba a ver ningun
          comentario, aunque los hubiera. Lo unico que sigue dependiendo de `yaResuelto` es poder
          agregar uno NUEVO — no tiene sentido seguir corrigiendo algo que ya se aprobo/entrego. */}
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
          {comentariosOrdenados.map((c) => {
            const segundosMomento = !esFoto && c.momento ? parsearMomento(c.momento) : null;
            const puedeSaltar = segundosMomento != null && usaPlayerPropio;
            return (
            <div key={c.id} className="flex items-start gap-2.5">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-[10px]">{iniciales(c.autorNombre)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 rounded-lg rounded-tl-none bg-card p-2.5 shadow-card dark:bg-bg-secondary">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold">{c.autorNombre}</span>
                  {c.momento && (
                    puedeSaltar ? (
                      <button
                        type="button"
                        onClick={() => videoPlayerRef.current?.seekTo(segundosMomento)}
                        className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-text-primary hover:bg-accent/25"
                        title="Saltar a este momento del video"
                      >
                        <Clock className="h-3 w-3" /> min {c.momento}
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-text-primary">
                        {esFoto ? (
                          <>
                            <ImageIcon className="h-3 w-3" /> {c.momento}
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" /> min {c.momento}
                          </>
                        )}
                      </span>
                    )
                  )}
                  {c.corregido && (
                    <span
                      className="flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] font-medium text-green-600 dark:text-green-400"
                      title="El responsable ya subio una correccion desde esta observacion"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Corregido
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm">{c.texto}</p>
              </div>
            </div>
            );
          })}
        </div>
        {puedeComentar && !yaResuelto && (
          <div className="space-y-1.5">
            {esFoto ? (
              numerosFotoComentando.length > 0 && (
                <div className="flex items-center justify-between gap-2 rounded-md bg-accent/15 px-2.5 py-1.5 text-xs font-medium text-text-primary">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5" />
                    {numerosFotoComentando.length === 1
                      ? `Sobre la foto #${numerosFotoComentando[0]}`
                      : `Sobre las fotos #${numerosFotoComentando.join(", #")}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFotosComentando([])}
                    className="rounded p-0.5 text-muted-foreground hover:text-text-primary"
                    title="Quitar fotos seleccionadas"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            ) : (
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
            )}
            {esFoto && (
              <Input
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onComentar();
                }}
                placeholder="Ej. Esta foto sale movida"
              />
            )}
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
              {esFoto
                ? "Toca el icono de comentario en una o varias fotos de la galeria para amarrar la observacion a esas fotos (opcional)."
                : usaPlayerPropio
                  ? "Se llena solo mientras reproduces."
                  : "Anota el minuto donde esta el cambio que pides."}
            </p>
          </div>
        )}
      </div>

      {esAprobador && (entregable.estado === "en_revision" || entregable.estado === "correcciones") && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onSolicitarCorrecciones}
            disabled={solicitarCorrecciones.isPending || (comentarios.length === 0 && !comentario.trim())}
            title={
              comentarios.length === 0 && !comentario.trim()
                ? "Escribe primero que hay que corregir"
                : undefined
            }
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

      {bloqueSubirMaterial}
      {bloqueSubirVideo}
    </div>
  );

  const fotoAmpliadaUrl = fotoAmpliadaIndex != null ? galeriaFotos[fotoAmpliadaIndex] : null;
  const fotoAmpliadaFileId = fotoAmpliadaUrl ? extraerFileIdDrive(fotoAmpliadaUrl) : null;
  const comentariosDeFotoAmpliada =
    fotoAmpliadaIndex != null ? comentarios.filter((c) => comentarioAplicaAFoto(c.momento, fotoAmpliadaIndex + 1)) : [];

  return (
    <>
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
            {fileIdActual && (
              <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
                {/* Copiar el link NO espera a que este aprobado — en revision tambien sirve
                    mandarselo a alguien mas para que opine, sin tener que esperar. Descargar si
                    se queda solo para lo ya aprobado/entregado (regla de negocio: no repartir el
                    archivo final antes de que este listo de verdad). */}
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
                {(entregable.estado === "aprobado" || entregable.estado === "entregado") && (
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
                )}
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
            // Antes `lg:overflow-visible`: si el contenido de esta fila (video + observaciones)
            // excedia el `max-h-[85vh]` del dialogo, se desbordaba silenciosamente y quedaba
            // CORTADO por el `overflow-hidden` del DialogContent (sin scrollbar, sin aviso) — se
            // notaba sobre todo al agregar la version alterna (tabs Horizontal/Vertical + boton
            // "+ Agregar...") porque suman alto arriba del video. `lg:overflow-y-auto` deja que
            // la fila scrollee cuando de verdad no cabe, en vez de recortar contenido sin avisar.
            //
            // Para fotografia: esta fila se deja TAL CUAL (con su overflow-y-auto normal) — un
            // intento anterior de "cada columna con su propio scroll via lg:h-full" dependia de
            // que la altura stretch del flexbox se propagara bien por varias capas anidadas
            // (flex-col > flex-1/min-h-0 > h-full > overflow-y-auto); en produccion esa cadena
            // no resolvia una altura real en algun caso, y el scroll de la galeria dejaba de
            // funcionar por completo (fotos inaccesibles, sin forma de bajar a verlas). Ahora
            // bloqueGaleriaFotos y bloqueObservaciones usan un `max-h` fijo en vh (mismo patron
            // ya probado en video, diseño y el propio lightbox) — no depende de la altura del
            // padre, asi que no se puede "romper" por la cadena de flexbox.
            layoutLado
              ? "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto lg:flex-row lg:items-stretch lg:gap-6"
              : "space-y-4 overflow-y-auto"
          )}
        >
          {esFoto ? bloqueGaleriaFotos : bloqueVideo}
          {bloqueObservaciones}
        </div>
      </DialogContent>
    </Dialog>

    {/* Vista previa ampliada: antes tocar una foto mandaba a Drive en pestaña nueva, sacando a
        la persona del dialogo de revision. Ahora se ve grande aqui mismo, con flechas para pasar
        a la siguiente sin cerrar nada — diseño tipo visor de fotos (barra flotante sobre la
        imagen, panel de comentarios debajo con el mismo lenguaje visual que Observaciones:
        avatar + burbuja, badge "Corregido" en verde, composer en pildora). */}
    <Dialog open={fotoAmpliadaIndex != null} onOpenChange={(v) => !v && setFotoAmpliadaIndex(null)}>
      <DialogContent
        overlayClassName="bg-black/90 backdrop-blur-sm"
        className="flex max-h-[92vh] w-full max-w-[95vw] flex-col gap-0 overflow-hidden rounded-2xl border-white/10 bg-[#0B0B0C] p-0 sm:max-w-3xl [&>button]:z-20 [&>button]:rounded-full [&>button]:bg-black/50 [&>button]:p-1.5 [&>button]:text-white/90 [&>button]:backdrop-blur-sm [&>button]:hover:bg-black/70"
      >
        {fotoAmpliadaUrl && (
          <>
            {/* `min-h-[40vh]`: un <img> sin ancho/alto propios todavia (bytes sin terminar de
                bajar) mide ~0px — sin este piso, el dialogo abria colapsado al tamaño del panel
                de comentarios de abajo, como si la foto nunca fuera a aparecer. El <img> real
                queda invisible (no desmontado, para que su `onLoad` si dispare) hasta que
                `fotoAmpliadaCargando` se apague. */}
            <div className="group/stage relative flex w-full min-h-[40vh] shrink-0 items-center justify-center bg-black">
              {fotoAmpliadaFileId && idToken ? (
                <>
                  {fotoAmpliadaCargando && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-white/40" />
                    </div>
                  )}
                  <img
                    key={fotoAmpliadaFileId}
                    src={`/api/drive-thumbnail?id=${encodeURIComponent(fotoAmpliadaFileId)}&token=${encodeURIComponent(idToken)}&size=1600`}
                    alt=""
                    onLoad={() => setFotoAmpliadaCargando(false)}
                    onError={() => setFotoAmpliadaCargando(false)}
                    className={cn(
                      "max-h-[58vh] w-auto max-w-full object-contain",
                      fotoAmpliadaCargando && "invisible"
                    )}
                  />
                </>
              ) : (
                <div className="flex h-72 w-full items-center justify-center text-sm text-white/50">
                  Cargando...
                </div>
              )}

              {/* Barra flotante superior: contador + abrir en Drive, sobre la imagen (no le
                  resta alto al visor). Siempre visible — a diferencia de las flechas, no
                  depende de hover, para que no se sienta oculta en touch/mobile. */}
              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-3">
                <span className="pointer-events-auto rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm">
                  {fotoAmpliadaIndex! + 1} / {galeriaFotos.length}
                </span>
                <a
                  href={fotoAmpliadaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm transition-colors hover:bg-black/70"
                >
                  <ExternalLink className="h-3 w-3" /> Abrir en Drive
                </a>
              </div>

              {fotoAmpliadaIndex! > 0 && (
                <button
                  type="button"
                  onClick={() => setFotoAmpliadaIndex((i) => (i != null ? i - 1 : i))}
                  className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-all duration-150 hover:bg-black/70 group-hover/stage:opacity-100"
                  title="Foto anterior"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}
              {fotoAmpliadaIndex! < galeriaFotos.length - 1 && (
                <button
                  type="button"
                  onClick={() => setFotoAmpliadaIndex((i) => (i != null ? i + 1 : i))}
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-all duration-150 hover:bg-black/70 group-hover/stage:opacity-100"
                  title="Siguiente foto"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}
            </div>

            {/* Comentar sin salir de la vista ampliada — antes solo se podia desde la columna
                de Observaciones, afuera de este lightbox. Amarrado siempre a ESTA foto. Mismo
                estilo de burbuja/avatar que la columna de Observaciones, para que se lea como
                parte del mismo sistema, no como un cuadro de chat aparte. */}
            <div className="min-h-0 shrink-0 space-y-3 border-t border-white/10 bg-white/[0.03] p-3.5">
              {comentariosDeFotoAmpliada.length > 0 && (
                <div className="max-h-32 space-y-2.5 overflow-y-auto pr-1 scrollbar-thin">
                  {comentariosDeFotoAmpliada.map((c) => (
                    <div key={c.id} className="flex items-start gap-2">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="text-[9px] bg-white/10 text-white/80">
                          {iniciales(c.autorNombre)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 rounded-lg rounded-tl-none bg-white/5 px-2.5 py-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-white">{c.autorNombre}</span>
                          {c.corregido && (
                            <span className="flex items-center gap-1 rounded-full bg-green-500/15 px-1.5 py-0.5 text-[10px] font-medium text-green-400">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Corregido
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/85">{c.texto}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {puedeComentar && !yaResuelto && (
                <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 pl-4 pr-1.5 focus-within:border-white/30">
                  <input
                    value={comentarioLightbox}
                    onChange={(e) => setComentarioLightbox(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onComentarLightbox();
                    }}
                    placeholder="Comentar sobre esta foto..."
                    className="h-7 min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={onComentarLightbox}
                    disabled={agregarComentario.isPending || !comentarioLightbox.trim()}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-opacity hover:brightness-95 disabled:opacity-30"
                    title="Enviar"
                  >
                    <SendHorizontal className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
