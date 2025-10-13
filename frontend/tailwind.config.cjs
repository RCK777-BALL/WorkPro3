const colors = require("tailwindcss/colors");

const zincPalette = colors.zinc ?? colors.neutral ?? {};

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        zinc: zincPalette,
      },
    },
  },
  plugins: [],
};
