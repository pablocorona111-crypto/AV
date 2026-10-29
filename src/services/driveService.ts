const BOUNDARY = "av_control_upload_boundary";
const CARPETA_RAIZ = "AV Control";

export interface ArchivoSubido {
  id: string;
  previewUrl: string;
  viewUrl: string;
  /** Carpeta de Drive donde quedo el archivo — solo en subidas nuevas (no al reemplazar
   * contenido de un `fileIdExistente`, ahi no se vuelve a resolver la carpeta). */
  carpetaId?: string;
  carpetaUrl?: string;
}

/** Extrae el ID de archivo de Drive de cualquier link (view, preview, open?id=...). */
export function extraerFileIdDrive(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}


/** Arma un mensaje de error util a partir de la respuesta de la API de Drive — antes se tiraba
 * siempre el mismo texto generico ("No se pudo buscar/crear la carpeta en Drive"), sin decir
 * POR QUE, asi que un token vencido, un scope insuficiente o un error real de Google se veian
 * identicos y no se podian diagnosticar. */
async function errorDrive(res: Response, accion: string): Promise<Error> {
  if (res.status === 401) {
    return new Error("Tu sesion de Drive expiro. Dale subir otra vez — va a pedir permiso de Google de nuevo.");
  }
  let detalle = "";
  try {
    const data = await res.json();
    detalle = data?.error?.message ?? "";
  } catch {
    // respuesta sin JSON — se deja sin detalle, el status ya dice algo.
  }
  if (res.status === 403) {
    return new Error(
      `No se pudo ${accion} en Drive: permiso insuficiente (403).${detalle ? ` ${detalle}` : ""} Dale subir otra vez — va a pedir permiso de Google de nuevo.`
    );
  }
  return new Error(`No se pudo ${accion} en Drive (codigo ${res.status}).${detalle ? ` ${detalle}` : ""}`);
}

async function buscarCarpeta(nombre: string, accessToken: string, parentId: string | null): Promise<string | null> {
  const escapado = nombre.replace(/'/g, "\\'");
  const condiciones = [
    `name='${escapado}'`,
    "mimeType='application/vnd.google-apps.folder'",
    "trashed=false",
    parentId ? `'${parentId}' in parents` : "'root' in parents",
  ];
  const q = encodeURIComponent(condiciones.join(" and "));
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw await errorDrive(res, "buscar la carpeta");
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

async function crearCarpeta(nombre: string, accessToken: string, parentId: string | null): Promise<string> {
  const res = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: nombre,
      mimeType: "application/vnd.google-apps.folder",
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  });
  if (!res.ok) throw await errorDrive(res, "crear la carpeta");
  const data = await res.json();
  return data.id;
}

async function obtenerOCrearCarpeta(
  nombre: string,
  accessToken: string,
  parentId: string | null = null
): Promise<string> {
  const existente = await buscarCarpeta(nombre, accessToken, parentId);
  if (existente) return existente;
  return crearCarpeta(nombre, accessToken, parentId);
}

function subirContenidoNuevo(
  file: File,
  accessToken: string,
  nombre: string,
  carpetaId: string,
  onProgress?: (porcentaje: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const metadata = { name: nombre, parents: [carpetaId] };
    const body = new Blob(
      [
        `--${BOUNDARY}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
        JSON.stringify(metadata),
        `\r\n--${BOUNDARY}\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`,
        file,
        `\r\n--${BOUNDARY}--`,
      ],
      { type: `multipart/related; boundary=${BOUNDARY}` }
    );

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id");
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("Content-Type", `multipart/related; boundary=${BOUNDARY}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(xhr.status === 401 ? "Tu sesion de Drive expiro. Reconecta e intenta de nuevo." : "No se pudo subir el video a Drive."));
        return;
      }
      resolve((JSON.parse(xhr.responseText) as { id: string }).id);
    };
    xhr.onerror = () => reject(new Error("Error de red al subir a Drive."));
    xhr.send(body);
  });
}

function reemplazarContenido(
  fileId: string,
  file: File,
  accessToken: string,
  onProgress?: (porcentaje: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PATCH", `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(
          new Error(
            xhr.status === 401
              ? "Tu sesion de Drive expiro. Reconecta e intenta de nuevo."
              : "No se pudo reemplazar el video en Drive."
          )
        );
        return;
      }
      resolve();
    };
    xhr.onerror = () => reject(new Error("Error de red al subir a Drive."));
    xhr.send(file);
  });
}

async function renombrarArchivo(fileId: string, nombre: string, accessToken: string): Promise<void> {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: nombre }),
  });
}

/** Publico: `role: reader, type: anyone` — mismo permiso para un archivo o una carpeta (la API
 * de Drive usa el mismo endpoint para ambos). Exportada para compartir la carpeta de una galeria
 * de fotos ya subida (ver backfill de `carpetaFotosUrl` en RevisarEntregableDialog.tsx). */
export async function compartirArchivo(fileId: string, accessToken: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
  if (!res.ok) throw new Error("No se pudo compartir el archivo en Drive.");
}

function linksDe(id: string, carpetaId?: string): ArchivoSubido {
  return {
    id,
    previewUrl: `https://drive.google.com/file/d/${id}/preview`,
    viewUrl: `https://drive.google.com/file/d/${id}/view`,
    ...(carpetaId ? { carpetaId, carpetaUrl: `https://drive.google.com/drive/folders/${carpetaId}` } : {}),
  };
}

/**
 * Sube un archivo a Drive, ordenado en "AV Control / {nombreCarpeta}[ / {subcarpeta}]" y
 * etiquetado con el proyecto. `subcarpeta` separa por tipo de material dentro del proyecto (ej.
 * "Videos" vs "Diseños") para que no quede todo revuelto en una sola carpeta. Si
 * `fileIdExistente` viene (ya habia un archivo para este entregable), reemplaza su contenido en
 * vez de crear uno nuevo — asi no se acumulan copias por cada correccion.
 */
export async function subirArchivoADrive(
  file: File,
  accessToken: string,
  opciones: {
    nombre: string;
    nombreCarpeta: string;
    subcarpeta?: string;
    fileIdExistente?: string;
    onProgress?: (porcentaje: number) => void;
  }
): Promise<ArchivoSubido> {
  const { nombre, nombreCarpeta, subcarpeta, fileIdExistente, onProgress } = opciones;

  if (fileIdExistente) {
    await reemplazarContenido(fileIdExistente, file, accessToken, onProgress);
    await renombrarArchivo(fileIdExistente, nombre, accessToken);
    return linksDe(fileIdExistente);
  }

  const raizId = await obtenerOCrearCarpeta(CARPETA_RAIZ, accessToken);
  const carpetaProyectoId = await obtenerOCrearCarpeta(nombreCarpeta, accessToken, raizId);
  const carpetaId = subcarpeta
    ? await obtenerOCrearCarpeta(subcarpeta, accessToken, carpetaProyectoId)
    : carpetaProyectoId;
  const id = await subirContenidoNuevo(file, accessToken, nombre, carpetaId, onProgress);
  try {
    await compartirArchivo(id, accessToken);
  } catch {
    // si falla compartir, el archivo igual quedo subido y el dueño lo puede ver.
  }
  // La CARPETA tambien se comparte (no solo cada archivo) — asi un link a la carpeta completa
  // (ej. para mandar "aqui estan todas las fotos de la sesion") abre para cualquiera, no solo
  // para quien ya tenia acceso de antes. Falla silenciosa iguaL que el archivo: si no se pudo
  // compartir, el archivo de adentro igual quedo visible por su propio permiso.
  try {
    await compartirArchivo(carpetaId, accessToken);
  } catch {
    // la carpeta puede ya estar compartida (otra foto de la misma sesion la comparte primero).
  }
  return linksDe(id, carpetaId);
}
