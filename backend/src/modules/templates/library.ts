/*
 * SPDX-License-Identifier: MIT
 */

import type { PMTemplateLibraryItem } from '@shared/onboarding';

export const pmTemplateLibrary: PMTemplateLibraryItem[] = [
  {
    id: 'hvac-inspection',
    title: 'HVAC filter & belt inspection',
    description: 'Replace filters, inspect belts, and verify air flow for rooftop HVAC units.',
    category: 'HVAC',
    interval: 'Monthly',
    impact: 'Improves climate control efficiency and extends blower motor life.',
    checklist: [
      'Isolate unit and verify lockout/tagout in place',
      'Replace intake and return filters',
      'Inspect and tension blower belts',
      'Clear condensate drain and pan',
      'Verify supply air temperature and log readings',
    ],
    rule: { type: 'calendar', cron: '0 5 1 * *' },
  },
  {
    id: 'process-pump',
    title: 'Process pump lubrication & seal check',
    description: 'Lubricate bearings, inspect couplings, and verify seal integrity for centrifugal pumps.',
    category: 'Pumps',
    interval: 'Biweekly',
    impact: 'Reduces risk of seal failures and captures vibration issues early.',
    checklist: [
      'Inspect mechanical seal for leaks',
      'Grease drive- and non-drive-end bearings',
      'Check coupling alignment and set screws',
      'Record suction/discharge pressure differential',
      'Verify vibration and temperature readings',
    ],
    rule: { type: 'calendar', cron: '0 4 */14 * *' },
  },
  {
    id: 'compressor-service',
    title: 'Air compressor PM',
    description: 'Full preventive maintenance for rotary screw compressors including oil and intake elements.',
    category: 'Compressors',
    interval: 'Quarterly',
    impact: 'Prevents unplanned downtime on compressed air system.',
    checklist: [
      'Replace compressor oil and filter',
      'Inspect separator element and hoses',
      'Clean or replace intake element',
      'Verify safety relief and minimum pressure valve operation',
      'Check dryer operation and drain condensate traps',
    ],
    rule: { type: 'calendar', cron: '0 6 1 */3 *' },
  },
  {
    id: 'conveyor-alignment',
    title: 'Conveyor chain alignment & lubrication',
    description: 'Inspect conveyor chain tension, alignment, and lubricate wear points.',
    category: 'Conveyors',
    interval: 'Monthly',
    impact: 'Avoids tracking issues that lead to jams and safety events.',
    checklist: [
      'Inspect sprockets and guides for wear',
      'Adjust chain tension to specification',
      'Lubricate chain and bearings',
      'Verify emergency stops and guarding',
      'Document section-by-section condition photos',
    ],
    rule: { type: 'calendar', cron: '0 3 1 * *' },
  },
  {
    id: 'press-calibration',
    title: 'Hydraulic press calibration',
    description: 'Verify tonnage, check hydraulic leaks, and test safety light curtains.',
    category: 'Presses',
    interval: 'Monthly',
    impact: 'Ensures stamping quality and operator safety systems stay in tolerance.',
    checklist: [
      'Verify hydraulic reservoir level and condition',
      'Inspect hoses/fittings for leaks',
      'Calibrate tonnage monitor',
      'Test e-stop and light curtain response',
      'Document ram parallelism measurements',
    ],
    rule: { type: 'calendar', cron: '0 2 1 * *' },
  },
];
