// shared/onboarding.ts

export interface PMTemplateLibraryItem {
  id: string;
  name: string;
  category?: string;
  description?: string;
  checklist?: string[];
  estimatedMinutes?: number;
}
