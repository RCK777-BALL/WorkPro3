/*
 * SPDX-License-Identifier: MIT
 */

import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import '@testing-library/jest-dom';

import { WarehouseDashboard } from './WarehouseDashboard';

vi.mock('@/api/analyticsWarehouse', () => ({
  fetchSnapshots: vi.fn().mockResolvedValue({
    snapshots: [
      {
        period: '2024-01-01',
        granularity: 'day',
        mtbfHours: 12,
        mttrHours: 2,
        responseSlaRate: 98,
        resolutionSlaRate: 96,
        downtimeHours: 4,
        maintenanceCost: 4000,
      },
    ],
    generatedAt: '2024-01-02T00:00:00Z',
  }),
  fetchLeaderboards: vi.fn().mockResolvedValue({ sites: [], assets: [], technicians: [] }),
  fetchComparisons: vi.fn().mockResolvedValue({ range: { from: '', to: '', granularity: 'day' }, comparisons: [] }),
  fetchReliabilityByAsset: vi.fn().mockResolvedValue([
    { assetId: 'a1', assetName: 'Asset A', mttrHours: 1.2, mtbfHours: 30 },
    { assetId: 'a2', assetName: 'Asset B', mttrHours: 2.5, mtbfHours: 20 },
  ]),
  fetchBacklogBurndown: vi.fn().mockResolvedValue([
    { period: '2024-01-01', open: 10, completed: 5, agingDays: 12 },
    { period: '2024-01-08', open: 6, completed: 8, agingDays: 8 },
  ]),
  fetchPmComplianceTrend: vi.fn().mockResolvedValue([
    { period: '2024-01-01', compliance: 75 },
    { period: '2024-01-08', compliance: 88 },
  ]),
  exportReliabilitySnapshot: vi.fn(),
  exportBacklogBurndown: vi.fn(),
  exportPmComplianceTrend: vi.fn(),
}));

vi.mock('@/components/charts/SimpleBarChart', () => ({
  SimpleBarChart: ({ data }: { data: Array<{ label: string; value: number }> }) => (
    <div>{data.map((item) => item.label).join(',')}</div>
  ),
}));

vi.mock('@/components/charts/SimpleLineChart', () => ({
  SimpleLineChart: ({ data }: { data: Array<{ label: string; value: number }> }) => (
    <div>{data.map((item) => `${item.label}:${item.value}`).join('|')}</div>
  ),
}));

describe('WarehouseDashboard', () => {
  it('renders reliability, backlog, and PM trend tiles from sample data', async () => {
    render(<WarehouseDashboard />);

    await waitFor(() => expect(screen.getByText(/Repair duration focus/i)).toBeInTheDocument());

    expect(screen.getAllByText(/Asset A/i)).toHaveLength(2);
    expect(screen.getAllByText(/Asset B/i)).toHaveLength(2);
    expect(screen.getByText(/2024-01-01:10/)).toBeInTheDocument();
    expect(screen.getByText(/2024-01-01:75/)).toBeInTheDocument();
    expect(screen.getByText(/Completion trend/i)).toBeInTheDocument();
  });
});
