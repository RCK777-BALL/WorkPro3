/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';

import type { AssetDetailResponse, HierarchyAsset, HierarchyResponse } from '@/api/hierarchy';
import { EntityAuditList } from '@/features/audit';
import AssetTemplateAssignments from './AssetTemplateAssignments';
import type { MeterType, TreeAssetSummary } from './hooks';
import { useAssetMeters, useCreateMeterReading } from './hooks';

type AssetDetailPanelProps = {
  assetSummary?: TreeAssetSummary;
  assetDetails?: AssetDetailResponse;
  hierarchy?: HierarchyResponse;
  onSelectAsset?(assetId: string): void;
  isLoading?: boolean;
};

const SectionCard = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
    <header className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-neutral-200">{title}</h3>
    </header>
    <div className="text-sm text-neutral-300">{children}</div>
  </section>
);

const EmptyState = ({ message }: { message: string }) => (
  <p className="text-sm text-neutral-500">{message}</p>
);

const formatCurrency = (value?: number, currency = 'USD') =>
  typeof value === 'number' ?
    new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value) :
    '-';

type RelationshipContext = {
  parentLabel?: string;
  parentName?: string;
  children: HierarchyAsset[];
};

const findRelationships = (assetId?: string, hierarchy?: HierarchyResponse): RelationshipContext => {
  if (!assetId || !hierarchy) {
    return { children: [] };
  }

  for (const department of hierarchy.departments) {
    const departmentAsset = department.assets.find((asset) => asset.id === assetId);
    if (departmentAsset) {
      return {
        parentLabel: 'Department',
        parentName: department.name,
        children: department.assets.filter((asset) => asset.id !== assetId),
      };
    }

    for (const line of department.lines) {
      const lineAsset = line.assets.find((asset) => asset.id === assetId);
      if (lineAsset) {
        return {
          parentLabel: 'Line',
          parentName: line.name,
          children: line.assets.filter((asset) => asset.id !== assetId),
        };
      }

      for (const station of line.stations) {
        const stationAsset = station.assets.find((asset) => asset.id === assetId);
        if (stationAsset) {
          return {
            parentLabel: 'Station',
            parentName: station.name,
            children: station.assets.filter((asset) => asset.id !== assetId),
          };
        }
      }
    }
  }

  return { children: [] };
};

const METER_OPTIONS: Record<
  MeterType,
  { label: string; helper: string; unit: 'hours' | 'cycles' }
> = {
  runtimeHours: {
    label: 'Runtime hours',
    helper: 'Track cumulative runtime hours to keep time-based maintenance schedules accurate.',
    unit: 'hours',
  },
  cycles: {
    label: 'Cycles',
    helper: 'Log completed cycles to align PM triggers with actual usage.',
    unit: 'cycles',
  },
};

const MeterEntryCard = ({ assetId }: { assetId?: string }) => {
  const [meterType, setMeterType] = useState<MeterType>('runtimeHours');
  const [value, setValue] = useState('');
  const [localError, setLocalError] = useState<string>();
  const { mutate, isPending, isSuccess, data, error, reset } = useCreateMeterReading();

  useEffect(() => {
    setLocalError(undefined);
    setValue('');
    reset();
  }, [assetId, reset]);

  useEffect(() => {
    if (isSuccess) {
      setValue('');
    }
  }, [isSuccess]);

  const helper = METER_OPTIONS[meterType];

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(undefined);

    if (!assetId) {
      setLocalError('Select an asset to record a meter reading.');
      return;
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      setLocalError('Enter a numeric meter value.');
      return;
    }
    if (numericValue < 0) {
      setLocalError('Meter values cannot be negative.');
      return;
    }

    mutate({ assetId, value: numericValue });
  };

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <div className="grid gap-3 sm:grid-cols-[1fr,200px]">
        <div>
          <label className="text-sm font-semibold text-neutral-200" htmlFor="meter-type">
            Meter type
          </label>
          <select
            id="meter-type"
            value={meterType}
            onChange={(event) => setMeterType(event.target.value as MeterType)}
            className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
          >
            {Object.entries(METER_OPTIONS).map(([key, option]) => (
              <option key={key} value={key}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-neutral-500">{helper.helper}</p>
        </div>
        <div>
          <label className="text-sm font-semibold text-neutral-200" htmlFor="meter-value">
            Reading
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              id="meter-value"
              type="number"
              min={0}
              step="0.1"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              placeholder={`Enter ${helper.unit}`}
              disabled={!assetId || isPending}
            />
            <span className="rounded-md bg-neutral-800/60 px-3 py-2 text-xs uppercase tracking-wide text-neutral-400">
              {helper.unit}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!assetId || isPending}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Record reading'}
        </button>
        <p className="text-xs text-neutral-500">
          These readings feed runtime and cycle-based maintenance triggers.
        </p>
      </div>

      {localError && <p className="text-xs text-rose-400">{localError}</p>}
      {error instanceof Error && <p className="text-xs text-rose-400">{error.message}</p>}
      {isSuccess && data && (
        <p className="text-xs text-emerald-400">
          Recorded {data.value} {helper.unit} on {new Date(data.createdAt).toLocaleString()}.
        </p>
      )}
      {!assetId && <p className="text-xs text-amber-400">Select an asset to enable meter entry.</p>}
    </form>
  );
};

const AssetDetailPanel = ({ assetSummary, assetDetails, hierarchy, isLoading, onSelectAsset }: AssetDetailPanelProps) => {
  if (!assetSummary && !assetDetails && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/40">
        <p className="text-sm text-neutral-400">Select an asset from the hierarchy to view its details.</p>
      </div>
    );
  }

  const asset = assetDetails?.asset ?? assetSummary?.asset;
  const hierarchyHints = {
    department: assetSummary?.departmentName,
    line: assetSummary?.lineName,
    station: assetSummary?.stationName,
  };

  const breadcrumbs = useMemo(
    () =>
      [
        hierarchyHints.department ? { label: 'Department', value: hierarchyHints.department } : null,
        hierarchyHints.line ? { label: 'Line', value: hierarchyHints.line } : null,
        hierarchyHints.station ? { label: 'Station', value: hierarchyHints.station } : null,
        asset ? { label: 'Asset', value: asset.name } : null,
      ].filter((item): item is { label: string; value: string } => Boolean(item)),
    [asset, hierarchyHints.department, hierarchyHints.line, hierarchyHints.station],
  );

  const relationships = useMemo(() => findRelationships(asset?.id, hierarchy), [asset?.id, hierarchy]);
  const { data: meters, isLoading: metersLoading } = useAssetMeters(asset?.id);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900/80 to-neutral-900/40 p-6">
        {asset ? (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-neutral-400">Asset</p>
              <h2 className="text-2xl font-bold text-white">{asset.name}</h2>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-neutral-300">
                {hierarchyHints.department && (
                  <span className="rounded-full bg-neutral-800/70 px-3 py-1">Department: {hierarchyHints.department}</span>
                )}
                {hierarchyHints.line && (
                  <span className="rounded-full bg-neutral-800/70 px-3 py-1">Line: {hierarchyHints.line}</span>
                )}
                {hierarchyHints.station && (
                  <span className="rounded-full bg-neutral-800/70 px-3 py-1">Station: {hierarchyHints.station}</span>
                )}
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              <div>
                <p className="text-xs uppercase text-neutral-500">Status</p>
                <p className="font-semibold text-indigo-300">{asset.status ?? 'Active'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-neutral-500">Criticality</p>
                <p className="font-semibold text-neutral-200">{asset.criticality ?? 'medium'}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-400">Loading asset details…</p>
        )}
      </section>

      <SectionCard title="Relationships & Links">
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase text-neutral-500">Breadcrumbs</p>
            {breadcrumbs.length ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {breadcrumbs.map((crumb, index) => (
                  <div key={`${crumb.label}-${crumb.value}`} className="flex items-center gap-2">
                    <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs text-neutral-200">
                      <span className="text-neutral-500">{crumb.label}:</span> {crumb.value}
                    </span>
                    {index < breadcrumbs.length - 1 && <span className="text-neutral-600">/</span>}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message={isLoading ? 'Loading breadcrumbs…' : 'No breadcrumbs available.'} />
            )}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
              <p className="text-xs uppercase text-neutral-500">Parent</p>
              <p className="text-sm font-semibold text-neutral-100">{relationships.parentName ?? 'Not placed in hierarchy'}</p>
              <p className="text-xs text-neutral-500">{relationships.parentLabel ?? 'No parent container detected.'}</p>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
              <p className="text-xs uppercase text-neutral-500">Children</p>
              {relationships.children.length ? (
                <ul className="mt-2 space-y-1">
                  {relationships.children.slice(0, 5).map((child) => (
                    <li
                      key={child.id}
                      className="flex items-center justify-between rounded-md bg-neutral-900/70 px-2 py-1 text-sm text-neutral-200"
                    >
                      <span>{child.name}</span>
                      {onSelectAsset && (
                        <button
                          type="button"
                          onClick={() => onSelectAsset(child.id)}
                          className="text-xs font-semibold text-indigo-300 hover:text-indigo-200"
                        >
                          View
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-neutral-500">No child assets recorded for this parent.</p>
              )}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
              <p className="text-xs uppercase text-neutral-500">Linked meters</p>
              {metersLoading ? (
                <p className="mt-2 text-sm text-neutral-500">Loading meters…</p>
              ) : meters?.length ? (
                <ul className="mt-2 space-y-1">
                  {meters.slice(0, 4).map((meter) => (
                    <li key={meter.id} className="flex items-center justify-between rounded-md bg-neutral-900/70 px-2 py-1 text-sm">
                      <span className="text-neutral-100">{meter.name}</span>
                      <span className="text-xs text-neutral-500">{meter.currentValue ?? 0} {meter.unit}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-neutral-500">No linked meters yet.</p>
              )}
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
              <p className="text-xs uppercase text-neutral-500">Documents</p>
              {assetDetails?.documents?.length ? (
                <ul className="mt-2 space-y-1">
                  {assetDetails.documents.slice(0, 4).map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between rounded-md bg-neutral-900/70 px-2 py-1 text-sm">
                      <span className="text-neutral-100">{doc.name ?? 'Untitled document'}</span>
                      <a
                        href={doc.url}
                        className="text-xs font-semibold text-indigo-300 hover:text-indigo-200"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-neutral-500">No documents linked to this asset.</p>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Usage meters">
        <MeterEntryCard assetId={asset?.id} />
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Work History">
          {assetDetails?.history?.length ? (
            <ul className="space-y-2">
              {assetDetails.history.slice(0, 6).map((item) => (
                <li key={item.id} className="rounded-lg border border-neutral-800/80 bg-neutral-900/50 px-3 py-2">
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>{new Date(item.date).toLocaleDateString()}</span>
                    <span className="uppercase text-neutral-400">{item.status}</span>
                  </div>
                  <p className="text-sm text-neutral-200">{item.title}</p>
                  {item.notes && <p className="text-xs text-neutral-400">{item.notes}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message={isLoading ? 'Loading history…' : 'No recent history'} />
          )}
        </SectionCard>

        <SectionCard title="Documents">
          {assetDetails?.documents?.length ? (
            <ul className="space-y-2">
              {assetDetails.documents.slice(0, 6).map((doc) => (
                <li key={doc.id} className="flex items-center justify-between rounded-lg bg-neutral-900/40 px-3 py-2 text-sm">
                  <div>
                    <p className="text-neutral-100">{doc.name ?? 'Untitled document'}</p>
                    <p className="text-xs text-neutral-500">{doc.type ?? 'document'}</p>
                  </div>
                  <a
                    href={doc.url}
                    className="text-xs font-semibold text-indigo-300 hover:text-indigo-200"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message={isLoading ? 'Loading documents…' : 'No documents linked'} />
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Parts">
          {assetDetails?.parts?.length ? (
            <ul className="space-y-2 text-sm">
              {assetDetails.parts.slice(0, 4).map((part) => (
                <li key={part.id} className="rounded-lg bg-neutral-900/40 px-3 py-2">
                  <p className="font-semibold text-neutral-100">{part.name}</p>
                  <p className="text-xs text-neutral-500">
                    Qty {part.quantity} • {part.location ?? 'Unknown location'}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message={isLoading ? 'Loading parts…' : 'No associated parts'} />
          )}
        </SectionCard>

        <SectionCard title="PM Templates">
          {assetDetails?.pmTemplates?.length ? (
            <ul className="space-y-2 text-sm">
              {assetDetails.pmTemplates.slice(0, 4).map((assignment) => (
                <li key={assignment.assignmentId} className="rounded-lg bg-neutral-900/40 px-3 py-2">
                  <p className="font-semibold text-neutral-100">{assignment.title}</p>
                  <p className="text-xs text-neutral-500">
                    Interval: {assignment.interval} •
                    {' '}
                    {assignment.nextDue ? `Next due ${new Date(assignment.nextDue).toLocaleDateString()}` : 'Next due scheduled'}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message={isLoading ? 'Loading templates…' : 'No PM templates assigned'} />
          )}
        </SectionCard>

        <SectionCard title="Work Orders">
          {assetDetails?.workOrders?.length ? (
            <ul className="space-y-2 text-sm">
              {assetDetails.workOrders.slice(0, 4).map((order) => (
                <li key={order.id} className="rounded-lg bg-neutral-900/40 px-3 py-2">
                  <p className="font-semibold text-neutral-100">{order.title}</p>
                  <p className="text-xs text-neutral-500">
                    {order.type} • {order.status} • {order.updatedAt ? new Date(order.updatedAt).toLocaleDateString() : 'No updates'}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message={isLoading ? 'Loading work orders…' : 'No work orders found'} />
          )}
        </SectionCard>
      </div>

      <SectionCard title="Cost Overview">
        {assetDetails?.cost ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs uppercase text-neutral-500">Total</p>
              <p className="text-xl font-semibold text-neutral-100">{formatCurrency(assetDetails.cost.total, assetDetails.cost.currency)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-neutral-500">Maintenance</p>
              <p className="text-lg text-neutral-200">{formatCurrency(assetDetails.cost.maintenance, assetDetails.cost.currency)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-neutral-500">Labor</p>
              <p className="text-lg text-neutral-200">{formatCurrency(assetDetails.cost.labor, assetDetails.cost.currency)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-neutral-500">Parts</p>
              <p className="text-lg text-neutral-200">{formatCurrency(assetDetails.cost.parts, assetDetails.cost.currency)}</p>
            </div>
            <p className="text-xs text-neutral-500 sm:col-span-2 lg:col-span-4">
              Reporting period: {assetDetails.cost.timeframe}
            </p>
          </div>
        ) : (
          <EmptyState message={isLoading ? 'Calculating costs…' : 'Cost data unavailable'} />
        )}
      </SectionCard>

      {assetDetails?.asset && (
        <SectionCard title="Assign Template">
          <AssetTemplateAssignments asset={assetDetails.asset} />
        </SectionCard>
      )}

      <EntityAuditList
        entityType="Asset"
        entityId={asset?.id ?? undefined}
        siteId={asset?.siteId ?? undefined}
        limit={12}
      />
    </div>
  );
};

export default AssetDetailPanel;

