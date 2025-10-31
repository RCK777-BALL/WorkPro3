/*
 * SPDX-License-Identifier: MIT
 */

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useThemeStore } from '@/store/themeStore';
import { safeLocalStorage } from '@/utils/safeLocalStorage';

type Props = { children: ReactNode };

/**
 * ThemeProvider syncs the persisted theme preference with the DOM.
 * It reads the theme from the Zustand store (which persists to localStorage)
 * and toggles the `dark` class on the document root accordingly.
 */
export default function ThemeProvider({ children }: Props) {
  const { theme, colorScheme } = useThemeStore();

  useEffect(() => {
    const root = window.document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolvedTheme = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;

    safeLocalStorage.setItem('color-scheme', resolvedTheme);

    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.style.colorScheme = resolvedTheme;
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (!colorScheme) {
      root.removeAttribute('data-color-scheme');
      return;
    }

    root.dataset.colorScheme = colorScheme;
  }, [colorScheme]);

  return <>{children}</>;
}

