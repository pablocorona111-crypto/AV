import { Suspense, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { CargandoPagina } from "@/components/CargandoPagina";

export function AppLayout() {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="flex h-screen bg-bg-app">
      <Sidebar abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onAbrirMenu={() => setMenuAbierto(true)} />
        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Suspense aqui (no solo en App) para que sidebar/header no desaparezcan al cambiar de pagina. */}
          <Suspense fallback={<CargandoPagina />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
