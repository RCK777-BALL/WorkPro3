/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useNavigationStore } from '@/store/navigationStore';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => vi.useRealTimers());

describe('navigation store', () => {
  it('persists sidebar order', async () => {
    const { setSidebarOrder } = useNavigationStore.getState();
    setSidebarOrder(['settings', 'dashboard']);
    await Promise.resolve();
    const saved = JSON.parse(localStorage.getItem('navigation-storage') || '{}');
    expect(saved.state.sidebarOrder).toEqual(['settings', 'dashboard']);
  });

  it('moves item on drag', () => {
    const store = useNavigationStore.getState();
    store.setSidebarOrder(['a', 'b', 'c'] as any);
    store.moveSidebarItem('c' as any, 'a' as any);
    expect(useNavigationStore.getState().sidebarOrder).toEqual(['c', 'a', 'b']);
  });
});
