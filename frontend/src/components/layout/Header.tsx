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
import AlertBell from './AlertBell';

const Header: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthStore((s: AuthState) => s.user);
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
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 text-slate-100 backdrop-blur supports-[backdrop-filter]:bg-slate-950/70">
      <button
        onClick={() => setSearchOpen(true)}
        className="flex max-w-md flex-1 items-center rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 shadow-sm transition hover:border-slate-600 hover:bg-slate-900/80"
      >
        <Search size={18} className="text-slate-400" />
        <span className="ml-2 hidden flex-1 text-left md:block text-slate-300">
          {t('header.searchPlaceholder')}
        </span>
        <kbd className="ml-auto hidden rounded border border-slate-700 bg-slate-800 px-1 text-xs text-slate-200 md:inline">
          ⌘K
        </kbd>
      </button>
      <div className="ml-4 flex items-center gap-3">
        <PlantSwitcher />
        <AlertBell />
        <span className="hidden text-sm font-medium text-slate-300 md:block">
          {formattedDateTime}
        </span>
        <NotificationMenu open={showNotifications} onOpenChange={setShowNotifications} />
        <Avatar name={user?.name || ''} size="sm" />
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
};

export default Header;

