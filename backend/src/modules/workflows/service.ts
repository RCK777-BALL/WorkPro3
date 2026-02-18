/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import WorkflowDefinition, { type WorkflowDefinitionDocument } from '../../../models/WorkflowDefinition';
import WorkflowInstance, { type WorkflowInstanceDocument } from '../../../models/WorkflowInstance';
import SlaPolicy, { type SlaPolicyDocument } from '../../../models/SlaPolicy';

export interface WorkflowContext {
  tenantId: string;
  siteId?: string;
}

export interface WorkflowDefinitionInput {
  name: string;
  description?: string;
  steps?: Array<{ name: string; type: string; config?: Record<string, unknown> }>;
}

export interface WorkflowInstanceInput {
  definitionId: string;
  context?: Record<string, unknown>;
}

export interface SlaPolicyInput {
  name: string;
  resolveMinutes: number;
  responseMinutes?: number;
}

const toObjectId = (value?: string): Types.ObjectId | undefined => {
  if (!value) return undefined;
  if (!Types.ObjectId.isValid(value)) return undefined;
  return new Types.ObjectId(value);
};

export const listDefinitions = async (
  context: WorkflowContext,
): Promise<WorkflowDefinitionDocument[]> => {
  const tenantId = toObjectId(context.tenantId);
  if (!tenantId) return [];
  return WorkflowDefinition.find({ tenantId }).sort({ createdAt: -1 });
};

export const createDefinition = async (
  context: WorkflowContext,
  input: WorkflowDefinitionInput,
): Promise<WorkflowDefinitionDocument> => {
  const tenantId = toObjectId(context.tenantId);
  if (!tenantId) throw new Error('Tenant context required');
  return WorkflowDefinition.create({
    tenantId,
    name: input.name,
    description: input.description,
    steps: input.steps ?? [],
    active: true,
  });
};

export const listInstances = async (
  context: WorkflowContext,
): Promise<WorkflowInstanceDocument[]> => {
  const tenantId = toObjectId(context.tenantId);
  if (!tenantId) return [];
  return WorkflowInstance.find({ tenantId }).sort({ createdAt: -1 });
};

export const createInstance = async (
  context: WorkflowContext,
  input: WorkflowInstanceInput,
): Promise<WorkflowInstanceDocument> => {
  const tenantId = toObjectId(context.tenantId);
  if (!tenantId) throw new Error('Tenant context required');
  const definitionId = toObjectId(input.definitionId);
  if (!definitionId) throw new Error('definitionId is required');
  return WorkflowInstance.create({
    tenantId,
    definitionId,
    status: 'pending',
    context: input.context ?? {},
  });
};

export const listSlaPolicies = async (
  context: WorkflowContext,
): Promise<SlaPolicyDocument[]> => {
  const tenantId = toObjectId(context.tenantId);
  if (!tenantId) return [];
  return SlaPolicy.find({ tenantId }).sort({ createdAt: -1 });
};

export const createSlaPolicy = async (
  context: WorkflowContext,
  input: SlaPolicyInput,
): Promise<SlaPolicyDocument> => {
  const tenantId = toObjectId(context.tenantId);
  if (!tenantId) throw new Error('Tenant context required');
  return SlaPolicy.create({
    tenantId,
    name: input.name,
    resolveMinutes: input.resolveMinutes,
    ...(input.responseMinutes ? { responseMinutes: input.responseMinutes } : {}),
  });
};
