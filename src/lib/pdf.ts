import { SLIDE_H, SLIDE_W } from "@/components/reportes/SlideRendimiento";

/** Captura el slide (1280x720) a PNG y lo mete en un PDF de UNA pagina del mismo tamaño, con el
 * fondo del tema activo (claro u oscuro). La imagen se carga en un <img> real antes de `addImage` para que jsPDF reciba
 * una imagen ya decodificada. `transform: none` anula el escalado de la vista previa. */
export async function descargarComoPdf(nodo: HTMLElement, nombreArchivo: string, fondo: string) {
  // Import dinamico: jspdf + html-to-image (~400 KB) solo se descargan al pedir el PDF.
  const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  const dataUrl = await toPng(nodo, {
    pixelRatio: 2,
    backgroundColor: fondo,
    width: SLIDE_W,
    height: SLIDE_H,
    style: { transform: "none", margin: "0" },
  });
  const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [SLIDE_W, SLIDE_H] });
  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      pdf.addImage(img, "PNG", 0, 0, SLIDE_W, SLIDE_H, "", "FAST");
      resolve();
    };
    img.onerror = () => reject(new Error("No se pudo cargar la imagen capturada del reporte."));
    img.src = dataUrl;
  });
  pdf.save(nombreArchivo);
}
