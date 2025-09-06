import { describe, it, beforeEach, expect, vi } from 'vitest';
import { addToQueue, flushQueue } from '../utils/offlineQueue';
import api from '../lib/api';

vi.mock('../lib/api', () => ({
  default: vi.fn(),
}));

type Storage = Record<string, string>;
let store: Storage;

beforeEach(() => {
  store = {};
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        store = {};
      },
    },
    writable: true,
  });
  vi.clearAllMocks();
});

describe('offline sync', () => {
  it('flushes seeded requests', async () => {
    const apiMock = api as unknown as ReturnType<typeof vi.fn>;
    (apiMock as any).mockResolvedValue({});
    addToQueue({ method: 'post', url: '/assets', data: { name: 'Seeded' } });
    await flushQueue();
    expect(apiMock).toHaveBeenCalledWith({ method: 'post', url: '/assets', data: { name: 'Seeded' } });
    expect(window.localStorage.getItem('offline-queue')).toBeNull();
  });
});
