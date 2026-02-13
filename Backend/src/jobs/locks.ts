/*
 * SPDX-License-Identifier: MIT
 */

const locks = new Map<string, number>();

export const acquireLock = (key: string, ttlMs = 60_000): boolean => {
  const now = Date.now();
  const expiresAt = locks.get(key);
  if (expiresAt && expiresAt > now) {
    return false;
  }
  locks.set(key, now + ttlMs);
  return true;
};

export const releaseLock = (key: string): void => {
  locks.delete(key);
};

export const withLock = async <T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T | null> => {
  if (!acquireLock(key, ttlMs)) {
    return null;
  }
  try {
    return await fn();
  } finally {
    releaseLock(key);
  }
};
