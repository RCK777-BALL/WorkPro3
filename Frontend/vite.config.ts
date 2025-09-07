import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // forward API calls during dev (adjust target if needed)
      '/api': {
        target: 'http://localhost:5010',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
