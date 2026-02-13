/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type { OnboardingReminderResponse, OnboardingState } from '@/types';

export const fetchOnboardingState = async (): Promise<OnboardingState> => {
  const res = await http.get<OnboardingState>('/onboarding');
  return res.data;
};

export const dismissOnboardingReminder = async (): Promise<OnboardingReminderResponse> => {
  const res = await http.post<OnboardingReminderResponse>('/onboarding/reminder/dismiss');
  return res.data;
};
