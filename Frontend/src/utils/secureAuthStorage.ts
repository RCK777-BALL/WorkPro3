/*
 * SPDX-License-Identifier: MIT
 */

import { safeLocalStorage } from '@/utils/safeLocalStorage';

const TOKEN_KEY = 'auth:token';
const FALLBACK_TOKEN_KEY = 'token';
const NATIVE_TOKEN_KEY = 'workpro_auth_token';

type CapacitorPluginBag = {
  SecureStoragePlugin?: {
    set: (input: { key: string; value: string }) => Promise<void>;
    get: (input: { key: string }) => Promise<{ value?: string }>;
    remove: (input: { key: string }) => Promise<void>;
  };
  Preferences?: {
    set: (input: { key: string; value: string }) => Promise<void>;
    get: (input: { key: string }) => Promise<{ value?: string }>;
    remove: (input: { key: string }) => Promise<void>;
  };
  BiometricAuth?: {
    authenticate?: (input?: { reason?: string }) => Promise<{ authenticated?: boolean }>;
  };
};

type CapacitorLike = {
  Plugins?: CapacitorPluginBag;
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
};

const getCapacitor = (): CapacitorLike | null => {
  if (typeof window === 'undefined') return null;
  return (window as typeof window & { Capacitor?: CapacitorLike }).Capacitor ?? null;
};

export const isNativeShell = (): boolean => {
  const capacitor = getCapacitor();
  if (!capacitor) return false;
  if (typeof capacitor.isNativePlatform === 'function') {
    return Boolean(capacitor.isNativePlatform());
  }
  if (typeof capacitor.getPlatform === 'function') {
    return capacitor.getPlatform() !== 'web';
  }
  return false;
};

let tokenCache: string | null = null;

const getNativeToken = async (): Promise<string | null> => {
  const capacitor = getCapacitor();
  if (!capacitor?.Plugins) return null;
  const secureStore = capacitor.Plugins.SecureStoragePlugin;
  if (secureStore) {
    const result = await secureStore.get({ key: NATIVE_TOKEN_KEY });
    return result?.value ?? null;
  }
  const preferences = capacitor.Plugins.Preferences;
  if (preferences) {
    const result = await preferences.get({ key: NATIVE_TOKEN_KEY });
    return result?.value ?? null;
  }
  return null;
};

const setNativeToken = async (token: string | null): Promise<void> => {
  const capacitor = getCapacitor();
  if (!capacitor?.Plugins) return;
  const secureStore = capacitor.Plugins.SecureStoragePlugin;
  if (secureStore) {
    if (token) {
      await secureStore.set({ key: NATIVE_TOKEN_KEY, value: token });
    } else {
      await secureStore.remove({ key: NATIVE_TOKEN_KEY });
    }
    return;
  }
  const preferences = capacitor.Plugins.Preferences;
  if (preferences) {
    if (token) {
      await preferences.set({ key: NATIVE_TOKEN_KEY, value: token });
    } else {
      await preferences.remove({ key: NATIVE_TOKEN_KEY });
    }
  }
};

export const hydrateAuthToken = async (): Promise<string | null> => {
  if (tokenCache) return tokenCache;
  if (isNativeShell()) {
    tokenCache = await getNativeToken();
    return tokenCache;
  }
  tokenCache = safeLocalStorage.getItem(TOKEN_KEY) ?? safeLocalStorage.getItem(FALLBACK_TOKEN_KEY);
  return tokenCache;
};

export const getAuthTokenSync = (): string | null => tokenCache;

export const getAuthToken = async (): Promise<string | null> => {
  if (tokenCache) return tokenCache;
  return hydrateAuthToken();
};

export const setAuthToken = async (token?: string): Promise<void> => {
  tokenCache = token ?? null;
  if (isNativeShell()) {
    await setNativeToken(token ?? null);
    safeLocalStorage.removeItem(TOKEN_KEY);
    safeLocalStorage.removeItem(FALLBACK_TOKEN_KEY);
    return;
  }
  if (token) {
    safeLocalStorage.setItem(TOKEN_KEY, token);
    safeLocalStorage.setItem(FALLBACK_TOKEN_KEY, token);
  } else {
    safeLocalStorage.removeItem(TOKEN_KEY);
    safeLocalStorage.removeItem(FALLBACK_TOKEN_KEY);
  }
};

export const clearAuthToken = async (): Promise<void> => {
  await setAuthToken(undefined);
};

export const authenticateBiometric = async (reason = 'Unlock WorkPro mobile workspace'): Promise<boolean> => {
  const capacitor = getCapacitor();
  const plugin = capacitor?.Plugins?.BiometricAuth;
  if (plugin?.authenticate) {
    const response = await plugin.authenticate({ reason });
    return Boolean(response?.authenticated);
  }
  if (typeof window !== 'undefined' && 'PublicKeyCredential' in window) {
    return true;
  }
  return false;
};

