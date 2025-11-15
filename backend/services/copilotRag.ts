/*
 * SPDX-License-Identifier: MIT
 */

import { Types, type FilterQuery } from 'mongoose';
import WorkOrder, { type WorkOrder as WorkOrderModel } from '../models/WorkOrder';
import WorkHistory, { type WorkHistoryDocument } from '../models/WorkHistory';
import Asset, { type AssetDoc } from '../models/Asset';

const VECTOR_SIZE = 64;
const CACHE_TTL_MS = 5 * 60 * 1000;
const CONTEXT_LIMIT = 40;

interface ContextMetadata {
  title: string;
  source: 'work-order' | 'asset' | 'history';
  workOrderId?: string | undefined;
  assetId?: string | undefined;
  summary?: string | undefined;
  action?: string | undefined;
  failureModes?: string[] | undefined;
  createdAt?: Date | string | undefined;
}

interface EmbeddingDoc {
  id: string;
  text: string;
  vector: number[];
  metadata: ContextMetadata;
}

interface EmbeddingCacheEntry {
  docs: EmbeddingDoc[];
  expiresAt: number;
}

const cache = new Map<string, EmbeddingCacheEntry>();

export interface CopilotSuggestion {
  id: string;
  title: string;
  detail: string;
  confidence: number;
  failureModes: string[];
  sourceType: string;
}

export interface CopilotContextEntry {
  id: string;
  snippet: string;
  score: number;
  sourceType: string;
  workOrderId?: string | undefined;
  assetId?: string | undefined;
}

export interface CopilotResponsePayload {
  summary: string;
  failureModes: string[];
  suggestions: CopilotSuggestion[];
  context: CopilotContextEntry[];
  generatedAt: string;
  workOrder?: {
    id: string;
    title: string;
    status: WorkOrderModel['status'];
    failureModeTags?: string[] | undefined;
    copilotSummary?: string | undefined;
  };
}

export interface CopilotRequestOptions {
  tenantId: string;
  plantId?: string;
  workOrderId?: string;
  assetId?: string;
  query: string;
  limit?: number;
}

export async function runCopilotRag(options: CopilotRequestOptions): Promise<CopilotResponsePayload> {
  const { tenantId, plantId, workOrderId, assetId, query, limit = 5 } = options;
  const workOrder = workOrderId ? await findWorkOrder(tenantId, plantId, workOrderId) : null;
  if (workOrderId && !workOrder) {
    throw new Error('work-order-not-found');
  }
  const scopedAssetId = assetId ?? workOrder?.assetId?.toString();
  const contextDocs = await getContextDocuments({ tenantId, plantId, assetId: scopedAssetId });
  const blendedQuery = `${query}\n${workOrder?.title ?? ''}\n${workOrder?.description ?? ''}`.trim();
  const queryVector = embedText(blendedQuery || query);
  const scored = contextDocs
    .map((doc) => ({
      doc,
      score: cosineSimilarity(queryVector, doc.vector),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const suggestions = scored.map((entry) => toSuggestion(entry.doc, entry.score));
  const context = scored.map((entry) => ({
    id: entry.doc.id,
    snippet: entry.doc.text.slice(0, 320),
    score: Number(entry.score.toFixed(3)),
    sourceType: entry.doc.metadata.source,
    workOrderId: entry.doc.metadata.workOrderId,
    assetId: entry.doc.metadata.assetId,
  }));

  const summaryParts: string[] = [];
  if (workOrder) {
    summaryParts.push(`Work order "${workOrder.title}" is currently ${workOrder.status}.`);
    if (workOrder.copilotSummary) {
      summaryParts.push(workOrder.copilotSummary);
    } else if (workOrder.description) {
      summaryParts.push(workOrder.description.slice(0, 240));
    }
  }
  if (suggestions.length) {
    const contextTitles = suggestions
      .map((item) => `${item.title} (${item.sourceType})`)
      .slice(0, 3)
      .join('; ');
    summaryParts.push(`Relevant history: ${contextTitles}.`);
  }
  const summary = summaryParts.join(' ').trim() || 'No prior maintenance insights available yet.';
  const detectedFailureModes = detectFailureModes(
    `${workOrder?.description ?? ''} ${suggestions.map((item) => item.detail).join(' ')}`,
    workOrder?.failureCode,
  );
  const failureModes = mergeFailureModes(workOrder?.failureModeTags ?? [], detectedFailureModes);

  const response: CopilotResponsePayload = {
    summary,
    failureModes,
    suggestions,
    context,
    generatedAt: new Date().toISOString(),
  };

  if (workOrder) {
    response.workOrder = {
      id: workOrder._id.toString(),
      title: workOrder.title,
      status: workOrder.status,
      failureModeTags: workOrder.failureModeTags?.map((tag) => tag.toString()),
      copilotSummary: workOrder.copilotSummary,
    };
  }

  return response;
}

async function findWorkOrder(
  tenantId: string,
  plantId: string | undefined,
  workOrderId: string,
): Promise<(WorkOrderModel & { _id: Types.ObjectId }) | null> {
  if (!Types.ObjectId.isValid(workOrderId)) {
    return null;
  }
  const filter: FilterQuery<WorkOrderModel> = {
    _id: new Types.ObjectId(workOrderId),
    tenantId,
  };
  if (plantId) {
    filter.plant = plantId;
  }
  return await WorkOrder.findOne(filter).lean();
}

interface ContextParams {
  tenantId: string;
  plantId?: string | undefined;
  assetId?: string | undefined;
}

async function getContextDocuments(params: ContextParams): Promise<EmbeddingDoc[]> {
  const cacheKey = buildCacheKey(params);
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.docs;
  }
  const docs = await buildContextDocuments(params);
  cache.set(cacheKey, { docs, expiresAt: Date.now() + CACHE_TTL_MS });
  return docs;
}

async function buildContextDocuments({ tenantId, plantId, assetId }: ContextParams): Promise<EmbeddingDoc[]> {
  const docs: EmbeddingDoc[] = [];
  const workOrderFilter: FilterQuery<WorkOrderModel> = { tenantId };
  if (plantId) {
    workOrderFilter.plant = plantId;
  }
  if (assetId && Types.ObjectId.isValid(assetId)) {
    workOrderFilter.assetId = new Types.ObjectId(assetId);
  }
  const recentOrders = await WorkOrder.find(workOrderFilter)
    .sort({ updatedAt: -1 })
    .limit(CONTEXT_LIMIT)
    .select('title description status failureCode updatedAt assetId copilotSummary failureModeTags')
    .lean();
  recentOrders.forEach((order) => {
    const text = buildWorkOrderText(order);
    docs.push({
      id: `work-order:${order._id.toString()}`,
      text,
      vector: embedText(text),
      metadata: {
        title: order.title,
        source: 'work-order',
        workOrderId: order._id.toString(),
        assetId: order.assetId?.toString(),
        summary: order.copilotSummary,
        failureModes: order.failureModeTags?.map((tag) => tag.toString()),
        createdAt: order.updatedAt,
      },
    });
  });

  const historyFilter: FilterQuery<WorkHistoryDocument> = { tenantId };
  if (assetId && Types.ObjectId.isValid(assetId)) {
    historyFilter.asset = new Types.ObjectId(assetId);
  }
  const histories = await WorkHistory.find(historyFilter)
    .sort({ updatedAt: -1 })
    .limit(Math.max(10, CONTEXT_LIMIT / 2))
    .select('recentWork actions workOrder asset updatedAt')
    .lean();
  histories.forEach((entry) => {
    const historyText = buildHistoryText(entry);
    if (!historyText) return;
    docs.push({
      id: `history:${entry._id.toString()}`,
      text: historyText,
      vector: embedText(historyText),
      metadata: {
        title: entry.recentWork?.[0]?.title ?? 'Technician note',
        source: 'history',
        workOrderId: entry.workOrder?.toString(),
        assetId: entry.asset?.toString(),
        summary: summarizeComments(
          entry.recentWork?.map((item) => item.notes ?? item.title) ?? [],
          entry.recentWork?.[0]?.title,
        ),
        failureModes: detectFailureModes(historyText),
        createdAt: entry.updatedAt,
      },
    });
  });

  if (assetId && Types.ObjectId.isValid(assetId)) {
    const asset = await Asset.findOne({
      _id: new Types.ObjectId(assetId),
      tenantId,
      ...(plantId ? { plant: plantId } : {}),
    })
      .select('name description notes location type updatedAt')
      .lean<AssetDoc | null>();
    if (asset) {
      const assetText = buildAssetText(asset);
      docs.push({
        id: `asset:${asset._id.toString()}`,
        text: assetText,
        vector: embedText(assetText),
        metadata: {
          title: asset.name,
          source: 'asset',
          assetId: asset._id.toString(),
          summary: asset.description ?? asset.notes ?? '',
          failureModes: detectFailureModes(assetText),
          createdAt: asset.updatedAt,
        },
      });
    }
  }

  return docs;
}

function buildWorkOrderText(order: WorkOrderModel & { _id: Types.ObjectId }): string {
  const parts: string[] = [order.title, order.description ?? '', `Status: ${order.status}`];
  if (order.failureCode) {
    parts.push(`Failure code: ${order.failureCode}`);
  }
  if (order.copilotSummary) {
    parts.push(order.copilotSummary);
  }
  return parts.filter(Boolean).join('\n');
}

type HistoryLike = Pick<WorkHistoryDocument, 'actions' | 'recentWork' | 'workOrder' | 'asset' | 'updatedAt'>;

function buildHistoryText(history: HistoryLike | WorkHistoryDocument): string {
  const notes: string[] = [];
  if (history.actions) {
    notes.push(history.actions);
  }
  if (Array.isArray(history.recentWork)) {
    history.recentWork.forEach((item) => {
      if (item.notes) {
        notes.push(`${item.title ?? 'Entry'}: ${item.notes}`);
      } else if (item.title) {
        notes.push(`${item.title} (${item.status})`);
      }
    });
  }
  return notes.join('\n');
}

function buildAssetText(asset: AssetDoc): string {
  const parts = [
    `Asset ${asset.name} (${asset.type})`,
    asset.description ?? '',
    asset.notes ?? '',
    asset.location ? `Located at ${asset.location}` : '',
  ];
  return parts.filter(Boolean).join('\n');
}

function buildCacheKey({ tenantId, plantId, assetId }: ContextParams): string {
  return [tenantId, plantId ?? 'all', assetId ?? 'any'].join(':');
}

function embedText(text: string): number[] {
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const vector = Array<number>(VECTOR_SIZE).fill(0);
  tokens.forEach((token) => {
    const hash = hashToken(token);
    vector[hash % VECTOR_SIZE] += 1;
  });
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / norm);
}

function hashToken(token: string): number {
  let hash = 0;
  for (let i = 0; i < token.length; i += 1) {
    hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
  }
  return dot;
}

export function summarizeComments(comments: string[], fallbackTitle?: string): string {
  const normalized = comments
    .map((comment) => comment?.trim())
    .filter((comment): comment is string => Boolean(comment && comment.length));
  if (!normalized.length) {
    return fallbackTitle ? `${fallbackTitle}: no recent technician notes.` : '';
  }
  const stitched = normalized
    .map((text) => text.replace(/\s+/g, ' '))
    .filter(Boolean);
  const summary = stitched.slice(0, 3).join(' ');
  return summary.length > 360 ? `${summary.slice(0, 357)}...` : summary;
}

const FAILURE_PATTERNS: Record<string, RegExp[]> = {
  electrical: [/voltage/i, /sensor/i, /wire/i, /short/i, /power/i],
  mechanical: [/bearing/i, /gear/i, /alignment/i, /vibration/i, /mechanical/i],
  hydraulic: [/leak/i, /hydraulic/i, /fluid/i, /pressure/i, /pump/i],
  contamination: [/filter/i, /contamination/i, /debris/i, /clog/i],
  controls: [/plc/i, /software/i, /firmware/i, /controller/i, /logic/i],
  safety: [/safety/i, /guard/i, /lockout/i, /injury/i],
};

export function detectFailureModes(text: string, fallback?: string): string[] {
  const normalized = text.toLowerCase();
  const matches: string[] = [];
  Object.entries(FAILURE_PATTERNS).forEach(([label, patterns]) => {
    if (patterns.some((pattern) => pattern.test(normalized))) {
      matches.push(label);
    }
  });
  if (fallback) {
    matches.push(fallback);
  }
  return mergeFailureModes([], matches);
}

export function mergeFailureModes(existing: string[], incoming: string[]): string[] {
  const seen = new Map(existing.map((tag) => [tag.toLowerCase(), tag]));
  const result = [...existing];
  incoming.forEach((tag) => {
    const slug = tag.toLowerCase();
    if (!seen.has(slug)) {
      seen.set(slug, tag);
      result.push(tag);
    }
  });
  return result;
}

function toSuggestion(doc: EmbeddingDoc, score: number): CopilotSuggestion {
  const failureModes = doc.metadata.failureModes ?? [];
  const action = doc.metadata.action || doc.metadata.summary || doc.text.slice(0, 280);
  return {
    id: doc.id,
    title: doc.metadata.title,
    detail: action,
    confidence: Math.max(0, Math.min(1, score)),
    failureModes,
    sourceType: doc.metadata.source,
  };
}

export function invalidateCopilotCache(): void {
  cache.clear();
}
