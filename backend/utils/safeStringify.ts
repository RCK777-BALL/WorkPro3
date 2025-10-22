/*
 * SPDX-License-Identifier: MIT
 */

export function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}
