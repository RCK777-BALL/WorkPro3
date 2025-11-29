import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'; // <--- Import path

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // This tells Vite that @/ resolves to the src directory
      '@/': path.resolve(__dirname, './src/')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
