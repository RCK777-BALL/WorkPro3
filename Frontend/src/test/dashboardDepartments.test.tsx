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


vi.mock('../utils/api', () => {
  const departments = [
    { id: 'prod', name: 'Production' },
    { id: 'pack', name: 'Packaging' },
  ];
  return {
    fetchSummary: vi.fn().mockResolvedValue({}),
    fetchAssetSummary: vi.fn().mockResolvedValue([]),
    fetchWorkOrderSummary: vi.fn().mockResolvedValue([]),
    fetchUpcomingMaintenance: vi.fn().mockResolvedValue([]),
    fetchCriticalAlerts: vi.fn().mockResolvedValue([]),
    fetchLowStock: vi.fn().mockResolvedValue([]),
    fetchDepartments: vi.fn().mockResolvedValue(departments),
    default: {
      get: vi.fn((url: string) => {
        if (url === '/departments') return Promise.resolve({ data: departments });
        return Promise.resolve({ data: { laborUtilization: 0 } });
      }),
    },
  };
});

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
  });
});
