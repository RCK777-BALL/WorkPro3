// shared/onboarding.ts

export interface PMTemplateLibraryItem {
  id: string;
  name: string;
  category?: string | undefined;
  description?: string | undefined;
  checklist?: string[] | undefined;
  estimatedMinutes?: number | undefined;
}
