/*
 * SPDX-License-Identifier: MIT
 */

export interface ProcedureTemplateSummary {
  id: string;
  name: string;
  description?: string;
  category?: string;
  categoryName?: string;
  latestPublishedVersion?: string;
  latestVersionNumber?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcedureVersionRequiredPart {
  id: string;
  partId: string;
  partName?: string;
  quantity: number;
}

export interface ProcedureVersionRequiredTool {
  id: string;
  toolName: string;
  quantity: number;
}

export interface ProcedureTemplateVersion {
  id: string;
  templateId: string;
  versionNumber: number;
  status: 'draft' | 'published';
  durationMinutes: number;
  safetySteps: string[];
  steps: string[];
  notes?: string;
  requiredParts: ProcedureVersionRequiredPart[];
  requiredTools: ProcedureVersionRequiredTool[];
  createdAt?: string;
  updatedAt?: string;
}
