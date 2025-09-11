/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect } from 'vitest';

describe('main entry', () => {
  it('throws an error when root element is missing', async () => {
    const original = document.body.innerHTML;
    document.body.innerHTML = '';
    await expect(import('../main')).rejects.toThrow(
      "Root element with id 'root' not found",
    );
    document.body.innerHTML = original;
  });
});
