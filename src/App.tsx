import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RutaProtegida } from "@/components/RutaProtegida";
import { CargandoPagina } from "@/components/CargandoPagina";

// Cada pagina se descarga solo cuando se visita (code splitting) — antes todas iban en un solo
// bundle de ~2 MB que habia que bajar completo antes de pintar el login.
const pagina = <K extends string>(cargar: () => Promise<Record<K, React.ComponentType>>, nombre: K) =>
  lazy(() => cargar().then((m) => ({ default: m[nombre] })));

const LoginPage = pagina(() => import("@/pages/LoginPage"), "LoginPage");
const PoliticaPrivacidadPage = pagina(() => import("@/pages/PoliticaPrivacidadPage"), "PoliticaPrivacidadPage");
const DashboardPage = pagina(() => import("@/pages/DashboardPage"), "DashboardPage");
const RequisicionesPage = pagina(() => import("@/pages/RequisicionesPage"), "RequisicionesPage");
const ProyectosPage = pagina(() => import("@/pages/ProyectosPage"), "ProyectosPage");
const SalidasPage = pagina(() => import("@/pages/SalidasPage"), "SalidasPage");
const CalendarioPage = pagina(() => import("@/pages/CalendarioPage"), "CalendarioPage");
const EquipoPage = pagina(() => import("@/pages/EquipoPage"), "EquipoPage");
const EntregablesPage = pagina(() => import("@/pages/EntregablesPage"), "EntregablesPage");
const MetricasPage = pagina(() => import("@/pages/MetricasPage"), "MetricasPage");
const RendimientoPage = pagina(() => import("@/pages/RendimientoPage"), "RendimientoPage");
const EstructuraPage = pagina(() => import("@/pages/EstructuraPage"), "EstructuraPage");
const ArchivosPage = pagina(() => import("@/pages/ArchivosPage"), "ArchivosPage");
const ReportesPage = pagina(() => import("@/pages/ReportesPage"), "ReportesPage");
const ConfiguracionPage = pagina(() => import("@/pages/ConfiguracionPage"), "ConfiguracionPage");
const NotFoundPage = pagina(() => import("@/pages/NotFoundPage"), "NotFoundPage");

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<CargandoPagina pantallaCompleta />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/privacidad" element={<PoliticaPrivacidadPage />} />
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
            <Route path="/rendimiento" element={<RutaProtegida><RendimientoPage /></RutaProtegida>} />
            <Route path="/estructura" element={<RutaProtegida><EstructuraPage /></RutaProtegida>} />
            <Route path="/archivos" element={<ArchivosPage />} />
            <Route path="/reportes" element={<RutaProtegida><ReportesPage /></RutaProtegida>} />
            <Route path="/configuracion" element={<RutaProtegida><ConfiguracionPage /></RutaProtegida>} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
