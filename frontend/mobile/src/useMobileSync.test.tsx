import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MobileSyncProvider, useMobileSync } from './useMobileSync';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MobileSyncProvider>{children}</MobileSyncProvider>
);

describe('useMobileSync persistence and conflict handling', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('persists queued actions to localStorage and rehydrates on mount', () => {
    const { result, unmount } = renderHook(() => useMobileSync(), { wrapper });

    act(() => {
      result.current.enqueue({ id: 'abc', entityType: 'Asset', operation: 'update', payload: { status: 'ok' } });
    });

    unmount();

    expect(JSON.parse(window.localStorage.getItem('mobile-sync-queue') ?? '[]')).toHaveLength(1);

    const { result: rehydrated } = renderHook(() => useMobileSync(), { wrapper });
    expect(rehydrated.current.queue).toHaveLength(1);
    expect(rehydrated.current.queue[0].payload).toEqual({ status: 'ok' });
  });

  it('re-queues conflicts when accepting the local change', () => {
    const { result } = renderHook(() => useMobileSync(), { wrapper });
    const conflict = {
      id: 'conflict-1',
      entityType: 'WorkOrder',
      operation: 'update',
      payload: { status: 'done' },
    } as const;

    act(() => {
      result.current.recordConflict(conflict);
    });
    expect(result.current.conflicts).toHaveLength(1);

    act(() => {
      result.current.resolveConflict(conflict.id, true);
    });

    expect(result.current.conflicts).toHaveLength(0);
    expect(result.current.queue).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: conflict.id, payload: conflict.payload })])
    );
  });
});
