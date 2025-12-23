/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

import InventoryItem from '../../../models/InventoryItem';
import PMProcedureTemplate, { type PMProcedureTemplateDocument } from '../../../models/PMProcedureTemplate';
import PMTemplateCategory, { type PMTemplateCategoryDocument } from '../../../models/PMTemplateCategory';
import PMTemplateVersion, {
  type PMTemplateVersionDocument,
  type PMTemplateVersionRequiredPart,
  type PMTemplateVersionRequiredTool,
} from '../../../models/PMTemplateVersion';
import type { CategoryInput, ProcedureTemplateInput, ProcedureVersionInput } from './procedureSchemas';

export interface PMProcedureContext {
  tenantId: string;
  siteId?: string;
}

export class PMProcedureError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'PMProcedureError';
    this.status = status;
  }
}

const toObjectId = (value: string | Types.ObjectId, label: string): Types.ObjectId => {
  if (value instanceof Types.ObjectId) {
    return value;
  }
  if (!Types.ObjectId.isValid(value)) {
    throw new PMProcedureError(`Invalid ${label}`, 400);
  }
  return new Types.ObjectId(value);
};

const ensureCategory = async (
  context: PMProcedureContext,
  categoryId?: string,
): Promise<Types.ObjectId | undefined> => {
  if (!categoryId) return undefined;
  const category = await PMTemplateCategory.findOne({ _id: categoryId, tenantId: context.tenantId });
  if (!category) {
    throw new PMProcedureError('Category not found', 404);
  }
  return category._id;
};

const ensureTemplate = async (
  context: PMProcedureContext,
  templateId: string,
): Promise<PMProcedureTemplateDocument> => {
  const template = await PMProcedureTemplate.findOne({ _id: templateId, tenantId: context.tenantId });
  if (!template) {
    throw new PMProcedureError('Template not found', 404);
  }
  return template;
};

const ensureVersion = async (
  context: PMProcedureContext,
  versionId: string,
): Promise<PMTemplateVersionDocument> => {
  const version = await PMTemplateVersion.findById(versionId);
  if (!version) {
    throw new PMProcedureError('Version not found', 404);
  }
  const template = await ensureTemplate(context, version.templateId.toString());
  if (template._id.toString() !== version.templateId.toString()) {
    throw new PMProcedureError('Template mismatch', 400);
  }
  return version;
};

const ensureParts = async (
  context: PMProcedureContext,
  parts: Types.ObjectId[],
): Promise<Map<string, string>> => {
  if (!parts.length) return new Map();
  const records = await InventoryItem.find({ _id: { $in: parts }, tenantId: context.tenantId })
    .select('name')
    .lean();
  const partMap = new Map(records.map((part) => [part._id.toString(), part.name]));
  for (const partId of parts) {
    if (!partMap.has(partId.toString())) {
      throw new PMProcedureError('Part not found', 404);
    }
  }
  return partMap;
};

const serializeCategory = (doc: Pick<PMTemplateCategoryDocument, '_id' | 'name' | 'description'>) => ({
  id: doc._id.toString(),
  name: doc.name,
  description: doc.description ?? undefined,
});

export const listCategories = async (context: PMProcedureContext) => {
  const categories = await PMTemplateCategory.find({ tenantId: context.tenantId })
    .sort({ name: 1 })
    .lean<Array<Pick<PMTemplateCategoryDocument, '_id' | 'name' | 'description'>>>();
  return categories.map((category) => serializeCategory(category));
};

export const createCategory = async (context: PMProcedureContext, payload: CategoryInput) => {
  const doc = await PMTemplateCategory.create({
    name: payload.name,
    description: payload.description,
    tenantId: toObjectId(context.tenantId, 'tenant id'),
    siteId: context.siteId ? toObjectId(context.siteId, 'site id') : undefined,
  });
  return serializeCategory(doc);
};

const serializeTemplate = (
  doc: PMProcedureTemplateDocument & { latestVersionNumber?: number },
  categoryName?: string,
) => ({
  id: doc._id.toString(),
  name: doc.name,
  description: doc.description ?? undefined,
  category: doc.category?.toString(),
  categoryName,
  latestPublishedVersion: doc.latestPublishedVersion?.toString(),
  latestVersionNumber: doc.latestVersionNumber ?? undefined,
  createdAt: doc.createdAt?.toISOString?.(),
  updatedAt: doc.updatedAt?.toISOString?.(),
});

export const listProcedureTemplates = async (context: PMProcedureContext) => {
  const templates = await PMProcedureTemplate.aggregate([
    { $match: { tenantId: toObjectId(context.tenantId, 'tenant id') } },
    {
      $lookup: {
        from: 'pm_template_versions',
        localField: 'latestPublishedVersion',
        foreignField: '_id',
        as: 'publishedVersion',
      },
    },
    { $unwind: { path: '$publishedVersion', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'pm_template_categories',
        localField: 'category',
        foreignField: '_id',
        as: 'categoryDoc',
      },
    },
    { $unwind: { path: '$categoryDoc', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        latestVersionNumber: '$publishedVersion.versionNumber',
        categoryName: '$categoryDoc.name',
      },
    },
  ]);

  return templates.map((template) =>
    serializeTemplate(template as PMProcedureTemplateDocument & { latestVersionNumber?: number }, template.categoryName),
  );
};

export const createProcedureTemplate = async (
  context: PMProcedureContext,
  payload: ProcedureTemplateInput,
) => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const categoryId = await ensureCategory(context, payload.category);
  const doc = await PMProcedureTemplate.create({
    name: payload.name,
    description: payload.description,
    category: categoryId,
    tenantId,
    siteId: context.siteId ? toObjectId(context.siteId, 'site id') : undefined,
  });
  return serializeTemplate(doc);
};

export const getProcedureTemplate = async (context: PMProcedureContext, templateId: string) => {
  const template = await ensureTemplate(context, templateId);
  let categoryName: string | undefined;
  if (template.category) {
    const category = await PMTemplateCategory.findById(template.category);
    categoryName = category?.name;
  }
  return serializeTemplate(template, categoryName);
};

export const updateProcedureTemplate = async (
  context: PMProcedureContext,
  templateId: string,
  payload: Partial<ProcedureTemplateInput>,
) => {
  const template = await ensureTemplate(context, templateId);
  if (payload.category) {
    const categoryId = await ensureCategory(context, payload.category);
    template.category = categoryId;
  }
  if (payload.name) {
    template.name = payload.name;
  }
  if (payload.description !== undefined) {
    template.description = payload.description;
  }
  await template.save();
  return getProcedureTemplate(context, templateId);
};

export const deleteProcedureTemplate = async (context: PMProcedureContext, templateId: string) => {
  const template = await ensureTemplate(context, templateId);
  await PMTemplateVersion.deleteMany({ templateId: template._id });
  await template.deleteOne();
  return { id: templateId };
};

const normalizeParts = (
  parts: ProcedureVersionInput['requiredParts'],
): PMTemplateVersionRequiredPart[] =>
  (parts ?? []).map((part) => ({
    partId: toObjectId(part.partId, 'part id'),
    quantity: part.quantity && part.quantity > 0 ? part.quantity : 1,
  }));

const normalizeTools = (
  tools: ProcedureVersionInput['requiredTools'],
): PMTemplateVersionRequiredTool[] =>
  (tools ?? []).map((tool) => ({
    toolName: tool.toolName.trim(),
    quantity: tool.quantity && tool.quantity > 0 ? tool.quantity : 1,
  }));

const serializeVersion = (
  version: PMTemplateVersionDocument,
  partNames: Map<string, string>,
): {
  id: string;
  templateId: string;
  versionNumber: number;
  status: string;
  durationMinutes: number;
  safetySteps: string[];
  steps: string[];
  notes?: string;
  requiredParts: { id: string; partId: string; partName?: string; quantity: number }[];
  requiredTools: { id: string; toolName: string; quantity: number }[];
  createdAt?: string;
  updatedAt?: string;
} => ({
  id: version._id.toString(),
  templateId: version.templateId.toString(),
  versionNumber: version.versionNumber,
  status: version.status,
  durationMinutes: version.durationMinutes,
  safetySteps: version.safetySteps ?? [],
  steps: version.steps ?? [],
  notes: version.notes ?? undefined,
  requiredParts: (version.requiredParts ?? []).map((part) => ({
    id: part._id?.toString() ?? '',
    partId: part.partId.toString(),
    partName: partNames.get(part.partId.toString()),
    quantity: part.quantity ?? 1,
  })),
  requiredTools: (version.requiredTools ?? []).map((tool) => ({
    id: tool._id?.toString() ?? '',
    toolName: tool.toolName,
    quantity: tool.quantity ?? 1,
  })),
  createdAt: version.createdAt?.toISOString?.(),
  updatedAt: version.updatedAt?.toISOString?.(),
});

const validateDraft = (version: PMTemplateVersionDocument) => {
  if (version.status === 'published') {
    throw new PMProcedureError('Published versions cannot be modified', 409);
  }
};

const ensureVersionParts = async (
  context: PMProcedureContext,
  parts: PMTemplateVersionRequiredPart[],
): Promise<Map<string, string>> => {
  const partIds = parts.map((part) => part.partId);
  return ensureParts(context, partIds);
};

export const listVersions = async (context: PMProcedureContext, templateId: string) => {
  const template = await ensureTemplate(context, templateId);
  const versions = await PMTemplateVersion.find({ templateId: template._id }).sort({ versionNumber: -1 });
  const partIds = versions.flatMap((version) => version.requiredParts.map((part) => part.partId));
  const partNames = await ensureParts(context, partIds as unknown as Types.ObjectId[]);
  return versions.map((version) => serializeVersion(version, partNames));
};

export const createVersion = async (
  context: PMProcedureContext,
  templateId: string,
  payload: ProcedureVersionInput,
) => {
  const template = await ensureTemplate(context, templateId);
  const normalizedParts = normalizeParts(payload.requiredParts);
  const partNames = await ensureVersionParts(context, normalizedParts);
  const normalizedTools = normalizeTools(payload.requiredTools);
  const latest = await PMTemplateVersion.findOne({ templateId: template._id })
    .sort({ versionNumber: -1 })
    .lean();
  const nextVersion = (latest?.versionNumber ?? 0) + 1;
  const version = await PMTemplateVersion.create({
    templateId: template._id,
    versionNumber: nextVersion,
    status: 'draft',
    durationMinutes: payload.durationMinutes,
    safetySteps: payload.safetySteps.map((step) => step.trim()).filter(Boolean),
    steps: (payload.steps ?? []).map((step) => step.trim()).filter(Boolean),
    notes: payload.notes,
    requiredParts: normalizedParts,
    requiredTools: normalizedTools,
  });
  return serializeVersion(version, partNames);
};

export const getVersion = async (context: PMProcedureContext, versionId: string) => {
  const version = await ensureVersion(context, versionId);
  const partNames = await ensureParts(
    context,
    version.requiredParts.map((part) => part.partId) as unknown as Types.ObjectId[],
  );
  return serializeVersion(version, partNames);
};

export const updateVersion = async (
  context: PMProcedureContext,
  versionId: string,
  payload: ProcedureVersionInput,
) => {
  const version = await ensureVersion(context, versionId);
  validateDraft(version);
  const normalizedParts = normalizeParts(payload.requiredParts);
  const partNames = await ensureVersionParts(context, normalizedParts);
  version.set({
    durationMinutes: payload.durationMinutes,
    safetySteps: payload.safetySteps.map((step) => step.trim()).filter(Boolean),
    steps: (payload.steps ?? []).map((step) => step.trim()).filter(Boolean),
    notes: payload.notes,
    requiredParts: normalizedParts,
    requiredTools: normalizeTools(payload.requiredTools),
  });
  await version.save();
  return serializeVersion(version, partNames);
};

export const deleteVersion = async (context: PMProcedureContext, versionId: string) => {
  const version = await ensureVersion(context, versionId);
  validateDraft(version);
  await version.deleteOne();
  return { id: versionId };
};

export const publishVersion = async (context: PMProcedureContext, versionId: string) => {
  const version = await ensureVersion(context, versionId);
  if (version.status === 'published') {
    throw new PMProcedureError('Version is already published', 409);
  }
  if (!version.durationMinutes || version.durationMinutes < 1) {
    throw new PMProcedureError('Duration is required before publishing', 400);
  }
  if (!version.safetySteps || version.safetySteps.length === 0) {
    throw new PMProcedureError('At least one safety step is required to publish', 400);
  }

  version.status = 'published';
  await version.save();
  await PMProcedureTemplate.updateOne(
    { _id: version.templateId },
    { latestPublishedVersion: version._id },
  );

  const partNames = await ensureParts(
    context,
    version.requiredParts.map((part) => part.partId) as unknown as Types.ObjectId[],
  );
  return serializeVersion(version, partNames);
};
