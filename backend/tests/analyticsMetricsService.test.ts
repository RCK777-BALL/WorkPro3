import { describe, it, expect, beforeEach, vi } from 'vitest';
import DowntimeLog from '../models/DowntimeLog';
import WorkOrder from '../models/WorkOrder';
import WorkHistory from '../models/WorkHistory';
import User from '../models/User';
import {
  calculateBacklogAgingMetrics,
  calculateBacklogMetrics,
  calculateMttrMtbfTrend,
  calculatePmCompliance,
  calculateReliabilityMetrics,
  calculateSlaPerformanceTrend,
  calculateTechnicianUtilization,
} from '../src/modules/analytics/metricsService';

const mockQuery = (results: any[]) => ({
  sort: () => ({
    lean: () => ({ exec: async () => results }),
  }),
});

const mockFind = (results: any[]) => ({
  select: () => ({
    lean: () => ({ exec: async () => results }),
  }),
});

const mockLean = (results: any[]) => ({
  lean: () => ({ exec: async () => results }),
});

describe('Analytics metric services', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calculates MTTR and MTBF from downtime logs', async () => {
    vi.spyOn(DowntimeLog, 'find').mockReturnValueOnce(
      mockQuery([
        { start: new Date('2024-01-01T00:00:00Z'), end: new Date('2024-01-01T02:00:00Z') },
        { start: new Date('2024-01-02T00:00:00Z'), end: new Date('2024-01-02T01:00:00Z') },
      ]) as any,
    );

    const result = await calculateReliabilityMetrics('tenant', {});
    expect(result.eventCount).toBe(2);
    expect(result.mttrHours).toBeCloseTo(1.5, 2);
    expect(result.mtbfHours).toBeCloseTo(24, 2);
  });

  it('computes backlog size and average age', async () => {
    const now = new Date('2024-01-05T00:00:00Z');
    vi.spyOn(WorkOrder, 'find').mockReturnValueOnce(
      mockFind([{ createdAt: new Date('2024-01-01T00:00:00Z') }, { createdAt: new Date('2024-01-03T00:00:00Z') }]) as any,
    );

    const metrics = await calculateBacklogMetrics('tenant', { end: now });
    expect(metrics.size).toBe(2);
    expect(metrics.averageAgeDays).toBeCloseTo(3, 1);
  });

  it('reports PM compliance using counts', async () => {
    vi.spyOn(WorkOrder, 'countDocuments')
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(4);

    const metrics = await calculatePmCompliance('tenant', {});
    expect(metrics.total).toBe(5);
    expect(metrics.completed).toBe(4);
    expect(metrics.complianceRate).toBeCloseTo(80);
  });

  it('builds MTTR/MTBF trend series from corrective work orders', async () => {
    vi.spyOn(WorkOrder, 'find').mockReturnValueOnce(
      mockFind([
        {
          completedAt: new Date('2024-01-02T00:00:00Z'),
          laborHours: 2,
        },
        {
          completedAt: new Date('2024-01-15T00:00:00Z'),
          timeSpentMin: 90,
        },
      ]) as any,
    );

    const result = await calculateMttrMtbfTrend('tenant', {
      start: new Date('2024-01-01T00:00:00Z'),
      end: new Date('2024-01-31T00:00:00Z'),
    });

    expect(result.series.length).toBeGreaterThan(0);
    expect(result.series[0].mttrHours).toBeGreaterThanOrEqual(0);
  });

  it('categorizes backlog aging into buckets', async () => {
    vi.spyOn(WorkOrder, 'find').mockReturnValueOnce(
      mockFind([
        { createdAt: new Date('2024-01-01T00:00:00Z') },
        { createdAt: new Date('2024-02-20T00:00:00Z') },
        { createdAt: new Date('2024-03-15T00:00:00Z') },
      ]) as any,
    );

    const result = await calculateBacklogAgingMetrics('tenant', {
      end: new Date('2024-04-01T00:00:00Z'),
    });

    expect(result.totalOpen).toBe(3);
    expect(result.buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(3);
  });

  it('calculates SLA performance trend', async () => {
    vi.spyOn(WorkOrder, 'find').mockReturnValueOnce(
      mockFind([
        {
          completedAt: new Date('2024-01-10T00:00:00Z'),
          requestedAt: new Date('2024-01-09T00:00:00Z'),
          slaHours: 24,
          slaRespondedAt: new Date('2024-01-09T12:00:00Z'),
          slaResolvedAt: new Date('2024-01-10T00:00:00Z'),
        },
      ]) as any,
    );

    const result = await calculateSlaPerformanceTrend('tenant', {
      start: new Date('2024-01-01T00:00:00Z'),
      end: new Date('2024-01-31T00:00:00Z'),
    });

    expect(result.series[0].responseRate).toBeGreaterThanOrEqual(0);
    expect(result.series[0].resolutionRate).toBeGreaterThanOrEqual(0);
  });

  it('computes technician utilization from work history', async () => {
    vi.spyOn(WorkHistory, 'find').mockReturnValueOnce(
      mockLean([
        { performedBy: 'tech-1', timeSpentHours: 12 },
        { performedBy: 'tech-1', timeSpentHours: 4 },
        { performedBy: 'tech-2', timeSpentHours: 6 },
      ]) as any,
    );
    vi.spyOn(User, 'find').mockReturnValueOnce(
      mockLean([
        { _id: 'tech-1', name: 'Alex Rivera' },
        { _id: 'tech-2', name: 'Sam Lee' },
      ]) as any,
    );

    const result = await calculateTechnicianUtilization('tenant', {
      start: new Date('2024-01-01T00:00:00Z'),
      end: new Date('2024-01-31T00:00:00Z'),
    });

    expect(result.technicians).toHaveLength(2);
    expect(result.averageUtilization).toBeGreaterThan(0);
  });
});
