/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import {
  cacheWorkOrders,
  getCachedWorkOrders,
  enqueueRequest,
  flushQueue,
  loadQueue,
  __resetForTests,
} from '@/store/dataStore';

beforeEach(async () => {
  await __resetForTests();
  vi.useRealTimers();
});

describe('dataStore offline cache and queue', () => {
  it('loads cached work orders when offline', async () => {
    const workOrders = [{ id: '1', name: 'Fix leak' }];
    await cacheWorkOrders(workOrders);
    const loaded = await getCachedWorkOrders();
    expect(loaded).toEqual(workOrders);
  });

  it('retries failed queued requests with backoff', async () => {
    vi.useFakeTimers();
    const apiMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({});
    await enqueueRequest({ method: 'post', url: '/a', data: { a: 1 } });

    await flushQueue(apiMock as unknown as AxiosInstance);
    expect(apiMock).toHaveBeenCalledTimes(1);
    let q = await loadQueue();
    expect(q[0].retries).toBe(1);
    const nextAttempt = q[0].nextAttempt!;

    vi.setSystemTime(nextAttempt);
    await flushQueue(apiMock as unknown as AxiosInstance);
    expect(apiMock).toHaveBeenCalledTimes(2);
    q = await loadQueue();
    expect(q).toHaveLength(0);
    vi.useRealTimers();
  });

  it('drops requests that conflict on the server', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const apiMock = vi.fn().mockRejectedValue({ response: { status: 409 } });
    await enqueueRequest({ method: 'post', url: '/conflict', data: {} });
    await flushQueue(apiMock as unknown as AxiosInstance);
    expect(apiMock).toHaveBeenCalledTimes(1);
    const q = await loadQueue();
    expect(q).toHaveLength(0);
    warnSpy.mockRestore();
  });
});

