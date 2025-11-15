export type OnboardingStepKey = 'site' | 'assets' | 'pmTemplates' | 'team';

export interface OnboardingStep {
  key: OnboardingStepKey;
  title: string;
  description: string;
  href: string;
  completed: boolean;
  completedAt?: string;
}

export interface OnboardingState {
  steps: OnboardingStep[];
  pendingReminder: boolean;
  reminderMessage?: string;
  lastReminderAt?: string;
  nextStepKey?: OnboardingStepKey | null;
}

export interface OnboardingReminderResponse {
  lastReminderAt: string;
}

export interface PMTemplateLibraryRule {
  type: 'calendar' | 'meter';
  cron?: string;
  meterName?: string;
  threshold?: number;
}

export interface PMTemplateLibraryItem {
  id: string;
  title: string;
  description: string;
  category: string;
  interval: string;
  checklist: string[];
  impact: string;
  rule: PMTemplateLibraryRule;
}
