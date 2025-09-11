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
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@/common': fileURLToPath(new URL('./src/components/common', import.meta.url)),
      '@/modals': fileURLToPath(new URL('./src/components/modals', import.meta.url)),
    },
  },
})

