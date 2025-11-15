/*
 * SPDX-License-Identifier: MIT
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const apiTarget = process.env.VITE_API_URL || 'http://localhost:5010';

export default defineConfig({
  plugins: [react()],
  css: {
    modules: false,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
      },
    },
    fs: {
      allow: ['..'],
    },
  },
  resolve: {
    alias: [
      { find: '@common', replacement: fileURLToPath(new URL('./src/components/common', import.meta.url)) },
      { find: '@shared', replacement: fileURLToPath(new URL('../shared/types', import.meta.url)) },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ],
  },
})

