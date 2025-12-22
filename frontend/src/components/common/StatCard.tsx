/*
 * SPDX-License-Identifier: MIT
 */

import Card from '@/components/common/Card';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
}

const StatCard = ({ title, value, description }: StatCardProps) => (
  <Card className="h-full">
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium text-neutral-600">{title}</p>
      <p className="text-2xl font-semibold text-neutral-900">{value}</p>
      {description && <p className="text-sm text-neutral-500">{description}</p>}
    </div>
  </Card>
);

export default StatCard;
