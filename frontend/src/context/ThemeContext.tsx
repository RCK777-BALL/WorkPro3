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
    background: '#f8fafc',
    text: '#000000',
  },
  dark: {
    background: '#050a1a',
    text: '#e2e8f0',
  },
};

const SYSTEM_THEME_COLORS: ThemeColors = {
  background: '#eaf4ff',
  text: '#000000',
};

const hexToRgb = (value: string): { r: number; g: number; b: number } | null => {
  const raw = value.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(raw)) return null;
  const normalized =
    raw.length === 3
      ? raw
          .split('')
          .map((ch) => `${ch}${ch}`)
          .join('')
      : raw;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return { r, g, b };
};

const relativeLuminance = (value: string): number => {
  const rgb = hexToRgb(value);
  if (!rgb) return 0;
  const transform = (channel: number) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  const r = transform(rgb.r);
  const g = transform(rgb.g);
  const b = transform(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrastRatio = (foreground: string, background: string): number => {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

const pickReadableTextColor = (background: string): string => {
  const darkText = '#000000';
  const lightText = '#f8fafc';
  return contrastRatio(darkText, background) >= contrastRatio(lightText, background)
    ? darkText
    : lightText;
};

const ensureReadableColors = (background: string, text: string): ThemeColors => {
  if (contrastRatio(text, background) >= 4.5) {
    return { background, text };
  }
  return {
    background,
    text: pickReadableTextColor(background),
  };
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
    return stored ?? 'dark';
  });

  const [backgroundColor, setBackgroundColorState] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME_COLORS.dark.background;
    const stored = safeLocalStorage.getItem(BACKGROUND_STORAGE_KEY);
    if (stored) return stored;
    const storedTheme =
      (safeLocalStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null) ?? 'system';
    const resolvedTheme =
      storedTheme === 'system' ? getSystemTheme() : (storedTheme as Exclude<ThemeMode, 'system'>);
    if (storedTheme === 'system') return SYSTEM_THEME_COLORS.background;
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
    if (storedTheme === 'system') return SYSTEM_THEME_COLORS.text;
    return DEFAULT_THEME_COLORS[resolvedTheme].text;
  });

  const safeThemeColors = useMemo(
    () => ensureReadableColors(backgroundColor, textColor),
    [backgroundColor, textColor],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    safeLocalStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    safeLocalStorage.setItem(BACKGROUND_STORAGE_KEY, safeThemeColors.background);
  }, [safeThemeColors.background]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    safeLocalStorage.setItem(TEXT_STORAGE_KEY, safeThemeColors.text);
  }, [safeThemeColors.text]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = window.document.documentElement;

    const apply = (value: ThemeMode) => {
      root.classList.remove('light', 'dark', 'system');
      root.classList.add(value);
      root.style.colorScheme = value === 'dark' ? 'dark' : 'light';
    };

    apply(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = window.document.documentElement;
    root.style.setProperty('--app-background-color', safeThemeColors.background);
    root.style.setProperty('--app-text-color', safeThemeColors.text);
    window.document.body.style.backgroundColor = safeThemeColors.background;
    window.document.body.style.color = safeThemeColors.text;
  }, [safeThemeColors.background, safeThemeColors.text]);

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
    if (theme === 'system') {
      setBackgroundColorState(SYSTEM_THEME_COLORS.background);
      setTextColorState(SYSTEM_THEME_COLORS.text);
      return;
    }
    const defaults = DEFAULT_THEME_COLORS[theme];
    setBackgroundColorState(defaults.background);
    setTextColorState(defaults.text);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      backgroundColor: safeThemeColors.background,
      setBackgroundColor,
      textColor: safeThemeColors.text,
      setTextColor,
      resetColors,
    }),
    [
      theme,
      setTheme,
      safeThemeColors.background,
      setBackgroundColor,
      safeThemeColors.text,
      setTextColor,
      resetColors,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used within a ThemeProvider');
  return theme;
}

export default ThemeContext;
