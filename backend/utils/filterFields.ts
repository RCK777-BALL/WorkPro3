/*
 * SPDX-License-Identifier: MIT
 */

export const filterFields = <T extends Record<string, any>>(source: T, allowed: string[]): Partial<T> => {
  const result: Partial<T> = {};
  for (const field of allowed) {
    if (source[field] !== undefined) {
      (result as any)[field] = source[field];
    }
  }
  return result;
};

