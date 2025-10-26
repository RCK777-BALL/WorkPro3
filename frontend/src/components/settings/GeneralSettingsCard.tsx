/*
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo, useState } from 'react';
import { Sliders } from 'lucide-react';

import Card from '@/components/common/Card';
import { copy as copyTokens } from '@/design-system';
import { useSettingsStore } from '@/store/settingsStore';
import type { GeneralSettings } from '@/store/settingsStore';

const TIMEZONE_OPTIONS: Array<{ value: GeneralSettings['timezone']; label: string }> = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
];

const DATE_FORMAT_OPTIONS: Array<{ value: GeneralSettings['dateFormat']; label: string }> = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

const LANGUAGE_OPTIONS: Array<{ value: GeneralSettings['language']; label: string }> = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'es-ES', label: 'Español' },
  { value: 'fr-FR', label: 'Français' },
  { value: 'de-DE', label: 'Deutsch' },
];

const inputClassName =
  'w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:border-primary-400 dark:focus:ring-primary-500/40';

const labelClassName = 'text-sm font-medium text-neutral-700 dark:text-neutral-200';
const helperTextClassName = 'text-xs text-neutral-500 dark:text-neutral-400';
const errorTextClassName = 'text-xs font-medium text-red-600 dark:text-red-400';

type GeneralSettingsField = keyof GeneralSettings;

const defaultTouchedState: Record<GeneralSettingsField, boolean> = {
  companyName: false,
  timezone: false,
  dateFormat: false,
  language: false,
};

const GeneralSettingsCard: React.FC = () => {
  const { general, setGeneral } = useSettingsStore((state) => ({
    general: state.general,
    setGeneral: state.setGeneral,
  }));

  const [touched, setTouched] = useState<Record<GeneralSettingsField, boolean>>(
    () => ({ ...defaultTouchedState })
  );

  const errors = useMemo(() => {
    return {
      companyName: general.companyName.trim().length
        ? ''
        : copyTokens.validation.companyNameRequired,
      timezone: general.timezone ? '' : copyTokens.validation.timezoneRequired,
      dateFormat: general.dateFormat ? '' : copyTokens.validation.dateFormatRequired,
      language: general.language ? '' : copyTokens.validation.languageRequired,
    } satisfies Record<GeneralSettingsField, string>;
  }, [
    general.companyName,
    general.dateFormat,
    general.language,
    general.timezone,
  ]);

  const handleBlur = (field: GeneralSettingsField) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const showError = (field: GeneralSettingsField) => touched[field] && errors[field];
  const fieldIdMap: Record<GeneralSettingsField, string> = {
    companyName: 'company-name',
    timezone: 'timezone',
    dateFormat: 'date-format',
    language: 'language',
  };

  const getDescribedBy = (field: GeneralSettingsField) => {
    const helperId = `${fieldIdMap[field]}-helper`;
    const errorId = `${fieldIdMap[field]}-error`;

    return showError(field) ? `${helperId} ${errorId}` : helperId;
  };

  return (
    <Card title="General Settings" icon={<Sliders className="h-5 w-5 text-neutral-500" />}>
      <div className="space-y-6">
        <div className="space-y-1">
          <label className={labelClassName} htmlFor="company-name">
            Company Name
          </label>
          <input
            id="company-name"
            type="text"
            className={inputClassName}
            placeholder={copyTokens.placeholders.companyName}
            value={general.companyName}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setGeneral({ companyName: event.target.value })
            }
            onBlur={handleBlur('companyName')}
            aria-describedby={getDescribedBy('companyName')}
            aria-invalid={Boolean(showError('companyName'))}
            required
          />
          <p id="company-name-helper" className={helperTextClassName}>
            {copyTokens.placeholders.companyName}
          </p>
          {showError('companyName') && (
            <p id="company-name-error" className={errorTextClassName}>
              {errors.companyName}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className={labelClassName} htmlFor="timezone">
            Timezone
          </label>
          <select
            id="timezone"
            className={inputClassName}
            value={general.timezone}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
              setGeneral({ timezone: event.target.value })
            }
            onBlur={handleBlur('timezone')}
            aria-describedby={getDescribedBy('timezone')}
            aria-invalid={Boolean(showError('timezone'))}
            required
          >
            <option value="" disabled>
              {copyTokens.placeholders.timezone}
            </option>
            {TIMEZONE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p id="timezone-helper" className={helperTextClassName}>
            {copyTokens.placeholders.timezone}
          </p>
          {showError('timezone') && (
            <p id="timezone-error" className={errorTextClassName}>
              {errors.timezone}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className={labelClassName} htmlFor="date-format">
            Date Format
          </label>
          <select
            id="date-format"
            className={inputClassName}
            value={general.dateFormat}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
              setGeneral({ dateFormat: event.target.value })
            }
            onBlur={handleBlur('dateFormat')}
            aria-describedby={getDescribedBy('dateFormat')}
            aria-invalid={Boolean(showError('dateFormat'))}
            required
          >
            <option value="" disabled>
              {copyTokens.placeholders.dateFormat}
            </option>
            {DATE_FORMAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p id="date-format-helper" className={helperTextClassName}>
            {copyTokens.placeholders.dateFormat}
          </p>
          {showError('dateFormat') && (
            <p id="date-format-error" className={errorTextClassName}>
              {errors.dateFormat}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className={labelClassName} htmlFor="language">
            Language
          </label>
          <select
            id="language"
            className={inputClassName}
            value={general.language}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
              setGeneral({ language: event.target.value })
            }
            onBlur={handleBlur('language')}
            aria-describedby={getDescribedBy('language')}
            aria-invalid={Boolean(showError('language'))}
            required
          >
            <option value="" disabled>
              {copyTokens.placeholders.language}
            </option>
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p id="language-helper" className={helperTextClassName}>
            {copyTokens.placeholders.language}
          </p>
          {showError('language') && (
            <p id="language-error" className={errorTextClassName}>
              {errors.language}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default GeneralSettingsCard;
