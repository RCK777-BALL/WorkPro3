/*
 * SPDX-License-Identifier: MIT
 */

import { test, expect } from '@playwright/test';
import {
  addToQueue,
  flushQueue,
  onSyncConflict,
  setHttpClient,
  loadQueue,
} from '@/utils/offlineQueue';

// Simulate a conflict response followed by server data
const mockClient = async (args: { method: string; url: string; data?: unknown }) => {
  if (args.method !== 'get') {
    const err = new Error('conflict') as unknown as {
      response?: { status?: number };
    };
    err.response = { status: 409 };
    throw err;
  }
  return { data: { id: '1', name: 'Server' } };
};

test('emits conflict with diff info', async () => {
  setHttpClient(mockClient);
  addToQueue({ method: 'put', url: '/assets/1', data: { id: '1', name: 'Local' } });
  const conflicts: unknown[] = [];
  onSyncConflict((c) => conflicts.push(c));
  await flushQueue(false);
  expect(conflicts).toHaveLength(1);
  expect(conflicts[0].diffs).toEqual([
    { field: 'name', local: 'Local', server: 'Server' },
  ]);
});

test('allows resolving with local version', async () => {
  let attempt = 0;
  const resolvingClient = async ({
    method,
    url,
    data,
  }: {
    method: string;
    url: string;
    data?: unknown;
  }) => {
    if (method === 'get') {
      return { data: { id: '1', name: 'Server' } };
    }
    attempt++;
    if (attempt === 1) {
      const err = new Error('conflict') as unknown as {
        response?: { status?: number };
      };
      err.response = { status: 409 };
      throw err;
    }
    expect(data).toEqual({ id: '1', name: 'Local' });
    return { data: { ok: true } };
  };

  setHttpClient(resolvingClient);
  addToQueue({ method: 'put', url: '/assets/1', data: { id: '1', name: 'Local' } });
  let conflict: unknown = null;
  onSyncConflict((c) => (conflict = c));
  await flushQueue(false);
  expect(conflict).toBeTruthy();
  expect(conflict.diffs).toEqual([
    { field: 'name', local: 'Local', server: 'Server' },
  ]);
  expect(loadQueue()).toHaveLength(0);
  await resolvingClient({
    method: conflict.method,
    url: conflict.url,
    data: conflict.local,
  });
  expect(attempt).toBe(2);
});
