import type { Config } from 'tailwindcss'
import colors from 'tailwindcss/colors'

export default {
  darkMode: 'media',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: colors.blue,
      },
    },
  },
  plugins: [],
} satisfies Config
