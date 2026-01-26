/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronRight, Circle, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import { usePermissions } from '@/auth/usePermissions';
import type { OnboardingStep, OnboardingStepKey } from '@/types';
import { FEATURE_SUPPORT_KEYS, isFeatureSupported } from '@/utils/featureSupport';
import TemplateLibrary from './TemplateLibrary';
import {
  useDismissOnboardingReminder,
  useOnboardingState,
  useResetOnboardingState,
  useStepActionLabel,
} from '../hooks';

const StepperItem = ({
  step,
  index,
  active,
  onSelect,
}: {
  step: OnboardingStep;
  index: number;
  active: boolean;
  onSelect: (key: OnboardingStepKey) => void;
}) => (
  <li>
    <button
      type="button"
      onClick={() => onSelect(step.key)}
      className={clsx(
        'group flex w-full items-start gap-3 rounded-2xl border border-white/10 px-3 py-2 text-left transition',
        active ? 'bg-white/10 text-white' : 'bg-transparent text-white/80 hover:bg-white/5',
      )}
    >
      {step.completed ? (
        <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-400" />
      ) : (
        <Circle className="mt-1 h-5 w-5 text-white/50" />
      )}
      <div className="flex-1">
        <p className="text-xs uppercase tracking-widest text-white/60">Step {index + 1}</p>
        <p className="text-sm font-semibold text-white">{step.title}</p>
        <p className="text-xs text-white/60">{step.description}</p>
      </div>
    </button>
  </li>
);

const StepContent = ({ step }: { step: OnboardingStep }) => {
  const actionLabel = useStepActionLabel(step.key);
  const href = step.href.startsWith('/') ? step.href : `/${step.href}`;
  if (step.key === 'pmTemplates') {
    return (
      <div className="mt-4">
        <p className="text-sm text-white/70">
          Pick a template to clone into your tenant. You can update assignments and intervals later.
        </p>
        <TemplateLibrary />
        <Link
          to={href}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm text-white/90 transition hover:bg-white/10"
        >
          Manage templates
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-white/70">{step.description}</p>
      <Link
        to={href}
        className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm text-white/90 transition hover:bg-white/10"
      >
        {actionLabel}
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
};

export const OnboardingWizard = () => {
  const { can } = usePermissions();
  const canViewOnboarding = can('sites', 'read');
  const canManageOnboarding = can('sites', 'manage');
  const [onboardingSupported, setOnboardingSupported] = useState(() =>
    isFeatureSupported(FEATURE_SUPPORT_KEYS.onboarding),
  );
  const { data, isLoading, isError, refetch } = useOnboardingState({
    enabled: canViewOnboarding && onboardingSupported,
  });
  const dismissReminder = useDismissOnboardingReminder();
  const resetOnboarding = useResetOnboardingState();
  const [activeKey, setActiveKey] = useState<OnboardingStepKey | null>(null);

  useEffect(() => {
    if (onboardingSupported) {
      const supported = isFeatureSupported(FEATURE_SUPPORT_KEYS.onboarding);
      if (!supported) {
        setOnboardingSupported(false);
      }
    }
  }, [onboardingSupported, data, isError]);

  if (!canViewOnboarding || !onboardingSupported) {
    return null;
  }

  const steps = data?.steps ?? [];
  const remaining = steps.filter((step) => !step.completed).length;
  const hasSteps = steps.length > 0;
  const allComplete = hasSteps && steps.every((step) => step.completed);
  const showWizard = hasSteps && !allComplete;
  const completionPct = steps.length ? Math.round(((steps.length - remaining) / steps.length) * 100) : 0;
  const nextStep = steps.find((step) => !step.completed) ?? steps[0];
  const nextStepHref = nextStep?.href?.startsWith('/') ? nextStep.href : nextStep?.href ? `/${nextStep.href}` : null;

  useEffect(() => {
    if (!steps.length) {
      setActiveKey(null);
      return;
    }
    const preferred = steps.find((step) => !step.completed)?.key ?? steps[steps.length - 1]?.key ?? null;
    setActiveKey((prev) => {
      if (prev && steps.some((step) => step.key === prev)) {
        return prev;
      }
      return preferred;
    });
  }, [steps]);

  const activeStep = useMemo(() => steps.find((step) => step.key === activeKey) ?? steps[0], [activeKey, steps]);

  if (isLoading) {
    return (
      <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 text-white">
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Loader2 className="h-4 w-4 animate-spin" /> Preparing onboarding checklist…
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-red-100">
        <div className="flex items-center justify-between">
          <p>Unable to load onboarding status.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-full border border-white/30 px-4 py-2 text-sm text-white"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (!hasSteps) {
    return (
      <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-start gap-4">
          <AlertCircle className="h-6 w-6 text-amber-300" />
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-white/60">Workspace onboarding</p>
            <h2 className="text-xl font-semibold">Setup details unavailable</h2>
            <p className="mt-2 text-sm text-white/70">
              No onboarding checklist is configured for this tenant yet. Admins can continue setup using the Tenant
              Setup checklist below and by completing core settings like sites, roles, and team invitations.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to="/plants"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm text-white/90 transition hover:bg-white/10"
              >
                Add a site
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                to="/settings/roles"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm text-white/90 transition hover:bg-white/10"
              >
                Review roles
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                to="/teams"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm text-white/90 transition hover:bg-white/10"
              >
                Invite users
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!showWizard || !activeStep) {
    if (!allComplete) {
      return null;
    }

    return (
      <section className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-emerald-100/70">Workspace onboarding</p>
            <h2 className="text-xl font-semibold">All steps complete</h2>
            <p className="mt-2 text-sm text-emerald-50/70">
              You&apos;re ready to go. Revisit any step from the main navigation whenever you need.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {canManageOnboarding ? (
              <button
                type="button"
                onClick={handleResetOnboarding}
                className="text-xs text-emerald-100 underline-offset-4 hover:underline disabled:opacity-60"
                disabled={resetOnboarding.isLoading}
              >
                Reset checklist
              </button>
            ) : null}
            <CheckCircle2 className="h-8 w-8 text-emerald-300" />
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-emerald-400" style={{ width: '100%' }} />
        </div>
        <p className="mt-1 text-xs text-emerald-100/70">100% complete</p>
      </section>
    );
  }

  const handleDismissReminder = async () => {
    try {
      await dismissReminder.mutateAsync();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to snooze reminder';
      toast.error(message);
    }
  };

  const handleResetOnboarding = async () => {
    const confirmed = window.confirm('Reset onboarding progress for this tenant?');
    if (!confirmed) return;
    try {
      await resetOnboarding.mutateAsync();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reset onboarding';
      toast.error(message);
    }
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-xl">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-1/3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/60">Workspace onboarding</p>
              <h2 className="text-xl font-semibold">{remaining ? `${remaining} steps to go` : 'All done!'}</h2>
            </div>
            <div className="flex flex-col items-end gap-1">
              {data?.pendingReminder ? (
                <button
                  type="button"
                  onClick={handleDismissReminder}
                  disabled={dismissReminder.isLoading}
                  className="text-xs text-amber-200 underline-offset-4 hover:underline disabled:opacity-60"
                >
                  Remind me later
                </button>
              ) : null}
              {canManageOnboarding ? (
                <button
                  type="button"
                  onClick={handleResetOnboarding}
                  disabled={resetOnboarding.isLoading}
                  className="text-xs text-white/70 underline-offset-4 hover:underline disabled:opacity-60"
                >
                  Reset checklist
                </button>
              ) : null}
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-white/60">{completionPct}% complete</p>
          <p className="mt-2 text-sm text-white/70">
            {data?.reminderMessage ?? 'Complete these guided steps to unlock the full workspace.'}
          </p>
          {nextStepHref ? (
            <Link
              to={nextStepHref}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/60 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100 transition hover:bg-emerald-500/20"
            >
              Continue onboarding
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : null}
          <ol className="mt-4 space-y-3">
            {steps.map((step, index) => (
              <StepperItem key={step.key} step={step} index={index} active={activeStep.key === step.key} onSelect={setActiveKey} />
            ))}
          </ol>
        </div>
        <div className="flex-1 rounded-2xl border border-white/10 bg-slate-950/40 p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/60">
            {stepIcon(activeStep.completed)}
            {activeStep.completed ? 'Completed' : 'In progress'}
          </div>
          <h3 className="mt-2 text-lg font-semibold">{activeStep.title}</h3>
          <p className="text-sm text-white/70">{activeStep.description}</p>
          <StepContent step={activeStep} />
        </div>
      </div>
    </section>
  );
};

const stepIcon = (completed: boolean) =>
  completed ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-amber-300" />;
