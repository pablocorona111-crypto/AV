import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-primary": "#FFFFFF",
        "bg-secondary": "#F6F8FB",
        "text-primary": "#111827",
        accent: {
          DEFAULT: "#000000",
          foreground: "#FFFFFF",
        },
        border: "#E5E7EB",
        card: "#FFFFFF",
        muted: {
          DEFAULT: "#F6F8FB",
          foreground: "#6B7280",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
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
        card: "0 1px 2px 0 rgba(17, 24, 39, 0.04), 0 1px 3px 0 rgba(17, 24, 39, 0.06)",
      },
    },
  },
  plugins: [],
} satisfies Config;
