import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("Error atrapado por ErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-app p-6 text-center">
          <p className="text-lg font-bold text-text-primary">Algo salio mal</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Hubo un error al mostrar esta pantalla. Manda esta descripcion para corregirlo:
          </p>
          <code className="max-w-lg rounded-md border border-border bg-card p-3 text-left text-xs text-destructive">
            {this.state.error.message}
          </code>
          <button
            onClick={() => (window.location.href = "/")}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
          >
            Volver al inicio
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
