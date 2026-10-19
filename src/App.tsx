import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RutaProtegida } from "@/components/RutaProtegida";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { RequisicionesPage } from "@/pages/RequisicionesPage";
import { ProyectosPage } from "@/pages/ProyectosPage";
import { SalidasPage } from "@/pages/SalidasPage";
import { CalendarioPage } from "@/pages/CalendarioPage";
import { EquipoPage } from "@/pages/EquipoPage";
import { EntregablesPage } from "@/pages/EntregablesPage";
import { MetricasPage } from "@/pages/MetricasPage";
import { ArchivosPage } from "@/pages/ArchivosPage";
import { ReportesPage } from "@/pages/ReportesPage";
import { ConfiguracionPage } from "@/pages/ConfiguracionPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/requisiciones" element={<RutaProtegida><RequisicionesPage /></RutaProtegida>} />
          <Route path="/proyectos" element={<RutaProtegida><ProyectosPage /></RutaProtegida>} />
          <Route path="/salidas" element={<RutaProtegida><SalidasPage /></RutaProtegida>} />
          <Route path="/calendario" element={<CalendarioPage />} />
          <Route path="/equipo" element={<RutaProtegida><EquipoPage /></RutaProtegida>} />
          <Route path="/entregables" element={<RutaProtegida><EntregablesPage /></RutaProtegida>} />
          <Route path="/metricas" element={<RutaProtegida><MetricasPage /></RutaProtegida>} />
          <Route path="/archivos" element={<ArchivosPage />} />
          <Route path="/reportes" element={<RutaProtegida><ReportesPage /></RutaProtegida>} />
          <Route path="/configuracion" element={<RutaProtegida><ConfiguracionPage /></RutaProtegida>} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
