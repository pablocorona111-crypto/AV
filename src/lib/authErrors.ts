/** Traduce errores comunes de Firebase Auth (popup de Google) a mensajes claros. */
export function mensajeErrorAuth(error: unknown): string {
  const codigo = error instanceof Error && "code" in error ? String((error as { code: string }).code) : "";

  switch (codigo) {
    case "auth/popup-blocked":
      return "Tu navegador bloqueo la ventana de Google. Permite ventanas emergentes para este sitio (icono en la barra de direcciones) e intenta de nuevo.";
    case "auth/popup-closed-by-user":
      return "Cerraste la ventana de Google antes de terminar. Intenta de nuevo.";
    case "auth/cancelled-popup-request":
      return "Ya habia una ventana de Google abierta. Intenta de nuevo.";
    case "auth/network-request-failed":
      return "Sin conexion a internet. Revisa tu red e intenta de nuevo.";
    default:
      return error instanceof Error ? error.message : "Ocurrio un error inesperado.";
  }
}
