/*
 * SPDX-License-Identifier: MIT
 */

import { useState } from 'react';

export interface RouteTask {
  id: string;
  title: string;
}

export function useRouteProgress(tasks: RouteTask[]) {
  const [index, setIndex] = useState(0);
  const current = tasks[index];
  const next = () => setIndex((i) => Math.min(i + 1, tasks.length));
  return { current, index, isComplete: index >= tasks.length, next };
}
