/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Book, Mail, Monitor, Moon, Palette, Sliders, Sun } from 'lucide-react';
import { isAxiosError } from 'axios';
import { useShallow } from 'zustand/react/shallow';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import DocumentUploader from '@/components/documentation/DocumentUploader';
import DocumentViewer from '@/components/documentation/DocumentViewer';
import {
  downloadDocument,
  fileToBase64,
  getMimeTypeForType,
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
import SettingsLayout from '@/components/settings/SettingsLayout';

type DocumentEntry = {
  id?: string;
  content?: string;
  metadata: DocumentMetadata;
  preview?: string;
};

interface ApiDocumentResponse {
  _id?: string;
  id?: string;
  name?: string;
  url?: string;
  metadata?: {
    size?: number;
    mimeType?: string;
    lastModified?: string;
    type?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

const Settings: React.FC = () => {
  const {
    general,
    notifications,
    email,
    setGeneral,
    setNotifications,
    setEmail,
    setTheme: applyThemeSettings,
    theme: themeSettings,
  } = useSettingsStore(
    useShallow((state) => ({
      general: state.general,
      notifications: state.notifications,
      email: state.email,
      setGeneral: state.setGeneral,
      setNotifications: state.setNotifications,
      setEmail: state.setEmail,
      setTheme: state.setTheme,
      theme: state.theme,
    })),
  );
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false);
  const [emailPreview, setEmailPreview] = useState({
    firstName: 'Ricardo',
    lastName: 'Edwards',
  });
  const hasFetchedSettingsRef = useRef(false);
  const settingsEffectActiveRef = useRef(false);

  const { theme: activeThemeMode, setTheme: setThemeMode, updateTheme } = useThemeStore(
    useShallow((state) => ({
      theme: state.theme,
      setTheme: state.setTheme,
      updateTheme: state.updateTheme,
    })),
  );
  const themeMode = themeSettings.mode ?? activeThemeMode ?? 'system';

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

  const [documents, setDocuments] = useState<DocumentEntry[]>([]);

  const normalizedEmailDomain = useMemo(() => {
    const trimmed = general.emailDomain.trim();
    if (!trimmed) {
      return '';
    }

    return trimmed.replace(/^@+/, '');
  }, [general.emailDomain]);

  const generatedEmailPreview = useMemo(() => {
    const sanitize = (value: string) =>
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '.');

    const first = sanitize(emailPreview.firstName);
    const last = sanitize(emailPreview.lastName);
    const localPart = [first, last].filter(Boolean).join('.').replace(/\.{2,}/g, '.');

    if (!localPart) {
      return normalizedEmailDomain ? `@${normalizedEmailDomain}` : '';
    }

    return normalizedEmailDomain ? `${localPart}@${normalizedEmailDomain}` : localPart;
  }, [emailPreview.firstName, emailPreview.lastName, normalizedEmailDomain]);

  type ThemeOptionKey = {
    [K in keyof ThemeSettings]: ThemeSettings[K] extends boolean ? K : never;
  }[keyof ThemeSettings & string];

  const themeOptions = [
    {
      key: 'sidebarCollapsed',
      label: 'Compact navigation',
      description: 'Reduce sidebar width to maximize workspace area',
    },
    {
      key: 'denseMode',
      label: 'Dense layout',
      description: 'Tighten spacing to view more information at once',
    },
    {
      key: 'highContrast',
      label: 'High contrast',
      description: 'Improve readability with stronger contrast and separators',
    },
  ] satisfies { label: string; description: string; key: ThemeOptionKey }[];

  const handleDocumentUpload = async (files: File[]) => {
    if (!files.length) {
      return;
    }

    try {
      setIsUploadingDocuments(true);
      const uploadedDocuments: DocumentEntry[] = [];

      for (const file of files) {
        try {
          const [{ content, metadata: parsedMetadata }, base64] = await Promise.all([
            parseDocument(file),
            fileToBase64(file),
          ]);

          const metadataPayload: ApiDocumentResponse['metadata'] = {};
          const resolvedSize = parsedMetadata.size ?? file.size;
          if (typeof resolvedSize === 'number' && !Number.isNaN(resolvedSize)) {
            metadataPayload.size = resolvedSize;
          }
          if (parsedMetadata.mimeType) {
            metadataPayload.mimeType = parsedMetadata.mimeType;
          }
          if (parsedMetadata.type) {
            metadataPayload.type = parsedMetadata.type;
          }
          const lastModifiedValue =
            parsedMetadata.lastModified instanceof Date
              ? parsedMetadata.lastModified
              : parsedMetadata.lastModified
                ? new Date(parsedMetadata.lastModified)
                : new Date(file.lastModified);
          if (!Number.isNaN(lastModifiedValue.getTime())) {
            metadataPayload.lastModified = lastModifiedValue.toISOString();
          }

          const { data: savedDocument } = await http.post<ApiDocumentResponse>('/documents', {
            base64,
            name: file.name,
            ...(Object.keys(metadataPayload).length > 0 ? { metadata: metadataPayload } : {}),
          });

          const resolvedUrl = resolveDocumentUrl(savedDocument.url ?? '');
          const documentId =
            savedDocument._id ??
            savedDocument.id ??
            `${Date.now()}-${Math.random().toString(16).slice(2)}`;
          const mimeType =
            parsedMetadata.mimeType ??
            savedDocument.metadata?.mimeType ??
            getMimeTypeForType(parsedMetadata.type ?? 'pdf');
          const lastModified = (() => {
            const serverValue = savedDocument.metadata?.lastModified;
            if (serverValue) {
              const parsed = new Date(serverValue);
              if (!Number.isNaN(parsed.getTime())) {
                return parsed;
              }
            }
            return lastModifiedValue;
          })();

          uploadedDocuments.push({
            id: documentId,
            content,
            preview: content,
            metadata: {
              id: documentId,
              title: savedDocument.name ?? parsedMetadata.title ?? file.name,
              type: (parsedMetadata.type ?? savedDocument.metadata?.type ?? 'pdf') as DocumentMetadata['type'],
              mimeType,
              size:
                savedDocument.metadata?.size ??
                metadataPayload.size ??
                parsedMetadata.size ??
                file.size,
              lastModified,
              url: resolvedUrl || undefined,
              downloadUrl: resolvedUrl || undefined,
            },
          });
        } catch (error) {
          console.error('Error uploading document:', error);
          addToast(`Failed to upload ${file.name}`, 'error');
        }
      }

      if (uploadedDocuments.length > 0) {
        setDocuments((prev) => [...prev, ...uploadedDocuments]);
        addToast(
          uploadedDocuments.length === 1 ? 'Document uploaded' : 'Documents uploaded',
          'success',
        );
      }
    } catch (error) {
      console.error('Error uploading documents:', error);
      addToast('Failed to upload documents', 'error');
    } finally {
      setIsUploadingDocuments(false);
    }
  };

  const resolveDocumentUrl = (path: string) => {
    if (!path) {
      return path;
    }
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    const base = http.defaults?.baseURL ?? '';
    const sanitizedBase = base.replace(/\/?api\/?$/, '');
    const normalizedBase = sanitizedBase.replace(/\/$/, '');
    if (!normalizedBase) {
      return path;
    }
    if (path.startsWith('/')) {
      return `${normalizedBase}${path}`;
    }
    return `${normalizedBase}/${path}`;
  };

  const handleDocumentDownload = async (doc: DocumentEntry) => {
    const mimeType = doc.metadata.mimeType ?? getMimeTypeForType(doc.metadata.type);

    if (doc.content) {
      downloadDocument(doc.content, doc.metadata.title, mimeType);
      return;
    }

    const downloadSource = doc.metadata.downloadUrl ?? doc.metadata.url;
    if (!downloadSource) {
      addToast('Document content is not available for download', 'error');
      return;
    }

    try {
      const response = await fetch(resolveDocumentUrl(downloadSource), {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to download document: ${response.status}`);
      }

      const blob = await response.blob();
      const blobMimeType = blob.type || mimeType;
      downloadDocument(blob, doc.metadata.title, blobMimeType);
    } catch (error) {
      console.error('Error downloading document:', error);
      addToast('Failed to download document', 'error');
    }
  };

  const handleRemoveDocument = async (documentId?: string) => {
    if (!documentId) {
      return;
    }

    const docIndex = documents.findIndex(
      (entry) => entry.id === documentId || entry.metadata.id === documentId,
    );
    if (docIndex === -1) {
      return;
    }

    const doc = documents[docIndex];

    try {
      if (doc.metadata.id) {
        await http.delete(`/documents/${doc.metadata.id}`);
      }
      setDocuments((prev) => prev.filter((_, idx) => idx !== docIndex));
      addToast('Document deleted', 'success');
    } catch (error) {
      console.error('Error deleting document:', error);
      addToast('Failed to delete document', 'error');
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadDocuments = async () => {
      setIsLoadingDocuments(true);
      try {
        const response = await http.get<ApiDocumentResponse[]>('/documents');
        if (!isMounted) {
          return;
        }

        const fetched = (response.data ?? []).map((item) => {
          const rawUrl = item.url ?? '';
          const title = item.name ?? rawUrl.split('/').pop() ?? 'Document';
          const extension = title.split('.').pop()?.toLowerCase();
          const metadataType = item.metadata?.type as DocumentMetadata['type'] | undefined;
          const resolvedType = (() => {
            if (metadataType) {
              return metadataType;
            }
            try {
              return inferDocumentType(item.metadata?.mimeType, extension);
            } catch {
              return 'pdf' as DocumentMetadata['type'];
            }
          })();
          const mimeType = item.metadata?.mimeType
            ? normalizeMimeType(item.metadata.mimeType, extension)
            : getMimeTypeForType(resolvedType);
          const lastModifiedSource =
            item.metadata?.lastModified ?? item.updatedAt ?? item.createdAt;
          const lastModified = lastModifiedSource ? new Date(lastModifiedSource) : new Date();
          const resolvedUrl = resolveDocumentUrl(rawUrl);

          const metadata: DocumentMetadata = {
            id: item._id ?? item.id,
            title,
            type: resolvedType,
            size: item.metadata?.size ?? 0,
            lastModified,
            mimeType,
            url: rawUrl ? resolvedUrl : undefined,
            downloadUrl: rawUrl ? resolvedUrl : undefined,
          };

          return { id: metadata.id, metadata } satisfies DocumentEntry;
        });

        setDocuments(fetched);
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
  }, [addToast]);

  useEffect(() => {
    settingsEffectActiveRef.current = true;
    let isMounted = true;

    if (hasFetchedSettingsRef.current) {
      return () => {
        isMounted = false;
        settingsEffectActiveRef.current = false;
      };
    }

    hasFetchedSettingsRef.current = true;

    const {
      general: currentGeneral,
      notifications: currentNotifications,
      email: currentEmail,
      theme: currentTheme,
      setGeneral: setGeneralState,
      setNotifications: setNotificationsState,
      setEmail: setEmailState,
      setTheme: setThemeState,
    } = useSettingsStore.getState();

    const applyPartialUpdate = <T extends object>(
      current: T,
      updates: Partial<T> | undefined,
      setter: (value: Partial<T>) => void,
    ) => {
      if (!updates) {
        return;
      }

      const next: Partial<T> = {};
      let hasChanges = false;

      (Object.keys(updates) as Array<keyof T>).forEach((key) => {
        const value = updates[key];
        if (value !== undefined && current[key] !== value) {
          next[key] = value;
          hasChanges = true;
        }
      });

      if (hasChanges) {
        setter(next);
      }
    };

    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const response = await http.get('/settings');

        if (!isMounted) {
          return;
        }

        const payload = response.data as Partial<{
          general: Partial<typeof currentGeneral>;
          notifications: Partial<typeof currentNotifications>;
          email: Partial<typeof currentEmail>;
          theme: Partial<ThemeSettings> & { mode?: 'light' | 'dark' | 'system' };
        }>;

        applyPartialUpdate(currentGeneral, payload?.general, setGeneralState);
        applyPartialUpdate(currentNotifications, payload?.notifications, setNotificationsState);
        applyPartialUpdate(currentEmail, payload?.email, setEmailState);

        if (payload?.theme) {
          const themePayload = payload.theme as Partial<ThemeSettings> & {
            mode?: 'light' | 'dark' | 'system';
          };
          const { mode, colorScheme } = themePayload;
          const themePatch: Partial<ThemeSettings> = {};

          (['sidebarCollapsed', 'denseMode', 'highContrast'] as const).forEach((key) => {
            const value = themePayload[key];
            if (value !== undefined && currentTheme[key] !== value) {
              themePatch[key] = value;
            }
          });

          if (mode && currentTheme.mode !== mode) {
            themePatch.mode = mode;
          }

          if (colorScheme && currentTheme.colorScheme !== colorScheme) {
            themePatch.colorScheme = colorScheme;
          }

          if (Object.keys(themePatch).length > 0) {
            setThemeState(themePatch);
          }

          if (mode || colorScheme) {
            useThemeStore.setState((state) => {
              const next: Partial<typeof state> = {};
              if (mode && state.theme !== mode) {
                next.theme = mode;
              }
              if (colorScheme && state.colorScheme !== colorScheme) {
                next.colorScheme = colorScheme;
              }

              return Object.keys(next).length > 0 ? { ...state, ...next } : state;
            });
          }
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const status = (error as { response?: { status?: number } }).response?.status;

        if (status === 404) {
          console.warn('Settings API not found. Falling back to defaults.');
          const fallbackTheme = useSettingsStore.getState().theme;
          useThemeStore.setState((state) => {
            const next: Partial<typeof state> = {};
            if (fallbackTheme.mode && state.theme !== fallbackTheme.mode) {
              next.theme = fallbackTheme.mode;
            }
            if (fallbackTheme.colorScheme && state.colorScheme !== fallbackTheme.colorScheme) {
              next.colorScheme = fallbackTheme.colorScheme;
            }

            return Object.keys(next).length > 0 ? { ...state, ...next } : state;
          });
        } else {
          console.error('Error loading settings:', error);
          addToast('Failed to load settings', 'error');
        }
      } finally {
        if (settingsEffectActiveRef.current) {
          setIsLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      isMounted = false;
      settingsEffectActiveRef.current = false;
    };
  }, [addToast]);

  const handleThemeModeChange = (mode: 'light' | 'dark' | 'system') => {
    applyThemeSettings({ mode });
    void setThemeMode(mode);
  };

  const themePresets: Array<{
    mode: 'light' | 'dark' | 'system';
    label: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      mode: 'light',
      label: 'Light',
      description: 'Bright interface for well-lit environments',
      icon: <Sun className="h-5 w-5" />,
    },
    {
      mode: 'dark',
      label: 'Dark',
      description: 'Dimmed palette for low-light conditions',
      icon: <Moon className="h-5 w-5" />,
    },
    {
      mode: 'system',
      label: 'System',
      description: 'Follow your operating system preference',
      icon: <Monitor className="h-5 w-5" />,
    },
  ];

  return (
    <SettingsLayout isLoading={isLoading}>
      {isLoading && (
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-neutral-300 bg-white/50 p-4 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-300">
          <LoadingSpinner fullscreen={false} size="sm" />
          <span>Loading your saved settings…</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1">
                  Company Email Domain
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  value={general.emailDomain}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setGeneral({ emailDomain: e.target.value })
                  }
                  placeholder="Enter your company email domain (e.g., cmms.com)"
                />
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Use this domain to automatically create employee email addresses.
                </p>
              </div>

              <div className="space-y-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/30">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  Email structure preview
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Enter a first and last name to preview the generated address.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1" htmlFor="preview-first-name">
                      First name
                    </label>
                    <input
                      id="preview-first-name"
                      type="text"
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                      value={emailPreview.firstName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEmailPreview((prev) => ({ ...prev, firstName: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1" htmlFor="preview-last-name">
                      Last name
                    </label>
                    <input
                      id="preview-last-name"
                      type="text"
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                      value={emailPreview.lastName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEmailPreview((prev) => ({ ...prev, lastName: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="rounded-md bg-white px-3 py-2 text-sm font-mono text-neutral-800 shadow-sm dark:bg-neutral-800 dark:text-neutral-100">
                  {generatedEmailPreview || 'Enter a name to preview the email address'}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Theme Presets" icon={<Palette className="h-5 w-5 text-neutral-500" />}>
            <div className="space-y-4">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Quickly switch between theme modes across the application.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {themePresets.map(({ mode, label, description, icon }) => {
                  const isActive = themeMode === mode;
                  return (
                    <Button
                      key={mode}
                      variant="outline"
                      className={`flex h-full flex-col items-start gap-2 border-2 px-4 py-3 text-left transition-colors ${
                        isActive
                          ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-200'
                          : 'border-neutral-200 text-neutral-700 hover:border-primary-200 hover:text-primary-700 dark:border-neutral-700 dark:text-neutral-100 dark:hover:border-primary-400 dark:hover:text-primary-200'
                      }`}
                      onClick={() => handleThemeModeChange(mode)}
                      disabled={isActive}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        {icon}
                        {label}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">{description}</span>
                    </Button>
                  );
                })}
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
                    handleThemeModeChange(value);
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
                    applyThemeSettings({ colorScheme: value });
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
                        applyThemeSettings({ [key]: e.target.checked })
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
                onClick={() => handleThemeModeChange('light')}
                disabled={themeMode === 'light'}
              >
                Light
              </Button>
              <Button
                variant="outline"
                onClick={() => handleThemeModeChange('dark')}
                disabled={themeMode === 'dark'}
              >
                Dark
              </Button>
              <Button
                variant="outline"
                onClick={() => handleThemeModeChange('system')}
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
                      key={doc.id ?? doc.metadata.id ?? doc.metadata.title}
                      metadata={doc.metadata}
                      preview={doc.preview}
                      onDownload={() => void handleDocumentDownload(doc)}
                      onDelete={() => void handleRemoveDocument(doc.id ?? doc.metadata.id)}
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
    </SettingsLayout>
  );
};

export default Settings;
