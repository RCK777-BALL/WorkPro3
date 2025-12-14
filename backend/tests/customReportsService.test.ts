/*
 * SPDX-License-Identifier: MIT
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';

import WorkOrder from '../models/WorkOrder';
import ReportTemplate from '../models/ReportTemplate';
import {
  getReportTemplate,
  listReportTemplates,
  runCustomReport,
  saveReportTemplate,
} from '../src/modules/custom-reports/service';
import type { AuthedRequest } from '../types/http';

const buildRequest = (
  tenantId: Types.ObjectId,
  permissions: string[],
  roles: string[],
  userId = new Types.ObjectId(),
): AuthedRequest => ({
  tenantId: tenantId.toString(),
  user: {
    id: userId.toString(),
    tenantId: tenantId.toString(),
    permissions,
    roles,
  },
});

let aggregateSpy: ReturnType<typeof vi.spyOn>;
let templates: Array<Record<string, any>>;

beforeEach(() => {
  templates = [];

  aggregateSpy = vi.spyOn(WorkOrder, 'aggregate').mockImplementation((pipeline: any[]) => {
    const hasGroupStage = pipeline.some((stage) => '$group' in stage);
    if (hasGroupStage) {
      return {
        exec: async () => [
          { _id: { status: 'requested' }, count: 1, sumCost: 125, avgLabor: 2 },
          { _id: { status: 'in_progress' }, count: 1, sumCost: 75, avgLabor: 3 },
        ],
      } as any;
    }
    return {
      exec: async () => [{ title: 'Tenant A - requested', status: 'requested' }],
    } as any;
  });

  vi.spyOn(ReportTemplate.prototype, 'save').mockImplementation(async function saveMock() {
    const ownerId = (this as Record<string, unknown>).ownerId ?? new Types.ObjectId();
    const tenantId = (this as Record<string, unknown>).tenantId ?? new Types.ObjectId();
    const source = this as Record<string, any>;
    const document = {
      _id: new Types.ObjectId(),
      name: source.name,
      description: source.description,
      fields: source.fields ?? [],
      filters: source.filters ?? [],
      groupBy: source.groupBy ?? [],
      dateRange: source.dateRange,
      model: source.model,
      calculations: source.calculations ?? [],
      visibility: source.visibility,
      ownerId,
      tenantId,
      shareId: source.shareId ?? `share-${templates.length}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Record<string, any>;
    templates.push(document);
    return document;
  });

  vi.spyOn(ReportTemplate, 'find').mockImplementation((query: any) => ({
    sort: () => ({
      exec: async () =>
        templates.filter((tpl) =>
          query?.tenantId ? tpl.tenantId?.toString() === String(query.tenantId) : true,
        ),
    }),
  })) as any;

  vi.spyOn(ReportTemplate, 'findOneAndUpdate').mockImplementation((query: any, update: any) => ({
    exec: async () => {
      const found = templates.find(
        (tpl) => tpl._id?.toString() === String(query._id) && tpl.tenantId?.toString() === String(query.tenantId),
      );
      if (!found) return null as any;
      Object.assign(found, update);
      return found as any;
    },
  }));

  vi.spyOn(ReportTemplate, 'findOne').mockImplementation((query: any) => ({
    exec: async () => {
      const matches = templates.filter((tpl) => tpl.tenantId?.toString() === String(query.tenantId));
      const match = matches.find((tpl) =>
        (query.$or as Array<Record<string, unknown>>)?.some((condition) => {
          if ('_id' in condition) return tpl._id?.toString() === String(condition._id);
          if ('shareId' in condition) return tpl.shareId === condition.shareId;
          return false;
        }),
      );
      return match ?? null;
    },
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
  templates = [];
  aggregateSpy.mockRestore();
});

describe('custom report query builder', () => {
  const tenantA = new Types.ObjectId();

  it('scopes queries by tenant and filters results', async () => {
    const result = await runCustomReport(tenantA, {
      model: 'workOrders',
      fields: ['title', 'status'],
      filters: [{ field: 'status', operator: 'eq', value: 'requested' }],
    });

    expect(result.total).toBe(1);
    expect(result.rows[0].title).toBe('Tenant A - requested');
    expect(result.groupBy).toEqual([]);
  });

  it('aggregates calculations accurately', async () => {
    const result = await runCustomReport(tenantA, {
      model: 'workOrders',
      groupBy: ['status'],
      calculations: [
        { operation: 'count', as: 'count' },
        { operation: 'sum', field: 'totalCost', as: 'sumCost' },
        { operation: 'avg', field: 'laborHours', as: 'avgLabor' },
      ],
    });

    const requested = result.rows.find((row) => row.status === 'requested');
    const inProgress = result.rows.find((row) => row.status === 'in_progress');

    expect(requested?.count).toBe(1);
    expect(requested?.sumCost).toBe(125);
    expect(requested?.avgLabor).toBe(2);

    expect(inProgress?.count).toBe(1);
    expect(inProgress?.sumCost).toBe(75);
    expect(inProgress?.avgLabor).toBe(3);
  });
});

describe('saved report sharing', () => {
  const tenantA = new Types.ObjectId();

  it('enforces visibility when fetching templates by shareable id', async () => {
    const builderReq = buildRequest(tenantA, ['reports.build', 'reports.read'], ['manager']);
    const technicianReq = buildRequest(tenantA, ['reports.read'], ['tech']);

    const template = await saveReportTemplate(builderReq, {
      name: 'Manager visibility',
      description: 'Visible only to managers',
      model: 'workOrders',
      fields: ['title'],
      filters: [],
      groupBy: [],
      visibility: { scope: 'roles', roles: ['manager'] },
    });

    const managerTemplates = await listReportTemplates(builderReq);
    expect(managerTemplates.map((tpl) => tpl.id)).toContain(template.id);

    const techTemplates = await listReportTemplates(technicianReq);
    expect(techTemplates).toHaveLength(0);

    await expect(getReportTemplate(technicianReq, template.shareId!)).rejects.toMatchObject({ message: 'Forbidden' });

    const shared = await getReportTemplate(builderReq, template.shareId!);
    expect(shared.name).toBe('Manager visibility');
  });
});
