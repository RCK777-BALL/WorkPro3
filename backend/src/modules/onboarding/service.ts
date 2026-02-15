/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

import Tenant, {
  type TenantDocument,
  type TenantOnboardingState,
  type OnboardingStepKey,
} from '../../../models/Tenant';
import Site from '../../../models/Site';
import Asset from '../../../models/Asset';
import PMTask from '../../../models/PMTask';
import User from '../../../models/User';
import Department from '../../../models/Department';
import Role from '../../../models/Role';
import InventoryItem from '../../../models/InventoryItem';

const REMINDER_COOLDOWN_MS = 1000 * 60 * 60 * 12; // 12 hours

export interface OnboardingStepDefinition {
  key: OnboardingStepKey;
  title: string;
  description: string;
  href: string;
}

export const STEP_DEFINITIONS: OnboardingStepDefinition[] = [
  {
    key: 'site',
    title: 'Add your first site',
    description: 'Create a plant or site to anchor assets and PM schedules.',
    href: '/plants',
  },
  {
    key: 'roles',
    title: 'Configure access roles',
    description: 'Set up tenant and site roles so users land with the right permissions.',
    href: '/settings/roles',
  },
  {
    key: 'departments',
    title: 'Define departments and lines',
    description: 'Stand up production areas to organize work and assets.',
    href: '/departments',
  },
  {
    key: 'assets',
    title: 'Import assets',
    description: 'Upload asset data or add equipment manually to build your registry.',
    href: '/imports',
  },
  {
    key: 'starterData',
    title: 'Load starter data',
    description: 'Bring in PMs, work orders, and parts with the bulk importer to jump-start your workspace.',
    href: '/imports',
  },
  {
    key: 'pmTemplates',
    title: 'Pick PM templates',
    description: 'Start from curated PM templates and adapt them to your equipment.',
    href: '/pm/tasks',
  },
  {
    key: 'users',
    title: 'Invite your team',
    description: 'Add technicians and supervisors so work can be assigned.',
    href: '/teams',
  },
];

const ensureTenant = async (tenantId: string): Promise<TenantDocument> => {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }
  return tenant;
};

const ensureState = (state?: TenantOnboardingState): TenantOnboardingState => {
  const next = {
    steps: {
      site: state?.steps?.site ?? { completed: false },
      roles: state?.steps?.roles ?? { completed: false },
      departments: state?.steps?.departments ?? { completed: false },
      assets: state?.steps?.assets ?? { completed: false },
      starterData: state?.steps?.starterData ?? { completed: false },
      pmTemplates: state?.steps?.pmTemplates ?? { completed: false },
      users: state?.steps?.users ?? { completed: false },
    },
    lastReminderAt: state?.lastReminderAt,
    reminderDismissedAt: state?.reminderDismissedAt,
  };
  return next as TenantOnboardingState;
};

const buildRestartState = (): TenantOnboardingState =>
  ({
    steps: {
      site: { completed: false },
      roles: { completed: false },
      departments: { completed: false },
      assets: { completed: false },
      starterData: { completed: false },
      pmTemplates: { completed: false },
      users: { completed: false },
    },
  }) as TenantOnboardingState;

const collectSignals = async (tenantId: Types.ObjectId) => {
  const [hasSite, hasDepartment, hasAsset, hasPmTask, userCount, roleCount, hasInventory] = await Promise.all([
    Site.exists({ tenantId }),
    Department.exists({ tenantId }),
    Asset.exists({ tenantId }),
    PMTask.exists({ tenantId }),
    User.countDocuments({ tenantId }),
    Role.countDocuments({ tenantId }),
    InventoryItem.exists({ tenantId }),
  ]);
  return {
    site: Boolean(hasSite),
    roles: (roleCount ?? 0) > 0,
    departments: Boolean(hasDepartment),
    assets: Boolean(hasAsset),
    starterData: Boolean(hasPmTask || hasInventory),
    pmTemplates: Boolean(hasPmTask),
    users: (userCount ?? 0) > 1,
  } satisfies Record<OnboardingStepKey, boolean>;
};

const refreshState = async (tenant: TenantDocument): Promise<TenantOnboardingState> => {
  const tenantId = tenant._id instanceof Types.ObjectId ? tenant._id : new Types.ObjectId(tenant._id);
  const completion = await collectSignals(tenantId);
  const nextState = ensureState(tenant.onboarding);
  let changed = false;

  for (const [key, done] of Object.entries(completion) as Array<[OnboardingStepKey, boolean]>) {
    const stepState = nextState.steps[key];
    if (done && !stepState.completed) {
      stepState.completed = true;
      stepState.completedAt = new Date();
      changed = true;
    }
  }

  if (!tenant.onboarding || changed) {
    tenant.onboarding = nextState;
    await tenant.save();
  }
  return nextState;
};

export interface OnboardingStepResponse extends OnboardingStepDefinition {
  completed: boolean;
  completedAt?: string;
}

export interface OnboardingStateResponse {
  steps: OnboardingStepResponse[];
  pendingReminder: boolean;
  reminderMessage?: string;
  lastReminderAt?: string;
  nextStepKey?: OnboardingStepKey | null;
}

const shouldShowReminder = (state: TenantOnboardingState, hasIncomplete: boolean) => {
  if (!hasIncomplete) return false;
  if (!state.lastReminderAt) return true;
  return Date.now() - state.lastReminderAt.getTime() > REMINDER_COOLDOWN_MS;
};

export const getOnboardingState = async (tenantId: string): Promise<OnboardingStateResponse> => {
  const tenant = await ensureTenant(tenantId);
  const state = await refreshState(tenant);
  const steps: OnboardingStepResponse[] = STEP_DEFINITIONS.map((step) => {
    const completedAt = state.steps[step.key]?.completedAt;
    return {
      ...step,
      completed: state.steps[step.key]?.completed ?? false,
      ...(completedAt ? { completedAt: completedAt.toISOString() } : {}),
    };
  });
  const incomplete = steps.filter((step) => !step.completed);
  const nextStep = incomplete[0]?.key ?? null;
  const pendingReminder = shouldShowReminder(state, incomplete.length > 0);
  const reminderMessage = pendingReminder
    ? `Complete ${incomplete.length === 1 ? 'this step' : 'these steps'} to finish setup. Next up: ${
        incomplete[0]?.title ?? 'onboarding'
      }.`
    : undefined;

  return {
    steps,
    pendingReminder,
    ...(reminderMessage !== undefined ? { reminderMessage } : {}),
    ...(state.lastReminderAt
      ? { lastReminderAt: state.lastReminderAt.toISOString() }
      : {}),
    nextStepKey: nextStep,
  };
};

export const dismissOnboardingReminder = async (tenantId: string) => {
  const tenant = await ensureTenant(tenantId);
  const state = ensureState(tenant.onboarding);
  const now = new Date();
  state.lastReminderAt = now;
  state.reminderDismissedAt = now;
  tenant.onboarding = state;
  await tenant.save();
  return { lastReminderAt: now.toISOString() };
};

export const restartOnboardingState = async (tenantId: string): Promise<OnboardingStateResponse> => {
  const tenant = await ensureTenant(tenantId);
  tenant.onboarding = buildRestartState();
  await tenant.save();
  return getOnboardingState(tenantId);
};
