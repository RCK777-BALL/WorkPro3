/*
 * SPDX-License-Identifier: MIT
 */

import { isAxiosError } from 'axios';
import http from '@/lib/http';
import type { OnboardingReminderResponse, OnboardingState } from '@/types';

const fallbackSteps: OnboardingState['steps'] = [
  {
    key: 'site',
    title: 'Add your first site',
    description: 'Create a plant or site to anchor assets and PM schedules.',
    href: '/plants',
    completed: false,
  },
  {
    key: 'roles',
    title: 'Configure access roles',
    description: 'Set up tenant and site roles so users land with the right permissions.',
    href: '/settings/roles',
    completed: false,
  },
  {
    key: 'departments',
    title: 'Define departments and lines',
    description: 'Stand up production areas to organize work and assets.',
    href: '/departments',
    completed: false,
  },
  {
    key: 'assets',
    title: 'Import assets',
    description: 'Upload asset data or add equipment manually to build your registry.',
    href: '/imports',
    completed: false,
  },
  {
    key: 'starterData',
    title: 'Load starter data',
    description: 'Bring in PMs, work orders, and parts with the bulk importer to jump-start your workspace.',
    href: '/imports',
    completed: false,
  },
  {
    key: 'pmTemplates',
    title: 'Pick PM templates',
    description: 'Start from curated PM templates and adapt them to your equipment.',
    href: '/pm/tasks',
    completed: false,
  },
  {
    key: 'users',
    title: 'Invite your team',
    description: 'Add technicians and supervisors so work can be assigned.',
    href: '/teams',
    completed: false,
  },
];

const buildFallbackState = (): OnboardingState => {
  const nextStepKey = fallbackSteps.find((step) => !step.completed)?.key ?? null;
  return {
    steps: fallbackSteps,
    pendingReminder: false,
    reminderMessage: 'Complete these guided steps to finish setup.',
    nextStepKey,
  };
};

const buildEmptyState = (): OnboardingState => ({
  steps: [],
  pendingReminder: false,
  nextStepKey: null,
});

export const fetchOnboardingState = async (): Promise<OnboardingState> => {
  try {
    const res = await http.get<{ data: OnboardingState } | OnboardingState>('/onboarding');
    if ('data' in res.data) {
      return res.data.data;
    }
    return res.data;
  } catch (error) {
    if (isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        return buildEmptyState();
      }
      if (!status || status === 404 || status >= 500) {
        return buildFallbackState();
      }
    }
    throw error;
  }
};

export const dismissOnboardingReminder = async (): Promise<OnboardingReminderResponse> => {
  const res = await http.post<OnboardingReminderResponse>('/onboarding/reminder/dismiss');
  return res.data;
};
