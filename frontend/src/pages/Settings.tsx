/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';
import { Bell, Book, Mail, Save, Sliders } from 'lucide-react';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import DocumentUploader from '@/components/documentation/DocumentUploader';
import DocumentViewer from '@/components/documentation/DocumentViewer';
import { downloadDocument, parseDocument, type DocumentMetadata } from '@/utils/documentation';
import { useThemeStore } from '@/store/themeStore';
import { useSettingsStore } from '@/store/settingsStore';
import type {
  EmailSettings,
  NotificationSettings,
  ThemeSettings,
} from '@/store/settingsStore';
import { useToast } from '@/context/ToastContext';
import http from '@/lib/http';
import ThemePreferencesCard from '@/pages/settings/ThemePreferencesCard';

const Settings: React.FC = () => {
  const general = useSettingsStore((state) => state.general);
  const notifications = useSettingsStore((state) => state.notifications);
  const email = useSettingsStore((state) => state.email);
  const setGeneral = useSettingsStore((state) => state.setGeneral);
  const setNotifications = useSettingsStore((state) => state.setNotifications);
  const setEmail = useSettingsStore((state) => state.setEmail);
  const setThemeSettings = useSettingsStore((state) => state.setTheme);
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  type NotificationOptionKey = {
    [K in keyof NotificationSettings]: NotificationSettings[K] extends boolean ? K : never;
  }[keyof NotificationSettings & string];

  type EmailPreferenceKey = {
    [K in keyof EmailSettings]: EmailSettings[K] extends boolean ? K : never;
  }[keyof EmailSettings & string];

  const notificationOptions = [
    {
      key: 'emailNotifications',
      label: 'Email notifications',
      description: 'Receive important updates in your inbox',
    },
    {
      key: 'pushNotifications',
      label: 'Push notifications',
      description: 'Stay up to date with browser alerts',
    },
    {
      key: 'workOrderUpdates',
      label: 'Work order updates',
      description: 'Alert me when work orders are created or updated',
    },
    {
      key: 'maintenanceReminders',
      label: 'Maintenance reminders',
      description: 'Remind me ahead of scheduled maintenance tasks',
    },
    {
      key: 'inventoryAlerts',
      label: 'Inventory alerts',
      description: 'Notify when critical stock thresholds are reached',
    },
    {
      key: 'systemUpdates',
      label: 'System updates',
      description: 'Announcements about new features and releases',
    },
  ] satisfies { label: string; description: string; key: NotificationOptionKey }[];

  const emailPreferences = [
    {
      key: 'dailyDigest',
      label: 'Daily digest',
      description: 'Summary of key activity delivered each morning',
    },
    {
      key: 'weeklyReport',
      label: 'Weekly report',
      description: 'Performance highlights and trends for the week',
    },
    {
      key: 'criticalAlerts',
      label: 'Critical alerts',
      description: 'Send immediately when critical issues occur',
    },
  ] satisfies { label: string; description: string; key: EmailPreferenceKey }[];

  const [documents, setDocuments] = useState<Array<{ content: string; metadata: DocumentMetadata }>>([]);

  const handleDocumentUpload = async (files: File[]) => {
    try {
      const newDocs = await Promise.all(files.map(parseDocument));
      setDocuments([...documents, ...newDocs]);
    } catch (error) {
      console.error('Error uploading documents:', error);
    }
  };

  const handleDocumentDownload = (doc: { content: string; metadata: DocumentMetadata }) => {
    const mimeType = (() => {
      switch (doc.metadata.type) {
        case 'pdf':
          return 'application/pdf';
        case 'excel':
          return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        case 'word':
          return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        default:
          return 'text/plain';
      }
    })();
    downloadDocument(doc.content, doc.metadata.title, mimeType);
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, idx) => idx !== index));
  };

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const response = await http.get('/settings');
        const payload = response.data as Partial<{
          general: Partial<typeof general>;
          notifications: Partial<typeof notifications>;
          email: Partial<typeof email>;
          theme: Partial<ThemeSettings> & { mode?: 'light' | 'dark' | 'system' };
        }>;

        if (!isMounted || !payload) {
          return;
        }

        if (payload.general) {
          setGeneral(payload.general);
        }

        if (payload.notifications) {
          setNotifications(payload.notifications);
        }

        if (payload.email) {
          setEmail(payload.email);
        }

        if (payload.theme) {
          const { mode, ...restTheme } = payload.theme;
          setThemeSettings({ ...restTheme, ...(mode ? { mode } : {}) });

          if (mode) {
            useThemeStore.setState({ theme: mode });
          }

          if (payload.theme.colorScheme) {
            useThemeStore.setState({ colorScheme: payload.theme.colorScheme });
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        addToast('Failed to load settings', 'error');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [addToast, setEmail, setGeneral, setNotifications]);

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      const {
        general: currentGeneral,
        notifications: currentNotifications,
        email: currentEmail,
        theme: currentTheme,
      } = useSettingsStore.getState();
      const { theme: currentThemeMode, colorScheme: currentColorScheme } = useThemeStore.getState();
      const themePayload = {
        ...currentTheme,
        mode: currentTheme.mode ?? currentThemeMode,
        colorScheme: currentTheme.colorScheme ?? currentColorScheme,
      };

      await http.post('/settings', {
        general: currentGeneral,
        notifications: currentNotifications,
        email: currentEmail,
        theme: themePayload,
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

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Settings</h2>
            <p className="text-neutral-500 dark:text-neutral-400">Manage your application preferences</p>
          </div>
          <Button
            variant="primary"
            icon={<Save size={16} />}
            onClick={handleSaveSettings}
            loading={isSaving}
            disabled={isSaving || isLoading}
          >
            {isSaving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-neutral-300 bg-white/50 p-4 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-300">
            <LoadingSpinner fullscreen={false} size="sm" />
            <span>Loading your saved settings…</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* General Settings */}
          <Card title="General Settings" icon={<Sliders className="h-5 w-5 text-neutral-500" />}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  value={general.companyName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGeneral({ companyName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1">
                  Timezone
                </label>
                <select
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  value={general.timezone}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGeneral({ timezone: e.target.value })}
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1">
                  Date Format
                </label>
                <select
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  value={general.dateFormat}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGeneral({ dateFormat: e.target.value })}
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1">
                  Language
                </label>
                <select
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  value={general.language}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGeneral({ language: e.target.value })}
                >
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Español</option>
                  <option value="fr-FR">Français</option>
                  <option value="de-DE">Deutsch</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Theme Settings */}
          <ThemePreferencesCard />

          {/* Notification Settings */}
          <Card title="Notification Settings" icon={<Bell className="h-5 w-5 text-neutral-500" />}>
            <div className="space-y-4">
              {notificationOptions.map(({ key, label, description }) => (
                <div className="flex items-center justify-between" key={key}>
                  <div>
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{label}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={notifications[key]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNotifications({ [key]: e.target.checked } as Partial<NotificationSettings>)
                      }
                    />
                    <div className="w-11 h-6 bg-neutral-200 dark:bg-neutral-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
                  </label>
                </div>
              ))}
            </div>
          </Card>

          {/* Email Preferences */}
          <Card title="Email Preferences" icon={<Mail className="h-5 w-5 text-neutral-500" />}>
            <div className="space-y-4">
              {emailPreferences.map(({ key, label, description }) => (
                <div className="flex items-center justify-between" key={key}>
                  <div>
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{label}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={email[key]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEmail({ [key]: e.target.checked } as Partial<EmailSettings>)
                      }
                    />
                    <div className="w-11 h-6 bg-neutral-200 dark:bg-neutral-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
                  </label>
                </div>
              ))}
            </div>
          </Card>

          {/* Theme Customization */}
          <Card title="Theme Customization" icon={<Palette className="h-5 w-5 text-neutral-500" />}>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
              Choose how WorkPro looks for you.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => void setThemeMode('light')}
                disabled={themeMode === 'light'}
              >
                Light
              </Button>
              <Button
                variant="outline"
                onClick={() => void setThemeMode('dark')}
                disabled={themeMode === 'dark'}
              >
                Dark
              </Button>
              <Button
                variant="outline"
                onClick={() => void setThemeMode('system')}
                disabled={themeMode === 'system'}
              >
                System
              </Button>
            </div>
          </Card>

          {/* Documentation Upload */}
          <Card title="Documentation" icon={<Book className="h-5 w-5 text-neutral-500" />} className="lg:col-span-2">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">Upload Documentation</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                  Upload PDF, Word, or Excel documents to add to the documentation library
                </p>
                <DocumentUploader onUpload={handleDocumentUpload} />
              </div>

              {documents.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-white">Uploaded Documents</h3>
                  {documents.map((doc, index) => (
                    <DocumentViewer
                      key={index}
                      content={doc.content}
                      metadata={doc.metadata}
                      onDownload={() => handleDocumentDownload(doc)}
                      onDelete={() => handleRemoveDocument(index)}
                    />
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
  );
};

export default Settings;
