/*
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo, useState } from 'react';
import { ChecklistWidget, MediaUploadWidget, NotesWidget } from '../../components/TaskControls';
import { QueuedSyncPanel } from '../../components/QueuedSyncPanel';
import ResponsiveMobileShell from '../../layouts/ResponsiveMobileShell';
import { MobileSyncProvider, useMobileSync, type OfflineAction } from '../../useMobileSync';

type WorkOrder = {
  id: string;
  title: string;
  asset: string;
  status: 'draft' | 'in_progress' | 'done';
};

const WorkOrderActions: React.FC<{ workOrder: WorkOrder }> = ({ workOrder }) => {
  const [title, setTitle] = useState(workOrder.title);
  const [description, setDescription] = useState('');
  const { enqueue, queue } = useMobileSync();

  const createAction = () => {
    const action: OfflineAction = {
      id: `${workOrder.id}-create-${Date.now()}`,
      entityType: 'WorkOrder',
      entityId: workOrder.id,
      operation: 'create',
      payload: { title, description, asset: workOrder.asset },
      version: Date.now(),
    };
    enqueue(action);
  };

  const updateStatus = (status: WorkOrder['status']) => {
    const action: OfflineAction = {
      id: `${workOrder.id}-status-${status}`,
      entityType: 'WorkOrder',
      entityId: workOrder.id,
      operation: 'update',
      payload: { status },
      version: Date.now(),
    };
    enqueue(action);
  };

  const queuedForOrder = useMemo(() => queue.filter((item) => item.entityId === workOrder.id), [queue, workOrder.id]);

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-lg border border-neutral-200 p-3">
        <p className="text-sm font-semibold text-neutral-900">Create/update</p>
        <input
          className="w-full rounded border border-neutral-200 p-2 text-sm"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Work order title"
        />
        <textarea
          className="w-full rounded border border-neutral-200 p-2 text-sm"
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What needs to be fixed?"
        />
        <div className="flex flex-wrap gap-2">
          <button className="rounded bg-green-600 px-3 py-1.5 text-sm font-semibold text-white" onClick={createAction}>
            Queue create
          </button>
          <button className="rounded bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white" onClick={() => updateStatus('in_progress')}>
            Queue start
          </button>
          <button className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white" onClick={() => updateStatus('done')}>
            Queue complete
          </button>
        </div>
        {queuedForOrder.length > 0 && (
          <p className="text-xs text-neutral-600">{queuedForOrder.length} action(s) queued for this work order.</p>
        )}
      </div>

      <ChecklistWidget
        entityId={workOrder.id}
        entityType="WorkOrder"
        items={[
          { id: 'safety', label: 'Complete safety checks' },
          { id: 'parts', label: 'Verify parts availability' },
          { id: 'validate', label: 'Validate asset online' },
        ]}
      />
      <NotesWidget entityId={workOrder.id} entityType="WorkOrder" />
      <MediaUploadWidget entityId={workOrder.id} entityType="WorkOrder" />
    </div>
  );
};

const MobileWorkOrderPageContent: React.FC = () => {
  const workOrder: WorkOrder = {
    id: 'wo-mobile-1',
    title: 'Mobile generated work order',
    asset: 'AST-1001',
    status: 'draft',
  };

  const nav = [
    { id: 'summary', label: 'Summary', onSelect: () => {} },
    { id: 'tasks', label: 'Tasks', onSelect: () => {} },
    { id: 'history', label: 'History', onSelect: () => {} },
  ];

  return (
    <ResponsiveMobileShell
      title="Work order"
      navItems={nav}
      rightRail={
        <div className="space-y-3">
          <QueuedSyncPanel />
        </div>
      }
    >
      <div className="space-y-3">
        <div className="rounded-lg border border-neutral-200 p-3">
          <p className="text-lg font-semibold text-neutral-900">{workOrder.title}</p>
          <p className="text-sm text-neutral-600">Asset: {workOrder.asset}</p>
          <p className="text-xs text-neutral-500">Status: {workOrder.status}</p>
        </div>
        <WorkOrderActions workOrder={workOrder} />
      </div>
    </ResponsiveMobileShell>
  );
};

const MobileWorkOrderPage: React.FC = () => (
  <MobileSyncProvider>
    <MobileWorkOrderPageContent />
  </MobileSyncProvider>
);

export default MobileWorkOrderPage;
