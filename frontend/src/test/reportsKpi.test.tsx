import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import Reports from '../pages/Reports';
import http from '../lib/http';

vi.mock('../lib/http');
vi.mock('../components/kpi/KpiExportButtons', () => ({ default: () => <div data-testid="export-btns" /> }));
const lineMock = vi.fn((props: any) => <canvas {...props} />);
vi.mock('react-chartjs-2', () => ({ Line: (props: any) => lineMock(props) }), { virtual: true });
vi.mock(
  'chart.js',
  () => ({ CategoryScale: {}, LinearScale: {}, PointElement: {}, LineElement: {}, Tooltip: {}, Legend: {}, Chart: {}, register: () => {} }),
  { virtual: true },
);

const mockedGet = http.get as unknown as vi.Mock;

mockedGet.mockImplementation((url: string) => {
  if (url === '/v1/analytics/kpis') {
    return Promise.resolve({ data: { mttr: 5, mtbf: 10, backlog: 0 } });
  }
  if (url === '/v1/analytics/analytics') {
    return Promise.resolve({ data: { maintenanceCompliance: 92 } });
  }
  if (url === '/v1/analytics/trends') {
    return Promise.resolve({ data: [] });
  }
  return Promise.resolve({ data: {} });
});

describe('Reports KPIs', () => {
  it('renders MTBF, MTTR and Compliance values', async () => {
    render(<Reports />);
    expect(await screen.findByText('MTBF')).toBeInTheDocument();
    expect(await screen.findByText('10.0h')).toBeInTheDocument();
    expect(await screen.findByText('MTTR')).toBeInTheDocument();
    expect(await screen.findByText('5.0h')).toBeInTheDocument();
    expect(await screen.findByText('Compliance')).toBeInTheDocument();
    expect(await screen.findByText('92.0%')).toBeInTheDocument();
  });
});

