/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useParams } from 'react-router-dom';

import { useAssetDetailsQuery } from '@/api/assets';
import AssetBomTable from '@/components/assets/AssetBomTable';
import AssetCostRollupChart from '@/components/assets/AssetCostRollupChart';
import AssetDocumentsList from '@/components/assets/AssetDocumentsList';
import AssetHistoryTimeline from '@/components/assets/AssetHistoryTimeline';
import AssetPmTemplateCards from '@/components/assets/AssetPmTemplateCards';
import AssetWorkOrderList from '@/components/assets/AssetWorkOrderList';
import DowntimeHistory from '@/components/assets/DowntimeHistory';
import CommentThread from '@/components/comments/CommentThread';
import AssetLifecycle, { evaluateWarrantyStatus } from '@/components/assets/AssetLifecycle';
import AssetMetersPanel from '@/components/assets/AssetMetersPanel';
import { QrLabel } from '@/components/qr';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'history', label: 'History' },
  { id: 'documents', label: 'Documents' },
  { id: 'bom', label: 'BOM Parts' },
  { id: 'pm', label: 'PM Templates' },
  { id: 'work', label: 'Open Work Orders' },
  { id: 'costs', label: 'Cost Rollups' },
  { id: 'lifecycle', label: 'Lifecycle' },
  { id: 'meters', label: 'Meters' },
  { id: 'comments', label: 'Comments' },
] as const;

type TabId = (typeof tabs)[number]['id'];

const formatField = (value?: string) => value ?? '—';

const AssetDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useAssetDetailsQuery(id);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const warrantyStatus = evaluateWarrantyStatus(data?.asset);

  const assetName = data?.asset.name ?? 'Asset details';
  const qrValue = useMemo(() => {
    if (!data?.asset?.id) return null;
    return data.asset.qrCode ?? JSON.stringify({ type: 'asset', id: data.asset.id });
  }, [data?.asset]);

  const overviewContent = useMemo(() => {
    if (!data) {
      return null;
    }
    const downtimeMinutes = data.downtimeLogs?.reduce((sum, log) => sum + (log.durationMinutes ?? 0), 0) ?? 0;
    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-[var(--wp-color-border)] bg-gradient-to-br from-neutral-950 to-neutral-900/70 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--wp-color-primary)]">Asset</p>
              <h1 className="text-3xl font-bold text-[var(--wp-color-text)]">{data.asset.name}</h1>
              {data.asset.description && <p className="mt-2 text-sm text-[var(--wp-color-text-muted)]">{data.asset.description}</p>}
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm text-[var(--wp-color-text-muted)]">
              <div>
                <dt className="text-xs uppercase text-[var(--wp-color-text-muted)]">Status</dt>
                <dd className="text-lg font-semibold text-[var(--wp-color-primary)]">{formatField(data.asset.status)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-[var(--wp-color-text-muted)]">Criticality</dt>
                <dd className="text-lg font-semibold text-[var(--wp-color-text)]">{formatField(data.asset.criticality)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-[var(--wp-color-text-muted)]">Type</dt>
                <dd>{formatField(data.asset.type)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-[var(--wp-color-text-muted)]">Location</dt>
                <dd>{formatField(data.asset.location)}</dd>
              </div>
            </dl>
          </div>
          <dl className="mt-6 grid gap-4 text-sm text-[var(--wp-color-text-muted)] md:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs uppercase text-[var(--wp-color-text-muted)]">Serial number</dt>
              <dd>{formatField(data.asset.serialNumber)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-[var(--wp-color-text-muted)]">Manufacturer</dt>
              <dd>{formatField(data.asset.manufacturer)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-[var(--wp-color-text-muted)]">Model</dt>
              <dd>{formatField(data.asset.modelName)}</dd>
            </div>
          </dl>
        </section>
        {data.reliability ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_70%,transparent)] p-4">
              <p className="text-xs uppercase text-[var(--wp-color-text-muted)]">MTBF</p>
              <p className="text-2xl font-semibold text-[var(--wp-color-text)]">
                {data.reliability.mtbfHours.toFixed(2)} <span className="text-sm text-[var(--wp-color-text-muted)]">hours</span>
              </p>
              <p className="text-xs text-[var(--wp-color-text-muted)]">Mean time between failures</p>
            </div>
            <div className="rounded-2xl border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_70%,transparent)] p-4">
              <p className="text-xs uppercase text-[var(--wp-color-text-muted)]">MTTR</p>
              <p className="text-2xl font-semibold text-[var(--wp-color-text)]">
                {data.reliability.mttrHours.toFixed(2)} <span className="text-sm text-[var(--wp-color-text-muted)]">hours</span>
              </p>
              <p className="text-xs text-[var(--wp-color-text-muted)]">Mean time to repair</p>
            </div>
            <div className="rounded-2xl border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_70%,transparent)] p-4">
              <p className="text-xs uppercase text-[var(--wp-color-text-muted)]">Recorded downtime</p>
              <p className="text-2xl font-semibold text-[var(--wp-color-text)]">
                {(downtimeMinutes / 60).toFixed(1)} <span className="text-sm text-[var(--wp-color-text-muted)]">hours</span>
              </p>
              <p className="text-xs text-[var(--wp-color-text-muted)]">{data.downtimeLogs.length} events logged</p>
            </div>
          </div>
        ) : null}
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_65%,transparent)] p-4">
            <header className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--wp-color-text)]">Recent history</h2>
            </header>
            <AssetHistoryTimeline entries={data.history.slice(0, 6)} isLoading={isLoading} />
          </section>
          <section className="rounded-2xl border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_65%,transparent)] p-4">
            <header className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--wp-color-text)]">Open work orders</h2>
            </header>
            <AssetWorkOrderList workOrders={data.openWorkOrders.slice(0, 4)} isLoading={isLoading} />
          </section>
          <section className="rounded-2xl border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_65%,transparent)] p-4">
            <header className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--wp-color-text)]">Downtime</h2>
            </header>
            <DowntimeHistory logs={data.downtimeLogs} isLoading={isLoading} maxItems={5} />
          </section>
        </div>
      </div>
    );
  }, [data, isLoading]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'history':
        return <AssetHistoryTimeline entries={data?.history ?? []} isLoading={isLoading} />;
      case 'documents':
        return <AssetDocumentsList documents={data?.documents ?? []} isLoading={isLoading} />;
      case 'bom':
        return <AssetBomTable parts={data?.bom ?? []} isLoading={isLoading} />;
      case 'pm':
        return <AssetPmTemplateCards templates={data?.pmTemplates ?? []} isLoading={isLoading} />;
      case 'work':
        return <AssetWorkOrderList workOrders={data?.openWorkOrders ?? []} isLoading={isLoading} />;
      case 'costs':
        return (
          <AssetCostRollupChart
            isLoading={isLoading}
            {...(data?.costRollups ? { cost: data.costRollups } : {})}
          />
        );
      case 'meters':
        return id ? <AssetMetersPanel assetId={id} /> : null;
      case 'lifecycle':
        return data?.asset ? (
          <AssetLifecycle asset={data.asset} />
        ) : (
          <p className="text-sm text-[var(--wp-color-text-muted)]">Asset lifecycle data unavailable.</p>
        );
      case 'comments':
        return id ? (
          <CommentThread entityType="Asset" entityId={id} />
        ) : (
          <p className="text-sm text-[var(--wp-color-text-muted)]">Asset id required to load comments.</p>
        );
      default:
        return overviewContent ?? <p className="text-sm text-[var(--wp-color-text-muted)]">Select an asset to view details.</p>;
    }
  };

  if (!id) {
    return (
      <div className="p-6">
        <p className="text-sm text-[var(--wp-color-text-muted)]">Provide an asset id to view details.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-[var(--wp-color-primary)]">Asset insights</p>
        <h1 className="text-3xl font-bold text-[var(--wp-color-text)]">{assetName}</h1>
        {!!error && (
          <p className="text-sm text-rose-300">
            {error instanceof Error ? error.message : 'Unable to load asset details.'}
          </p>
        )}
        {warrantyStatus.status !== 'none' && (
          <div
            className={clsx(
              'mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold',
              warrantyStatus.status === 'expired' && 'border-rose-500/40 bg-rose-500/10 text-rose-200',
              warrantyStatus.status === 'expiring' && 'border-amber-500/40 bg-amber-500/10 text-amber-100',
              warrantyStatus.status === 'active' && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
            )}
          >
            {warrantyStatus.status === 'expired' && 'Warranty expired'}
            {warrantyStatus.status === 'expiring' && 'Warranty expiring soon'}
            {warrantyStatus.status === 'active' && 'Warranty active'}
            {warrantyStatus.daysRemaining !== undefined && (
              <span className="text-[11px] font-normal text-[var(--wp-color-text)]/70">
                {Math.abs(warrantyStatus.daysRemaining)} day{Math.abs(warrantyStatus.daysRemaining) === 1 ? '' : 's'} remaining
              </span>
            )}
          </div>
        )}
      </header>
      {qrValue && (
        <div className="flex justify-end">
          <div className="max-w-sm">
            <QrLabel
              name={assetName}
              subtitle={data?.asset.location ?? data?.asset.type ?? 'Asset label'}
              qrValue={qrValue}
            />
          </div>
        </div>
      )}
      <nav className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={clsx(
              'rounded-full px-4 py-2 text-sm font-semibold transition',
              activeTab === tab.id
                ? 'bg-indigo-500/90 text-[var(--wp-color-text)] shadow'
                : 'bg-[color-mix(in_srgb,var(--wp-color-surface)_70%,transparent)] text-[var(--wp-color-text-muted)] hover:text-[var(--wp-color-text)]',
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <section className="rounded-3xl border border-[var(--wp-color-border)]/80 bg-[color-mix(in_srgb,var(--wp-color-background)_70%,transparent)] p-6">
        {renderTabContent()}
      </section>
    </div>
  );
};

export default AssetDetails;

