/*
 * SPDX-License-Identifier: MIT
 */

import type { AssetPmTemplate } from '@/api/assets';

export type AssetPmTemplateCardsProps = {
  templates?: AssetPmTemplate[];
  isLoading?: boolean;
};

const formatDue = (value?: string) => (value ? new Date(value).toLocaleDateString() : 'Not scheduled');

const AssetPmTemplateCards = ({ templates, isLoading }: AssetPmTemplateCardsProps) => {
  if (isLoading) {
    return <p className="text-sm text-[var(--wp-color-text-muted)]">Loading PM templates...</p>;
  }

  if (!templates?.length) {
    return <p className="text-sm text-[var(--wp-color-text-muted)]">No PM templates assigned to this asset.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {templates.map((template) => (
        <article key={template.assignmentId} className="rounded-2xl border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_70%,transparent)] p-4">
          <header className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--wp-color-text)]">{template.title}</h3>
            <span className={`text-xs font-semibold ${template.active ? 'text-emerald-500' : 'text-[var(--wp-color-text-muted)]'}`}>
              {template.active ? 'Active' : 'Paused'}
            </span>
          </header>
          <dl className="mt-3 space-y-1 text-sm text-[var(--wp-color-text-muted)]">
            <div className="flex justify-between">
              <dt className="text-[var(--wp-color-text-muted)]">Interval</dt>
              <dd>{template.interval}</dd>
            </div>
            {template.usageMetric && (
              <div className="flex justify-between">
                <dt className="text-[var(--wp-color-text-muted)]">Usage trigger</dt>
                <dd>
                  {template.usageTarget ?? 'n/a'} {template.usageMetric}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-[var(--wp-color-text-muted)]">Next due</dt>
              <dd>{formatDue(template.nextDue)}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
};

export default AssetPmTemplateCards;

