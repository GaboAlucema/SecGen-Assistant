/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: "#3B82F6",       // Azul vibrante
        alert: "#EF4444",       // Rojo crítico
        warn: "#F59E0B",        // Ámbar/Riesgo medio
        safe: "#10B981",        // Verde esmeralda/Éxito

        bgApp: "#F8FAFC",       // Fondo general (Blanco azulado)
        bgCard: "#FFFFFF",      // Fondo de tarjetas/bloques

        textMain: "#0F172A",    // Azul pizarra muy oscuro
        textMuted: "#64748B",   // Gris azulado

        uiBorder: "#E2E8F0",    // Borde suave en tono slate
      },
    },
  },
  plugins: [],
};
