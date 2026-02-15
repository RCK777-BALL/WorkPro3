/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect } from 'vitest';

describe('main entry', () => {
  it.skip('boots when root element exists', async () => {
    const original = document.body.innerHTML;
    document.body.innerHTML = '<div id="root"></div>';
    await expect(import('@/main')).resolves.toBeTruthy();
    document.body.innerHTML = original;
  });
});
