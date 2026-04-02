import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./providers/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff8ff",
          100: "#dbeefe",
          500: "#0b8bd6",
          600: "#006fae",
          900: "#063652",
        },
      },
      keyframes: {
        "toast-in": {
          "0%": { opacity: "0", transform: "translateX(10px) translateY(-6px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateX(0) translateY(0) scale(1)" },
        },
      },
      animation: {
        "toast-in": "toast-in 0.25s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
