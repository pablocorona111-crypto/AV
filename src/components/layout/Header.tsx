import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Bell, Search, ChevronDown, LogOut, UserCog } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNotificaciones } from "@/hooks/useNotificaciones";
import { ROLE_LABELS } from "@/lib/roles";
import { DEMO_USUARIOS } from "@/data/demoData";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function NotificacionesMenu() {
  const { notificaciones, noLeidas, marcarLeida } = useNotificaciones();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const onClickNotificacion = (n: { id: string; leida: boolean; entregableId?: string }) => {
    if (!n.leida) marcarLeida(n.id);
    if (n.entregableId) {
      setOpen(false);
      navigate(`/entregables?abrir=${n.entregableId}`);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="relative rounded-md p-2 hover:bg-bg-secondary focus:outline-none" aria-label="Notificaciones">
        <Bell className="h-5 w-5 text-text-primary/70" />
        {noLeidas > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notificaciones.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">Sin notificaciones.</p>
        )}
        <div className="max-h-80 overflow-y-auto">
          {notificaciones.map((n) => (
            <button
              key={n.id}
              onClick={() => onClickNotificacion(n)}
              className="flex w-full items-start gap-2 border-b border-border px-2 py-2.5 text-left last:border-0 hover:bg-bg-secondary"
            >
              <span
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.leida ? "bg-transparent" : "bg-accent"}`}
              />
              <div className="min-w-0 flex-1">
                <p className={`text-xs leading-snug ${n.leida ? "text-muted-foreground" : "font-medium text-text-primary"}`}>
                  {n.texto}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(n.creadoEn), { addSuffix: true, locale: es })}
                </p>
              </div>
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header() {
  const { usuario, esModoDemo, cambiarUsuarioDemo, logout } = useAuth();

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-white px-6">
      <div className="relative flex-1 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar requisiciones, proyectos o personas..."
          className="h-10 w-full rounded-md border border-border bg-bg-secondary pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {esModoDemo && (
        <Badge variant="warning" className="hidden md:inline-flex">
          Modo demo
        </Badge>
      )}

      <NotificacionesMenu />

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1.5 hover:bg-bg-secondary focus:outline-none">
          <Avatar>
            <AvatarFallback>{usuario ? iniciales(usuario.nombre) : "?"}</AvatarFallback>
          </Avatar>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold leading-tight">{usuario?.nombre ?? "Invitado"}</p>
            <p className="text-xs text-muted-foreground leading-tight">
              {usuario ? ROLE_LABELS[usuario.rol] : ""}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {esModoDemo && (
            <>
              <DropdownMenuLabel className="flex items-center gap-1 text-text-primary">
                <UserCog className="h-3.5 w-3.5" /> Previsualizar rol (demo)
              </DropdownMenuLabel>
              {DEMO_USUARIOS.map((u) => (
                <DropdownMenuItem key={u.id} onClick={() => cambiarUsuarioDemo(u.id)}>
                  {u.nombre} — {ROLE_LABELS[u.rol]}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => logout()} className="text-destructive gap-2">
            <LogOut className="h-4 w-4" /> Cerrar sesion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
