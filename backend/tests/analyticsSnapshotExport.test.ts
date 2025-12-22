import express from 'express';
import request from 'supertest';
import { parse } from 'csv-parse/sync';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSnapshotsFromWarehouse = vi.fn();
vi.mock('../src/modules/analytics/service', () => ({
  getSnapshotsFromWarehouse: (...args: any[]) => getSnapshotsFromWarehouse(...args),
  buildAnalyticsSnapshots: vi.fn(),
  getLeaderboards: vi.fn(),
  getSiteComparisons: vi.fn(),
  rebuildWarehouseForTenant: vi.fn(),
}));

import { exportSnapshotCsvHandler } from '../src/modules/analytics/controller';

const app = express();
app.get('/api/analytics/v2/metrics.csv', (req, res, next) => {
  req.tenantId = 'tenant123';
  exportSnapshotCsvHandler(req as any, res as any, next as any);
});

describe('Analytics snapshot exports', () => {
  beforeEach(() => {
    getSnapshotsFromWarehouse.mockReset();
  });

  it('exports snapshot rows with filters applied', async () => {
    getSnapshotsFromWarehouse.mockResolvedValue([
      {
        period: '2024-01-01T00:00:00.000Z',
        granularity: 'month',
        siteId: 'site-1',
        siteName: 'Plant A',
        mtbfHours: 12,
        mttrHours: 3,
        responseSlaRate: 92,
        resolutionSlaRate: 88,
        technicianUtilization: 55,
        downtimeHours: 4.5,
        maintenanceCost: 1234,
      },
      {
        period: '2024-02-01T00:00:00.000Z',
        granularity: 'month',
        siteId: 'site-2',
        siteName: 'Plant B',
        mtbfHours: 10,
        mttrHours: 2,
        responseSlaRate: 90,
        resolutionSlaRate: 85,
        technicianUtilization: 60,
        downtimeHours: 5.25,
        maintenanceCost: 1500,
      },
    ]);

    const res = await request(app)
      .get('/api/analytics/v2/metrics.csv?from=2024-01-01&to=2024-02-15&scope=site')
      .expect(200);

    expect(getSnapshotsFromWarehouse).toHaveBeenCalledWith('tenant123', {
      from: new Date('2024-01-01'),
      to: new Date('2024-02-15'),
      granularity: undefined,
      scope: 'site',
    });

    const records = parse(res.text, { columns: true, skip_empty_lines: true });
    expect(Object.keys(records[0])).toEqual([
      'Period',
      'Granularity',
      'Site',
      'Asset',
      'Technician',
      'MTBF (hours)',
      'MTTR (hours)',
      'Response SLA (%)',
      'Resolution SLA (%)',
      'Utilization (%)',
      'Downtime (hours)',
      'Maintenance Cost',
    ]);
    expect(records).toHaveLength(2);
    expect(records[0].Site).toBe('Plant A');
    expect(records[1]['Downtime (hours)']).toBe('5.25');
  });
});
