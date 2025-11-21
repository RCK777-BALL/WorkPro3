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

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'history', label: 'History' },
  { id: 'documents', label: 'Documents' },
  { id: 'bom', label: 'BOM Parts' },
  { id: 'pm', label: 'PM Templates' },
  { id: 'work', label: 'Open Work Orders' },
  { id: 'costs', label: 'Cost Rollups' },
] as const;

type TabId = (typeof tabs)[number]['id'];

const formatField = (value?: string) => value ?? '—';

const AssetDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useAssetDetailsQuery(id);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const assetName = data?.asset.name ?? 'Asset details';

  const overviewContent = useMemo(() => {
    if (!data) {
      return null;
    }
    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-neutral-800 bg-gradient-to-br from-neutral-950 to-neutral-900/70 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-indigo-300">Asset</p>
              <h1 className="text-3xl font-bold text-white">{data.asset.name}</h1>
              {data.asset.description && <p className="mt-2 text-sm text-neutral-300">{data.asset.description}</p>}
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm text-neutral-300">
              <div>
                <dt className="text-xs uppercase text-neutral-500">Status</dt>
                <dd className="text-lg font-semibold text-indigo-200">{formatField(data.asset.status)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-neutral-500">Criticality</dt>
                <dd className="text-lg font-semibold text-neutral-100">{formatField(data.asset.criticality)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-neutral-500">Type</dt>
                <dd>{formatField(data.asset.type)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-neutral-500">Location</dt>
                <dd>{formatField(data.asset.location)}</dd>
              </div>
            </dl>
          </div>
          <dl className="mt-6 grid gap-4 text-sm text-neutral-300 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs uppercase text-neutral-500">Serial number</dt>
              <dd>{formatField(data.asset.serialNumber)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-neutral-500">Manufacturer</dt>
              <dd>{formatField(data.asset.manufacturer)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-neutral-500">Model</dt>
              <dd>{formatField(data.asset.modelName)}</dd>
            </div>
          </dl>
        </section>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
            <header className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Recent history</h2>
            </header>
            <AssetHistoryTimeline entries={data.history.slice(0, 6)} isLoading={isLoading} />
          </section>
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
            <header className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Open work orders</h2>
            </header>
            <AssetWorkOrderList workOrders={data.openWorkOrders.slice(0, 4)} isLoading={isLoading} />
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
      default:
        return overviewContent ?? <p className="text-sm text-neutral-500">Select an asset to view details.</p>;
    }
  };

  if (!id) {
    return (
      <div className="p-6">
        <p className="text-sm text-neutral-500">Provide an asset id to view details.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-indigo-300">Asset insights</p>
        <h1 className="text-3xl font-bold text-white">{assetName}</h1>
        {!!error && (
          <p className="text-sm text-rose-300">
            {error instanceof Error ? error.message : 'Unable to load asset details.'}
          </p>
        )}
      </header>
      <nav className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={clsx(
              'rounded-full px-4 py-2 text-sm font-semibold transition',
              activeTab === tab.id
                ? 'bg-indigo-500/90 text-white shadow'
                : 'bg-neutral-900/60 text-neutral-300 hover:text-white',
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <section className="rounded-3xl border border-neutral-900/80 bg-neutral-950/60 p-6">
        {renderTabContent()}
      </section>
    </div>
  );
};

export default AssetDetails;
