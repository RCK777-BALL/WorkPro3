/*
 * SPDX-License-Identifier: MIT
 */

export const copy = {
  placeholders: {
    companyName: 'Enter your company name',
    timezone: 'Select your primary timezone',
    dateFormat: 'Choose a default date format',
    language: 'Choose a display language',
  },
  validation: {
    companyNameRequired: 'Company name is required',
    timezoneRequired: 'Select a timezone',
    dateFormatRequired: 'Select a date format',
    languageRequired: 'Select a language',
  },
} as const;

export type CopyTokens = typeof copy;
