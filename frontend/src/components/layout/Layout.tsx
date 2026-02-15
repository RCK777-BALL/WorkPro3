/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { useTheme } from '@/context/ThemeContext';
import { useSettingsStore } from '@/store/settingsStore';
import { ScopeProvider } from '@/context/ScopeContext';
import { emitToast } from '@/context/ToastContext';
import { useTranslation } from 'react-i18next';
import { syncManager } from '@/utils/syncManager';
import AppShell from '@/layout/AppShell';
import { applyThemeCssVariables, resolveTheme } from '@/theme/theme';

const COLOR_SCHEMES: Record<
  string,
  {
    accent: string;
    accentStrong: string;
    accentLight: string;
    glow: string;
    glowStrong: string;
    halo: string;
  }
> = {
  default: {
    accent: '#4f46e5',
    accentStrong: '#4338ca',
    accentLight: '#e0e7ff',
    glow: 'rgba(99, 102, 241, 0.28)',
    glowStrong: 'rgba(79, 70, 229, 0.22)',
    halo: 'rgba(56, 189, 248, 0.14)',
  },
  teal: {
    accent: '#0f766e',
    accentStrong: '#0d9488',
    accentLight: '#ccfbf1',
    glow: 'rgba(20, 184, 166, 0.28)',
    glowStrong: 'rgba(13, 148, 136, 0.22)',
    halo: 'rgba(59, 130, 246, 0.12)',
  },
  purple: {
    accent: '#7c3aed',
    accentStrong: '#6d28d9',
    accentLight: '#ede9fe',
    glow: 'rgba(147, 51, 234, 0.28)',
    glowStrong: 'rgba(109, 40, 217, 0.22)',
    halo: 'rgba(168, 85, 247, 0.16)',
  },
};

export default function Layout() {
  const location = useLocation();
  const { pathname } = location;
  const { t } = useTranslation();
  const { backgroundColor, textColor, theme } = useTheme();
  const { sidebarCollapsed, denseMode, highContrast, colorScheme = 'default' } = useSettingsStore(
    (state) => state.theme,
  );
  const unauthorizedHandledKeyRef = useRef<string | null>(null);
  const accent = useMemo(() => COLOR_SCHEMES[colorScheme] ?? COLOR_SCHEMES.default, [colorScheme]);
  const semanticTheme = useMemo(() => {
    const mode =
      theme === 'system'
        ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light')
        : theme;
    return resolveTheme(mode === 'dark' ? 'dark' : 'light');
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const body = window.document.body;
    body.classList.toggle('dense-mode', denseMode);
    return () => {
      body.classList.remove('dense-mode');
    };
  }, [denseMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const body = window.document.body;
    body.classList.toggle('high-contrast', highContrast);
    return () => {
      body.classList.remove('high-contrast');
    };
  }, [highContrast]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = window.document.documentElement;
    root.dataset.colorScheme = colorScheme;
    root.style.setProperty('--accent-color', accent.accent);
    root.style.setProperty('--accent-color-strong', accent.accentStrong);
    root.style.setProperty('--accent-color-light', accent.accentLight);
    root.style.setProperty('--accent-glow', accent.glow);
    root.style.setProperty('--accent-glow-strong', accent.glowStrong);
    root.style.setProperty('--accent-halo', accent.halo);
  }, [accent, colorScheme]);

  useEffect(() => {
    applyThemeCssVariables(semanticTheme);
  }, [semanticTheme]);

  useEffect(() => {
    const state = (location.state as { unauthorized?: boolean; message?: string } | null) ?? null;
    if (state?.unauthorized) {
      if (unauthorizedHandledKeyRef.current === location.key) return;

      unauthorizedHandledKeyRef.current = location.key;
      emitToast(state.message ?? t('auth.permissionRedirect'), 'error');
      window.history.replaceState({}, document.title, location.pathname + location.search);
    } else {
      unauthorizedHandledKeyRef.current = null;
    }
  }, [location.key, location.pathname, location.search, location.state, t]);

  useEffect(() => {
    syncManager.init();
    return () => syncManager.teardown();
  }, []);

  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot');

  if (isAuthRoute) {
    return <Outlet />;
  }

  return (
    <ScopeProvider>
      <div style={{ backgroundColor, color: textColor }}>
        <AppShell sidebarCollapsed={sidebarCollapsed} denseMode={denseMode}>
          <Outlet />
        </AppShell>
      </div>
    </ScopeProvider>
  );
}
