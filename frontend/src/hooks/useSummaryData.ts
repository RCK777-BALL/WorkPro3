/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import http from '../lib/http';

type CacheEntry<T> = { promise?: Promise<T>; data?: T; ts?: number };
const cache: Record<string, CacheEntry<unknown>> = {};

export function useSummary<T = unknown>(
  path: string,
  deps: unknown[] = [],
  options: { auto?: boolean; poll?: boolean; ttlMs?: number } = {},
): [T | undefined, () => Promise<T | undefined>] {
  const { auto = true, poll = true, ttlMs = 10_000 } = options;
  const [, setTick] = useState(0);
  const mountedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const backoffRef = useRef(1000); // start 1s

  const fetcher = useCallback(async () => {
    const now = Date.now();
    const c = (cache[path] as CacheEntry<T>) || (cache[path] = {} as CacheEntry<T>);
    if (c.data && c.ts && now - c.ts < ttlMs) return c.data as T;
    if (c.promise) return c.promise;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const p = http
      .get<T>(path, { signal: controller.signal })
      .then((res) => {
        if (!mountedRef.current) return c.data as T | undefined;
        c.data = res.data;
        c.ts = Date.now();
        c.promise = undefined;
        backoffRef.current = 1000;
        setTick((t) => t + 1);
        return c.data as T;
      })
      .catch(async (err) => {
        c.promise = undefined;
        if (err?.response?.status === 429) {
          await new Promise((r) => setTimeout(r, backoffRef.current));
          backoffRef.current = Math.min(backoffRef.current * 2, 30_000);
        } else if (err.name === 'CanceledError') {
          return undefined;
        } else {
          console.error('fetch error', path, err);
        }
        throw err;
      });

    c.promise = p;
    return p;
  }, [path, ttlMs]);

  useEffect(() => {
    mountedRef.current = true;
    if (auto) fetcher().catch(() => {});

    let timer: ReturnType<typeof setInterval> | undefined;
    if (poll && typeof window !== 'undefined') {
      timer = setInterval(() => fetcher().catch(() => {}), 60_000);
    }

    return () => {
      mountedRef.current = false;
      if (timer) clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [fetcher, auto, poll, ...deps]);

  return [cache[path]?.data as T | undefined, fetcher];
}

export default useSummary;
