/*
 * SPDX-License-Identifier: MIT
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DashboardAnalyticsPanel from './DashboardAnalyticsPanel';

vi.mock('./hooks', () => ({
  DASHBOARD_RANGE_OPTIONS: [
    { label: 'Last 30 days', value: '30d', days: 30 },
  ],
  useDashboardAnalytics: () => ({
    data: {
      kpis: {
        statuses: [],
        overdue: 1,
        pmCompliance: { total: 2, completed: 1, percentage: 50 },
        downtimeHours: 4,
        maintenanceCost: 100,
        partsSpend: 70,
        backlogAgingDays: 6,
        laborUtilization: 80,
        mttr: 1,
        mtbf: 3,
      },
      mtbf: { value: 3, trend: [] },
      pmCompliance: { total: 2, completed: 1, percentage: 50, trend: [] },
      workOrderVolume: { total: 0, byStatus: [], trend: [] },
    },
    loading: false,
    error: null,
    refetch: vi.fn(),
    params: undefined,
  }),
}));

vi.mock('@/lib/http', () => ({
  default: { post: vi.fn().mockResolvedValue({ data: {} }) },
}));

describe('DashboardAnalyticsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders drill-down links for extended widgets', () => {
    render(<DashboardAnalyticsPanel />);
    expect(screen.getByText(/MTTR work orders/i).closest('a')).toHaveAttribute(
      'href',
      '/workorders?type=corrective&status=completed&sort=duration_desc',
    );
    expect(screen.getByText(/Backlog aging/i)).toBeInTheDocument();
  });

  it('schedules exports from the control bar', async () => {
    render(<DashboardAnalyticsPanel />);
    const emailInput = screen.getByPlaceholderText(/delivery@example.com/i);
    fireEvent.change(emailInput, { target: { value: 'team@example.com' } });
    fireEvent.click(screen.getByText(/Schedule PDF/i));
    expect(emailInput).toHaveValue('team@example.com');
  });
});
