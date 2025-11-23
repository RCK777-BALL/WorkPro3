/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { useRouteProgress, RouteTask } from './useRouteProgress';
import {
  ConflictBanner,
  MobileSyncProvider,
  useMobileSync,
  type OfflineAction,
} from '../src/useMobileSync';

interface Props {
  tasks: RouteTask[];
}

const RouteWorkflow: React.FC<Props> = ({ tasks }) => {
  const { current, isComplete, next } = useRouteProgress(tasks);
  const { enqueue } = useMobileSync();

  const queueAction = () => {
    const action: OfflineAction = {
      id: Math.random().toString(36).slice(2),
      entityType: 'WorkOrder',
      entityId: current.id,
      operation: 'update',
      payload: { status: 'complete' },
      version: Date.now(),
    };
    enqueue(action);
  };
  return (
    <div>
      <ConflictBanner />
      {isComplete ? (
        <p data-testid="complete">Route Complete</p>
      ) : (
        <div>
          <p data-testid="current-task">{current.title}</p>
          <button onClick={next}>Next</button>
          <button onClick={queueAction}>Queue Offline Action</button>
        </div>
      )}
    </div>
  );
};

const RouteWorkflowWithSync: React.FC<Props> = (props) => (
  <MobileSyncProvider>
    <RouteWorkflow {...props} />
  </MobileSyncProvider>
);

export default RouteWorkflowWithSync;
