/*
 * SPDX-License-Identifier: MIT
 */

import { type ChangeEvent, useCallback } from 'react';
import { Monitor, Moon, Palette, Sun } from 'lucide-react';
import Card from '@/components/common/Card';
import { useTheme } from '@/context/ThemeContext';
import { useSettingsStore, type ThemeSettings } from '@/store/settingsStore';
import { useThemeStore } from '@/store/themeStore';

const THEME_MODE_OPTIONS = [
  {
    value: 'light' as const,
    label: 'Light',
    description: 'Bright interface with light backgrounds',
    icon: Sun,
  },
  {
    value: 'dark' as const,
    label: 'Dark',
    description: 'Dimmed interface for low-light environments',
    icon: Moon,
  },
  {
    value: 'system' as const,
    label: 'System',
    description: 'WorkPro default: light blue background with black text',
    icon: Monitor,
  },
];

const COLOR_SCHEME_OPTIONS = [
  {
    value: 'default' as const,
    label: 'Blue',
    swatch: ['#0a5ea6', '#0d74c7'],
  },
  {
    value: 'teal' as const,
    label: 'Teal',
    swatch: ['#0f766e', '#14b8a6'],
  },
  {
    value: 'purple' as const,
    label: 'Purple',
    swatch: ['#6d28d9', '#a855f7'],
  },
];

type ThemePreferenceToggleKey = {
  [Key in keyof ThemeSettings]: ThemeSettings[Key] extends boolean ? Key : never;
}[keyof ThemeSettings];

const PREFERENCE_TOGGLES: Array<{
  key: ThemePreferenceToggleKey;
  label: string;
  description: string;
}> = [
  {
    key: 'sidebarCollapsed',
    label: 'Collapsed sidebar',
    description: 'Use a compact sidebar layout',
  },
  {
    key: 'denseMode',
    label: 'Dense mode',
    description: 'Compact spacing across the interface',
  },
  {
    key: 'highContrast',
    label: 'High contrast',
    description: 'Increase contrast for improved legibility',
  },
];

type ThemeMode = (typeof THEME_MODE_OPTIONS)[number]['value'];

export default function ThemePreferencesCard() {
  const { setTheme: applyTheme, resetColors } = useTheme();
  const themeSettings = useSettingsStore((state) => state.theme);
  const setThemeSettings = useSettingsStore((state) => state.setTheme);
  const persistedThemeMode = useThemeStore((state) => state.theme);
  const persistedColorScheme = useThemeStore((state) => state.colorScheme);
  const setThemeStoreMode = useThemeStore((state) => state.setTheme);
  const updateThemeStore = useThemeStore((state) => state.updateTheme);

  const selectedThemeMode = themeSettings.mode ?? persistedThemeMode;
  const selectedColorScheme = themeSettings.colorScheme ?? persistedColorScheme;

  const handleModeChange = useCallback(
    (mode: ThemeMode) => {
      setThemeSettings({ mode });
      applyTheme(mode);
      resetColors();
      void setThemeStoreMode(mode);
    },
    [applyTheme, resetColors, setThemeSettings, setThemeStoreMode],
  );

  const handleColorSchemeChange = useCallback(
    (scheme: (typeof COLOR_SCHEME_OPTIONS)[number]['value']) => {
      setThemeSettings({ colorScheme: scheme });
      void updateThemeStore({ colorScheme: scheme });
    },
    [setThemeSettings, updateThemeStore],
  );

  const handleToggleChange = useCallback(
    (key: ThemePreferenceToggleKey) =>
      (event: ChangeEvent<HTMLInputElement>) => {
        const checked = event.target.checked;
        setThemeSettings({ [key]: checked } as Partial<ThemeSettings>);
      },
    [setThemeSettings],
  );

  return (
    <Card title="Theme Settings" icon={<Palette className="h-5 w-5 text-[var(--wp-color-text-muted)]" />}>
      <div className="space-y-6">
        <section className="space-y-3">
          <h4 className="text-sm font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Theme mode</h4>
          <div className="grid gap-3 md:grid-cols-3">
            {THEME_MODE_OPTIONS.map(({ value, label, description, icon: Icon }) => {
              const isActive = selectedThemeMode === value;
              return (
                <label
                  key={value}
                  className={`relative flex cursor-pointer flex-col rounded-lg border p-4 transition-all ${
                    isActive
                      ? 'border-primary-500 bg-primary-50 text-primary-900 dark:border-primary-500/80 dark:bg-primary-500/10 dark:text-primary-50'
                      : 'border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] hover:border-primary-200 dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface)] dark:hover:border-primary-500/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="theme-mode"
                    value={value}
                    checked={isActive}
                    onChange={() => handleModeChange(value)}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full border text-lg ${
                        isActive
                          ? 'border-primary-500 bg-primary-500 text-[var(--wp-color-text)]'
                          : 'border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] text-[var(--wp-color-text-muted)] dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface-elevated)] dark:text-[var(--wp-color-text-muted)]'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{label}</p>
                      <p className="text-xs text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">{description}</p>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Color scheme</h4>
          <div className="grid gap-3 md:grid-cols-3">
            {COLOR_SCHEME_OPTIONS.map(({ value, label, swatch }) => {
              const isSelected = selectedColorScheme === value;
              return (
                <label
                  key={value}
                  className={`group flex cursor-pointer flex-col rounded-lg border p-4 transition-all ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 dark:border-primary-500/80 dark:bg-primary-500/10'
                      : 'border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] hover:border-primary-200 dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface)] dark:hover:border-primary-500/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="color-scheme"
                    value={value}
                    checked={isSelected}
                    onChange={() => handleColorSchemeChange(value)}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">{label}</p>
                      <p className="text-xs text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">Accent color presets</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {swatch.map((color) => (
                        <span
                          key={color}
                          className="h-6 w-6 rounded-full border border-white shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          {PREFERENCE_TOGGLES.map(({ key, label, description }) => (
            <div className="flex items-center justify-between" key={key}>
              <div>
                <p className="text-sm font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">{label}</p>
                <p className="text-xs text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">{description}</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={Boolean(themeSettings[key])}
                  onChange={handleToggleChange(key)}
                />
                <div className="relative h-6 w-11 rounded-full bg-[color-mix(in srgb,var(--wp-color-text) 12%, transparent)] transition peer-checked:bg-primary-500 dark:bg-[var(--wp-color-surface-elevated)]">
                  <div className="absolute top-1/2 left-1 h-4 w-4 -translate-y-1/2 rounded-full bg-[var(--wp-color-surface)] shadow transition peer-checked:translate-x-5" />
                </div>
              </label>
            </div>
          ))}
        </section>
      </div>
    </Card>
  );
}

