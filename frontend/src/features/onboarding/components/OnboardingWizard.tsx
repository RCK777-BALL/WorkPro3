/* eslint-disable react-hooks/exhaustive-deps */
/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronRight, Circle, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import type { OnboardingStep, OnboardingStepKey } from '@/types';
import TemplateLibrary from './TemplateLibrary';
import {
  useDismissOnboardingReminder,
  useOnboardingState,
  useRestartOnboarding,
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

  if (step.key === 'users') {
    return (
      <div className="mt-4 space-y-4">
        <p className="text-sm text-white/70">
          Add your first technician, supervisor, or planner profile so work can be assigned and tracked.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/teams?create=1"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/20"
          >
            Create team member profile
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            to={href}
            className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm text-white/90 transition hover:bg-white/10"
          >
            {actionLabel}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
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
  const { data, isLoading, isError, refetch } = useOnboardingState();
  const dismissReminder = useDismissOnboardingReminder();
  const restartOnboarding = useRestartOnboarding();
  const [activeKey, setActiveKey] = useState<OnboardingStepKey | null>(null);

  const steps = data?.steps ?? [];
  const remaining = steps.filter((step) => !step.completed).length;
  const showWizard = steps.some((step) => !step.completed);
  const completionPct = steps.length ? Math.round(((steps.length - remaining) / steps.length) * 100) : 0;

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
        <div className="flex items-center justify-between gap-2">
          <p>Unable to load onboarding status.</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => restartOnboarding.mutate()}
              disabled={restartOnboarding.isPending}
              className="rounded-full border border-white/30 px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              Restart onboarding
            </button>
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-full border border-white/30 px-4 py-2 text-sm text-white"
            >
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!showWizard || !activeStep) {
    return null;
  }

  const handleDismissReminder = async () => {
    try {
      await dismissReminder.mutateAsync();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to snooze reminder';
      toast.error(message);
    }
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-linear-to-br from-slate-900 to-slate-800 p-6 text-white shadow-xl">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-1/3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/60">Workspace onboarding</p>
              <h2 className="text-xl font-semibold">{remaining ? `${remaining} steps to go` : 'All done!'}</h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => restartOnboarding.mutate()}
                disabled={restartOnboarding.isPending}
                className="rounded-full border border-white/30 px-3 py-1.5 text-xs text-white/90 transition hover:bg-white/10 disabled:opacity-60"
              >
                Restart onboarding
              </button>
              {data?.pendingReminder ? (
                <button
                  type="button"
                  onClick={handleDismissReminder}
                  disabled={dismissReminder.isPending}
                  className="text-xs text-amber-200 underline-offset-4 hover:underline disabled:opacity-60"
                >
                  Remind me later
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


