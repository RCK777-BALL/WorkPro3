/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from 'react';
import Button from '@/components/common/Button';
import http from '@/lib/http';

export interface CopilotSuggestion {
  id: string;
  title: string;
  detail: string;
  confidence: number;
  failureModes: string[];
  sourceType: string;
}

interface CopilotContextSnippet {
  id: string;
  snippet: string;
  score: number;
  sourceType: string;
  workOrderId?: string;
  assetId?: string;
}

interface CopilotResult {
  summary: string;
  failureModes: string[];
  suggestions: CopilotSuggestion[];
  context: CopilotContextSnippet[];
  generatedAt: string;
}

interface Props {
  workOrderId?: string;
  assetId?: string;
  initialSummary?: string;
  initialTags?: string[];
  onApplySuggestion?: (suggestion: CopilotSuggestion) => Promise<void> | void;
}

const DEFAULT_PROMPT = 'What should I do next to close this work order?';

const CopilotPanel: React.FC<Props> = ({
  workOrderId,
  assetId,
  initialSummary,
  initialTags,
  onApplySuggestion,
}) => {
  const [query, setQuery] = useState(DEFAULT_PROMPT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CopilotResult | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const activeSummary = result?.summary || initialSummary || '';
  const activeTags = useMemo(() => {
    const tags = result?.failureModes && result.failureModes.length > 0
      ? result.failureModes
      : initialTags ?? [];
    const seen = new Set<string>();
    const deduped: string[] = [];
    tags.forEach((tag) => {
      const slug = tag.toLowerCase();
      if (!seen.has(slug)) {
        seen.add(slug);
        deduped.push(tag);
      }
    });
    return deduped;
  }, [initialTags, result?.failureModes]);

  const fetchAssist = async () => {
    if (!workOrderId && !assetId) {
      setError('Select a work order or asset to query copilot.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload: Record<string, string> = { query };
      if (workOrderId) payload.workOrderId = workOrderId;
      if (assetId) payload.assetId = assetId;
      const res = await http.post<CopilotResult>('/ai/copilot', payload);
      setResult(res.data);
    } catch (err) {
      console.error(err);
      setError('Unable to fetch suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (suggestion: CopilotSuggestion) => {
    if (!onApplySuggestion) {
      try {
        await navigator.clipboard.writeText(suggestion.detail);
      } catch {
        setError('Unable to copy suggestion to clipboard');
      }
      return;
    }
    setApplyingId(suggestion.id);
    try {
      await onApplySuggestion(suggestion);
    } catch (err) {
      console.error(err);
      setError('Unable to apply suggestion');
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className="border rounded-md p-4 space-y-4 bg-white dark:bg-slate-900">
      <div>
        <label htmlFor="copilot-query" className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Ask Copilot
        </label>
        <textarea
          id="copilot-query"
          className="mt-1 w-full rounded-md border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
          rows={2}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={DEFAULT_PROMPT}
        />
        <div className="mt-2 flex items-center gap-2">
          <Button onClick={fetchAssist} loading={loading} disabled={!workOrderId && !assetId}>
            Generate suggestions
          </Button>
          {result?.generatedAt && (
            <span className="text-xs text-neutral-500">
              Updated {new Date(result.generatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {error && <div className="text-error-600 text-sm">{error}</div>}

      {activeSummary && (
        <div>
          <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-100">Summary</div>
          <p className="text-sm text-neutral-700 dark:text-neutral-200 mt-1 whitespace-pre-line">{activeSummary}</p>
        </div>
      )}

      {activeTags.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-100 mb-2">Failure modes</div>
          <div className="flex flex-wrap gap-2">
            {activeTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-100"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {result?.suggestions?.length ? (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-100">Suggested actions</div>
          {result.suggestions.map((suggestion) => (
            <div key={suggestion.id} className="rounded-md border border-neutral-200 dark:border-slate-700 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">{suggestion.title}</p>
                  <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-line">
                    {suggestion.detail}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Source: {suggestion.sourceType} · Confidence {Math.round(suggestion.confidence * 100)}%
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleApply(suggestion)}
                  loading={applyingId === suggestion.id}
                >
                  {onApplySuggestion ? 'Apply' : 'Copy'}
                </Button>
              </div>
              {suggestion.failureModes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestion.failureModes.map((tag) => (
                    <span key={tag} className="text-[10px] uppercase tracking-wide bg-neutral-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {result?.context?.length ? (
        <details className="rounded-md border border-dashed border-neutral-300 dark:border-slate-700 p-3">
          <summary className="text-sm font-medium cursor-pointer">Retrieved context ({result.context.length})</summary>
          <div className="mt-3 space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
            {result.context.map((ctx) => (
              <div key={ctx.id} className="border-b border-neutral-100 dark:border-slate-800 pb-2 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>{ctx.sourceType}</span>
                  <span>score {ctx.score.toFixed(2)}</span>
                </div>
                <p className="mt-1 whitespace-pre-line">{ctx.snippet}</p>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
};

export default CopilotPanel;
