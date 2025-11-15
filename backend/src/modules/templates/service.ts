/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

import PMTask from '../../../models/PMTask';
import type { PMContext, PMTemplateResponse } from '../pm/service';
import { PMTemplateError } from '../pm/service';
import { pmTemplateLibrary } from './library';
import type { PMTemplateLibraryItem } from '@shared/onboarding';

export interface PMTemplateLibraryResponse extends PMTemplateLibraryItem {}

export const listTemplateLibrary = (): PMTemplateLibraryResponse[] => pmTemplateLibrary;

const formatChecklistNote = (checklist: string[]) =>
  checklist.length ? `\n\nChecklist:\n${checklist.map((item) => `• ${item}`).join('\n')}` : '';

const toObjectId = (value: string, label: string): Types.ObjectId => {
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
  const doc = await PMTask.create({
    title: template.title,
    notes: `${template.description}\n${template.impact}${formatChecklistNote(template.checklist)}`.trim(),
    tenantId,
    rule: template.rule,
    assignments: [],
  });

  return {
    id: doc._id.toString(),
    title: doc.title,
    notes: doc.notes ?? undefined,
    active: doc.active,
    assignments: [],
  };
};
