import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 text-center">
      <p className="text-4xl font-bold">404</p>
      <p className="text-sm text-muted-foreground">Esta pagina no existe.</p>
      <Link to="/" className={buttonVariants({ className: "mt-2" })}>
        Volver al inicio
      </Link>
    </div>
  );
}
