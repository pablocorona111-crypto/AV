import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

/**
 * Reemplaza `window.confirm(...)` por una card centrada con el resto del diseño (y su propia
 * X para cerrar, ya la trae `DialogContent`). Usar `confirmarTexto` para acciones destructivas
 * de verdad (ej. borrar todos los datos) — el boton de confirmar queda deshabilitado hasta que
 * el usuario escriba ese texto exacto, asi no se dispara por error.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  confirmarTexto,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Si viene, hay que escribir este texto exacto antes de habilitar el boton de confirmar. */
  confirmarTexto?: string;
  onConfirm: () => void;
}) {
  const [texto, setTexto] = useState("");
  const bloqueado = Boolean(confirmarTexto) && texto !== confirmarTexto;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setTexto("");
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {destructive && <AlertTriangle className="h-5 w-5 text-destructive" />}
            {title}
          </DialogTitle>
          <DialogDescription asChild>
            <div>{description}</div>
          </DialogDescription>
        </DialogHeader>

        {confirmarTexto && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              Escribe <span className="font-semibold text-text-primary">{confirmarTexto}</span> para
              continuar.
            </p>
            <Input value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus />
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            disabled={bloqueado}
            onClick={() => {
              onConfirm();
              setTexto("");
            }}
            className={cn(destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
