/*
 * SPDX-License-Identifier: MIT
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src/test',
  projects: [{ name: 'api', use: {} }],
});
