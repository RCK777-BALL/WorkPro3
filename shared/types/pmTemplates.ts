/*
 * SPDX-License-Identifier: MIT
 */

export interface PMTemplateChecklistItem {
  id: string;
  description: string;
  required?: boolean;
}

export interface PMTemplateRequiredPart {
  id: string;
  partId: string;
  partName?: string;
  quantity?: number;
}

export interface PMTemplateAssignment {
  id: string;
  assetId: string;
  assetName?: string;
  interval: string;
  usageMetric?: 'runHours' | 'cycles';
  usageTarget?: number;
  usageLookbackDays?: number;
  procedureTemplateId?: string;
  procedureTemplateName?: string;
  nextDue?: string;
  checklist: PMTemplateChecklistItem[];
  requiredParts: PMTemplateRequiredPart[];
}

export interface PMTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  tasks: string[];
  estimatedMinutes?: number;
  assignments: PMTemplateAssignment[];
  createdAt?: string;
  updatedAt?: string;
}

export type PMTemplateUpsertInput = Pick<PMTemplate, 'name' | 'category'> &
  Partial<Pick<PMTemplate, 'description' | 'tasks' | 'estimatedMinutes'>>;
