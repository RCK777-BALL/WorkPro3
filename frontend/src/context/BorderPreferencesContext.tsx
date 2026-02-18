/* eslint-disable react-refresh/only-export-components */
/*
 * SPDX-License-Identifier: MIT
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { safeLocalStorage } from '@/utils/safeLocalStorage';

export interface BorderPreferences {
  color: string;
  width: number;
  radius: number;
}

interface BorderPreferencesContextValue {
  borderConfig: BorderPreferences;
  setBorderConfig: (config: BorderPreferences) => void;
  updateBorderConfig: (config: Partial<BorderPreferences>) => void;
  resetBorderConfig: () => void;
}

const DEFAULT_BORDER_PREFERENCES: BorderPreferences = {
  color: '#2b2d42',
  width: 1,
  radius: 12,
};

const STORAGE_KEY = 'ui.preferences.teamTableBorder';

const noop = () => {};

const defaultContextValue: BorderPreferencesContextValue = {
  borderConfig: Object.freeze({ ...DEFAULT_BORDER_PREFERENCES }),
  setBorderConfig: noop,
  updateBorderConfig: noop,
  resetBorderConfig: noop,
};

const BorderPreferencesContext =
  createContext<BorderPreferencesContextValue | undefined>(undefined);

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const sanitizePreferences = (
  preferences: BorderPreferences,
): BorderPreferences => ({
  color:
    typeof preferences.color === 'string' && preferences.color.trim().length > 0
      ? preferences.color
      : DEFAULT_BORDER_PREFERENCES.color,
  width: clampNumber(
    Number.isFinite(preferences.width) ? preferences.width : DEFAULT_BORDER_PREFERENCES.width,
    0,
    12,
  ),
  radius: clampNumber(
    Number.isFinite(preferences.radius)
      ? preferences.radius
      : DEFAULT_BORDER_PREFERENCES.radius,
    0,
    48,
  ),
});

const readStoredPreferences = (): BorderPreferences => {
  if (typeof window === 'undefined') {
    return DEFAULT_BORDER_PREFERENCES;
  }

  const stored = safeLocalStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return DEFAULT_BORDER_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<BorderPreferences>;
    return sanitizePreferences({
      ...DEFAULT_BORDER_PREFERENCES,
      ...parsed,
    });
  } catch (error) {
    console.warn('Failed to parse stored border preferences', error);
    return DEFAULT_BORDER_PREFERENCES;
  }
};

export const BorderPreferencesProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [borderConfig, setBorderConfigState] = useState<BorderPreferences>(() =>
    readStoredPreferences(),
  );

  const setBorderConfig = useCallback((config: BorderPreferences) => {
    setBorderConfigState(sanitizePreferences(config));
  }, []);

  const updateBorderConfig = useCallback(
    (config: Partial<BorderPreferences>) => {
      setBorderConfigState((previous) =>
        sanitizePreferences({
          ...previous,
          ...config,
        }),
      );
    },
    [],
  );

  const resetBorderConfig = useCallback(() => {
    setBorderConfigState(DEFAULT_BORDER_PREFERENCES);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(borderConfig));
  }, [borderConfig]);

  const value = useMemo(
    () => ({
      borderConfig,
      setBorderConfig,
      updateBorderConfig,
      resetBorderConfig,
    }),
    [borderConfig, setBorderConfig, updateBorderConfig, resetBorderConfig],
  );

  return (
    <BorderPreferencesContext.Provider value={value}>
      {children}
    </BorderPreferencesContext.Provider>
  );
};

export const useBorderPreferences = () => {
  const context = useContext(BorderPreferencesContext);

  if (!context) {
    if (import.meta.env?.DEV) {
      console.warn(
        'useBorderPreferences called outside of BorderPreferencesProvider. Using default border preferences.',
      );
    }

    return defaultContextValue;
  }

  return context;
};

export default BorderPreferencesContext;

