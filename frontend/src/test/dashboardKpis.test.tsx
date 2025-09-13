/*
 * SPDX-License-Identifier: MIT
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import type { Mock } from 'vitest';

import Dashboard from '@/pages/Dashboard';
import http from '@/lib/http';

vi.mock('../lib/http');
const mockedGet = http.get as unknown as Mock;

mockedGet.mockImplementation((url: string) => {
  if (url === '/api/summary') {
    return Promise.resolve({
      data: {
        openWorkOrders: 7,
        pmDueThisWeek: 3,
        assets: 42,
        uptime: 99.5,
        inventoryItems: 128,
        activeUsers: 5,
      },
    });
  }
  if (url === '/api/audit/logs') {
    return Promise.resolve({ data: [] });
  }
  if (url === '/summary/departments') {
    return Promise.resolve({ data: [] });
  }
  if (url === '/summary/low-stock') {
    return Promise.resolve({ data: [] });
  }
  if (url === '/summary') {
    return Promise.resolve({ data: {} });
  }
  return Promise.resolve({ data: [] });
});

describe('Dashboard KPIs', () => {
  it('renders KPI tiles from summary', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Open Work Orders')).toBeInTheDocument();
    expect(await screen.findByText('7')).toBeInTheDocument();
    expect(await screen.findByText('PM Due (7d)')).toBeInTheDocument();
    expect(await screen.findByText('3')).toBeInTheDocument();
    expect(await screen.findByText('Total Assets')).toBeInTheDocument();
    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(await screen.findByText('Uptime')).toBeInTheDocument();
    expect(await screen.findByText('99.5%')).toBeInTheDocument();
    expect(await screen.findByText('Inventory Items')).toBeInTheDocument();
    expect(await screen.findByText('128')).toBeInTheDocument();
    expect(await screen.findByText('Active Users')).toBeInTheDocument();
    expect(await screen.findByText('5')).toBeInTheDocument();
  });
});
