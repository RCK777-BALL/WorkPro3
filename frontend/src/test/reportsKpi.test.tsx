/*
 * SPDX-License-Identifier: MIT
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

import Reports from '@/pages/Reports';
import http from '@/lib/http';

vi.mock('../lib/http');
vi.mock('../components/kpi/KpiExportButtons', () => ({ default: () => <div data-testid="export-btns" /> }));
const lineMock = vi.fn((props: any) => <canvas {...props} />);
const barMock = vi.fn((props: any) => <canvas {...props} />);
(vi.mock as any)(
  'react-chartjs-2',
  () => ({ Line: (props: any) => lineMock(props), Bar: (props: any) => barMock(props) }),
  { virtual: true },
);
(vi.mock as any)(
  'chart.js',
  () => ({ CategoryScale: {}, LinearScale: {}, PointElement: {}, LineElement: {}, BarElement: {}, Tooltip: {}, Legend: {}, Chart: {}, register: () => {} }),
  { virtual: true },
);

const mockedGet = http.get as unknown as Mock;

const kpiPayload = {
  mttr: 5,
  mtbf: 12,
  backlog: 3,
  availability: 0.9,
  performance: 0.92,
  quality: 0.96,
  oee: 0.82,
  energy: {
    totalKwh: 125,
    averagePerHour: 5,
    perAsset: [{ assetId: 'a1', assetName: 'Asset A', totalKwh: 90 }],
    perSite: [{ siteId: 's1', siteName: 'Site A', totalKwh: 125 }],
  },
  downtime: {
    totalMinutes: 180,
    reasons: [
      { reason: 'mechanical', minutes: 120 },
      { reason: 'electrical', minutes: 60 },
    ],
    trend: [],
  },
  benchmarks: {
    assets: [
      { id: 'a1', name: 'Asset A', availability: 0.91, performance: 0.93, quality: 0.97, oee: 0.82 },
    ],
    sites: [
      { id: 's1', name: 'Site A', availability: 0.9, performance: 0.92, quality: 0.96, oee: 0.82 },
    ],
  },
  thresholds: { availability: 0.85, performance: 0.9, quality: 0.95, oee: 0.8 },
  range: { start: '2024-01-01T00:00:00.000Z', end: '2024-01-31T00:00:00.000Z' },
};

const trendPayload = {
  oee: [{ period: '2024-01-01', value: 0.8 }],
  availability: [{ period: '2024-01-01', value: 0.9 }],
  performance: [{ period: '2024-01-01', value: 0.92 }],
  quality: [{ period: '2024-01-01', value: 0.96 }],
  energy: [{ period: '2024-01-01', value: 50 }],
  downtime: [{ period: '2024-01-01', value: 120 }],
};

beforeEach(() => {
  mockedGet.mockReset();
  mockedGet.mockImplementation((url: string) => {
    if (url === '/v1/analytics/kpis') {
      return Promise.resolve({ data: kpiPayload });
    }
    if (url === '/v1/analytics/trends') {
      return Promise.resolve({ data: trendPayload });
    }
    return Promise.resolve({ data: {} });
  });
});

describe('Reports analytics page', () => {
  it('renders the enriched KPI widgets and charts', async () => {
    render(<Reports />);
    expect(await screen.findByText('OEE')).toBeInTheDocument();
    expect(await screen.findByText('82.0%')).toBeInTheDocument();
    expect(await screen.findByText('Availability')).toBeInTheDocument();
    expect(await screen.findByText('90.0%')).toBeInTheDocument();
    expect(await screen.findByText('Energy')).toBeInTheDocument();
    expect(await screen.findByText('125.0 kWh')).toBeInTheDocument();
    expect(await screen.findByTestId('oee-trend')).toBeInTheDocument();
    expect(await screen.findByTestId('energy-trend')).toBeInTheDocument();
    expect(await screen.findByText('Asset Benchmarking')).toBeInTheDocument();
  });

  it('applies filters and triggers API calls with query parameters', async () => {
    render(<Reports />);
    await screen.findByText('Asset');
    await userEvent.selectOptions(screen.getByLabelText('Site'), 's1');
    await waitFor(() => {
      expect(mockedGet).toHaveBeenCalledWith(
        '/v1/analytics/kpis',
        expect.objectContaining({ params: expect.objectContaining({ siteIds: expect.any(String) }) }),
      );
    });
  });
});
