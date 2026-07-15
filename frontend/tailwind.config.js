/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        coral: {
          bg: "#FAECE7",
          mid: "#F0997B",
          strong: "#D85A30",
          text: "#4A1B0C",
        },
        greenP: {
          bg: "#EAF3DE",
          text: "#3B6D11",
          border: "#C0DD97",
        },
        redP: {
          bg: "#FCEBEB",
          text: "#A32D2D",
          border: "#F7C1C1",
        },
        grayP: {
          bg: "#F1EFE8",
          border: "#D3D1C7",
          text: "#5F5E5A",
          dark: "#2C2C2A",
        },
      },
    },
  },
  plugins: [],
};
