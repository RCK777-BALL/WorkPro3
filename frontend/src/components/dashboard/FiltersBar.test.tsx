/*
 * SPDX-License-Identifier: MIT
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import FiltersBar from './FiltersBar';
import { useDashboardStore } from '../../store/dashboardStore';
import type { Department } from '../../types';

const departments: Department[] = [];

describe('FiltersBar', () => {
  beforeEach(() => {
    useDashboardStore.setState({
      selectedTimeframe: 'custom',
      customRange: { start: '2024-01-10', end: '2024-01-20' },
      selectedDepartment: 'all',
      selectedRole: 'all',
    });
  });

  it('shows error for invalid custom range', () => {
    const setCustomRange = vi.spyOn(useDashboardStore.getState(), 'setCustomRange');
    render(<FiltersBar departments={departments} />);

    const startInput = screen.getByDisplayValue('2024-01-10');
    fireEvent.change(startInput, { target: { value: '2024-01-25' } });

    expect(screen.getByText(/start date must be before end date/i)).toBeInTheDocument();
    expect(setCustomRange).not.toHaveBeenCalled();
  });
});
