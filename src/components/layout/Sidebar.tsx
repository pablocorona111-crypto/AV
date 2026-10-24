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
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { puedeVerRuta, puedeGestionarUsuarios } from "@/lib/roles";

const navItems = [
  { to: "/", label: "Inicio", icon: Home, end: true },
  { to: "/requisiciones", label: "Requisiciones", icon: FileText },
  { to: "/proyectos", label: "Proyectos", icon: FolderKanban },
  { to: "/salidas", label: "Grabaciones y Salidas", icon: Camera },
  { to: "/calendario", label: "Calendario", icon: Calendar },
  { to: "/equipo", label: "Equipo", icon: Users },
  { to: "/entregables", label: "Entregables", icon: PackageCheck },
  { to: "/metricas", label: "Metricas", icon: BarChart3 },
  { to: "/archivos", label: "Archivos", icon: FolderOpen },
  { to: "/reportes", label: "Reportes", icon: FileBarChart },
  { to: "/configuracion", label: "Configuracion", icon: Settings },
];

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

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 scrollbar-thin">
        {navItems
          .filter((item) => puedeVerRuta(usuario, item.to))
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavegar}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-text-primary/80 transition-colors hover:bg-bg-secondary",
                  isActive && "bg-accent/20 text-text-primary font-semibold"
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
      </nav>

      {puedeGestionarUsuarios(usuario) && (
        <div className="border-t border-border p-4">
          <p className="mb-1 text-xs text-muted-foreground">Espacio de almacenamiento</p>
          <div className="h-1.5 w-full rounded-full bg-bg-secondary">
            <div className="h-1.5 w-[32%] rounded-full bg-accent" />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">320 GB de 1 TB</p>
        </div>
      )}
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
            <DialogPrimitive.Title className="sr-only">Menu de navegacion</DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="absolute right-3 top-5 rounded-md p-1.5 text-text-primary/70 hover:bg-bg-secondary focus:outline-none"
              aria-label="Cerrar menu"
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
