import { useState } from "react";
import { CheckCircle2, RotateCcw, Send } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { puedeAprobarGuion } from "@/lib/roles";
import {
  useAgregarComentarioGuion,
  useAprobarGuion,
  useComentariosGuion,
  useEnviarGuionARevision,
  useSolicitarCorreccionesGuion,
} from "@/hooks/useGuiones";
import { ESTADO_GUION_BADGE, ESTADO_GUION_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Guion } from "@/types";

export function RevisarGuionDialog({
  guion,
  open,
  onOpenChange,
  nombreResponsable,
  nombreProyecto,
}: {
  guion: Guion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nombreResponsable: string;
  nombreProyecto?: string;
}) {
  const { usuario } = useAuth();
  const [comentario, setComentario] = useState("");

  const { data: comentarios = [] } = useComentariosGuion(guion?.id ?? "");
  const agregarComentario = useAgregarComentarioGuion(guion?.id ?? "");
  const enviarARevision = useEnviarGuionARevision();
  const aprobar = useAprobarGuion();
  const solicitarCorrecciones = useSolicitarCorreccionesGuion();

  if (!guion || !usuario) return null;

  const esResponsable = guion.responsableId === usuario.id;
  const esAprobador = puedeAprobarGuion(usuario);

  const onComentar = async () => {
    if (!comentario.trim()) return;
    await agregarComentario.mutateAsync({ autorId: usuario.id, autorNombre: usuario.nombre, texto: comentario });
    setComentario("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{guion.titulo}</DialogTitle>
            <Badge variant={ESTADO_GUION_BADGE[guion.estado]}>{ESTADO_GUION_LABELS[guion.estado]}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {guion.folio}
            {nombreProyecto && <> · Proyecto: {nombreProyecto}</>} · Redactor: {nombreResponsable}
          </p>

          <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-bg-secondary p-4 text-sm">
            {guion.contenido}
          </div>

          {esResponsable && guion.estado !== "aprobado" && guion.estado !== "en_revision" && (
            <Button type="button" onClick={() => enviarARevision.mutate(guion.id)} disabled={enviarARevision.isPending}>
              <Send className="h-4 w-4" /> Enviar a revision
            </Button>
          )}

          <div className="space-y-2">
            <Label>Observaciones</Label>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-border p-3">
              {comentarios.length === 0 && <p className="text-xs text-muted-foreground">Sin observaciones aun.</p>}
              {comentarios.map((c) => (
                <div key={c.id} className="text-sm">
                  <span className="font-medium">{c.autorNombre}:</span> {c.texto}
                </div>
              ))}
            </div>
            {(esAprobador || esResponsable) && (
              <div className="flex gap-2">
                <Input
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Ej. Cambiar el gancho de la primera linea"
                />
                <Button type="button" variant="outline" onClick={onComentar} disabled={agregarComentario.isPending}>
                  Comentar
                </Button>
              </div>
            )}
          </div>

          {esAprobador && guion.estado === "en_revision" && (
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => solicitarCorrecciones.mutate(guion.id)}
                disabled={solicitarCorrecciones.isPending}
              >
                <RotateCcw className="h-4 w-4" /> Solicitar cambios
              </Button>
              <Button
                type="button"
                onClick={() => aprobar.mutate({ id: guion.id, aprobadorId: usuario.id })}
                disabled={aprobar.isPending}
              >
                <CheckCircle2 className="h-4 w-4" /> Aprobar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
