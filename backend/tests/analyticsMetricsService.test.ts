import { describe, it, expect, beforeEach, vi } from 'vitest';
import DowntimeLog from '../models/DowntimeLog';
import WorkOrder from '../models/WorkOrder';
import { calculateBacklogMetrics, calculatePmCompliance, calculateReliabilityMetrics } from '../src/modules/analytics/metricsService';

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
});
