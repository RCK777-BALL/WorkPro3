/*
 * SPDX-License-Identifier: MIT
 */

import type { Config } from 'tailwindcss'
import colors from 'tailwindcss/colors'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: colors.blue,
        success: colors.green,
        error: colors.red,
        warning: colors.amber,
      },
    },
  },
  plugins: [],
} satisfies Config
