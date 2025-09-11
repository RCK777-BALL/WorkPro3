/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import Card from '../common/Card';

interface Props {
  label: string;
  value: number | string;
  suffix?: string;
}

const KpiWidget: React.FC<Props> = ({ label, value, suffix }) => (
  <Card>
    <div className="space-y-1">
      <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</h3>
      <p className="text-2xl font-semibold">{value}{suffix}</p>
    </div>
  </Card>
);

export default KpiWidget;
