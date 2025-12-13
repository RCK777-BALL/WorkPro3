export type OnboardingStepKey =
  | 'site'
  | 'roles'
  | 'departments'
  | 'assets'
  | 'starterData'
  | 'pmTemplates'
  | 'users';

export interface OnboardingStep {
  key: OnboardingStepKey;
  title: string;
  description: string;
  href: string;
  completed: boolean;
  completedAt?: string | undefined;
}

export interface OnboardingState {
  steps: OnboardingStep[];
  pendingReminder: boolean;
  reminderMessage?: string | undefined;
  lastReminderAt?: string | undefined;
  nextStepKey?: OnboardingStepKey | null | undefined;
}

export interface OnboardingReminderResponse {
  lastReminderAt: string;
}

export interface PMTemplateLibraryRule {
  type: 'calendar' | 'meter';
  cron?: string | undefined;
  meterName?: string | undefined;
  threshold?: number | undefined;
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
  estimatedMinutes?: number | undefined;
}

export interface InspectionFormTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  sections: Array<{ heading: string; items: string[] }>;
}
