/*
 * SPDX-License-Identifier: MIT
 */

import type { MemberOnboardingPlan } from '../../shared/types/teamOnboarding';

export const MEMBER_ONBOARDING_PLAN: MemberOnboardingPlan = {
  defaultStatus: 'pending',
  lastUpdated: '2024-10-01T00:00:00.000Z',
  steps: [
    {
      id: 'profile-setup',
      title: 'Complete profile & access',
      description: 'Confirm contact info, role, and preferred communication channel.',
      ownerRole: 'People Ops',
      expectedDays: 1,
      status: 'completed',
      resources: [
        {
          label: 'Profile checklist',
          type: 'checklist',
          url: '/settings/profile',
        },
        {
          label: 'Access request form',
          type: 'form',
          url: '/settings/roles',
        },
      ],
    },
    {
      id: 'workspace-orientation',
      title: 'Workspace orientation',
      description: 'Tour the workspace, safety zones, and daily standup cadence.',
      ownerRole: 'Team Lead',
      expectedDays: 2,
      status: 'in_progress',
      resources: [
        {
          label: 'Orientation deck',
          type: 'doc',
          url: '/docs/onboarding/orientation',
        },
        {
          label: 'Safety walkthrough',
          type: 'video',
          url: '/docs/onboarding/safety-walkthrough',
        },
      ],
    },
    {
      id: 'tools-training',
      title: 'Tooling & CMMS training',
      description: 'Learn core workflows: work orders, PMs, and asset updates.',
      ownerRole: 'Maintenance Supervisor',
      expectedDays: 3,
      status: 'pending',
      resources: [
        {
          label: 'CMMS quickstart',
          type: 'doc',
          url: '/help-center/onboarding/cmms-quickstart',
        },
        {
          label: 'Work order simulation',
          type: 'checklist',
          url: '/work-orders',
        },
      ],
    },
    {
      id: 'compliance-clearance',
      title: 'Compliance & certifications',
      description: 'Verify certifications, site badges, and required compliance training.',
      ownerRole: 'Safety Lead',
      expectedDays: 5,
      status: 'pending',
      resources: [
        {
          label: 'Compliance tracker',
          type: 'form',
          url: '/compliance',
        },
        {
          label: 'Certification checklist',
          type: 'checklist',
          url: '/docs/onboarding/certifications',
        },
      ],
    },
    {
      id: 'first-week-goals',
      title: 'First-week goals',
      description: 'Align on the first PM, shadowed work order, and support contacts.',
      ownerRole: 'Team Lead',
      expectedDays: 7,
      status: 'pending',
      resources: [
        {
          label: 'Week-one goals template',
          type: 'doc',
          url: '/docs/onboarding/week-one-goals',
        },
      ],
    },
  ],
};
