/*
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it, vi, afterEach } from 'vitest';

import type { MaintenanceScheduleInput } from './maintenanceSchedules';
import { sanitizeSchedulePayload } from './maintenanceSchedules';

const createSchedule = (overrides: Partial<MaintenanceScheduleInput> = {}): MaintenanceScheduleInput => ({
  title: 'Test Schedule',
  description: 'Desc',
  assetId: 'asset-123',
  frequency: 'monthly',
  nextDue: '2024-01-01',
  estimatedDuration: 2,
  instructions: 'Do work',
  type: 'preventive',
  repeatConfig: {
    interval: 1,
    unit: 'month',
  },
  parts: ['filter'],
  ...overrides,
});

describe('sanitizeSchedulePayload', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('normalises invalid numbers and dates', () => {
    vi.setSystemTime(new Date('2024-05-01T00:00:00Z'));

    const payload = sanitizeSchedulePayload(
      createSchedule({
        estimatedDuration: Number.NaN,
        nextDue: 'not-a-date',
        repeatConfig: {
          interval: Number.NaN as number,
          unit: 'invalid-unit' as 'day',
          endDate: 'also-invalid',
          occurrences: Number.NaN as number,
        },
      }),
    );

    expect(payload.estimatedDuration).toBe(0);
    expect(payload.nextDue).toBe('2024-05-01');
    expect(payload.repeatConfig.interval).toBe(1);
    expect(payload.repeatConfig.unit).toBe('month');
    expect(payload.repeatConfig).not.toHaveProperty('endDate');
    expect(payload.repeatConfig).not.toHaveProperty('occurrences');
  });

  it('trims and filters optional fields', () => {
    const payload = sanitizeSchedulePayload(
      createSchedule({
        parts: [' bearing  ', '  ', 'bolt'],
        assignedTo: '  alice  ',
        lastCompletedBy: '  bob  ',
        lastCompleted: 'invalid-date',
      }),
    );

    expect(payload.parts).toEqual(['bearing', 'bolt']);
    expect(payload.assignedTo).toBe('alice');
    expect(payload.lastCompletedBy).toBe('bob');
    expect(payload).not.toHaveProperty('lastCompleted');
  });
});

