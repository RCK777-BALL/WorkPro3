/*
 * SPDX-License-Identifier: MIT
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Book,
  Mail,
  Palette,
  Save,
  Sliders,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import DocumentUploader from '@/components/documentation/DocumentUploader';
import DocumentViewer from '@/components/documentation/DocumentViewer';
import {
  downloadDocument,
  inferDocumentType,
  normalizeMimeType,
  parseDocument,
  type DocumentMetadata,
} from '@/utils/documentation';
import { useThemeStore } from '@/store/themeStore';
import { useSettingsStore } from '@/store/settingsStore';
import type {
  EmailSettings,
  NotificationSettings,
  ThemeSettings,
} from '@/store/settingsStore';
import { useToast } from '@/context/ToastContext';
import http from '@/lib/http';

type ManagedDocument = {
  id: string;
  content?: string;
  metadata: DocumentMetadata;
};

type ApiDocument = {
  _id: string;
  name?: string;
  title?: string;
  url: string;
  createdAt?: string;
  updatedAt?: string;
};

const Settings: React.FC = () => {
  const themeMode = useThemeStore((state) => state.theme);
  const setThemeMode = useThemeStore((state) => state.setTheme);
  const updateTheme = useThemeStore((state) => state.updateTheme);
  const general = useSettingsStore((state) => state.general);
  const notifications = useSettingsStore((state) => state.notifications);
  const email = useSettingsStore((state) => state.email);
  const themeSettings = useSettingsStore((state) => state.theme);
  const setGeneral = useSettingsStore((state) => state.setGeneral);
  const setNotifications = useSettingsStore((state) => state.setNotifications);
  const setEmail = useSettingsStore((state) => state.setEmail);
  const setThemeSettings = (updater: (prev: ThemeSettings) => ThemeSettings) =>
    useSettingsStore.setState((state) => ({ theme: updater(state.theme) }));
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  type ThemeOptionKey = {
    [K in keyof ThemeSettings]: ThemeSettings[K] extends boolean ? K : never;
  }[keyof ThemeSettings & string];

  type NotificationOptionKey = {
    [K in keyof NotificationSettings]: NotificationSettings[K] extends boolean ? K : never;
  }[keyof NotificationSettings & string];

  type EmailPreferenceKey = {
    [K in keyof EmailSettings]: EmailSettings[K] extends boolean ? K : never;
  }[keyof EmailSettings & string];

  const themeOptions = [
    {
      label: 'Collapsed Sidebar',
      description: 'Use a compact sidebar layout',
      key: 'sidebarCollapsed',
    },
    {
      label: 'Dense Mode',
      description: 'Compact spacing for all elements',
      key: 'denseMode',
    },
    {
      label: 'High Contrast',
      description: 'Increase contrast for better visibility',
      key: 'highContrast',
    },
  ] satisfies { label: string; description: string; key: ThemeOptionKey }[];

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

  const [documents, setDocuments] = useState<ManagedDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false);

  const downloadBaseUrl = useMemo(() => {
    const base = http.defaults.baseURL ?? '';
    if (!base) {
      return typeof window !== 'undefined' ? window.location.origin : '';
    }
    return base.replace(/\/?api\/?$/, '');
  }, []);

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1] ?? '');
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const createMetadataFromApi = useCallback((doc: ApiDocument): DocumentMetadata => {
    const baseTitle = doc.name ?? doc.title ?? 'Document';
    const extension = baseTitle.split('.').pop()?.toLowerCase();
    let mimeType = 'application/octet-stream';
    let type: DocumentMetadata['type'] = 'pdf';

    try {
      mimeType = normalizeMimeType(undefined, extension);
      type = inferDocumentType(mimeType, extension);
    } catch {
      // Fallback to PDF-like defaults if the document type cannot be determined.
      mimeType = 'application/octet-stream';
      type = 'pdf';
    }

    return {
      id: doc._id,
      title: baseTitle,
      type,
      mimeType,
      lastModified: doc.updatedAt
        ? new Date(doc.updatedAt)
        : doc.createdAt
          ? new Date(doc.createdAt)
          : undefined,
      downloadUrl: doc.url,
    };
  }, []);

  const handleDocumentUpload = async (files: File[]) => {
    if (!files.length) {
      return;
    }

    setIsUploadingDocuments(true);
    const uploaded: ManagedDocument[] = [];
    const failed: string[] = [];

    for (const file of files) {
      try {
        const parsed = await parseDocument(file);
        const base64 = await fileToBase64(file);
        const response = await http.post<ApiDocument>('/documents', { name: file.name, base64 });
        const saved = response.data as ApiDocument;
        const metadata: DocumentMetadata = {
          ...parsed.metadata,
          id: saved._id,
          title: saved.name ?? saved.title ?? parsed.metadata.title,
          downloadUrl: saved.url,
          lastModified:
            parsed.metadata.lastModified ??
            (saved.updatedAt ? new Date(saved.updatedAt) : saved.createdAt ? new Date(saved.createdAt) : undefined),
        };

        uploaded.push({ id: saved._id, content: parsed.content, metadata });
      } catch (error) {
        console.error('Error uploading document:', error);
        failed.push(file.name);
      }
    }

    if (uploaded.length > 0) {
      setDocuments((prev) => [...prev, ...uploaded]);
      addToast(uploaded.length > 1 ? 'Documents uploaded' : 'Document uploaded', 'success');
    }

    if (failed.length > 0) {
      addToast(`Failed to upload: ${failed.join(', ')}`, 'error');
    }

    setIsUploadingDocuments(false);
  };

  const handleDocumentDownload = async (doc: ManagedDocument) => {
    try {
      if (doc.metadata.downloadUrl) {
        const url = doc.metadata.downloadUrl;
        const isAbsolute = /^https?:\/\//i.test(url);
        const response = await http.get<ArrayBuffer>(url, {
          responseType: 'arraybuffer',
          ...(isAbsolute ? {} : { baseURL: downloadBaseUrl }),
        });
        downloadDocument(response.data, doc.metadata.title, doc.metadata.mimeType);
        return;
      }

      if (doc.content) {
        downloadDocument(doc.content, doc.metadata.title, doc.metadata.mimeType);
        return;
      }

      addToast('Document cannot be downloaded', 'error');
    } catch (error) {
      console.error('Error downloading document:', error);
      addToast('Failed to download document', 'error');
    }
  };

  const handleRemoveDocument = async (id: string) => {
    try {
      await http.delete(`/documents/${id}`);
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      addToast('Document deleted', 'success');
    } catch (error) {
      console.error('Error deleting document:', error);
      addToast('Failed to delete document', 'error');
    }
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
          useSettingsStore.setState((state) => ({
            theme: { ...state.theme, ...restTheme },
          }));

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

  useEffect(() => {
    let isMounted = true;

    const loadDocuments = async () => {
      try {
        setIsLoadingDocuments(true);
        const response = await http.get<ApiDocument[]>('/documents');
        if (!isMounted) {
          return;
        }
        const payload = response.data ?? [];
        setDocuments(payload.map((doc) => ({ id: doc._id, metadata: createMetadataFromApi(doc) })));
      } catch (error) {
        console.error('Error loading documents:', error);
        if (isMounted) {
          addToast('Failed to load documents', 'error');
        }
      } finally {
        if (isMounted) {
          setIsLoadingDocuments(false);
        }
      }
    };

    void loadDocuments();

    return () => {
      isMounted = false;
    };
  }, [addToast, createMetadataFromApi]);

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
      await http.post('/settings', {
        general: currentGeneral,
        notifications: currentNotifications,
        email: currentEmail,
        theme: {
          ...currentTheme,
          mode: currentThemeMode,
          colorScheme: currentTheme.colorScheme ?? currentColorScheme,
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
          <Card title="Theme Settings" icon={<Palette className="h-5 w-5 text-neutral-500" />}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1">
                  Theme
                </label>
                <select
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  value={themeMode}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    const value = e.target.value as 'light' | 'dark' | 'system';
                    void setThemeMode(value);
                  }}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1">
                  Color Scheme
                </label>
                <select
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  value={themeSettings.colorScheme ?? 'default'}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    const value = e.target.value;
                    setThemeSettings((prev) => ({ ...prev, colorScheme: value }));
                    updateTheme({ colorScheme: value });
                  }}
                >
                  <option value="default">Default</option>
                  <option value="teal">Teal</option>
                  <option value="purple">Purple</option>
                </select>
              </div>

              {themeOptions.map(({ label, description, key }) => (
                <div className="flex items-center justify-between" key={key}>
                  <div>
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{label}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={themeSettings[key]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setThemeSettings((prev) => ({
                          ...prev,
                          [key]: e.target.checked,
                        }))
                      }
                    />
                    <div className="w-11 h-6 bg-neutral-200 dark:bg-neutral-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </Card>

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
                {(isUploadingDocuments || isLoadingDocuments) && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-neutral-500 dark:text-neutral-400">
                    <LoadingSpinner fullscreen={false} size="sm" />
                    <span>{isUploadingDocuments ? 'Uploading documents…' : 'Loading documents…'}</span>
                  </div>
                )}
              </div>

              {documents.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-white">Uploaded Documents</h3>
                  {documents.map((doc) => (
                    <DocumentViewer
                      key={doc.id}
                      content={doc.content}
                      metadata={doc.metadata}
                      onDownload={() => void handleDocumentDownload(doc)}
                      onDelete={() => void handleRemoveDocument(doc.id)}
                    />
                  ))}
                </div>
              ) : (
                !isLoadingDocuments && !isUploadingDocuments && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    No documents uploaded yet.
                  </p>
                )
              )}
            </div>
          </Card>
        </div>
      </div>
  );
};

export default Settings;
