/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { startPMScheduler, stopPMScheduler } from '../utils/PMScheduler';
import * as taskA from './helpers/dummyTaskA';
import * as taskB from './helpers/dummyTaskB';

function resetCounters() {
  taskA.counter.runs = 0;
  taskB.counter.runs = 0;
}

describe('PMScheduler utils', () => {
  beforeEach(() => {
    resetCounters();
  });

  afterEach(() => {
    stopPMScheduler();
  });

  it('runs multiple schedules concurrently', async () => {
    startPMScheduler('a', { cronExpr: '*/1 * * * * *', taskModulePath: './tests/helpers/dummyTaskA' });
    startPMScheduler('b', { cronExpr: '*/1 * * * * *', taskModulePath: './tests/helpers/dummyTaskB' });

    await new Promise((r) => setTimeout(r, 1100));

    expect(taskA.counter.runs).toBeGreaterThan(0);
    expect(taskB.counter.runs).toBeGreaterThan(0);
  });

  it('replaces existing schedule with same id', async () => {
    startPMScheduler('x', { cronExpr: '*/1 * * * * *', taskModulePath: './tests/helpers/dummyTaskA' });
    await new Promise((r) => setTimeout(r, 1100));
    const firstRuns = taskA.counter.runs;

    startPMScheduler('x', { cronExpr: '*/1 * * * * *', taskModulePath: './tests/helpers/dummyTaskB' });
    await new Promise((r) => setTimeout(r, 1100));

    expect(taskA.counter.runs).toBe(firstRuns);
    expect(taskB.counter.runs).toBeGreaterThan(0);
  });
});
