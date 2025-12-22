/*
 * SPDX-License-Identifier: MIT
 */

import type { MaintenanceScheduleRepeatConfig } from './models/MaintenanceSchedule';
import type { InspectionTemplateDocument } from './models/InspectionTemplate';
import type { WorkOrderDocument } from './models/WorkOrder';
import type { ConditionRuleLean } from './services/iotIngestionService';

export type SeedInspectionTemplate = Pick<InspectionTemplateDocument, 'name' | 'description' | 'version' | 'categories' | 'sections'>;

export const inspectionTemplates: SeedInspectionTemplate[] = [
  {
    name: 'Line Clearance Checklist',
    description: 'Baseline safety and quality checks for the packaging line.',
    version: 1,
    categories: ['safety', 'quality'],
    sections: [
      {
        id: 'startup',
        title: 'Startup',
        items: [
          { id: 'guards', prompt: 'Verify guards are in place', type: 'boolean', required: true },
          { id: 'spill', prompt: 'Spill kit stocked', type: 'boolean', required: true },
        ],
      },
      {
        id: 'materials',
        title: 'Materials',
        items: [
          { id: 'lot-code', prompt: 'Record material lot code', type: 'text' },
          { id: 'labels', prompt: 'Confirm labels match spec', type: 'boolean', required: true },
        ],
      },
    ],
  },
  {
    name: 'Line Clearance Checklist',
    description: 'Adds IoT temperature spot-check and captures torque readings.',
    version: 2,
    categories: ['safety', 'quality'],
    sections: [
      {
        id: 'startup',
        title: 'Startup',
        items: [
          { id: 'guards', prompt: 'Verify guards are in place', type: 'boolean', required: true },
          { id: 'spill', prompt: 'Spill kit stocked', type: 'boolean', required: true },
          {
            id: 'iot-spotcheck',
            prompt: 'Log IoT temperature spot-check value',
            type: 'number',
            helpText: 'Use handheld sensor if gateway is offline.',
          },
        ],
      },
      {
        id: 'materials',
        title: 'Materials',
        items: [
          { id: 'lot-code', prompt: 'Record material lot code', type: 'text' },
          { id: 'labels', prompt: 'Confirm labels match spec', type: 'boolean', required: true },
          { id: 'torque', prompt: 'Enter torque reading (Nm)', type: 'number' },
        ],
      },
    ],
  },
];

export const pmScheduleRepeat: MaintenanceScheduleRepeatConfig = {
  interval: 1,
  unit: 'month',
};

export const pmScheduleFixture = {
  title: 'Monthly Line A PM (latest template)',
  description: 'Anchors the PM to the latest line clearance template version.',
  frequency: 'monthly',
  estimatedDuration: 90,
  repeatConfig: pmScheduleRepeat,
  type: 'pm',
  templateName: inspectionTemplates[0].name,
  templateVersion: Math.max(...inspectionTemplates.map((tpl) => tpl.version)),
  instructions: 'Use the newest revision when generating tasks.',
};

export const workOrderWithChecklistFixture: Pick<
  WorkOrderDocument,
  'title' | 'description' | 'status' | 'priority' | 'importance' | 'timeSpentMin' | 'checklists' | 'checklist'
> & { completedAt: Date } = {
  title: 'PM run with completed checklist',
  description: 'Generated from PM schedule with all steps checked off.',
  status: 'completed',
  priority: 'high',
  importance: 'medium',
  completedAt: new Date(),
  timeSpentMin: 75,
  checklists: [
    { text: 'Lockout/Tagout applied', done: true, status: 'done' },
    { text: 'Greased drive components', done: true, status: 'done' },
    { text: 'Re-tensioned belt', done: true, status: 'done' },
  ],
  checklist: [
    { id: 'guard', text: 'Safety guards verified', type: 'checkbox', completedValue: true, required: true },
    { id: 'torque', text: 'Torque logged', type: 'numeric', completedValue: 12, required: false },
    { id: 'notes', text: 'Notes', type: 'text', completedValue: 'All clear' },
  ],
};

export const iotRuleFixture: ConditionRuleLean = {
  metric: 'temperature_c',
  operator: '>=',
  threshold: 85,
  workOrderTitle: 'Investigate motor over-temperature',
  workOrderDescription: 'IoT gateway raised temperature spike above 85°C.',
};

export const latestInspectionTemplateVersion = pmScheduleFixture.templateVersion;

export const inspectionChecklistIds = inspectionTemplates.flatMap((template) =>
  template.sections.flatMap((section) => section.items.map((item) => item.id)),
);
