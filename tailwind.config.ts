import type { Config } from "tailwindcss";

/** Los tokens de color viven como variables CSS en `src/index.css` (`:root` y `.dark`), no como
 * hex fijo — asi la misma clase (`bg-card`, `text-text-primary`, ...) cambia sola segun el tema.
 * El formato `rgb(var(--x) / <alpha-value>)` es el que deja seguir usando modificadores de
 * opacidad de Tailwind (`bg-accent/20`, `bg-bg-secondary/40`, ...). */
const token = (nombre: string) => `rgb(var(${nombre}) / <alpha-value>)`;

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /** Fondo de pagina (el nivel mas al fondo). En claro es el gris #F6F8FB de siempre. */
        "bg-app": token("--av-bg-app"),
        "bg-primary": token("--av-bg-primary"),
        /** Un nivel por encima de las superficies: hovers, tracks, chips, tabs. */
        "bg-secondary": token("--av-bg-secondary"),
        "text-primary": token("--av-text-primary"),
        accent: {
          DEFAULT: token("--av-accent"),
          foreground: token("--av-accent-foreground"),
        },
        border: token("--av-border"),
        card: token("--av-card"),
        muted: {
          DEFAULT: token("--av-muted"),
          foreground: token("--av-muted-foreground"),
        },
        destructive: {
          DEFAULT: token("--av-destructive"),
          foreground: token("--av-destructive-foreground"),
        },
      },
      borderRadius: {
        lg: "16px",
        md: "12px",
        sm: "8px",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "var(--av-shadow-card)",
      },
    },
  },
  plugins: [],
} satisfies Config;
