/*
 * SPDX-License-Identifier: MIT
 */

export type StorageAdapter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'clear'>;

const createMemoryStorage = (): StorageAdapter => {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
};

let cachedStorage: Storage | null | undefined;
const memoryStorage = createMemoryStorage();

const probeWindowStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const { localStorage } = window;
    if (!localStorage) {
      return null;
    }

    const probeKey = '__workpro_storage_probe__';
    localStorage.setItem(probeKey, probeKey);
    localStorage.removeItem(probeKey);
    return localStorage;
  } catch {
    return null;
  }
};

const resolveWindowStorage = (): Storage | null => {
  if (cachedStorage !== undefined) {
    return cachedStorage;
  }

  cachedStorage = probeWindowStorage();
  return cachedStorage;
};

const withStorage = <T>(operation: (storage: StorageAdapter) => T): T => {
  const storage = resolveWindowStorage();

  if (storage) {
    try {
      return operation(storage);
    } catch {
      cachedStorage = null;
      return operation(memoryStorage);
    }
  }

  return operation(memoryStorage);
};

export const resetSafeLocalStorageCache = () => {
  cachedStorage = undefined;
};

export const safeLocalStorage = {
  getItem(key: string): string | null {
    return withStorage((storage) => storage.getItem(key));
  },
  setItem(key: string, value: string): void {
    void withStorage((storage) => {
      storage.setItem(key, value);
      return undefined;
    });
  },
  removeItem(key: string): void {
    void withStorage((storage) => {
      storage.removeItem(key);
      return undefined;
    });
  },
  clear(): void {
    void withStorage((storage) => {
      storage.clear();
      return undefined;
    });
  },
  isNativeAvailable(): boolean {
    return resolveWindowStorage() !== null;
  },
};

export default safeLocalStorage;
