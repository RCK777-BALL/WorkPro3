/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';

export type RequestFieldType = 'text' | 'textarea' | 'select' | 'number' | 'checkbox';

export interface RequestAttachmentDefinition {
  key: string;
  label: string;
  required?: boolean;
  accept?: string[];
  maxFiles?: number;
}

export interface RequestFieldDefinition {
  key: string;
  label: string;
  type?: RequestFieldType;
  required?: boolean;
  options?: string[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

export interface RequestTypeItem {
  _id: string;
  name: string;
  slug: string;
  category: string;
  requiredFields: string[];
  attachments: RequestAttachmentDefinition[];
  fields: RequestFieldDefinition[];
  defaultPriority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface RequestTypeInput {
  name: string;
  slug: string;
  category: string;
  requiredFields: string[];
  attachments?: RequestAttachmentDefinition[];
  fields?: RequestFieldDefinition[];
  defaultPriority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface RequestFormInput {
  name: string;
  description?: string;
  requestType?: string;
  fields: RequestFieldDefinition[];
  attachments: RequestAttachmentDefinition[];
}

export const fetchRequestTypes = async () => {
  const response = await http.get<RequestTypeItem[]>('/work-requests/types');
  return response.data;
};

export const createRequestType = async (input: RequestTypeInput) => {
  const response = await http.post<RequestTypeItem>('/work-requests/types', input);
  return response.data;
};

export const saveRequestForm = async (slug: string, input: RequestFormInput) => {
  const response = await http.put(`/work-requests/forms/${encodeURIComponent(slug)}`, input);
  return response.data;
};
