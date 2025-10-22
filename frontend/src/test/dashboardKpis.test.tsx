/*
 * SPDX-License-Identifier: MIT
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import type { Mock } from 'vitest';

import Dashboard from '@/pages/Dashboard';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => {
  const get = vi.fn();
  return {
    api: {
      get,
    },
  };
});

vi.mock('react-hot-toast', () => ({
  error: vi.fn(),
  success: vi.fn(),
  dismiss: vi.fn(),
}));

const mockedGet = api.get as unknown as Mock;

mockedGet.mockImplementation((url: string) => {
  if (url === '/summary') {
    return Promise.resolve({
      data: {
        data: {
          totalWO: 12,
          completedWO: 5,
          avgResponse: 2.5,
          slaHitRate: 91,
        },
      },
    });
  }

  if (url === '/summary/workorders') {
    return Promise.resolve({
      data: {
        data: [
          { _id: 'requested', count: 4 },
          { _id: 'in_progress', count: 3 },
          { _id: 'completed', count: 5 },
        ],
      },
    });
  }

  if (url === '/dashboard/overview') {
    return Promise.resolve({
      data: {
        data: {
          livePulse: { maintenanceDue: 6, criticalAlerts: 2 },
          analytics: { completionRate: 85 },
          commandCenter: { overdueWorkOrders: 3 },
          workOrders: { onTimeCompletionRate: 91 },
        },
      },
    });
  }

  if (url === '/workorders/search') {
    return Promise.resolve({
      data: {
        data: [
          {
            _id: 'wo-1',
            title: 'Repair conveyor belt',
            status: 'completed',
            priority: 'high',
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            dueDate: new Date(Date.now() - 86400000).toISOString(),
            assetName: 'Line 1',
          },
          {
            _id: 'wo-2',
            title: 'Inspect hydraulic pump',
            status: 'in_progress',
            priority: 'medium',
            createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
            dueDate: new Date(Date.now() + 86400000).toISOString(),
            assetName: 'Line 2',
          },
        ],
      },
    });
  }

  return Promise.resolve({ data: { data: [] } });
});

describe('Dashboard KPIs', () => {
  it('renders KPI tiles from summary', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Work Orders')).toBeInTheDocument();
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(await screen.findByText('5')).toBeInTheDocument();
    expect(await screen.findByText('Active PMs')).toBeInTheDocument();
    expect(await screen.findByText('6')).toBeInTheDocument();
    expect(await screen.findByText('85%')).toBeInTheDocument();
    expect(await screen.findByText('Overdue')).toBeInTheDocument();
    expect(await screen.findByText('3')).toBeInTheDocument();
    expect(await screen.findByText('2')).toBeInTheDocument();
    expect(await screen.findByText('2.5 hrs')).toBeInTheDocument();
    expect(await screen.findByText('91%')).toBeInTheDocument();
  });
});
