/*
 * SPDX-License-Identifier: MIT
 */

import type { InspectionFormTemplate, PMTemplateLibraryItem } from '../../../../shared/types/onboarding';

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
    id: 'forklift-inspection',
    title: 'Forklift daily inspection',
    description: 'OSHA-friendly pre-shift inspection with tires, forks, and safety devices.',
    category: 'Safety',
    interval: 'Daily',
    impact: 'Keeps operators safe and documents pre-use checks for auditors.',
    checklist: [
      'Inspect forks, mast chains, and carriage',
      'Verify horn, lights, and backup alarm',
      'Check tires for wear and damage',
      'Test brakes and parking brake',
      'Log battery or propane levels',
    ],
    rule: { type: 'calendar', cron: '0 4 * * *' },
  },
  {
    id: 'fire-pump-weekly',
    title: 'Fire pump weekly churn',
    description: 'Run the fire pump to capture pressures, flow anomalies, and alarms.',
    category: 'Life safety',
    interval: 'Weekly',
    impact: 'Supports insurance and NFPA documentation for emergency readiness.',
    checklist: [
      'Record suction and discharge pressure',
      'Inspect controller for alarms',
      'Verify jockey pump stops correctly',
      'Walk riser room for leaks or valve position',
      'Document run duration and anomalies',
    ],
    rule: { type: 'calendar', cron: '0 2 * * 1' },
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
    id: 'eyewash-inspection',
    title: 'Eyewash station weekly inspection',
    description: 'Document flushes and verify signage, access, and flow for eyewash stations.',
    category: 'EHS',
    interval: 'Weekly',
    impact: 'Provides compliance trail and catches obstructions or failures early.',
    checklist: [
      'Flush eyewash until water runs clear',
      'Inspect caps, bowl cleanliness, and signage',
      'Verify pathway is clear and unobstructed',
      'Document water temperature and flow concerns',
      'Tag unit if out of service and create WO',
    ],
    rule: { type: 'calendar', cron: '0 7 * * 1' },
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

export const inspectionFormLibrary: InspectionFormTemplate[] = [
  {
    id: 'lockout-tagout',
    title: 'Lockout/tagout verification',
    category: 'Safety',
    description: 'Pre-job verification of lockout points, energy isolation, and permits.',
    sections: [
      {
        heading: 'Preparation',
        items: ['Review equipment specific LOTO', 'Notify affected employees', 'Verify permits are approved'],
      },
      {
        heading: 'Isolation',
        items: ['Apply locks and tags to all energy sources', 'Try/start test completed', 'Zero energy state confirmed'],
      },
      {
        heading: 'Restoration',
        items: ['Inspect work area', 'Remove tools and reinstall guards', 'Remove locks/tags and announce startup'],
      },
    ],
  },
  {
    id: 'hot-work',
    title: 'Hot work permit checklist',
    category: 'EHS',
    description: 'Capture safeguards and fire watch details before starting hot work.',
    sections: [
      {
        heading: 'Area prep',
        items: ['Flammable materials cleared or covered', 'Fire extinguisher staged and inspected', 'Drains protected'],
      },
      {
        heading: 'Execution',
        items: ['Operator PPE verified', 'Fire watch assigned and briefed', 'Ventilation adequate'],
      },
      {
        heading: 'Post-work',
        items: ['Fire watch duration documented', 'Area reinspected after 30 minutes', 'Permit closed and filed'],
      },
    ],
  },
  {
    id: 'gmp-cleaning',
    title: 'GMP cleaning verification',
    category: 'Quality',
    description: 'Document equipment cleaning, swabbing, and sign-offs for GMP environments.',
    sections: [
      {
        heading: 'Pre-clean checks',
        items: ['Batch cleared and labeled', 'Tools and chemicals staged', 'Allergen/contaminant hazards reviewed'],
      },
      {
        heading: 'Cleaning steps',
        items: ['Disassemble contact parts', 'Wash and sanitize surfaces', 'Record dwell time and rinse quality'],
      },
      {
        heading: 'Verification',
        items: ['ATP or swab sample recorded', 'QA signoff received', 'Equipment released to production'],
      },
    ],
  },
];
