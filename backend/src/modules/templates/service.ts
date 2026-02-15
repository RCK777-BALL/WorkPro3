/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

import PMTemplate, { type PMTemplateDocument } from '../../../models/PMTemplate';
import type { PMContext, PMTemplateResponse } from '../pm/service';
import { PMTemplateError } from '../pm/service';
import { inspectionFormLibrary, pmTemplateLibrary } from './library';
import type { InspectionFormTemplate, PMTemplateLibraryItem } from '../../../../shared/types/onboarding';

export interface PMTemplateLibraryResponse extends PMTemplateLibraryItem {}
export interface InspectionFormLibraryResponse extends InspectionFormTemplate {}

export const listTemplateLibrary = (): PMTemplateLibraryResponse[] => pmTemplateLibrary;
export const listInspectionForms = (): InspectionFormLibraryResponse[] => inspectionFormLibrary;

const toObjectId = (value: string | Types.ObjectId, label: string): Types.ObjectId => {
  if (value instanceof Types.ObjectId) {
    return value;
  }
  if (!Types.ObjectId.isValid(value)) {
    throw new PMTemplateError(`Invalid ${label}`, 400);
  }
  return new Types.ObjectId(value);
};

export const cloneTemplateFromLibrary = async (
  context: PMContext,
  templateId: string,
): Promise<PMTemplateResponse> => {
  const template = pmTemplateLibrary.find((item) => item.id === templateId);
  if (!template) {
    throw new PMTemplateError('Template not found', 404);
  }

  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const doc = (await PMTemplate.create({
    name: template.title,
    category: template.category,
    description: `${template.description}\n${template.impact}`.trim(),
    tasks: template.checklist ?? [],
    estimatedMinutes: template.estimatedMinutes ?? 0,
    tenantId,
    assignments: [],
  } as any)) as PMTemplateDocument;

  const id = (doc._id as Types.ObjectId).toString();

  return {
    id,
    name: doc.name,
    category: doc.category,
    description: doc.description ?? '',
    tasks: doc.tasks ?? [],
    estimatedMinutes: doc.estimatedMinutes ?? undefined,
    assignments: [],
    createdAt: doc.createdAt?.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
  };
};
