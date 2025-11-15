/*
 * SPDX-License-Identifier: MIT
 */

import { ClipboardList, Package2, ShieldAlert } from 'lucide-react';

import {
  AlertsPanel,
  PartsTableView,
  PdfExportPanel,
  PurchaseOrderBuilder,
  PurchaseOrderExportPanel,
  VendorListPanel,
  useAlertsQuery,
  usePartsQuery,
} from '@/features/inventory';

const StatCard = ({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Package2 }) => (
  <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
    <div className="rounded-full bg-neutral-100 p-2 text-neutral-600">
      <Icon size={20} />
    </div>
    <div>
      <p className="text-xs uppercase text-neutral-500">{label}</p>
      <p className="text-xl font-semibold text-neutral-900">{value}</p>
    </div>
  </div>
);

const Inventory = () => {
  const partsQuery = usePartsQuery();
  const alertsQuery = useAlertsQuery();

  const partsCount = partsQuery.data?.length ?? 0;
  const lowStockCount = alertsQuery.data?.length ?? 0;
  const linkedAssets = (partsQuery.data ?? []).reduce((sum, part) => sum + (part.assets?.length ?? 0), 0);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Inventory intelligence</h1>
          <p className="text-sm text-neutral-500">
            Track parts, see which assets rely on them, and generate purchase orders without leaving this page.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <StatCard label="Active parts" value={partsCount.toString()} icon={Package2} />
          <StatCard label="Linked assets" value={linkedAssets.toString()} icon={ClipboardList} />
          <StatCard label="Alerts" value={lowStockCount.toString()} icon={ShieldAlert} />
        </div>
      </header>

      <AlertsPanel />

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <PartsTableView />
        <div className="space-y-6">
          <VendorListPanel />
          <PurchaseOrderBuilder />
          <PurchaseOrderExportPanel />
          <PdfExportPanel />
        </div>
      </div>
    </div>
  );
};

export default Inventory;
