/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect } from 'vitest';
import { calcNextDue } from '../tasks/PMSchedulerTask';

describe('calcNextDue', () => {
  it('advances annually', () => {
    const from = new Date('2022-06-15T00:00:00Z');
    const next = calcNextDue(from, 'annually');
    expect(next.getFullYear()).toBe(2023);
    expect(next.getMonth()).toBe(from.getMonth());
    expect(next.getDate()).toBe(from.getDate());
  });

  it('advances yearly alias', () => {
    const from = new Date('2022-06-15T00:00:00Z');
    const next = calcNextDue(from, 'yearly');
    expect(next.getFullYear()).toBe(2023);
  });

  it('supports custom day interval', () => {
    const from = new Date('2022-06-15T00:00:00Z');
    const next = calcNextDue(from, 'every 3 days');
    expect(next.getTime() - from.getTime()).toBe(3 * 24 * 60 * 60 * 1000);
  });

  it('supports custom week interval', () => {
    const from = new Date('2022-06-15T00:00:00Z');
    const next = calcNextDue(from, 'every 2 weeks');
    expect(next.getTime() - from.getTime()).toBe(14 * 24 * 60 * 60 * 1000);
  });

  it('advances quarterly', () => {
    const from = new Date('2022-01-15T00:00:00Z');
    const next = calcNextDue(from, 'quarterly');
    expect(next.getUTCMonth()).toBe(3); // April
    expect(next.getUTCDate()).toBe(15);
  });

  it('advances biannually', () => {
    const from = new Date('2022-01-15T00:00:00Z');
    const next = calcNextDue(from, 'biannually');
    expect(next.getUTCMonth()).toBe(6); // July
    expect(next.getUTCDate()).toBe(15);
  });

  it('handles DST by using UTC calculations', () => {
    const from = new Date('2021-03-13T12:00:00-08:00');
    const next = calcNextDue(from, 'every 1 day');
    expect(next.getTime() - from.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});
