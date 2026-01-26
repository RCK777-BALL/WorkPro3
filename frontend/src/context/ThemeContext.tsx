/*
 * SPDX-License-Identifier: MIT
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { safeLocalStorage } from '@/utils/safeLocalStorage';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeColors {
  background: string;
  text: string;
}

const THEME_STORAGE_KEY = 'theme';
const BACKGROUND_STORAGE_KEY = 'theme.backgroundColor';
const TEXT_STORAGE_KEY = 'theme.textColor';

const DEFAULT_THEME_COLORS: Record<Exclude<ThemeMode, 'system'>, ThemeColors> = {
  light: {
    background: '#ffffff',
    text: '#0f172a',
  },
  dark: {
    background: '#0f172a',
    text: '#f8fafc',
  },
};

const getSystemTheme = (): Exclude<ThemeMode, 'system'> =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

export interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  textColor: string;
  setTextColor: (color: string) => void;
  resetColors: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = safeLocalStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    return stored ?? 'system';
  });

  const [backgroundColor, setBackgroundColorState] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME_COLORS.dark.background;
    const stored = safeLocalStorage.getItem(BACKGROUND_STORAGE_KEY);
    if (stored) return stored;
    const storedTheme =
      (safeLocalStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null) ?? 'system';
    const resolvedTheme =
      storedTheme === 'system' ? getSystemTheme() : (storedTheme as Exclude<ThemeMode, 'system'>);
    return DEFAULT_THEME_COLORS[resolvedTheme].background;
  });

  const [textColor, setTextColorState] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME_COLORS.dark.text;
    const stored = safeLocalStorage.getItem(TEXT_STORAGE_KEY);
    if (stored) return stored;
    const storedTheme =
      (safeLocalStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null) ?? 'system';
    const resolvedTheme =
      storedTheme === 'system' ? getSystemTheme() : (storedTheme as Exclude<ThemeMode, 'system'>);
    return DEFAULT_THEME_COLORS[resolvedTheme].text;
  });

  const resolvedThemeRef = useRef<Exclude<ThemeMode, 'system'>>(
    theme === 'system' ? getSystemTheme() : theme,
  );
  const backgroundColorRef = useRef(backgroundColor);
  const textColorRef = useRef(textColor);

  useEffect(() => {
    backgroundColorRef.current = backgroundColor;
  }, [backgroundColor]);

  useEffect(() => {
    textColorRef.current = textColor;
  }, [textColor]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    safeLocalStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    safeLocalStorage.setItem(BACKGROUND_STORAGE_KEY, backgroundColor);
  }, [backgroundColor]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    safeLocalStorage.setItem(TEXT_STORAGE_KEY, textColor);
  }, [textColor]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = window.document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = (value: Exclude<ThemeMode, 'system'>) => {
      root.classList.remove('light', 'dark');
      root.classList.add(value);
      root.style.colorScheme = value;
    };

    const syncColors = (prevTheme: Exclude<ThemeMode, 'system'>, nextTheme: Exclude<ThemeMode, 'system'>) => {
      const prevDefaults = DEFAULT_THEME_COLORS[prevTheme];
      const nextDefaults = DEFAULT_THEME_COLORS[nextTheme];

      if (backgroundColorRef.current === prevDefaults.background) {
        setBackgroundColorState(nextDefaults.background);
      }

      if (textColorRef.current === prevDefaults.text) {
        setTextColorState(nextDefaults.text);
      }
    };

    const resolvedTheme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
    apply(resolvedTheme);
    if (resolvedThemeRef.current !== resolvedTheme) {
      syncColors(resolvedThemeRef.current, resolvedTheme);
      resolvedThemeRef.current = resolvedTheme;
    }

    if (theme !== 'system') return;

    const handler = (event: MediaQueryListEvent) => {
      const nextTheme = event.matches ? 'dark' : 'light';
      apply(nextTheme);
      if (resolvedThemeRef.current !== nextTheme) {
        syncColors(resolvedThemeRef.current, nextTheme);
        resolvedThemeRef.current = nextTheme;
      }
    };

    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = window.document.documentElement;
    root.style.setProperty('--app-background-color', backgroundColor);
    root.style.setProperty('--app-text-color', textColor);
    window.document.body.style.backgroundColor = backgroundColor;
    window.document.body.style.color = textColor;
  }, [backgroundColor, textColor]);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
  }, []);

  const setBackgroundColor = useCallback((color: string) => {
    setBackgroundColorState(color);
  }, []);

  const setTextColor = useCallback((color: string) => {
    setTextColorState(color);
  }, []);

  const resetColors = useCallback(() => {
    const appliedTheme = theme === 'system' ? getSystemTheme() : theme;
    const defaults = DEFAULT_THEME_COLORS[appliedTheme];
    setBackgroundColorState(defaults.background);
    setTextColorState(defaults.text);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      backgroundColor,
      setBackgroundColor,
      textColor,
      setTextColor,
      resetColors,
    }),
    [theme, setTheme, backgroundColor, setBackgroundColor, textColor, setTextColor, resetColors],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used within a ThemeProvider');
  return theme;
}

export default ThemeContext;
