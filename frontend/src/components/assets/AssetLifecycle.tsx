/*
 * SPDX-License-Identifier: MIT
 */

import type { AssetDetailResponse } from '@/api/assets';

const formatDate = (value?: string | Date): string => {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatCurrency = (value?: number): string =>
  typeof value === 'number' ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value) : '—';

const toDate = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

const monthDiff = (start: Date, end: Date): number => {
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return end.getDate() >= start.getDate() ? months : months - 1;
};

export type WarrantyStatus =
  | { status: 'none' }
  | {
      status: 'active' | 'expiring' | 'expired';
      endDate: Date;
      startDate?: Date;
      daysRemaining?: number;
    };

export const evaluateWarrantyStatus = (
  asset?: AssetDetailResponse['asset'],
): WarrantyStatus => {
  if (!asset) return { status: 'none' };
  const warrantyEnd = toDate(asset.warrantyEnd ?? asset.warrantyExpiry);
  const warrantyStart = toDate(asset.warrantyStart);
  if (!warrantyEnd) return { status: 'none' };

  const today = new Date();
  const daysRemaining = Math.ceil((warrantyEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return { status: 'expired', endDate: warrantyEnd, startDate: warrantyStart, daysRemaining };
  }

  if (daysRemaining <= 60) {
    return { status: 'expiring', endDate: warrantyEnd, startDate: warrantyStart, daysRemaining };
  }

  return { status: 'active', endDate: warrantyEnd, startDate: warrantyStart, daysRemaining };
};

interface AssetLifecycleProps {
  asset: AssetDetailResponse['asset'];
}

const MetricCard = ({ title, value, helper }: { title: string; value: string; helper?: string }) => (
  <div className="rounded-2xl border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_70%,transparent)] p-4">
    <p className="text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">{title}</p>
    <p className="mt-1 text-xl font-semibold text-[var(--wp-color-text)]">{value}</p>
    {helper && <p className="text-sm text-[var(--wp-color-text-muted)]">{helper}</p>}
  </div>
);

const StatusBadge = ({ tone, children }: { tone: 'green' | 'amber' | 'red'; children: string }) => {
  const toneClasses: Record<'green' | 'amber' | 'red', string> = {
    green: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30',
    amber: 'bg-amber-500/10 text-amber-200 border-amber-500/30',
    red: 'bg-rose-500/10 text-rose-200 border-rose-500/30',
  };
  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}>{children}</span>;
};

const AssetLifecycle = ({ asset }: AssetLifecycleProps) => {
  const purchaseDate = toDate(asset.purchaseDate);
  const expectedLifeMonths = asset.expectedLifeMonths;
  const explicitReplacementDate = toDate(asset.replacementDate);
  const projectedReplacementDate =
    explicitReplacementDate ?? (purchaseDate && expectedLifeMonths ? addMonths(purchaseDate, expectedLifeMonths) : undefined);

  const monthsRemaining = projectedReplacementDate ? Math.max(0, monthDiff(new Date(), projectedReplacementDate)) : undefined;
  const depreciation = asset.purchaseCost && expectedLifeMonths ? asset.purchaseCost / expectedLifeMonths : undefined;
  const reservePerMonth = asset.purchaseCost && monthsRemaining ? asset.purchaseCost / Math.max(monthsRemaining, 1) : undefined;

  const warrantyStatus = evaluateWarrantyStatus(asset);

  const tone =
    warrantyStatus.status === 'expired' ? 'red' : warrantyStatus.status === 'expiring' ? 'amber' : warrantyStatus.status === 'active' ? 'green' : null;
  const warrantyHelper =
    warrantyStatus.status === 'none'
      ? 'Add warranty details to stay ahead of expiration notices.'
      : warrantyStatus.status === 'expired'
        ? 'Warranty coverage has ended. Consider scheduling a post-warranty inspection.'
        : warrantyStatus.daysRemaining !== undefined
          ? `${warrantyStatus.daysRemaining} day${Math.abs(warrantyStatus.daysRemaining) === 1 ? '' : 's'} remaining`
          : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_82%,transparent)] p-4">
        <div className="flex items-center gap-3">
          {tone && <StatusBadge tone={tone}>{warrantyStatus.status === 'active' ? 'Warranty active' : `Warranty ${warrantyStatus.status}`}</StatusBadge>}
          <div>
            <p className="text-sm font-semibold text-[var(--wp-color-text)]">Warranty coverage</p>
            <p className="text-sm text-[var(--wp-color-text-muted)]">
              {warrantyStatus.status === 'none'
                ? 'No warranty dates recorded'
                : `${formatDate(warrantyStatus.startDate)} – ${formatDate(warrantyStatus.endDate)}`}
            </p>
            {warrantyHelper && <p className="text-xs text-[var(--wp-color-text-muted)]">{warrantyHelper}</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Purchase cost" value={formatCurrency(asset.purchaseCost)} helper="Capitalized value of the asset" />
        <MetricCard
          title="Expected life"
          value={expectedLifeMonths ? `${expectedLifeMonths} months` : '—'}
          helper={purchaseDate ? `In service since ${formatDate(purchaseDate)}` : undefined}
        />
        <MetricCard
          title="Projected replacement"
          value={formatDate(projectedReplacementDate)}
          helper={monthsRemaining !== undefined ? `${monthsRemaining} months remaining` : 'Add lifecycle data to project timing'}
        />
        <MetricCard
          title="Monthly depreciation"
          value={formatCurrency(depreciation)}
          helper={reservePerMonth ? `Reserve ~${formatCurrency(reservePerMonth)} per month` : 'Set cost + lifespan to forecast budget'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_70%,transparent)] p-4">
          <h3 className="text-sm font-semibold text-[var(--wp-color-text)]">Replacement planning</h3>
          <ul className="mt-3 space-y-2 text-sm text-[var(--wp-color-text-muted)]">
            <li className="flex justify-between rounded-lg bg-[color-mix(in_srgb,var(--wp-color-surface)_65%,transparent)] px-3 py-2">
              <span>Replacement target</span>
              <span className="font-semibold text-[var(--wp-color-text)]">{formatDate(projectedReplacementDate)}</span>
            </li>
            <li className="flex justify-between rounded-lg bg-[color-mix(in_srgb,var(--wp-color-surface)_65%,transparent)] px-3 py-2">
              <span>Months to plan</span>
              <span className="font-semibold text-[var(--wp-color-text)]">{monthsRemaining !== undefined ? `${monthsRemaining} mo` : '—'}</span>
            </li>
            <li className="flex justify-between rounded-lg bg-[color-mix(in_srgb,var(--wp-color-surface)_65%,transparent)] px-3 py-2">
              <span>Budget to allocate</span>
              <span className="font-semibold text-[var(--wp-color-text)]">{formatCurrency(reservePerMonth)}</span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_70%,transparent)] p-4">
          <h3 className="text-sm font-semibold text-[var(--wp-color-text)]">Lifecycle notes</h3>
          <ul className="mt-3 space-y-2 text-sm text-[var(--wp-color-text-muted)]">
            <li className="rounded-lg bg-[color-mix(in_srgb,var(--wp-color-surface)_65%,transparent)] px-3 py-2">
              Keep warranty documentation linked to this asset to streamline claims.
            </li>
            <li className="rounded-lg bg-[color-mix(in_srgb,var(--wp-color-surface)_65%,transparent)] px-3 py-2">
              Schedule a condition assessment 90 days before the projected replacement date.
            </li>
            <li className="rounded-lg bg-[color-mix(in_srgb,var(--wp-color-surface)_65%,transparent)] px-3 py-2">
              Use the reserve amount to inform yearly budgeting and procurement planning.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AssetLifecycle;

