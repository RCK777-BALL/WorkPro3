/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import Avatar from '@/components/common/Avatar';
import NotificationMenu from './NotificationMenu';
import { useAuthStore, type AuthState } from '@/store/authStore';
import GlobalSearch from './GlobalSearch';
import PlantSwitcher from './PlantSwitcher';
import TenantSwitcher from './TenantSwitcher';
import { useScopeContext } from '@/context/ScopeContext';
import SyncStatusIndicator from '@/components/offline/SyncStatusIndicator';

const Header: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthStore((s: AuthState) => s.user);
  const { activeTenant, activePlant, loadingTenants, loadingPlants } = useScopeContext();
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const formattedDateTime = useMemo(
    () =>
      currentTime.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    [currentTime],
  );

  return (
    <header className="flex flex-col gap-3 border-b border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_88%,transparent)] px-4 py-3 text-[var(--wp-color-text)] backdrop-blur md:flex-row md:items-center md:justify-between">
      <button
        onClick={() => setSearchOpen(true)}
        className="flex w-full items-center rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm text-[var(--wp-color-text)] shadow-sm transition hover:border-[var(--wp-color-border-strong)] hover:bg-[var(--wp-color-surface-elevated)] md:max-w-md md:flex-1"
      >
        <Search size={18} className="text-[var(--wp-color-text-muted)]" />
        <span className="ml-2 hidden flex-1 text-left text-[var(--wp-color-text-muted)] md:block">
          {t('header.searchPlaceholder')}
        </span>
        <kbd className="ml-auto hidden rounded border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] px-1 text-xs text-[var(--wp-color-text)] md:inline">
          Ctrl/Cmd+K
        </kbd>
      </button>
      <div className="flex flex-wrap items-center gap-3 md:ml-4 md:flex-nowrap md:gap-4">
        <div
          className="hidden items-center gap-2 rounded-md border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_80%,transparent)] px-3 py-2 text-xs text-[var(--wp-color-text)] md:flex"
          aria-live="polite"
        >
          <span className="text-[var(--wp-color-text-muted)]">{t('context.tenant')}:</span>
          <span className="font-semibold">
            {loadingTenants ? t('context.loading') : activeTenant?.name ?? t('context.unassigned')}
          </span>
          <span className="ml-2 text-[var(--wp-color-text-muted)]" aria-hidden>
            |
          </span>
          <span className="text-[var(--wp-color-text-muted)]">{t('context.site')}:</span>
          <span className="font-semibold">
            {loadingPlants ? t('context.loading') : activePlant?.name ?? t('context.unassigned')}
          </span>
        </div>
        <TenantSwitcher />
        <PlantSwitcher />
        <span className="hidden text-sm font-medium text-[var(--wp-color-text-muted)] md:block">
          {formattedDateTime}
        </span>
        <SyncStatusIndicator />
        <NotificationMenu open={showNotifications} onOpenChange={setShowNotifications} />
        <Avatar name={user?.name || ''} size="sm" />
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
};

export default Header;


