import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@common': resolve(__dirname, './src/components/common'),
      '@backend-shared': resolve(__dirname, '../backend/shared'),
    }
  },
  server: {
    fs: {
      allow: [resolve(__dirname, '..')],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
