/*
 * SPDX-License-Identifier: MIT
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import http from '@/lib/http';
import {
  enqueueWorkOrderUpdate,
  flushQueue,
  loadQueue,
  onSyncConflict,
  setHttpClient,
} from '@/utils/offlineQueue';

type HttpClient = Parameters<typeof setHttpClient>[0];

type LocalStorageMock = {
  store: Record<string, string>;
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

let localStorageMock: LocalStorageMock & {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  localStorageMock = {
    store: {},
    getItem: vi.fn((key: string) => (key in localStorageMock.store ? localStorageMock.store[key] : null)),
    setItem: vi.fn((key: string, value: string) => {
      localStorageMock.store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete localStorageMock.store[key];
    }),
    clear: vi.fn(() => {
      localStorageMock.store = {};
    }),
  };

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
});

afterEach(() => {
  setHttpClient(http as unknown as HttpClient);
  vi.restoreAllMocks();
});

describe('offline work order sync', () => {
  it('queues reconcile updates and fetches server data on conflicts', async () => {
    const conflictHandler = vi.fn();
    const unsubscribe = onSyncConflict(conflictHandler);

    const httpMock: HttpClient = vi.fn(async ({ method, url }) => {
      if (method === 'put' && url === '/work-orders/wo-1/reconcile') {
        throw { response: { status: 409 } };
      }
      if (method === 'get' && url === '/workorders/wo-1') {
        return { data: { title: 'Server copy' } };
      }
      return {};
    });

    setHttpClient(httpMock);

    enqueueWorkOrderUpdate('wo-1', { title: 'Local update' });
    const queue = loadQueue();
    expect(queue[0].url).toBe('/work-orders/wo-1/reconcile');
    expect((queue[0].data as Record<string, unknown>).clientUpdatedAt).toBeDefined();

    await flushQueue(false);

    expect(httpMock).toHaveBeenCalledWith({ method: 'get', url: '/workorders/wo-1' });
    expect(conflictHandler).toHaveBeenCalledTimes(1);
    const conflict = conflictHandler.mock.calls[0][0];
    expect(conflict.url).toBe('/work-orders/wo-1/reconcile');
    expect(conflict.local).toMatchObject({ title: 'Local update' });
    expect(conflict.server).toMatchObject({ title: 'Server copy' });

    unsubscribe();
  });
});
