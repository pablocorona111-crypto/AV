import { forwardRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/** El calendario de `DatePicker` sale por su propio Portal a `document.body` (para no
 * recortarse dentro de este Dialog) — eso lo deja FUERA del DOM de `DialogPrimitive.Content`.
 * Radix detecta un click ahi como "afuera" del dialogo y lo cierra solo, aunque visualmente el
 * usuario este clickeando un dia del calendario que abrio el propio dialogo. Se ignoran los
 * clicks que caen dentro de ese panel (marcado con `data-datepicker-panel`). */
function esClickEnDatePicker(event: Event) {
  const target = (event as CustomEvent<{ originalEvent: PointerEvent | FocusEvent }>).detail?.originalEvent?.target;
  return target instanceof Element && Boolean(target.closest("[data-datepicker-panel]"));
}

export const DialogContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    /** Reemplaza el fondo (`.av-overlay`, el mismo gris semitransparente en todos los dialogos)
     * por uno propio — ej. la vista ampliada de fotos quiere un negro mas oscuro para que la
     * imagen resalte, sin oscurecer de mas el resto de dialogos de la app. */
    overlayClassName?: string;
  }
>(({ className, overlayClassName, children, onPointerDownOutside, onInteractOutside, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className={cn("fixed inset-0 z-50", overlayClassName ?? "av-overlay")} />
    <DialogPrimitive.Content
      ref={ref}
      onPointerDownOutside={(e) => {
        if (esClickEnDatePicker(e)) e.preventDefault();
        onPointerDownOutside?.(e);
      }}
      onInteractOutside={(e) => {
        if (esClickEnDatePicker(e)) e.preventDefault();
        onInteractOutside?.(e);
      }}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-4 shadow-card max-h-[90vh] overflow-y-auto sm:max-h-[85vh] sm:p-6",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        aria-label="Cerrar"
        className="absolute right-2 top-2 rounded-md p-2 opacity-60 hover:bg-bg-secondary hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:right-3 sm:top-3"
      >
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex flex-col gap-1 pr-8", className)} {...props} />;
}

export const DialogTitle = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
));
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}
