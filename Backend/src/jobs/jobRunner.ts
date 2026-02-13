/*
 * SPDX-License-Identifier: MIT
 */

import { withLock } from './locks';

export const runJob = async <T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs = 60_000,
): Promise<T | null> => withLock(key, ttlMs, fn);
