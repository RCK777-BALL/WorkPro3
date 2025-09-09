import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import React from 'react';
import { Chart as ChartJS } from 'chart.js';
import http from '../lib/http';

vi.mock('../lib/http');

beforeAll(() => {
  // Stub required browser APIs for Chart.js
  Object.defineProperty(global, 'ResizeObserver', {
    writable: true,
    value: class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  });

  HTMLCanvasElement.prototype.getContext = () => ({
    canvas: document.createElement('canvas'),
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: [] }),
    putImageData: () => {},
    createImageData: () => [],
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({ width: 0 }),
    transform: () => {},
    rect: () => {},
    clip: () => {},
  });
});

import Analytics from '../pages/Analytics';

const mockedGet = http.get as unknown as vi.Mock;

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
    const costChart = ChartJS.getChart(cost as HTMLCanvasElement);
    const downChart = ChartJS.getChart(down as HTMLCanvasElement);
    expect(costChart?.data.datasets[0].data).toEqual([100]);
    expect(downChart?.data.datasets[0].data).toEqual([5]);
  });
});
