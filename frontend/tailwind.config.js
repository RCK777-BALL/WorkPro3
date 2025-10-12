import colors from "tailwindcss/colors";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        zinc: colors.zinc,
        slate: colors.slate,
        emerald: colors.emerald,
        cyan: colors.cyan,
        blue: colors.blue,
        black: colors.black,
        white: colors.white
      }
    }
  },
  plugins: []
};
