/*
 * SPDX-License-Identifier: MIT
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import ts from 'typescript'

const tsconfig = ts.parseConfigFileTextToJson(
  'tsconfig.json',
  fs.readFileSync(new URL('./tsconfig.json', import.meta.url), 'utf-8'),
).config
const baseConfig = tsconfig.extends
  ? ts.parseConfigFileTextToJson(
      tsconfig.extends,
      fs.readFileSync(new URL(tsconfig.extends, import.meta.url), 'utf-8'),
    ).config
  : tsconfig
const paths = baseConfig.compilerOptions?.paths ?? {}
const alias = Object.fromEntries(
  Object.entries(paths).map(([key, [value]]) => [
    key.replace('/*', '/'),
    fileURLToPath(new URL(value.replace('/*', '/'), import.meta.url)),
  ]),
)

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  resolve: {
    alias,
  },
})
