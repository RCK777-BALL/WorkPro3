/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import Avatar from '@/components/common/Avatar';
import NotificationMenu from './NotificationMenu';
import { useAuthStore, type AuthState } from '@/store/authStore';
import GlobalSearch from './GlobalSearch';

const Header: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthStore((s: AuthState) => s.user);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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

  return (
    <header className="flex h-16 items-center justify-between border-b bg-gradient-to-r from-white to-neutral-100 px-4 dark:from-neutral-900 dark:to-neutral-800">
      <button
        onClick={() => setSearchOpen(true)}
        className="flex max-w-md flex-1 items-center rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-600 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
      >
        <Search size={18} className="text-neutral-500 dark:text-neutral-400" />
        <span className="ml-2 hidden flex-1 text-left md:block">
          {t('header.searchPlaceholder')}
        </span>
        <kbd className="ml-auto hidden rounded bg-neutral-200 px-1 text-xs md:inline dark:bg-neutral-700">
          ⌘K
        </kbd>
      </button>
      <div className="ml-4 flex items-center gap-4">
        <NotificationMenu open={showNotifications} onOpenChange={setShowNotifications} />
        <Avatar name={user?.name || ''} size="sm" />
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
};

export default Header;

