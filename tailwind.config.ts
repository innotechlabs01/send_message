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
        surface: {
          DEFAULT: "#ffffff",
          secondary: "#f5f5f5",
          tertiary: "#f2f2f2",
        },
        primary: {
          50: "#f0f6ff",
          100: "#e0efff",
          200: "#b9ddff",
          300: "#89c3ff",
          400: "#4a90d9",
          450: "#2269ED",
          500: "#1A56DB",
          600: "#1E40AF",
          700: "#1E3A8A",
        },
        text: {
          primary: "#1A1A1A",
          secondary: "#4A4A4A",
          tertiary: "#757575",
          disabled: "#B3B3B3",
        },
        border: {
          DEFAULT: "#E8E8E8",
          strong: "#D9D9D9",
        },
        success: {
          50: "#ecfdf5",
          400: "#10B981",
          600: "#059669",
        },
        neutral: {
          50: "#FAFAFE",
          100: "#F2F6F9",
          200: "#eef2f7",
        },
      },
      fontFamily: {
        poppins: ["Poppins", "system-ui", "sans-serif"],
      },
      spacing: {
        '18': '4.5rem',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        'screen': '9999px',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'hover': '0 4px 25px -5px rgba(34, 105, 237, 0.12), 0 8px 10px -6px rgba(34, 105, 237, 0.08)',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};
export default config;
