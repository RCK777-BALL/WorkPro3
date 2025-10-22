/*
 * SPDX-License-Identifier: MIT
 */

export const filterFields = <T extends Record<string, unknown>>(source: T, allowed: string[]): Partial<T> => {
  const result: Partial<T> = {};
  for (const field of allowed) {
    if (
      Object.prototype.hasOwnProperty.call(source, field) &&
      source[field as keyof T] !== undefined
    ) {
      result[field as keyof T] = source[field as keyof T];
    }
  }
  return result;
};

