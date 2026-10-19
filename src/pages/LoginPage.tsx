import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Clapperboard, ShieldCheck, Film, Users2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { mensajeErrorAuth } from "@/lib/authErrors";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.94-2.91l-3.87-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

const BENEFICIOS = [
  { icon: Film, texto: "Requisiciones, proyectos y entregables en un solo lugar" },
  { icon: Users2, texto: "Visibilidad de equipo, cargas y calendario en tiempo real" },
  { icon: ShieldCheck, texto: "Acceso controlado por rol, solo cuentas corporativas" },
];

export function LoginPage() {
  const { usuario, loginConGoogle, esModoDemo } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/" replace />;

  const onClick = async () => {
    setError(null);
    setEnviando(true);
    try {
      await loginConGoogle();
    } catch (e) {
      setError(mensajeErrorAuth(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-bg-secondary">
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-text-primary p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #FFFFFF 0%, transparent 45%), radial-gradient(circle at 80% 70%, #FFFFFF 0%, transparent 40%)",
          }}
        />
        <div className="relative flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white">
            <Clapperboard className="h-5 w-5 text-accent" />
          </div>
          <span className="text-lg font-bold">AV CONTROL</span>
        </div>

        <div className="relative space-y-8">
          <h2 className="max-w-md text-3xl font-bold leading-tight">
            Gestion audiovisual de Grupo Ortiz, ordenada de principio a fin.
          </h2>
          <ul className="space-y-4">
            {BENEFICIOS.map(({ icon: Icon, texto }) => (
              <li key={texto} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm text-white/80">{texto}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/50">
          © 2026 Grupo Ortiz — Departamento Audiovisual
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <Card className="w-full max-w-sm border-border shadow-card">
          <CardContent className="pt-8">
            <div className="mb-8 flex flex-col items-center gap-3 text-center lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-accent">
                <Clapperboard className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-lg font-bold">AV CONTROL</h1>
            </div>

            <div className="mb-6 space-y-1 text-center lg:text-left">
              <h2 className="text-xl font-bold text-text-primary">Bienvenido de vuelta</h2>
              <p className="text-sm text-muted-foreground">
                Ingresa con tu cuenta corporativa de Grupo Ortiz
              </p>
            </div>

            {esModoDemo && (
              <p className="mb-4 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
                Modo demo: entra directo con el primer usuario demo. No hay proyecto Firebase configurado todavia.
              </p>
            )}

            <Button
              type="button"
              variant="outline"
              className="h-11 w-full gap-2 border-border text-sm font-medium"
              onClick={onClick}
              disabled={enviando}
            >
              <GoogleIcon />
              {enviando ? "Ingresando..." : "Continuar con Google"}
            </Button>

            {error && (
              <p className="mt-3 rounded-md bg-red-50 p-2 text-center text-xs text-destructive">
                {error}
              </p>
            )}

            <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Acceso solo por invitacion
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
