/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import Button from '@/components/common/Button';
import { Download } from 'lucide-react';

type Resource = 'kpis' | 'trends';

interface Props {
  resource?: Resource;
  query?: string;
}

const resourceFormats: Record<Resource, Array<'csv' | 'xlsx' | 'pdf'>> = {
  kpis: ['csv', 'xlsx', 'pdf'],
  trends: ['csv', 'pdf'],
};

const exportFile = (resource: Resource, format: string, query?: string) => {
  const link = document.createElement('a');
  link.href = `/api/v1/analytics/${resource}.${format}${query ? `?${query}` : ''}`;
  link.download = `${resource}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const KpiExportButtons: React.FC<Props> = ({ resource = 'kpis', query }) => (
  <div className="flex gap-2">
    {resourceFormats[resource].map((format) => (
      <Button
        key={format}
        variant="outline"
        icon={<Download size={16} />}
        onClick={() => exportFile(resource, format, query)}
      >
        {format.toUpperCase()}
      </Button>
    ))}
  </div>
);

export default KpiExportButtons;
