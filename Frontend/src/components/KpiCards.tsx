import React from 'react';

export type KpiCard = {
  label: string;
  value: string | number;
  trend?: string;
};

const KpiCards: React.FC<{ items: KpiCard[] }> = ({ items }) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-neutral-500">{item.label}</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900">{item.value}</p>
          {item.trend ? <p className="mt-1 text-xs text-neutral-500">{item.trend}</p> : null}
        </div>
      ))}
    </div>
  );
};

export default KpiCards;
