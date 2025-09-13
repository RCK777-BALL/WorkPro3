/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import Avatar from '@common/Avatar';
import NotificationMenu from './NotificationMenu';
import { useAuthStore, type AuthState } from '@/store/authStore';

const Header: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthStore((s: AuthState) => s.user);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4 dark:bg-neutral-900">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400"
          />
          <input
            type="text"
            placeholder={t('header.searchPlaceholder')}
            className="w-full rounded-md border border-neutral-300 bg-transparent py-2 pl-9 pr-3 text-sm text-neutral-900 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </div>
      </div>
      <div className="ml-4 flex items-center gap-4">
        <NotificationMenu open={showNotifications} onOpenChange={setShowNotifications} />
        <Avatar name={user?.name || ''} size="sm" />
      </div>
    </header>
  );
};

export default Header;

