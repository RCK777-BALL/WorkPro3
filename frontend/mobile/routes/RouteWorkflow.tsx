/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { useRouteProgress, RouteTask } from './useRouteProgress';

interface Props {
  tasks: RouteTask[];
}

const RouteWorkflow: React.FC<Props> = ({ tasks }) => {
  const { current, isComplete, next } = useRouteProgress(tasks);
  return (
    <div>
      {isComplete ? (
        <p data-testid="complete">Route Complete</p>
      ) : (
        <div>
          <p data-testid="current-task">{current.title}</p>
          <button onClick={next}>Next</button>
        </div>
      )}
    </div>
  );
};

export default RouteWorkflow;
