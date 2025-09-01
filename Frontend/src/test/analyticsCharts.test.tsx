import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import api from '../utils/api';

vi.mock('../utils/api');
vi.mock('../components/layout/Layout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('../components/kpi/KpiWidget', () => ({ default: () => <div /> }));
vi.mock('../components/kpi/KpiExportButtons', () => ({ default: () => <div /> }));
vi.mock('../components/common/Button', () => ({ default: ({ children }: any) => <button>{children}</button> }));
vi.mock('../components/common/Card', () => ({ default: ({ children, title }: any) => <div>{title}{children}</div> }));
vi.mock('../components/common/Badge', () => ({ default: () => <span /> }));
vi.mock('react-chartjs-2', () => ({ Line: (props: any) => <canvas {...props} /> }));
vi.mock('chart.js', () => ({ CategoryScale: {}, LinearScale: {}, PointElement: {}, LineElement: {}, Tooltip: {}, Legend: {}, Chart: {}, register: () => {} }));

import Analytics from '../pages/Analytics';

const mockedGet = api.get as unknown as vi.Mock;

mockedGet.mockImplementation((url: string) => {
  if (url === '/reports/analytics') {
    return Promise.resolve({
      data: {
        workOrderCompletionRate: 0,
        averageResponseTime: 0,
        maintenanceCompliance: 0,
        assetUptime: 0,
        costPerWorkOrder: 0,
        laborUtilization: 0,
        topAssets: [],
      },
    });
  }
  if (url === '/v1/analytics/kpis') {
    return Promise.resolve({ data: { mttr: 0, mtbf: 0, backlog: 0 } });
  }
  if (url === '/reports/costs') {
    return Promise.resolve({ data: [{ period: '2023-01', laborCost: 100, materialCost: 50, maintenanceCost: 20, totalCost: 170 }] });
  }
  if (url === '/reports/downtime') {
    return Promise.resolve({ data: [{ period: '2023-01', downtime: 5 }] });
  }
  return Promise.resolve({ data: {} });
});

describe('Analytics charts', () => {
  it('renders cost and downtime charts', async () => {
    render(<Analytics />);
    const cost = await screen.findByTestId('cost-chart');
    const down = await screen.findByTestId('downtime-chart');
    expect(cost).toBeInTheDocument();
    expect(down).toBeInTheDocument();
  });
});
