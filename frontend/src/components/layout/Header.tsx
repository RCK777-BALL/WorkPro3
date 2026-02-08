/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import Avatar from '@/components/common/Avatar';
import NotificationMenu from './NotificationMenu';
import { useAuthStore, type AuthState } from '@/store/authStore';
import GlobalSearch from './GlobalSearch';
import PlantSwitcher from './PlantSwitcher';
import TenantSwitcher from './TenantSwitcher';
import { useScopeContext } from '@/context/ScopeContext';
import SyncStatusIndicator from '@/components/offline/SyncStatusIndicator';
import Button from '@/components/common/Button';
import { usePermissions } from '@/auth/usePermissions';

const Header: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s: AuthState) => s.user);
  const { activeTenant, activePlant, loadingTenants, loadingPlants } = useScopeContext();
  const { can } = usePermissions();
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
    <header className="flex flex-col gap-3 border-b border-slate-800 bg-slate-950/80 px-4 py-3 text-slate-100 backdrop-blur supports-[backdrop-filter]:bg-slate-950/70 md:flex-row md:items-center md:justify-between">
      <button
        onClick={() => setSearchOpen(true)}
        className="flex w-full items-center rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 shadow-sm transition hover:border-slate-600 hover:bg-slate-900/80 md:max-w-md md:flex-1"
      >
        <Search size={18} className="text-slate-400" />
        <span className="ml-2 hidden flex-1 text-left md:block text-slate-300">
          {t('header.searchPlaceholder')}
        </span>
        <kbd className="ml-auto hidden rounded border border-slate-700 bg-slate-800 px-1 text-xs text-slate-200 md:inline">
          ⌘K
        </kbd>
      </button>
      <div className="flex flex-wrap items-center gap-3 md:ml-4 md:flex-nowrap md:gap-4">
        {can('workOrders', 'write') && (
          <Button
            type="button"
            size="sm"
            className="w-full md:w-auto"
            onClick={() => navigate('/work-orders?create=1')}
            icon={<Plus className="h-4 w-4" />}
          >
            Create WO
          </Button>
        )}
        <div
          className="hidden items-center gap-2 rounded-md border border-slate-700/80 bg-slate-900/60 px-3 py-2 text-xs text-slate-200 md:flex"
          aria-live="polite"
        >
          <span className="text-slate-400">{t('context.tenant')}:</span>
          <span className="font-semibold">
            {loadingTenants ? t('context.loading') : activeTenant?.name ?? t('context.unassigned')}
          </span>
          <span className="ml-2 text-slate-600" aria-hidden>
            •
          </span>
          <span className="text-slate-400">{t('context.site')}:</span>
          <span className="font-semibold">
            {loadingPlants ? t('context.loading') : activePlant?.name ?? t('context.unassigned')}
          </span>
        </div>
        <TenantSwitcher />
        <PlantSwitcher />
        <span className="hidden text-sm font-medium text-slate-300 md:block">
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
