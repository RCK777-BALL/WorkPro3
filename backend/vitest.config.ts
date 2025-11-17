 // Vite is used here solely so Vitest can bundle test files. The backend
// does not rely on Vite in production builds or at runtime.
 

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    env: {
      // Pin MongoDB binary version used by mongodb-memory-server to avoid 404 downloads
      MONGOMS_VERSION: '7.0.5',
      MONGOMS_OS: 'ubuntu2004',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
