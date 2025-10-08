/*
 * SPDX-License-Identifier: MIT
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const tsconfig = JSON.parse(fs.readFileSync(new URL('./tsconfig.json', import.meta.url), 'utf-8'));
const baseConfig = tsconfig.extends
  ? JSON.parse(fs.readFileSync(new URL(tsconfig.extends, import.meta.url), 'utf-8'))
  : tsconfig;
const paths = (baseConfig.compilerOptions?.paths as Record<string, string[]>) ?? {};

const alias = Object.fromEntries(
  Object.entries(paths).map(([key, [value]]) => [
    key.replace('/*', '/'),
    fileURLToPath(new URL(value.replace('/*', '/'), import.meta.url)),
  ]),
);

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    environment: 'node',
    setupFiles: ['./src/test/e2e.setup.ts'],
    include: ['**/*.e2e.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
