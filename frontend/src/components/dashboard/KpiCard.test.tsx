/*
 * SPDX-License-Identifier: MIT
 */

import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import KpiCard from './KpiCard';

describe('KpiCard', () => {
  it('matches snapshot', () => {
    const { container } = render(
      <KpiCard title="Test" value={100} deltaPct={5} series={[]} />,
    );
    expect(container).toMatchSnapshot();
  });
});
