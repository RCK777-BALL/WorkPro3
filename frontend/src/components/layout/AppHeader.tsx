/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Search, Sparkles } from 'lucide-react';

import NotificationMenu from './NotificationMenu';
import GlobalSearch from './GlobalSearch';
import { useAuth } from '@/context/AuthContext';
import ThemeControls from './ThemeControls';

const formatTimestamp = () =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

const AppHeader: React.FC = () => {
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [timestamp, setTimestamp] = useState(formatTimestamp);
  const { user } = useAuth();

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTimestamp(formatTimestamp()), 60_000);
    return () => window.clearInterval(id);
  }, []);

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

  const statusStyles = useMemo(
    () =>
      online
        ? 'bg-success-500 shadow-success-500/40'
        : 'bg-error-500 shadow-error-500/40',
    [online],
  );

  return (
    <>
      <header className="relative flex h-20 items-center gap-6 border-b border-white/10 bg-white/10 px-6 backdrop-blur-xl">
        <div className="flex flex-1 items-center gap-4">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="group flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white md:max-w-xl"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white/80 transition group-hover:bg-white/10 group-hover:text-white">
              <Search className="h-5 w-5" />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="font-medium">Search assets, work orders and permits</span>
              <span className="text-xs text-white/50">Smart suggestions powered by your latest activity</span>
            </span>
            <span className="hidden items-center gap-1 text-[11px] font-medium text-white/50 md:flex">
              <kbd className="rounded bg-white/10 px-1.5 py-0.5">⌘</kbd>
              <span>+</span>
              <kbd className="rounded bg-white/10 px-1.5 py-0.5">K</kbd>
            </span>
          </button>

          <div className="hidden min-w-[14rem] flex-col rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 lg:flex">
            <span className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className={`h-2.5 w-2.5 rounded-full shadow-[0_0_0_4px_rgba(255,255,255,0.08)] ${statusStyles}`} />
              {online ? 'Live systems' : 'Offline mode'}
            </span>
            <span className="mt-1 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-white/60" />
              <span>{timestamp}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeControls />
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 sm:flex">
            <Sparkles className="h-4 w-4 text-white/60" />
            <span className="font-medium text-white">{user?.name ?? 'Guest'}</span>
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <span>{user?.role ? user.role.toUpperCase() : 'TECH'}</span>
          </div>

          <NotificationMenu open={notificationsOpen} onOpenChange={setNotificationsOpen} />
        </div>
      </header>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
};

export default AppHeader;
