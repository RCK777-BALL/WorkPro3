/*
 * SPDX-License-Identifier: MIT
 */

import type { PMTemplateLibraryItem } from '../../../../shared/onboarding';

export const pmTemplateLibrary: PMTemplateLibraryItem[] = [
  {
    id: 'boiler-efficiency',
    title: 'Boiler efficiency inspection',
    description: 'Dial in routine PM for your boilers with safety checks and trending.',
    category: 'Utilities',
    interval: 'Weekly',
    impact: 'Keeps boilers tuned while catching safety issues before downtime.',
    checklist: [
      'Inspect flame quality and log readings',
      'Verify relief valve and low water cutoffs',
      'Record flue gas temperature and draft',
      'Check burner air mix and clean igniters',
      'Document stack O2/CO for trending',
    ],
    rule: { type: 'calendar', cron: '0 4 * * 1' },
  },
  {
    id: 'ahu-cleaning',
    title: 'Air handling unit cleaning',
    description: 'Prefill a full coil cleaning, filter swap, and logging steps.',
    category: 'Air handling',
    interval: 'Monthly',
    impact: 'Improves airflow and keeps AHU coils clean for energy efficiency.',
    checklist: [
      'Remove and dispose of dirty filters',
      'Clean supply and return coils',
      'Check belt tension and sheave alignment',
      'Inspect drain pans and clear condensate',
      'Log supply/return temperature differential',
    ],
    rule: { type: 'calendar', cron: '0 5 1 * *' },
  },
  {
    id: 'compressor-performance',
    title: 'Compressor performance capture',
    description: 'Quick win to log compressor health and spot air leaks.',
    category: 'Compressor',
    interval: 'Quarterly',
    impact: 'Captures baseline performance data to prevent surprises.',
    checklist: [
      'Capture amperage and discharge pressure',
      'Inspect inlet filters and oil levels',
      'Test condensate traps and drains',
      'Walkdown for audible air leaks',
      'Record dryer dew point and alarms',
    ],
    rule: { type: 'calendar', cron: '0 6 1 */3 *' },
  },
];
