/*
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it } from 'vitest';

import {
  inspectionChecklistIds,
  inspectionTemplates,
  latestInspectionTemplateVersion,
  pmScheduleFixture,
  workOrderWithChecklistFixture,
} from '../seedFixtures';

describe('seed fixtures', () => {
  it('exposes sequential inspection template versions with unique ids', () => {
    const versions = inspectionTemplates.map((tpl) => tpl.version);
    expect(new Set(versions).size).toBe(versions.length);
    expect(Math.max(...versions)).toBe(latestInspectionTemplateVersion);
    expect(inspectionChecklistIds.length).toBeGreaterThan(0);
  });

  it('ties the PM schedule to the latest template version', () => {
    expect(pmScheduleFixture.templateVersion).toBe(latestInspectionTemplateVersion);
    expect(pmScheduleFixture.title).toContain('latest template');
  });

  it('captures a completed PM work order checklist', () => {
    expect(workOrderWithChecklistFixture.status).toBe('completed');
    expect(workOrderWithChecklistFixture.checklists?.every((item) => item.status === 'done')).toBe(true);
  });
});
