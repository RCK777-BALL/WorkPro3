/*
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo, useState } from 'react';
import { ChecklistWidget, NotesWidget } from '../../components/TaskControls';
import { QueuedSyncPanel } from '../../components/QueuedSyncPanel';
import ResponsiveMobileShell from '../../layouts/ResponsiveMobileShell';
import { MobileSyncProvider, useMobileSync, type OfflineAction } from '../../useMobileSync';

type Asset = {
  id: string;
  name: string;
  location: string;
  health: 'ok' | 'attention' | 'down';
};

const AssetActions: React.FC<{ asset: Asset }> = ({ asset }) => {
  const [health, setHealth] = useState<Asset['health']>(asset.health);
  const [tag, setTag] = useState('');
  const { enqueue, recordConflict } = useMobileSync();

  const enqueueUpdate = () => {
    const action: OfflineAction = {
      id: `${asset.id}-health-${health}`,
      entityType: 'Asset',
      entityId: asset.id,
      operation: 'update',
      payload: { health },
      version: Date.now(),
    };
    enqueue(action);
  };

  const enqueueTag = () => {
    if (!tag.trim()) return;
    const action: OfflineAction = {
      id: `${asset.id}-tag-${Date.now()}`,
      entityType: 'Asset',
      entityId: asset.id,
      operation: 'update-metadata',
      payload: { tag: tag.trim() },
      version: Date.now(),
    };
    enqueue(action);
    setTag('');
  };

  const simulateConflict = () => {
    const conflict: OfflineAction = {
      id: `${asset.id}-conflict`,
      entityType: 'Asset',
      entityId: asset.id,
      operation: 'update',
      payload: { health: 'ok' },
      version: Date.now(),
    };
    recordConflict(conflict);
  };

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 p-3">
      <p className="text-sm font-semibold text-neutral-900">Offline updates</p>
      <div className="space-y-1 text-sm text-neutral-800">
        <label className="text-xs text-neutral-600">Health state</label>
        <select
          className="w-full rounded border border-neutral-200 p-2 text-sm"
          value={health}
          onChange={(event) => setHealth(event.target.value as Asset['health'])}
        >
          <option value="ok">OK</option>
          <option value="attention">Needs attention</option>
          <option value="down">Out of service</option>
        </select>
      </div>
      <button className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white" onClick={enqueueUpdate}>
        Queue status update
      </button>

      <div className="space-y-1 text-sm text-neutral-800">
        <label className="text-xs text-neutral-600">Tags</label>
        <input
          className="w-full rounded border border-neutral-200 p-2 text-sm"
          value={tag}
          placeholder="Add tag"
          onChange={(event) => setTag(event.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <button className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white" onClick={enqueueTag}>
          Queue tag
        </button>
        <button className="rounded border border-rose-300 bg-white px-3 py-1.5 text-sm font-semibold text-rose-700" onClick={simulateConflict}>
          Simulate conflict
        </button>
      </div>
    </div>
  );
};

const MobileAssetDetailPageContent: React.FC = () => {
  const asset: Asset = {
    id: 'asset-mobile-1',
    name: 'Pump 1001',
    location: 'North wing',
    health: 'attention',
  };
  const nav = [
    { id: 'overview', label: 'Overview', onSelect: () => {} },
    { id: 'checks', label: 'Checks', onSelect: () => {} },
    { id: 'files', label: 'Files', onSelect: () => {} },
  ];

  const summary = useMemo(
    () => [
      { label: 'Asset', value: asset.name },
      { label: 'Location', value: asset.location },
      { label: 'Health', value: asset.health },
    ],
    [asset],
  );

  return (
    <ResponsiveMobileShell
      title="Asset detail"
      navItems={nav}
      rightRail={
        <div className="space-y-3">
          <QueuedSyncPanel />
        </div>
      }
    >
      <div className="space-y-3">
        <div className="space-y-2 rounded-lg border border-neutral-200 p-3">
          <p className="text-lg font-semibold text-neutral-900">{asset.name}</p>
          <p className="text-sm text-neutral-600">{asset.location}</p>
          <div className="grid grid-cols-1 gap-2 text-xs text-neutral-700 sm:grid-cols-2">
            {summary.map((item) => (
              <div key={item.label} className="rounded bg-neutral-50 px-3 py-2">
                <p className="font-semibold text-neutral-900">{item.label}</p>
                <p>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
        <AssetActions asset={asset} />
        <ChecklistWidget
          entityId={asset.id}
          entityType="Asset"
          items={[
            { id: 'inspect', label: 'Inspect for leaks' },
            { id: 'lubricate', label: 'Lubricate joints' },
            { id: 'photos', label: 'Capture photo evidence' },
          ]}
        />
        <NotesWidget entityId={asset.id} entityType="Asset" />
      </div>
    </ResponsiveMobileShell>
  );
};

const MobileAssetDetailPage: React.FC = () => (
  <MobileSyncProvider>
    <MobileAssetDetailPageContent />
  </MobileSyncProvider>
);

export default MobileAssetDetailPage;
