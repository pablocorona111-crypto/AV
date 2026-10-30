import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileDown, Loader2 } from "lucide-react";
import { useEntregables, useUsuarios } from "@/hooks/useCatalogos";
import { useColaboradoresDelEquipo } from "@/hooks/useColaboradoresDelEquipo";
import { useAuth } from "@/context/AuthContext";
import { useTema } from "@/hooks/useTema";
import { aCatalogo } from "@/lib/especialidades";
import { coloresDelEquipo, COLORES_PERSONA_MARCA } from "@/lib/avatar";
import {
  aprobadosEnRango,
  asignadosEnRango,
  diasPromedioEntrega,
  donaEstados,
  PALETA_MARCA,
  PALETA_MARCA_OSCURA,
  explicarArea,
  entregablesPorResponsable,
  entregasEnRango,
  entregasPorDia,
  entregasPorSemanaDelMes,
  etiquetaRango,
  rangoPeriodo,
  rendimientoSemanal,
  type PeriodoReporte,
} from "@/lib/rendimiento";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemoBadge } from "@/components/DemoBadge";
import { fondoSlide, SlideRendimiento, type DatosSlide } from "@/components/reportes/SlideRendimiento";
import { VistaPreviaEscalada } from "@/components/reportes/VistaPreviaEscalada";
import { descargarComoPdf } from "@/lib/pdf";

/** Calcula todo lo que muestra el slide para un periodo (y el anterior, para comparar). */
function useDatosReporte(periodo: PeriodoReporte, offset: number, oscuro: boolean): DatosSlide {
  const { usuario } = useAuth();
  const { data: entregables = [] } = useEntregables();
  const { data: colaboradores = [] } = useColaboradoresDelEquipo();
  const { data: usuarios = [] } = useUsuarios();

  return useMemo(() => {
    const rango = rangoPeriodo(periodo, offset);
    const anterior = rangoPeriodo(periodo, offset - 1);
    const porResponsable = entregablesPorResponsable(entregables);
    // Si quien genera el reporte es superadmin, la "lider" es la cuenta con rol lider (no el superadmin).
    const liderId =
      usuario?.rol === "lider_audiovisual" ? usuario.id : usuarios.find((u) => u.rol === "lider_audiovisual")?.id;
    const colorPersona = coloresDelEquipo(colaboradores.map((c) => c.nombre), COLORES_PERSONA_MARCA);

    const resumen = (r: typeof rango) => {
      const entregas = entregasEnRango(entregables, r);
      const equipo = rendimientoSemanal(entregables, r);
      const filas = colaboradores.map((c) => {
        const rend = rendimientoSemanal(porResponsable.get(c.id) ?? [], r);
        return {
          nombre: c.nombre,
          puesto: c.puesto,
          encargo: aCatalogo(c.especialidades).join(" · "),
          avance: rend.avance,
          esLider: c.id === liderId,
          color: colorPersona(c.nombre),
          asignadas: rend.asignadas, entregadas: rend.entregadas, aTiempo: rend.aTiempo, porcentaje: rend.porcentaje };
      });
      return {
        entregas,
        equipo,
        filas,
        asignados: asignadosEnRango(entregables, r),
        dias: diasPromedioEntrega(entregas),
        alDia: filas.filter((f) => (f.porcentaje ?? -1) >= 80).length,
        // Mis avances como lider (mis propios cambios web, diseño...).
        miAvance: filas.find((f) => f.esLider)?.avance ?? null,
      };
    };
    const actual = resumen(rango);
    const previo = resumen(anterior);

    const aTiempo = actual.entregas.filter((e) => e.aTiempo).length;
    const pctATiempo = actual.entregas.length ? Math.round((aTiempo / actual.entregas.length) * 100) : null;
    const pctEquipo = actual.equipo.porcentaje;

    return {
      titulo: periodo === "semana" ? "Reporte semanal de rendimiento" : "Reporte mensual de rendimiento",
      periodoLabel: etiquetaRango(periodo, rango),
      lider: colaboradores.find((c) => c.id === liderId)?.nombre ?? usuario?.nombre ?? "—",
      generado: new Date().toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }),
      kpis: [
        {
          label: "Entregados",
          valor: String(actual.entregas.length),
          detalle: `${aprobadosEnRango(entregables, rango)} aprobados`,
        },
        {
          label: "Cumplimiento",
          valor: pctEquipo === null ? "—" : `${pctEquipo}%`,
          detalle: `${actual.equipo.entregadas} de ${actual.equipo.asignadas} tareas`,
          color: pctEquipo === null ? undefined : pctEquipo >= 80 ? (oscuro ? "#F5F5F5" : "#171717") : pctEquipo >= 50 ? "#8A8A8A" : "#FB670B",
        },
        { label: "A tiempo", valor: pctATiempo === null ? "—" : `${pctATiempo}%`, detalle: `${aTiempo} de ${actual.entregas.length} entregas` },
        {
          label: "Atrasadas",
          valor: String(actual.equipo.atrasadas),
          detalle: `${actual.equipo.enCorrecciones} en correcciones`,
          color: actual.equipo.atrasadas > 0 ? "#FB670B" : undefined,
        },
      ],
      // Semana: por dia (7 barras). Mes: por semana (4-5 barras) — por dia eran 31 y no se leia.
      porDia: periodo === "semana" ? entregasPorDia(actual.entregas, periodo, rango) : entregasPorSemanaDelMes(actual.entregas, rango),
      // El lider primero (sus propios avances), luego el equipo por avance real.
      filas: actual.filas.sort(
        (a, b) => Number(Boolean(b.esLider)) - Number(Boolean(a.esLider)) || (b.avance ?? -1) - (a.avance ?? -1) || b.asignadas - a.asignadas
      ),
      gestion: [
        { label: "Tareas asignadas", dato: { valor: actual.asignados, anterior: previo.asignados, masEsMejor: true } },
        { label: "Cumplimiento del equipo", dato: { valor: pctEquipo, anterior: previo.equipo.porcentaje, masEsMejor: true, sufijo: "%" } },
        { label: "Promedio de entrega", dato: { valor: actual.dias, anterior: previo.dias, masEsMejor: false, sufijo: " dias" } },
        { label: "Colaboradores al dia", dato: { valor: actual.alDia, anterior: previo.alDia, masEsMejor: true } },
        { label: "Mis avances", dato: { valor: actual.miAvance, anterior: previo.miAvance, masEsMejor: true, sufijo: "%" } },
      ],
      area: {
        nombre: "Area Audiovisual",
        dato: { valor: actual.equipo.avance, anterior: previo.equipo.avance, masEsMejor: true, sufijo: "%" },
        ...explicarArea(
          actual.equipo,
          periodo === "mes"
            ? `en ${rango.inicio.toLocaleDateString("es-MX", { month: "long" })}`
            : `en la semana del ${etiquetaRango(periodo, rango)}`,
          oscuro ? "oscuro" : true // paleta de identidad GO (naranja / gris / negro)
        ),
      },
      estados: donaEstados(actual.equipo, oscuro ? PALETA_MARCA_OSCURA : PALETA_MARCA),
      porPersona: (() => {
        const cuenta = new Map<string, number>();
        for (const { entregable } of actual.entregas) {
          cuenta.set(entregable.responsableId, (cuenta.get(entregable.responsableId) ?? 0) + 1);
        }
        const ESCALA = oscuro
          ? ["#F5F5F5", "#C7C7C7", "#A3A3A3", "#7A7A7A", "#525252", "#3A3A3A"]
          : ["#262626", "#525252", "#7A7A7A", "#A3A3A3", "#C7C7C7", "#E0E0E0"];
        return [...cuenta.entries()]
          .map(([id, valor]) => ({ nombre: colaboradores.find((c) => c.id === id)?.nombre ?? "Otro", valor }))
          .sort((a, b) => b.valor - a.valor)
          .map((d, i) => ({ ...d, color: ESCALA[Math.min(i, ESCALA.length - 1)] }));
      })(),
    };
  }, [periodo, offset, entregables, colaboradores, usuarios, usuario, oscuro]);
}

export function ReportesPage() {
  const [periodo, setPeriodo] = useState<PeriodoReporte>("semana");
  const [offset, setOffset] = useState(0);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slideRef = useRef<HTMLDivElement>(null);
  const { esOscuro } = useTema();
  const datos = useDatosReporte(periodo, offset, esOscuro);

  const cambiarPeriodo = (p: PeriodoReporte) => {
    setPeriodo(p);
    setOffset(0);
  };

  const onDescargar = async () => {
    if (!slideRef.current) return;
    setDescargando(true);
    setError(null);
    try {
      const inicio = rangoPeriodo(periodo, offset).inicio;
      const fecha = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, "0")}-${String(inicio.getDate()).padStart(2, "0")}`;
      await descargarComoPdf(slideRef.current, `reporte-${periodo === "semana" ? "semanal" : "mensual"}-${fecha}.pdf`, fondoSlide(esOscuro));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar el PDF.");
    } finally {
      setDescargando(false);
    }
  };

  const etiquetaActual = periodo === "semana" ? ["Esta semana", "Semana pasada"] : ["Este mes", "Mes pasado"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Reportes</h1>
          <p className="text-sm text-muted-foreground">Rendimiento del equipo y del lider, listo para exportar en PDF.</p>
        </div>
        <DemoBadge />
      </div>

      <Card>
        <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Reporte de rendimiento</CardTitle>
            <CardDescription>
              Así se verá el PDF: un solo slide horizontal, en el tema activo (claro u oscuro).
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={periodo} onValueChange={(v) => cambiarPeriodo(v as PeriodoReporte)}>
              <TabsList>
                <TabsTrigger value="semana">Semanal</TabsTrigger>
                <TabsTrigger value="mes">Mensual</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="icon" onClick={() => setOffset((o) => o - 1)} aria-label="Periodo anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[7rem] text-center text-sm font-medium">
              {offset === 0 ? etiquetaActual[0] : offset === -1 ? etiquetaActual[1] : `Hace ${-offset} ${periodo === "semana" ? "semanas" : "meses"}`}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setOffset((o) => o + 1)}
              disabled={offset >= 0}
              aria-label="Periodo siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button onClick={onDescargar} disabled={descargando}>
              {descargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              {descargando ? "Generando..." : "Descargar PDF"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 p-3 sm:p-5">
          {error && <p className="text-xs text-destructive">{error}</p>}
          <VistaPreviaEscalada>
            <SlideRendimiento ref={slideRef} datos={datos} oscuro={esOscuro} />
          </VistaPreviaEscalada>
        </CardContent>
      </Card>
    </div>
  );
}
