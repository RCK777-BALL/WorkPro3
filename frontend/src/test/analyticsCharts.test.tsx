/*
 * SPDX-License-Identifier: MIT
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import type { Mock } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import http from '@/lib/http';

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

  HTMLCanvasElement.prototype.getContext = ((contextId: '2d') =>
    contextId === '2d'
        ? ({
          canvas: document.createElement('canvas'),
          fillRect: () => {},
          clearRect: () => {},
          getImageData: () => ({ data: new Uint8ClampedArray(), width: 0, height: 0 } as ImageData),
          putImageData: () => {},
          createImageData: () => new ImageData(1, 1),
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
          measureText: () => ({ width: 0 } as TextMetrics),
          transform: () => {},
          rect: () => {},
          clip: () => {},
        } as unknown as CanvasRenderingContext2D)
        : null) as HTMLCanvasElement['getContext'];
});

import Analytics from '@/pages/Analytics';

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

const mockedGet = http.get as unknown as Mock;

mockedGet.mockImplementation((url: string) => {
  if (url === '/reports/pm-compliance') {
    return Promise.resolve({ data: [{ period: '2023-01', compliance: 98 }] });
  }
  if (url === '/reports/downtime') {
    return Promise.resolve({ data: [{ period: '2023-01', downtime: 5 }] });
  }
  if (url === '/reports/cost-by-asset') {
    return Promise.resolve({ data: [{ asset: 'Pump A', cost: 170 }] });
  }
  return Promise.resolve({ data: {} });
});

describe('Analytics charts', () => {
  it('renders cost and downtime charts', async () => {
    render(
      <MemoryRouter future={routerFuture}>
        <Analytics />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Analytics')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PM Compliance/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Downtime/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cost/i })).toBeInTheDocument();
  });
});
