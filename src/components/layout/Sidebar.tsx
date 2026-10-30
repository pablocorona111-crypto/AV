import { NavLink } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Clapperboard,
  Home,
  FileText,
  FolderKanban,
  Calendar,
  Users,
  PackageCheck,
  BarChart3,
  FolderOpen,
  FileBarChart,
  Settings,
  Camera,
  TrendingUp,
  Network,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { puedeVerRuta } from "@/lib/roles";

/** Agrupado por uso (lo del dia primero) y con `desc` como ayuda al pasar el mouse — antes era
 * una lista plana de 12 opciones sin pista de para que sirve cada una. */
const grupos = [
  {
    titulo: "Dia a dia",
    items: [
      { to: "/", label: "Inicio", icon: Home, end: true, desc: "Resumen del día" },
      { to: "/entregables", label: "Entregables", icon: PackageCheck, desc: "Trabajos asignados y su revisión" },
      { to: "/calendario", label: "Calendario", icon: Calendar, desc: "Fechas de entrega y salidas" },
      { to: "/salidas", label: "Grabaciones y Salidas", icon: Camera, desc: "Salidas a grabar o fotografiar" },
    ],
  },
  {
    titulo: "Gestion",
    items: [
      { to: "/requisiciones", label: "Requisiciones", icon: FileText, desc: "Solicitudes de contenido" },
      { to: "/proyectos", label: "Proyectos", icon: FolderKanban, desc: "Trabajos en curso por etapa" },
      { to: "/equipo", label: "Equipo", icon: Users, desc: "Personas, especialidades y carga" },
      { to: "/archivos", label: "Archivos", icon: FolderOpen, desc: "Material entregado y referencias" },
    ],
  },
  {
    titulo: "Analisis",
    items: [
      { to: "/estructura", label: "Estructura y KPI", icon: Network, desc: "Metas por persona y cómo trabajamos" },
      { to: "/rendimiento", label: "Rendimiento", icon: TrendingUp, desc: "Avance semanal del equipo" },
      { to: "/reportes", label: "Reportes", icon: FileBarChart, desc: "Reporte en PDF para dirección" },
      { to: "/metricas", label: "Métricas", icon: BarChart3, desc: "Indicadores generales" },
      { to: "/configuracion", label: "Configuración", icon: Settings, desc: "Usuarios y permisos" },
    ],
  },
];

const GRUPO_LABEL: Record<string, string> = { "Dia a dia": "Día a día", Gestion: "Gestión", Analisis: "Análisis" };

function ContenidoSidebar({ onNavegar }: { onNavegar?: () => void }) {
  const { usuario } = useAuth();

  return (
    <>
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent">
          <Clapperboard className="h-5 w-5 text-accent-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight">AV CONTROL</p>
          <p className="truncate text-xs text-muted-foreground leading-tight">
            Grupo Ortiz | Audiovisual
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 scrollbar-thin">
        {grupos.map((grupo) => {
          const visibles = grupo.items.filter((item) => puedeVerRuta(usuario, item.to));
          if (visibles.length === 0) return null;
          return (
            <div key={grupo.titulo} className="pb-2">
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {GRUPO_LABEL[grupo.titulo] ?? grupo.titulo}
              </p>
              {visibles.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavegar}
                  title={item.desc}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-text-primary/80 transition-colors hover:bg-bg-secondary",
                      isActive && "bg-accent/20 text-text-primary font-semibold"
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>
    </>
  );
}

export function Sidebar({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  return (
    <>
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <ContenidoSidebar />
      </aside>

      <DialogPrimitive.Root open={abierto} onOpenChange={(o) => !o && onCerrar()}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="av-overlay fixed inset-0 z-50 lg:hidden" />
          <DialogPrimitive.Content
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border bg-card shadow-card lg:hidden"
            aria-describedby={undefined}
          >
            <DialogPrimitive.Title className="sr-only">Menú de navegación</DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="absolute right-3 top-5 rounded-md p-1.5 text-text-primary/70 hover:bg-bg-secondary focus:outline-none"
              aria-label="Cerrar menú"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
            <ContenidoSidebar onNavegar={onCerrar} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
