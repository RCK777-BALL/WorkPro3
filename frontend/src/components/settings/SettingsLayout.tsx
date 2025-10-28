/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState, type ReactNode } from 'react';
import { Save } from 'lucide-react';

import Button from '@/components/common/Button';
import { useToast } from '@/context/ToastContext';
import http from '@/lib/http';
import { useSettingsStore } from '@/store/settingsStore';
import { useThemeStore } from '@/store/themeStore';

interface SettingsLayoutProps {
  children: ReactNode;
  description?: string;
  isLoading?: boolean;
  title?: string;
}

const SettingsLayout: React.FC<SettingsLayoutProps> = ({
  children,
  description = 'Manage your application preferences',
  isLoading = false,
  title = 'Settings',
}) => {
  const { addToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);

      const { general, notifications, email, theme } = useSettingsStore.getState();
      const { theme: mode, colorScheme } = useThemeStore.getState();

      await http.post('/settings', {
        general,
        notifications,
        email,
        theme: {
          ...theme,
          mode,
          colorScheme: theme.colorScheme ?? colorScheme,
        },
      });

      addToast('Settings saved', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status === 401) {
        addToast('Unauthorized', 'error');
      } else {
        addToast('Failed to save settings', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const renderSaveButton = () => (
    <Button
      variant="primary"
      icon={<Save size={16} />}
      onClick={handleSaveSettings}
      loading={isSaving}
      disabled={isSaving || isLoading}
    >
      {isSaving ? 'Saving…' : 'Save Changes'}
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">{title}</h2>
          {description ? (
            <p className="text-neutral-500 dark:text-neutral-400">{description}</p>
          ) : null}
        </div>
        {renderSaveButton()}
      </div>

      {children}

      <div className="sticky bottom-0 left-0 right-0 z-10 mt-6">
        <div className="flex justify-end rounded-lg border border-neutral-200 bg-white/80 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-neutral-700 dark:bg-neutral-900/80 dark:supports-[backdrop-filter]:bg-neutral-900/60">
          {renderSaveButton()}
        </div>
      </div>
    </div>
  );
};

export default SettingsLayout;
