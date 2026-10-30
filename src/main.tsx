import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { UploadQueueProvider } from "@/context/UploadQueueContext";
import { UploadQueuePanel } from "@/components/UploadQueuePanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import App from "./App";
import "./index.css";

// Tras cada deploy, una pestaña ya abierta pide chunks con hash viejo que ya no existen: en vez
// de "Algo salio mal" al cambiar de pagina, se recarga sola con la version nueva.
window.addEventListener("vite:preloadError", () => window.location.reload());

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60_000, refetchOnWindowFocus: false, retry: 1 } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <UploadQueueProvider>
            <App />
            <UploadQueuePanel />
          </UploadQueueProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
