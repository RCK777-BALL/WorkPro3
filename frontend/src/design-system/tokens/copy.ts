/*
 * SPDX-License-Identifier: MIT
 */

export const copy = {
  placeholders: {
    companyName: 'Enter your company name',
    timezone: 'Select your primary timezone',
    dateFormat: 'Choose a default date format',
    language: 'Choose a display language',
    emailDomain: 'Enter your company email domain (e.g., cmms.com)',
    emailPreviewHelper: 'Preview employee email structure by combining names with your domain.',
  },
  validation: {
    companyNameRequired: 'Company name is required',
    timezoneRequired: 'Select a timezone',
    dateFormatRequired: 'Select a date format',
    languageRequired: 'Select a language',
    emailDomainRequired: 'Enter an email domain to generate employee emails',
  },
} as const;

export type CopyTokens = typeof copy;
