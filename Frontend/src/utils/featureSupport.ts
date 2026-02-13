/*
 * SPDX-License-Identifier: MIT
 */

import { safeLocalStorage } from '@/utils/safeLocalStorage';

export const FEATURE_SUPPORT_KEYS = {
  documents: 'feature:documents',
  onboarding: 'feature:onboarding',
} as const;

type FeatureSupportKey = (typeof FEATURE_SUPPORT_KEYS)[keyof typeof FEATURE_SUPPORT_KEYS];

export const isFeatureSupported = (key: FeatureSupportKey): boolean => {
  return safeLocalStorage.getItem(key) !== 'false';
};

export const setFeatureSupported = (key: FeatureSupportKey, supported: boolean): void => {
  safeLocalStorage.setItem(key, supported ? 'true' : 'false');
};
