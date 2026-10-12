import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        calm: {
          bg: "var(--page-background)",
          card: "var(--surface)",
          border: "var(--border-color)",
          muted: "var(--surface-muted)",
        },
        ink: {
          900: "var(--text-primary)",
          600: "var(--text-secondary)",
          400: "var(--text-muted)",
        },
        primary: {
          700: "var(--primary-hover)",
          600: "var(--primary)",
          100: "var(--primary-light)",
        },
        up: {
          DEFAULT: "var(--market-up)",
          bg: "var(--market-up-bg)",
        },
        down: {
          DEFAULT: "var(--market-down)",
          bg: "var(--market-down-bg)",
        },
        background: "var(--page-background)",
        foreground: "var(--text-primary)",
      },
      boxShadow: {
        calm: "var(--shadow-sm)",
        "calm-md": "var(--shadow-md)",
      },
    },
  },
  plugins: [],
};
export default config;
