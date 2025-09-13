/*
 * SPDX-License-Identifier: MIT
 */

 
 
import React, { useEffect, useState, useRef } from 'react';

import { Search, Bell, HelpCircle, Menu, Book, Video, MessageCircle, FileText, ExternalLink, Database } from 'lucide-react';
import GlobalSearch from '@/components/GlobalSearch';
import { useToast } from '../../context/ToastContext';
 
import ThemeToggle from '@common/ThemeToggle';
import Avatar from '@common/Avatar';
import Card from '@common/Card';
import { Button } from '@/components/ui/button';
import { useAuthStore, type AuthState, isAdmin as selectIsAdmin, isSupervisor as selectIsSupervisor } from '@/store/authStore';

import { useDataStore } from '@/store/dataStore';
import { useNavigate } from 'react-router-dom';

import { markNotificationRead } from '@/api/notifications';
import { useSummary } from '@/hooks/useSummaryData';
import { useTranslation } from 'react-i18next';
 

import type { Notification } from '@/types';

interface HeaderProps {
  onToggleSidebar: () => void;
  title?: string;
}

type HeaderNotification = Notification & { link?: string };

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, title }) => {
  const { t, i18n } = useTranslation();
  const { addToast } = useToast();
  const user = useAuthStore((s: AuthState) => s.user);
  const isAdmin = useAuthStore(selectIsAdmin);
  const isSupervisor = useAuthStore(selectIsSupervisor);
  const { useFakeData, setUseFakeData } = useDataStore();
  const navigate = useNavigate();
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const notificationsMenuRef = useRef<HTMLDivElement>(null);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const helpMenuRef = useRef<HTMLDivElement>(null);
 

  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [notificationsData, fetchNotifications] = useSummary<HeaderNotification[]>(
    '/notifications',
    [],
    { auto: false, poll: false, ttlMs: 30_000 },
  );

  useEffect(() => {
    if (notificationsData) setNotifications(notificationsData);
  }, [notificationsData]);

  useEffect(() => {
    if (showNotifications) {
      setLoadingNotifications(true);
      fetchNotifications()
        .then((data) => {
          if (!data) {
            addToast(t('header.failedToLoadNotifications'), 'error');
            setNotificationsError(t('header.failedToLoadNotifications'));
          } else {
            setNotificationsError(null);
          }
        })
        .finally(() => setLoadingNotifications(false));
    }
  }, [showNotifications, fetchNotifications, addToast, t]);
  useEffect(() => {
    if (showNotifications) {
      notificationsMenuRef.current?.focus();
    } else {
      notificationsButtonRef.current?.focus();
    }
  }, [showNotifications]);

  useEffect(() => {
    if (showHelpMenu) {
      helpMenuRef.current?.focus();
    } else {
      helpButtonRef.current?.focus();
    }
  }, [showHelpMenu]);

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

 
 
 

  const helpResources = [
    {
      title: t('header.documentation'),
      description: t('header.documentationDesc'),
      icon: <Book size={20} />,
      link: '/documentation',
      color: 'text-primary-600'
    },
    {
      title: t('header.videoTutorials'),
      description: t('header.videoTutorialsDesc'),
      icon: <Video size={20} />,
      link: '/documentation#videos',
      color: 'text-teal-600'
    },
    {
      title: t('header.liveChat'),
      description: t('header.liveChatDesc'),
      icon: <MessageCircle size={20} />,
      link: '/messages',
      color: 'text-success-600'
    },
    {
      title: t('header.knowledgeBase'),
      description: t('header.knowledgeBaseDesc'),
      icon: <FileText size={20} />,
      link: '/documentation#kb',
      color: 'text-accent-600'
    }
  ];
 


  const unreadCount = notifications.filter(n => !n.read).length;
 
  const getTimeAgo = (createdAt: string) => {
    const now = new Date();
    const date = new Date(createdAt);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return t('time.justNow');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('time.minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('time.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    return t('time.daysAgo', { count: days });
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-200 border-error-200 dark:border-error-800';
      case 'warning':
        return 'bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-200 border-warning-200 dark:border-warning-800';
      default:
        return 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-200 border-primary-200 dark:border-primary-800';
    }
  };

  const handleNotificationClick = async (notification: HeaderNotification) => {
    // Optimistic update
 
    setNotifications(prevNotifications =>
      prevNotifications.map(n =>
        n.id === notification.id ? { ...n, read: true } : n
      )
    );

    try {
      await markNotificationRead(notification.id);
      if (notification.link) {
        navigate(notification.link);
      }
      setShowNotifications(false);
    } catch {
      addToast('Failed to mark notification as read', 'error');
      // Revert on failure
      setNotifications(prevNotifications =>
        prevNotifications.map(n =>
          n.id === notification.id ? { ...n, read: false } : n
        )
      );
    }
  };

 
  const handleResourceClick = (link: string) => {
    setShowHelpMenu(false);
    navigate(link);
  };

  const handleContactSupport = () => {
    setShowHelpMenu(false);
    navigate('/messages');
  };

  const handleToggleDataMode = () => {
    setUseFakeData(!useFakeData);
  };

  const toggleNotifications = () => setShowNotifications(prev => !prev);

  return (
    <>
    <header className="relative h-16 bg-gradient-to-r from-primary-light to-primary-dark text-primary-foreground border-b border-border flex items-center justify-between px-2 sm:px-4 lg:px-6">

      <div className="flex items-center">
        <button
          onClick={onToggleSidebar} aria-label="Toggle sidebar"
          className="lg:hidden p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none"
        >
          <Menu size={20} className="dark:text-white" />
        </button>
        <h1 className="text-xl font-semibold text-white ml-2 lg:ml-0">{title ?? t('nav.dashboard')}</h1>
        <button
          onClick={() => setShowMobileSearch(!showMobileSearch)} aria-label="Search"
          className="md:hidden ml-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none"
        >
          <Search size={20} className="dark:text-white" />
        </button>
      </div>

      <div className="hidden md:flex items-center bg-neutral-100 dark:bg-neutral-700 rounded-lg px-3 py-2 w-96">
        <Search size={18} className="text-neutral-700 dark:text-neutral-300" />
        <input
          type="text"
          placeholder={t('header.searchPlaceholder')}
          className="bg-transparent border-none outline-none w-full text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 ml-2"
        />
      </div>

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

 
        <div className="relative">
          <button
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none relative" aria-label="Notifications" aria-haspopup="true" aria-expanded={showNotifications} ref={notificationsButtonRef}
            onClick={toggleNotifications}
          >
            <Bell size={20} className="dark:text-white" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-error-500 text-white text-xs flex items-center justify-center rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

 
          {showNotifications && (
            <div
              ref={notificationsMenuRef}
              tabIndex={-1}
              role="menu"
              aria-label="Notifications"
              className="absolute right-0 mt-2 w-80 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 z-50"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowNotifications(false);
                }
              }}
            >
              <Card
                title={t('header.notifications')}
                subtitle={`${unreadCount} unread notifications`}
                noPadding
              >
                <div className="max-h-96 overflow-y-auto">
                  {loadingNotifications && (
                    <div className="py-8 text-center text-neutral-700 dark:text-neutral-300">
                      Loading...
                    </div>
                  )}

                  {!loadingNotifications && notificationsError && (
                    <div className="py-8 text-center text-neutral-700 dark:text-neutral-300">
                      {notificationsError}
                    </div>
                  )}

                  {!loadingNotifications && !notificationsError &&
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        className={`w-full text-left p-4 border-b border-neutral-100 dark:border-neutral-700 last:border-b-0 ${
                          notification.read ? 'opacity-75' : ''
                        } ${getNotificationColor(notification.type)}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-medium">{notification.title}</h4>
                          <span className="text-xs">{getTimeAgo(notification.createdAt)}</span>
                        </div>
                        <p className="text-sm">{notification.message}</p>
                      </button>
                    ))}

                  {!loadingNotifications && !notificationsError && notifications.length === 0 && (
                    <div className="py-8 text-center text-neutral-700 dark:text-neutral-300">
                      {t('header.noNotifications')}
                    </div>
                  )}
                </div>
                <div className="p-2 border-t border-neutral-100 dark:border-neutral-700 text-center">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      navigate('/notifications');
                    }}
                    className="text-sm text-primary-600 hover:underline"
                  >
                    {t('header.viewAll')}
                  </button>
                </div>
              </Card>
            </div>
          )}
 
        </div>
 

        <div className="relative">
          <button 
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none" aria-label="Help menu" aria-haspopup="true" aria-expanded={showHelpMenu} ref={helpButtonRef}
            onClick={() => setShowHelpMenu(!showHelpMenu)}
          >
            <HelpCircle size={20} className="dark:text-white" />
          </button>

          {showHelpMenu && (
            <div
              ref={helpMenuRef}
              tabIndex={-1}
              role="menu"
              aria-label="Help menu"
              className="absolute right-0 mt-2 w-80 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 z-50"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowHelpMenu(false);
                }
              }}
            >
              <Card
                title={t('header.helpResources')}
                subtitle={t('header.helpSubtitle')}
                noPadding
              >
                <div className="p-2">
                  {helpResources.map((resource, index) => (
                    <button
                      key={index}
                      onClick={() => handleResourceClick(resource.link)}
                      className="w-full flex items-start p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors duration-150"
                    >
                      <div className={`p-2 rounded-lg ${resource.color} bg-opacity-10`}>
                        {resource.icon}
                      </div>
                      <div className="ml-3 text-left">
                        <h4 className="font-medium text-neutral-900 dark:text-white">{resource.title}</h4>
                        <p className="text-sm text-neutral-700 dark:text-neutral-300">{resource.description}</p>
                      </div>
                      <ExternalLink size={16} className="ml-auto text-neutral-400" />
                    </button>
                  ))}
                </div>
                
                <div className="p-4 bg-neutral-50 dark:bg-neutral-700 border-t border-neutral-200 dark:border-neutral-600">
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2">{t('header.needHelp')}</p>
                  <Button
                    className="w-full"
                    onClick={handleContactSupport}
                  >
                    {t('header.contactSupport')}
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>

        <div className="flex items-center ml-2">
          <Avatar 
            name={user?.name || ''} 
            size="sm"
          />
          <div className="ml-2 hidden md:block">
            <p className="text-sm font-medium text-neutral-900 dark:text-white">{user?.name}</p>
            <p className="text-xs text-neutral-700 dark:text-neutral-300">
              {t(`roles.${user?.role ?? 'tech'}`)}
            </p>
          </div>
        </div>
      </div>
      {showMobileSearch && (
        <div className="absolute top-16 inset-x-0 px-4 py-2 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 md:hidden">
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-700 rounded-lg px-3 py-2">
            <Search size={18} className="text-neutral-700 dark:text-neutral-300" />
            <input
              type="text"
              placeholder={t('header.searchPlaceholder')}
              className="bg-transparent border-none outline-none w-full text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 ml-2"
            />
          </div>
        </div>
      )}
    </header>
    <GlobalSearch open={showGlobalSearch} onOpenChange={setShowGlobalSearch} />
  </>
  );
};

export default Header;
