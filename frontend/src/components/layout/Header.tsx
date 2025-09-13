/*
 * SPDX-License-Identifier: MIT
 */

 
 
import React, { useEffect, useState } from 'react';

import { Search, Menu, Database } from 'lucide-react';
import GlobalSearch from '@/components/GlobalSearch';

import ThemeToggle from '@common/ThemeToggle';
import Avatar from '@common/Avatar';
import { Button } from '@/components/ui/button';
import { useAuthStore, type AuthState, isAdmin as selectIsAdmin, isSupervisor as selectIsSupervisor } from '@/store/authStore';

import { useDataStore } from '@/store/dataStore';
import { useTranslation } from 'react-i18next';

import NotificationMenu from './NotificationMenu';
import HelpMenu from './HelpMenu';
import SearchBar from './SearchBar';

interface HeaderProps {
  onToggleSidebar: () => void;
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, title }) => {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s: AuthState) => s.user);
  const isAdmin = useAuthStore(selectIsAdmin);
  const isSupervisor = useAuthStore(selectIsSupervisor);
  const { useFakeData, setUseFakeData } = useDataStore();
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowGlobalSearch(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

 
 
 

  const handleToggleDataMode = () => {
    setUseFakeData(!useFakeData);
  };

  return (
    <>
      <header className="relative h-16 bg-gradient-to-r from-primary-light to-primary-dark text-primary-foreground border-b border-border flex items-center justify-between px-2 sm:px-4 lg:px-6">
        <div className="flex items-center">
          <button
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
            className="lg:hidden p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none"
          >
            <Menu size={20} className="dark:text-white" />
          </button>
          <h1 className="text-xl font-semibold text-white ml-2 lg:ml-0">{title ?? t('nav.dashboard')}</h1>
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            aria-label="Search"
            className="md:hidden ml-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none"
          >
            <Search size={20} className="dark:text-white" />
          </button>
        </div>

        <SearchBar showMobileSearch={showMobileSearch} />

        <div className="flex items-center space-x-4">
          {(isAdmin || isSupervisor) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleDataMode}
              className={`flex items-center gap-1 ${useFakeData ? 'text-warning-600' : 'text-success-600'}`}
            >
              <Database size={16} />
              {useFakeData ? t('header.demoMode') : t('header.liveData')}
            </Button>
          )}

          <ThemeToggle />
          <select
            value={i18n.language}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => i18n.changeLanguage(e.target.value)}
            className="border rounded p-1 text-sm bg-white dark:bg-neutral-800 dark:text-white"
          >
            <option value="en">EN</option>
            <option value="es">ES</option>
          </select>

          <NotificationMenu open={showNotifications} onOpenChange={setShowNotifications} />

          <HelpMenu open={showHelpMenu} onOpenChange={setShowHelpMenu} />

          <div className="flex items-center ml-2">
            <Avatar name={user?.name || ''} size="sm" />
            <div className="ml-2 hidden md:block">
              <p className="text-sm font-medium text-neutral-900 dark:text-white">{user?.name}</p>
              <p className="text-xs text-neutral-700 dark:text-neutral-300">
                {t(`roles.${user?.role ?? 'tech'}`)}
              </p>
            </div>
          </div>
        </div>
      </header>
      <GlobalSearch open={showGlobalSearch} onOpenChange={setShowGlobalSearch} />
    </>
  );
};

export default Header;
