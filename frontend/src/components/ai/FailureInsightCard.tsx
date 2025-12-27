/*
 * SPDX-License-Identifier: MIT
 */

import ProgressBar from '@/components/common/ProgressBar';
import type { FailurePredictionInsight } from '@/types/ai';

interface Props {
  title?: string;
  insight?: FailurePredictionInsight | null;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
}

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const FailureInsightCard = ({ title = 'AI insights', insight, loading, error, onRetry }: Props) => {
  const hasError = Boolean(error);

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</p>
          <p className="text-xs text-neutral-500">Predictive stub using recent downtime and meter data.</p>
        </div>
        {onRetry && (
          <button
            type="button"
            className="text-xs font-medium text-primary-600 hover:text-primary-700"
            onClick={onRetry}
            disabled={loading}
          >
            Refresh
          </button>
        )}
      </div>
      {loading && <p className="mt-3 text-sm text-neutral-500">Loading AI insights…</p>}
      {hasError && !loading && (
        <p className="mt-3 text-sm text-error-600">Unable to load AI insights. Try again later.</p>
      )}
      {!loading && !hasError && insight && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-300">
                <span>Failure probability (30d)</span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {formatPercent(insight.failureProbability)}
                </span>
              </div>
              <ProgressBar
                value={insight.failureProbability * 100}
                max={100}
                barClassName="bg-amber-500"
                className="mt-1 h-2"
              />
              <p className="mt-1 text-xs text-neutral-500">Confidence {formatPercent(insight.confidence)}</p>
            </div>
          </div>

          <div className="rounded-md bg-neutral-50 p-3 text-sm text-neutral-700 dark:bg-slate-800 dark:text-neutral-200">
            <p className="font-semibold">Likely root cause</p>
            <p className="mt-1 whitespace-pre-line">{insight.rootCauseSummary}</p>
          </div>

          {insight.signals?.length ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Signals</p>
              <ul className="space-y-1 text-sm text-neutral-700 dark:text-neutral-200">
                {insight.signals.map((signal, index) => (
                  <li
                    key={`${signal.label}-${index.toString()}`}
                    className="flex items-start justify-between gap-3 rounded-md border border-neutral-100 px-3 py-2 dark:border-slate-800"
                  >
                    <div>
                      <p className="font-medium">{signal.label}</p>
                      <p className="text-xs text-neutral-500">{signal.detail}</p>
                    </div>
                    <span className="text-xs font-semibold text-amber-600">
                      {formatPercent(signal.impact)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {insight.recommendedActions?.length ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Recommended actions</p>
              <ul className="list-disc pl-5 text-sm text-neutral-700 dark:text-neutral-200">
                {insight.recommendedActions.map((item) => (
                  <li key={item} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {(insight.recommendedParts?.length || insight.recommendedTools?.length) && (
            <div className="grid gap-3 md:grid-cols-2">
              {insight.recommendedParts?.length ? (
                <div className="rounded-md border border-neutral-100 p-3 dark:border-slate-800">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Parts</p>
                  <ul className="mt-1 space-y-1 text-sm text-neutral-700 dark:text-neutral-200">
                    {insight.recommendedParts.map((part, index) => (
                      <li key={`${part.name}-${index.toString()}`}>
                        <span className="font-medium">{part.name}</span>
                        {part.quantity ? ` · ${part.quantity}x` : ''}
                        {part.reason ? <span className="block text-xs text-neutral-500">{part.reason}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {insight.recommendedTools?.length ? (
                <div className="rounded-md border border-neutral-100 p-3 dark:border-slate-800">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Tools</p>
                  <ul className="mt-1 flex flex-wrap gap-2 text-xs text-neutral-700 dark:text-neutral-200">
                    {insight.recommendedTools.map((tool) => (
                      <li key={tool} className="rounded-full bg-neutral-100 px-3 py-1 dark:bg-slate-800">
                        {tool}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}

          {insight.pmTemplateDraft && (
            <div className="rounded-md border border-dashed border-primary-200 bg-primary-50/70 p-3 text-sm text-neutral-900 dark:border-primary-800 dark:bg-primary-900/20 dark:text-neutral-100">
              <p className="font-semibold">Suggested PM draft</p>
              <p className="text-xs text-neutral-700 dark:text-neutral-200">
                {insight.pmTemplateDraft.title} · every {insight.pmTemplateDraft.intervalDays} days
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {insight.pmTemplateDraft.checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default FailureInsightCard;
