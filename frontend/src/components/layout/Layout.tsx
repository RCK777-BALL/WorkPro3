/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import Header from './Header';
import Sidebar from './Sidebar';
import RightPanel from './RightPanel';
import ContextBreadcrumbs from './ContextBreadcrumbs';
import CommandPalette from '@/components/global/CommandPalette';
import { useTheme } from '@/context/ThemeContext';
import { useSettingsStore } from '@/store/settingsStore';
import { ScopeProvider } from '@/context/ScopeContext';
import { emitToast } from '@/context/ToastContext';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { syncManager } from '@/utils/syncManager';

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

const hexToRgba = (hex: string, alpha: number) => {
  let normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((char) => char + char)
      .join('');
  }
  const parsed = parseInt(normalized, 16);
  const r = (parsed >> 16) & 255;
  const g = (parsed >> 8) & 255;
  const b = parsed & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default function Layout() {
  const location = useLocation();
  const { pathname } = location;
  const { t } = useTranslation();
  const { backgroundColor, textColor } = useTheme();
  const { sidebarCollapsed, denseMode, highContrast, colorScheme = 'default' } = useSettingsStore(
    (state) => state.theme,
  );
  const unauthorizedHandledKeyRef = useRef<string | null>(null);
  const accent = useMemo(() => COLOR_SCHEMES[colorScheme] ?? COLOR_SCHEMES.default, [colorScheme]);
  const accentBackground = useMemo(
    () => ({
      radial: `radial-gradient(circle at top, ${hexToRgba(accent.accent, 0.08)}, transparent 50%)`,
    }),
    [accent],
  );

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
      <div
        className="relative min-h-screen bg-slate-950 text-slate-100 transition-colors duration-300"
        style={{ backgroundColor, color: textColor }}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-slate-950"
          style={{ background: accentBackground.radial }}
        />

        <div className={clsx('relative z-10 flex min-h-screen', denseMode ? 'gap-4' : undefined)}>
          <Sidebar collapsed={sidebarCollapsed} />

          <div className="flex flex-1 flex-col overflow-hidden">
            <CommandPalette />
            <Header />
            <main
              className={clsx(
                'flex-1 overflow-y-auto',
                denseMode ? 'px-4 pb-6 pt-4 md:px-6' : 'px-6 pb-10 pt-6 md:px-10',
              )}
            >
              <div className="mx-auto flex w-full flex-col gap-6">
                <ContextBreadcrumbs />
                <Outlet />
              </div>
            </main>
          </div>
          <RightPanel />
        </div>
      </div>
    </ScopeProvider>
  );
}
