export type ChecklistInputType = 'boolean' | 'text' | 'number' | 'choice';

export interface ChecklistItem {
  id: string;
  prompt: string;
  type: ChecklistInputType;
  required?: boolean;
  helpText?: string;
  options?: string[];
}

export interface ChecklistSection {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export interface InspectionTemplate {
  _id?: string;
  id?: string;
  tenantId?: string;
  siteId?: string | null;
  name: string;
  description?: string | null;
  version: number;
  categories: string[];
  retentionDays?: number | null;
  sections: ChecklistSection[];
  createdAt?: string;
  updatedAt?: string;
}

export type InspectionStatus = 'draft' | 'in-progress' | 'completed' | 'archived';

export interface ChecklistResponse {
  itemId: string;
  response: string | number | boolean | string[] | null;
  passed?: boolean;
  notes?: string;
}

export interface InspectionRecord {
  _id?: string;
  id?: string;
  tenantId?: string;
  siteId?: string | null;
  assetId?: string | null;
  templateId: string;
  templateName: string;
  status: InspectionStatus;
  sections: ChecklistSection[];
  responses: ChecklistResponse[];
  summary?: string | null;
  completedBy?: string | null;
  startedAt?: string;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
