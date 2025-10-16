/*
 * SPDX-License-Identifier: MIT
 */

export type UnifiedStatus =
  | 'Open'
  | 'In Progress'
  | 'Pending Approval'
  | 'On Hold'
  | 'Completed'
  | 'Cancelled';

export interface StatusDefinition {
  /**
   * Canonical status value shared across Work Orders, PMs, Assets, and Permits.
   */
  value: UnifiedStatus;
  /** Machine friendly key consumers can use for lookups. */
  key: string;
  /** Hex color code or Tailwind-compatible token. */
  color: string;
  /** Optional short description for tooltips. */
  description: string;
  /** Sort order used when rendering the status legend. */
  order: number;
}

const BASE_STATUS_DEFINITIONS: StatusDefinition[] = [
  {
    value: 'Open',
    key: 'open',
    color: '#1d4ed8',
    description: 'Item has been logged but no work has started yet.',
    order: 1,
  },
  {
    value: 'In Progress',
    key: 'in-progress',
    color: '#0ea5e9',
    description: 'Technicians are actively working on the task.',
    order: 2,
  },
  {
    value: 'Pending Approval',
    key: 'pending-approval',
    color: '#f97316',
    description: 'Awaiting supervisor or safety sign-off before work can continue.',
    order: 3,
  },
  {
    value: 'On Hold',
    key: 'on-hold',
    color: '#6b7280',
    description: 'Temporarily paused due to parts, permits, or scheduling conflicts.',
    order: 4,
  },
  {
    value: 'Completed',
    key: 'completed',
    color: '#16a34a',
    description: 'All work is finished and ready for review or closeout.',
    order: 5,
  },
  {
    value: 'Cancelled',
    key: 'cancelled',
    color: '#dc2626',
    description: 'Work will not proceed or has been voided.',
    order: 6,
  },
];

export const STATUS_DEFINITIONS: StatusDefinition[] = BASE_STATUS_DEFINITIONS.map((definition) => ({
  ...definition,
}));

const STATUS_LOOKUP = new Map<string, StatusDefinition>();
for (const definition of STATUS_DEFINITIONS) {
  STATUS_LOOKUP.set(definition.key, definition);
  STATUS_LOOKUP.set(definition.value, definition);
}

export const getStatusDefinitions = (): StatusDefinition[] =>
  STATUS_DEFINITIONS.map((definition) => ({ ...definition }));

export const resolveStatusDefinition = (status: string): StatusDefinition | undefined =>
  STATUS_LOOKUP.get(status);

