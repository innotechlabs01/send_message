import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Superficies
        surface: {
          DEFAULT: "#ffffff",
          secondary: "#f5f5f5",
          tertiary: "#ececec",
        },
        // Color primario - Azul corporativo
        primary: {
          50: "#ebf4ff",
          100: "#d6e9ff",
          200: "#a0c4e8",
          300: "#7ab0e0",
          400: "#4a90d9",
          500: "#357abd",
          600: "#2a6099",
          700: "#1e4873",
        },
        // Grises para texto
        text: {
          primary: "#1a1a1a",
          secondary: "#525252",
          tertiary: "#737373",
          disabled: "#a3a3a3",
        },
        // Bordes
        border: {
          DEFAULT: "#d4d4d4",
          strong: "#a3a3a3",
        },
        // Estados
        success: {
          50: "#e8f5e9",
          100: "#c8e6c9",
          400: "#4caf50",
          600: "#2e7d32",
        },
        accent: {
          50: "#fce4ec",
          100: "#f8bbd9",
          400: "#e91e63",
          600: "#c2185b",
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'hover': '0 4px 25px -5px rgba(74, 144, 217, 0.15), 0 8px 10px -6px rgba(74, 144, 217, 0.1)',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};
export default config;
