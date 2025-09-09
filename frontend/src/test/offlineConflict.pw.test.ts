import { test, expect } from '@playwright/test';
import {
  addToQueue,
  flushQueue,
  onSyncConflict,
  setHttpClient,
} from '../utils/offlineQueue';

// Simulate a conflict response followed by server data
const mockClient = async (args: { method: string; url: string; data?: any }) => {
  if (args.method !== 'get') {
    const err: any = new Error('conflict');
    err.response = { status: 409 };
    throw err;
  }
  return { data: { id: '1', name: 'Server' } };
};

test('emits conflict with diff info', async () => {
  setHttpClient(mockClient);
  addToQueue({ method: 'put', url: '/assets/1', data: { id: '1', name: 'Local' } });
  const conflicts: any[] = [];
  onSyncConflict((c) => conflicts.push(c));
  await flushQueue(false);
  expect(conflicts).toHaveLength(1);
  expect(conflicts[0].diffs).toEqual([
    { field: 'name', local: 'Local', server: 'Server' },
  ]);
});
