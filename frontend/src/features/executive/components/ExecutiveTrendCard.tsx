/*
 * SPDX-License-Identifier: MIT
 */

import type { ReactNode } from 'react';

import Card from '@/components/common/Card';
import { SimpleLineChart } from '@/components/charts/SimpleLineChart';

interface ExecutiveTrendCardProps {
  title: string;
  description: string;
  data: { label: string; value: number }[];
  accent?: string;
  footer?: ReactNode;
}

export function ExecutiveTrendCard({ title, description, data, accent = '#6366f1', footer }: ExecutiveTrendCardProps) {
  return (
    <Card title={title} subtitle={description} className="h-full bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="h-52">
        <SimpleLineChart data={data} showDots stroke={accent} />
      </div>
      {footer ? <div className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">{footer}</div> : null}
    </Card>
  );
}
