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
    return <p className="text-sm text-neutral-400">Loading PM templates…</p>;
  }

  if (!templates?.length) {
    return <p className="text-sm text-neutral-500">No PM templates assigned to this asset.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {templates.map((template) => (
        <article key={template.assignmentId} className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
          <header className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">{template.title}</h3>
            <span className={`text-xs font-semibold ${template.active ? 'text-emerald-300' : 'text-neutral-500'}`}>
              {template.active ? 'Active' : 'Paused'}
            </span>
          </header>
          <dl className="mt-3 space-y-1 text-sm text-neutral-300">
            <div className="flex justify-between">
              <dt className="text-neutral-400">Interval</dt>
              <dd>{template.interval}</dd>
            </div>
            {template.usageMetric && (
              <div className="flex justify-between">
                <dt className="text-neutral-400">Usage trigger</dt>
                <dd>
                  {template.usageTarget ?? 'n/a'} {template.usageMetric}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-neutral-400">Next due</dt>
              <dd>{formatDue(template.nextDue)}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
};

export default AssetPmTemplateCards;
