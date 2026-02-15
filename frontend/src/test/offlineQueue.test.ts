/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  addToQueue,
  flushQueue,
  clearQueue,
  enqueueAssetRequest,
  enqueueDepartmentRequest,
  type QueuedRequest,
  diffObjects,
  MAX_QUEUE_RETRIES,
} from '@/utils/offlineQueue';
import http from '../lib/http';
import { emitToast } from '../context/ToastContext';
 

vi.mock('../lib/http', () => ({
  default: vi.fn(),
}));
vi.mock('../context/ToastContext', () => ({
  emitToast: vi.fn(),
}));

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

const queueSetCalls = () =>
  localStorageMock.setItem.mock.calls.filter(([key]) => key === 'offline-queue');

const latestQueuedItems = <T = unknown>(): T[] => {
  const calls = queueSetCalls();
  const payload = calls[calls.length - 1]?.[1];
  return payload ? (JSON.parse(payload) as T[]) : [];
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
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('offline queue helpers', () => {
  it('adds requests to localStorage', () => {
    const req = { method: 'post' as const, url: '/task', data: { foo: 'bar' } };
    addToQueue(req);
    expect(queueSetCalls().length).toBeGreaterThan(0);
    const saved = latestQueuedItems<QueuedRequest>();
    expect(saved[0]).toEqual({ ...req, retries: 0 });
  });

  it('clears queued actions', () => {
    localStorageMock.store['offline-queue'] = '[]';
    clearQueue();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('offline-queue');
  });

  it('flushes the queue and clears storage', async () => {
    const apiMock = http as unknown as ReturnType<typeof vi.fn>;
    (apiMock as any).mockResolvedValue({});
    const queue = [
      { method: 'post' as const, url: '/a', data: { a: 1 } },
      { method: 'put' as const, url: '/b', data: { b: 2 } },
    ];
    localStorageMock.store['offline-queue'] = JSON.stringify(queue);

    await flushQueue();

    expect(apiMock).toHaveBeenCalledTimes(2);
    expect(apiMock).toHaveBeenNthCalledWith(1, { method: 'post', url: '/a', data: { a: 1 } });
    expect(apiMock).toHaveBeenNthCalledWith(2, { method: 'put', url: '/b', data: { b: 2 } });
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('offline-queue');
  });

  it('persists remaining items as each queued request completes', async () => {
    const apiMock = http as unknown as ReturnType<typeof vi.fn>;
    (apiMock as any).mockResolvedValue({});
    const queue = [
      { method: 'post' as const, url: '/a', data: { a: 1 } },
      { method: 'put' as const, url: '/b', data: { b: 2 } },
      { method: 'post' as const, url: '/c', data: { c: 3 } },
    ];
    localStorageMock.store['offline-queue'] = JSON.stringify(queue);

    await flushQueue();

    expect(apiMock).toHaveBeenCalledTimes(3);
    expect(queueSetCalls().length).toBeGreaterThanOrEqual(2);

    const setCalls = queueSetCalls();
    const firstPersist = JSON.parse(setCalls[setCalls.length - 2][1]) as QueuedRequest[];
    expect(firstPersist).toEqual([
      { method: 'put', url: '/b', data: { b: 2 } },
      { method: 'post', url: '/c', data: { c: 3 } },
    ]);

    const secondPersist = JSON.parse(setCalls[setCalls.length - 1][1]) as QueuedRequest[];
    expect(secondPersist).toEqual([{ method: 'post', url: '/c', data: { c: 3 } }]);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('offline-queue');
  });

  it('enqueues asset requests', () => {
    const asset = { id: '1', name: 'A' } as any;
    enqueueAssetRequest('put', asset);
    const saved = latestQueuedItems<QueuedRequest>();
    expect(saved[0]).toEqual({ method: 'put', url: '/assets/1', data: asset, retries: 0 });
  });

  it('enqueues department requests', () => {
    localStorageMock.setItem.mockClear();
    const dep = { id: '1', name: 'Dept' } as any;
    enqueueDepartmentRequest('delete', dep);
    const saved = latestQueuedItems<QueuedRequest>();
    expect(saved[0]).toEqual({ method: 'delete', url: '/departments/1', data: dep, retries: 0 });
  });

  it('continues flushing when a request fails', async () => {
    const apiMock = http as unknown as ReturnType<typeof vi.fn>;
    (apiMock as any).mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('fail'));
    const queue = [
      { method: 'post' as const, url: '/a', data: { a: 1 } },
      { method: 'put' as const, url: '/b', data: { b: 2 } },
    ];
    localStorageMock.store['offline-queue'] = JSON.stringify(queue);

    await flushQueue(false); // disable backoff for deterministic test

    expect(apiMock).toHaveBeenCalledTimes(2);
    expect(queueSetCalls().length).toBeGreaterThan(0);
     const saved = latestQueuedItems<QueuedRequest>();
 
    expect(saved).toHaveLength(1);
    expect(saved[0].url).toBe('/b');
    expect(saved[0].retries).toBe(1);
    expect(saved[0].error).toBeDefined();
  });

  it('skips requests whose nextAttempt is in the future', async () => {
    const apiMock = http as unknown as ReturnType<typeof vi.fn>;
    (apiMock as any).mockResolvedValue({});
    const future = Date.now() + 100000;
    const queue = [
      { method: 'post' as const, url: '/a', data: { a: 1 }, nextAttempt: future },
    ];
    localStorageMock.store['offline-queue'] = JSON.stringify(queue);

    await flushQueue();

    expect(apiMock).not.toHaveBeenCalled();
    const saved = latestQueuedItems<any>();
    expect(saved[0].nextAttempt).toBe(future);
  });

  it('drops requests that conflict on the server', async () => {
    const apiMock = http as unknown as ReturnType<typeof vi.fn>;
    (apiMock as any).mockRejectedValue({ response: { status: 409 } });
    const queue = [
      { method: 'post' as const, url: '/conflict', data: { id: 1 } },
    ];
    localStorageMock.store['offline-queue'] = JSON.stringify(queue);

    await flushQueue();

    expect(apiMock).toHaveBeenCalledTimes(2);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('offline-queue');
  });

  it('drops requests after exceeding max retries and notifies user', async () => {
    const apiMock = http as unknown as ReturnType<typeof vi.fn>;
    (apiMock as any).mockRejectedValue(new Error('fail'));
    const queue = [
      { method: 'post' as const, url: '/a', data: { a: 1 }, retries: MAX_QUEUE_RETRIES },
    ];
    localStorageMock.store['offline-queue'] = JSON.stringify(queue);

    await flushQueue(false);

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('offline-queue');
    expect(emitToast).toHaveBeenCalled();
  });

  it('processes 1k queued records within 5s', async () => {
    const apiMock = http as unknown as ReturnType<typeof vi.fn>;
    (apiMock as any).mockResolvedValue({});
    const queue = Array.from({ length: 1000 }, (_, i) => ({
      method: 'post' as const,
      url: `/bulk/${i}`,
      data: { i },
    }));
    localStorageMock.store['offline-queue'] = JSON.stringify(queue);
    const start = performance.now();
    await flushQueue(false); // no backoff for speed
    const duration = performance.now() - start;
    expect(apiMock).toHaveBeenCalledTimes(1000);
    expect(duration).toBeLessThan(5000);
  });

  it('handles queued screenshot uploads', async () => {
    const apiMock = http as unknown as ReturnType<typeof vi.fn>;
    (apiMock as any).mockResolvedValue({});
    const req = { method: 'post' as const, url: '/uploads/screenshot', data: { img: 'dataurl' } };
    localStorageMock.store['offline-queue'] = JSON.stringify([req]);

    await flushQueue();

    expect(apiMock).toHaveBeenCalledWith({ method: 'post', url: '/uploads/screenshot', data: { img: 'dataurl' } });
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('offline-queue');
  });

  it('handles queued signature uploads', async () => {
    const apiMock = http as unknown as ReturnType<typeof vi.fn>;
    (apiMock as any).mockResolvedValue({});
    const req = { method: 'post' as const, url: '/uploads/signature', data: { sig: 'dataurl' } };
    localStorageMock.store['offline-queue'] = JSON.stringify([req]);

    await flushQueue();

    expect(apiMock).toHaveBeenCalledWith({ method: 'post', url: '/uploads/signature', data: { sig: 'dataurl' } });
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('offline-queue');
  });

  it('prevents overlapping flushes', async () => {
    const apiMock = http as unknown as ReturnType<typeof vi.fn>;
    let resolveFirst: (value?: any) => void = () => {};
    (apiMock as any).mockReturnValue(
      new Promise((res) => {
        resolveFirst = res;
      })
    );
    const queue = [{ method: 'post' as const, url: '/a', data: { a: 1 } }];
    localStorageMock.store['offline-queue'] = JSON.stringify(queue);

    const first = flushQueue();
    const second = flushQueue();
    await second;

    resolveFirst({});
    await first;

    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('offline-queue');
  });

  it('preserves new requests added during a flush', async () => {
    const apiMock = http as unknown as ReturnType<typeof vi.fn>;
    let resolveFirst: (value?: any) => void = () => {};
    (apiMock as any)
      .mockReturnValueOnce(
        new Promise((res) => {
          resolveFirst = res;
        })
      )
      .mockResolvedValue({});

    const initial = [{ method: 'post' as const, url: '/a', data: { a: 1 } }];
    localStorageMock.store['offline-queue'] = JSON.stringify(initial);

    const running = flushQueue();
    addToQueue({ method: 'post', url: '/b', data: { b: 2 } });

    resolveFirst({});
    await running;

    const stored = JSON.parse(localStorageMock.store['offline-queue']);
    expect(stored.some((entry: { url?: string }) => entry.url === '/b')).toBe(true);

    await flushQueue();

    expect(apiMock).toHaveBeenCalledTimes(2);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('offline-queue');
  });
});

describe('diffObjects', () => {
  it('detects changes in nested structures', () => {
    const local = { id: 1, meta: { tags: ['a'], info: { active: true } } };
    const server = { id: 1, meta: { tags: ['a', 'b'], info: { active: true } } };
    const diffs = diffObjects(local, server);
    expect(diffs).toEqual([
      { field: 'meta', local: local.meta, server: server.meta },
    ]);
  });

  it('safely compares circular references', () => {
    const local: any = { id: 1 };
    local.self = local;
    const server: any = { id: 1 };
    server.self = server;
    expect(diffObjects(local, server)).toEqual([]);

    const serverChanged: any = { id: 1, name: 'srv' };
    serverChanged.self = serverChanged;
    expect(diffObjects(local, serverChanged)).toEqual([
      { field: 'name', local: undefined, server: 'srv' },
    ]);
  });
});

