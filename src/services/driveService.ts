const BOUNDARY = "av_control_upload_boundary";
const CARPETA_RAIZ = "AV Control";

export interface ArchivoSubido {
  id: string;
  previewUrl: string;
  viewUrl: string;
}

/** Extrae el ID de archivo de Drive de cualquier link (view, preview, open?id=...). */
export function extraerFileIdDrive(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/** Miniatura que Drive ya genera del video — rapido, no hay que descargar el archivo. */
export async function obtenerMiniaturaDrive(fileId: string, accessToken: string): Promise<string | null> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=thumbnailLink`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.thumbnailLink) return null;
  // El link viene con un tamaño chico al final (ej. "=s220") — lo cambiamos por uno mas grande.
  return data.thumbnailLink.replace(/=s\d+$/, "=s400");
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
  if (!res.ok) throw new Error("No se pudo buscar la carpeta en Drive.");
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
  if (!res.ok) throw new Error("No se pudo crear la carpeta en Drive.");
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

async function compartirArchivo(fileId: string, accessToken: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
  if (!res.ok) throw new Error("No se pudo compartir el archivo en Drive.");
}

function linksDe(id: string): ArchivoSubido {
  return {
    id,
    previewUrl: `https://drive.google.com/file/d/${id}/preview`,
    viewUrl: `https://drive.google.com/file/d/${id}/view`,
  };
}

/**
 * Sube un video a Drive, ordenado en "AV Control / {nombreCarpeta}" y etiquetado con el proyecto.
 * Si `fileIdExistente` viene (ya habia un video para este entregable), reemplaza su contenido
 * en vez de crear un archivo nuevo — asi no se acumulan copias por cada correccion.
 */
export async function subirArchivoADrive(
  file: File,
  accessToken: string,
  opciones: {
    nombre: string;
    nombreCarpeta: string;
    fileIdExistente?: string;
    onProgress?: (porcentaje: number) => void;
  }
): Promise<ArchivoSubido> {
  const { nombre, nombreCarpeta, fileIdExistente, onProgress } = opciones;

  if (fileIdExistente) {
    await reemplazarContenido(fileIdExistente, file, accessToken, onProgress);
    await renombrarArchivo(fileIdExistente, nombre, accessToken);
    return linksDe(fileIdExistente);
  }

  const raizId = await obtenerOCrearCarpeta(CARPETA_RAIZ, accessToken);
  const carpetaId = await obtenerOCrearCarpeta(nombreCarpeta, accessToken, raizId);
  const id = await subirContenidoNuevo(file, accessToken, nombre, carpetaId, onProgress);
  try {
    await compartirArchivo(id, accessToken);
  } catch {
    // si falla compartir, el archivo igual quedo subido y el dueño lo puede ver.
  }
  return linksDe(id);
}
