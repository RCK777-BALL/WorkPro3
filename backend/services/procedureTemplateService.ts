/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

import ProcedureTemplate from '../models/ProcedureTemplate';
import ProcedureTemplateVersion, {
  type ProcedureTemplateVersionDocument,
} from '../models/ProcedureTemplateVersion';

export interface ProcedureChecklistEntry {
  id: string;
  text: string;
  type: 'checkbox';
  required: boolean;
  evidenceRequired?: boolean;
  status: 'not_started';
  done: false;
}

export interface ProcedureSnapshot {
  templateId: Types.ObjectId;
  versionId: Types.ObjectId;
  versionNumber: number;
  durationMinutes: number;
  safetySteps: string[];
  steps: string[];
  notes?: string;
  requiredParts: { partId: Types.ObjectId; quantity: number }[];
  requiredTools: { toolName: string; quantity: number }[];
}

const buildChecklistEntries = (version: ProcedureTemplateVersionDocument): ProcedureChecklistEntry[] => {
  const entries: ProcedureChecklistEntry[] = [];
  const addEntry = (text: string, prefix?: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    entries.push({
      id: new Types.ObjectId().toString(),
      text: prefix ? `${prefix}: ${trimmed}` : trimmed,
      type: 'checkbox',
      required: true,
      evidenceRequired: false,
      status: 'not_started',
      done: false,
    });
  };

  (version.safetySteps ?? []).forEach((step) => addEntry(step, 'Safety'));
  (version.steps ?? []).forEach((step) => addEntry(step));
  return entries;
};

export const resolveLatestPublishedProcedure = async (
  tenantId: string,
  templateId: string | Types.ObjectId,
): Promise<ProcedureSnapshot | null> => {
  if (!(templateId instanceof Types.ObjectId) && !Types.ObjectId.isValid(templateId)) return null;
  const template = await ProcedureTemplate.findOne({
    _id: templateId,
    tenantId,
  });
  if (!template) return null;

  const version = template.latestPublishedVersion
    ? await ProcedureTemplateVersion.findOne({
        _id: template.latestPublishedVersion,
        tenantId,
        status: 'published',
      })
    : await ProcedureTemplateVersion.findOne({
        templateId: template._id,
        tenantId,
        status: 'published',
      }).sort({ versionNumber: -1 });

  if (!version) return null;

  return {
    templateId: template._id,
    versionId: version._id,
    versionNumber: version.versionNumber,
    durationMinutes: version.durationMinutes,
    safetySteps: version.safetySteps ?? [],
    steps: version.steps ?? [],
    notes: version.notes ?? undefined,
    requiredParts: (version.requiredParts ?? []).map((part) => ({
      partId: part.partId,
      quantity: part.quantity ?? 1,
    })),
    requiredTools: (version.requiredTools ?? []).map((tool) => ({
      toolName: tool.toolName,
      quantity: tool.quantity ?? 1,
    })),
  };
};

export const buildProcedureChecklist = (version: ProcedureTemplateVersionDocument): ProcedureChecklistEntry[] =>
  buildChecklistEntries(version);

export const resolveProcedureChecklist = async (
  tenantId: string,
  templateId?: Types.ObjectId,
): Promise<{
  snapshot?: ProcedureSnapshot;
  checklist?: ProcedureChecklistEntry[];
}> => {
  if (!templateId) return {};
  const snapshot = await resolveLatestPublishedProcedure(tenantId, templateId);
  if (!snapshot) return {};
  const version = await ProcedureTemplateVersion.findOne({
    _id: snapshot.versionId,
    tenantId,
  });
  if (!version) return { snapshot };
  return {
    snapshot,
    checklist: buildChecklistEntries(version),
  };
};
