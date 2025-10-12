/*
 * SPDX-License-Identifier: MIT
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  resolve: {
    alias: [
      { find: '@common', replacement: fileURLToPath(new URL('./src/components/common', import.meta.url)) },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      { find: '@radix-ui/react-slot', replacement: fileURLToPath(new URL('./src/lib/radix-slot.tsx', import.meta.url)) },
    ],
  },
})

