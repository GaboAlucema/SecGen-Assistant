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
        brandBlue: "#4DABF7",   // Azul cielo vibrante
        bgGeneral: "#F8F9FA",   // Fondo blanco grisáceo
        textDark: "#212529",    // Gris oscuro para lectura
        alert: {
          bg: "#FFF5F5",        // Fondo rosa muy claro
          main: "#FF6B6B",      // Rojo coral alerta
        },
        warn: {
          bg: "#FFF9DB",        // Fondo amarillo suave
          main: "#FFD43B",      // Amarillo brillante
          text: "#B38600",      // Amarillo oscuro para legibilidad de texto
        },
        safe: {
          bg: "#E6FCF5",        // Fondo menta suave
          main: "#20C997",      // Verde menta encendido
        },
        ui: {
          border: "#DEE2E6",    // Bordes limpios
          textMuted: "#868E96"  // Texto secundario
        },
      },
    },
  },
  plugins: [],
};
