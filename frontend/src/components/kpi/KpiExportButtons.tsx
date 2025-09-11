import React from 'react';
import Button from '@/common/Button';
import { Download } from 'lucide-react';

const formats = ['csv', 'xlsx', 'pdf'] as const;

const exportFile = (format: string) => {
  const link = document.createElement('a');
  link.href = `/api/v1/analytics/kpis.${format}`;
  link.download = `kpis.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const KpiExportButtons: React.FC = () => (
  <div className="flex gap-2">
    {formats.map((f) => (
      <Button
        key={f}
        variant="outline"
        icon={<Download size={16} />}
        onClick={() => exportFile(f)}
      >
        {f.toUpperCase()}
      </Button>
    ))}
  </div>
);

export default KpiExportButtons;
