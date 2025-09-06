import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import Dashboard from '../pages/Dashboard';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../components/layout/Layout', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

const mockSocket = { on: vi.fn(), off: vi.fn() };
vi.mock('../utils/notificationsSocket', () => ({
  getNotificationsSocket: () => mockSocket,
}));

const departments = [
  { id: 'prod', name: 'Production' },
  { id: 'pack', name: 'Packaging' },
];

export const getMock = vi.fn((url: string) => {
  if (url === '/summary/departments') {
    return Promise.resolve({ data: departments });
  }
  if (url === '/summary/low-stock') {
    return Promise.resolve({ data: [] });
  }
  if (url === '/summary') {
    return Promise.resolve({ data: {} });
  }
  return Promise.resolve({ data: { laborUtilization: 0 } });
});

vi.mock('../api/summary', () => ({
  fetchSummary: vi.fn().mockResolvedValue({}),
  fetchAssetSummary: vi.fn().mockResolvedValue([]),
  fetchWorkOrderSummary: vi.fn().mockResolvedValue([]),
  fetchUpcomingMaintenance: vi.fn().mockResolvedValue([]),
  fetchCriticalAlerts: vi.fn().mockResolvedValue([]),
  fetchLowStock: vi.fn().mockResolvedValue([]),
}));

vi.mock('../lib/api', () => ({
  default: { get: getMock },
}));

describe('Dashboard departments', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: '1', name: 'Leader', email: '', role: 'admin' },
      isAuthenticated: true,
    });
  });

  it('loads departments into the select', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByText('Filters'));

    expect(await screen.findByRole('option', { name: 'Production' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Packaging' })).toBeInTheDocument();
    expect(getMock).not.toHaveBeenCalledWith(expect.stringContaining('/reports/analytics'));
  });
});
