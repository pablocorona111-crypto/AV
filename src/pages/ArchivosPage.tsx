import { useState } from "react";
import { Download, Link2, Check, LayoutGrid, Table2 } from "lucide-react";
import { useProyectos } from "@/hooks/useProyectos";
import { useEntregables, useUsuarios } from "@/hooks/useCatalogos";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DemoBadge } from "@/components/DemoBadge";
import { RevisarEntregableDialog } from "@/components/entregables/RevisarEntregableDialog";
import { MiniaturaVideo } from "@/components/entregables/MiniaturaVideo";
import { extraerFileIdDrive } from "@/services/driveService";
import { ESTADO_ENTREGABLE_BADGE, ESTADO_ENTREGABLE_LABELS, etiquetaEstadoEntregable, CATEGORIA_CONTENIDO_LABELS } from "@/lib/labels";
import { dentroDelPeriodo, type Periodo } from "@/lib/periodo";
import { cn, formatFecha } from "@/lib/utils";
import type { EstadoEntregable } from "@/types";

type FiltroPeriodo = Periodo | "todos";
type FiltroEstadoArchivos = EstadoEntregable | "todos" | "listos";

/** "Listos" junta aprobado+entregado — para que community no tenga que elegir un estado a la
 * vez cuando lo que quiere es ver/descargar todo lo que ya se puede usar. */
function pasaFiltroEstado(estado: EstadoEntregable, filtro: FiltroEstadoArchivos): boolean {
  if (filtro === "todos") return true;
  if (filtro === "listos") return estado === "aprobado" || estado === "entregado";
  return estado === filtro;
}

export function ArchivosPage() {
  const { data: proyectos = [] } = useProyectos();
  const { data: entregables = [] } = useEntregables();
  const { data: usuarios = [] } = useUsuarios();
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoArchivos>("todos");
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodo>("todos");
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [vista, setVista] = useState<"cuadricula" | "tabla">("tabla");

  const copiarLink = async (id: string, fileId: string) => {
    await navigator.clipboard.writeText(`https://drive.google.com/file/d/${fileId}/view`);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId((actual) => (actual === id ? null : actual)), 1500);
  };

  const seleccionado = entregables.find((e) => e.id === seleccionadoId) ?? null;
  const proyectoDe = (id: string | undefined) =>
    id ? proyectos.find((p) => p.id === id)?.nombre ?? "Proyecto eliminado" : "Sin proyecto";
  const nombreDe = (id: string) => usuarios.find((u) => u.id === id)?.nombre ?? id;

  const terminoBusqueda = busqueda.trim().toLowerCase();
  // Antes se ocultaba aqui cualquier entregable sin urlRevision/urlFinal — eso dejaba fuera a
  // TODOS los pendientes (sin material cargado todavia), que es justo lo que el superadmin
  // necesita ver en Archivos para poder subirles el material el mismo.
  const referencias = entregables.filter((e) => {
    if (!pasaFiltroEstado(e.estado, filtroEstado)) return false;
    if (!dentroDelPeriodo(e.fechaEntregado ?? e.creadoEn, filtroPeriodo)) return false;
    if (!terminoBusqueda) return true;
    const nombreProyecto = proyectoDe(e.proyectoId).toLowerCase();
    return e.nombre.toLowerCase().includes(terminoBusqueda) || nombreProyecto.includes(terminoBusqueda);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Archivos</h1>
          <p className="text-sm text-muted-foreground">
            Referencias y vinculos a archivos. El almacenamiento binario vive en Firebase Storage.
          </p>
        </div>
        <DemoBadge />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o proyecto..."
          className="sm:max-w-xs"
        />
        <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as FiltroEstadoArchivos)}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="listos">Listos (aprobado o entregado)</SelectItem>
            {Object.entries(ESTADO_ENTREGABLE_LABELS).map(([valor, etiqueta]) => (
              <SelectItem key={valor} value={valor}>
                {etiqueta}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroPeriodo} onValueChange={(v) => setFiltroPeriodo(v as FiltroPeriodo)}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo el tiempo</SelectItem>
            <SelectItem value="semana">Esta semana</SelectItem>
            <SelectItem value="mes">Este mes</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-1 rounded-md border border-border p-0.5 sm:ml-auto">
          <button
            type="button"
            onClick={() => setVista("cuadricula")}
            className={cn(
              "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium",
              vista === "cuadricula" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-bg-secondary"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Cuadricula
          </button>
          <button
            type="button"
            onClick={() => setVista("tabla")}
            className={cn(
              "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium",
              vista === "tabla" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-bg-secondary"
            )}
          >
            <Table2 className="h-3.5 w-3.5" /> Tabla
          </button>
        </div>
      </div>

      {vista === "tabla" ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-secondary text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Entregable</th>
                <th className="px-3 py-2 font-medium">Proyecto</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Responsable</th>
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2 font-medium">Material</th>
              </tr>
            </thead>
            <tbody>
              {referencias.map((e) => {
                const link = e.urlRevision || e.urlFinal || "";
                const fileId = extraerFileIdDrive(link);
                const yaListo = e.estado === "aprobado" || e.estado === "entregado";
                const puedeBajarYCompartir = yaListo && Boolean(fileId);
                return (
                  <tr
                    key={e.id}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-bg-secondary"
                    onClick={() => setSeleccionadoId(e.id)}
                  >
                    <td className="px-3 py-2 font-medium">{e.nombre}</td>
                    <td className="px-3 py-2 text-muted-foreground">{proyectoDe(e.proyectoId)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{CATEGORIA_CONTENIDO_LABELS[e.tipo]}</td>
                    <td className="px-3 py-2 text-muted-foreground">{nombreDe(e.responsableId)}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatFecha(e.fechaEntregado ?? e.fechaAprobado ?? e.fechaCompromiso)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={ESTADO_ENTREGABLE_BADGE[e.estado]} className="text-[10px]">
                        {etiquetaEstadoEntregable(e)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2" onClick={(ev) => ev.stopPropagation()}>
                      {puedeBajarYCompartir ? (
                        <div className="flex gap-1">
                          <a
                            href={`/api/drive-video?id=${encodeURIComponent(fileId!)}&download=1&nombre=${encodeURIComponent(e.nombre)}`}
                            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium hover:bg-bg-secondary"
                          >
                            <Download className="h-3 w-3" /> Bajar
                          </a>
                          <button
                            type="button"
                            onClick={() => copiarLink(e.id, fileId!)}
                            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium hover:bg-bg-secondary"
                          >
                            {copiadoId === e.id ? (
                              <>
                                <Check className="h-3 w-3" /> Copiado
                              </>
                            ) : (
                              <>
                                <Link2 className="h-3 w-3" /> Link
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {fileId ? "Pendiente de aprobar" : "Sin material"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {referencias.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {busqueda || filtroEstado !== "todos" || filtroPeriodo !== "todos"
                ? "Sin resultados para ese filtro."
                : "Sin referencias de archivo registradas."}
            </p>
          )}
        </div>
      ) : (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {referencias.map((e) => {
          const link = e.urlRevision || e.urlFinal || "";
          const fileId = extraerFileIdDrive(link);
          const yaListo = e.estado === "aprobado" || e.estado === "entregado";
          const puedeBajarYCompartir = yaListo && Boolean(fileId);
          return (
            <Card
              key={e.id}
              className="cursor-pointer overflow-hidden hover:shadow-md"
              onClick={() => setSeleccionadoId(e.id)}
            >
              <MiniaturaVideo url={e.urlRevision || e.urlFinal} orientacion={e.orientacionVideo} />
              <CardContent className="space-y-1 p-2">
                <div className="flex items-start justify-between gap-1">
                  <p className="truncate text-xs font-medium">{e.nombre}</p>
                  <Badge variant="outline" className="shrink-0 text-[10px]">{e.version}</Badge>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">{proyectoDe(e.proyectoId)}</p>
                <p className="truncate text-[10px] text-muted-foreground/80">
                  {e.fechaEntregado
                    ? `Entregado: ${formatFecha(e.fechaEntregado)}`
                    : `Fecha compromiso: ${formatFecha(e.fechaCompromiso)}`}
                </p>
                <div className="flex flex-wrap items-center gap-1">
                  <Badge variant={ESTADO_ENTREGABLE_BADGE[e.estado]} className="text-[10px]">
                    {etiquetaEstadoEntregable(e)}
                  </Badge>
                  {e.estado === "aprobado" && (
                    <Badge variant="success" className="text-[10px]">
                      Listo para subir
                    </Badge>
                  )}
                </div>
                {puedeBajarYCompartir && (
                  <div className="flex gap-1 pt-1">
                    <a
                      href={`/api/drive-video?id=${encodeURIComponent(fileId!)}&download=1&nombre=${encodeURIComponent(e.nombre)}`}
                      onClick={(ev) => ev.stopPropagation()}
                      className="flex flex-1 items-center justify-center gap-1 rounded-md border border-border py-1 text-[10px] font-medium hover:bg-bg-secondary"
                    >
                      <Download className="h-3 w-3" /> Bajar
                    </a>
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        copiarLink(e.id, fileId!);
                      }}
                      className="flex flex-1 items-center justify-center gap-1 rounded-md border border-border py-1 text-[10px] font-medium hover:bg-bg-secondary"
                    >
                      {copiadoId === e.id ? (
                        <>
                          <Check className="h-3 w-3" /> Copiado
                        </>
                      ) : (
                        <>
                          <Link2 className="h-3 w-3" /> Link
                        </>
                      )}
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {referencias.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
            {busqueda || filtroEstado !== "todos" || filtroPeriodo !== "todos"
              ? "Sin resultados para ese filtro."
              : "Sin referencias de archivo registradas."}
          </p>
        )}
      </div>
      )}

      <RevisarEntregableDialog
        entregable={seleccionado}
        open={Boolean(seleccionadoId)}
        onOpenChange={(open) => !open && setSeleccionadoId(null)}
        nombreResponsable={seleccionado ? nombreDe(seleccionado.responsableId) : ""}
        nombreProyecto={seleccionado ? proyectoDe(seleccionado.proyectoId) : undefined}
        nombreAprobador={seleccionado?.aprobadorId ? nombreDe(seleccionado.aprobadorId) : undefined}
      />
    </div>
  );
}
