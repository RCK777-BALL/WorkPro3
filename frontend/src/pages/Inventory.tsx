/*
 * SPDX-License-Identifier: MIT
 */

import { ClipboardList, Package2, ShieldAlert } from 'lucide-react';

import {
  AlertsPanel,
  InventoryAlertIndicator,
  PartsTableView,
  PdfExportPanel,
  PurchaseOrderBuilder,
  PurchaseOrderExportPanel,
  VendorListPanel,
  useAlertsQuery,
  usePartsQuery,
} from '@/features/inventory';
import { usePermissions } from '@/auth/usePermissions';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Input from '@/components/common/Input';
import PageHeader from '@/components/layout/PageHeader';

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
  const { can } = usePermissions();

  const partsCount = partsQuery.data?.total ?? 0;
  const lowStockCount = alertsQuery.data?.openCount ?? alertsQuery.data?.items?.length ?? 0;
  const linkedAssets = (partsQuery.data?.items ?? []).reduce(
    (sum, part) => sum + (part.assets?.length ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <PageHeader
          title="Inventory intelligence"
          description="Track parts, see which assets rely on them, and generate purchase orders without leaving this page."
          actions={
            <div className="pt-2">
              <InventoryAlertIndicator />
            </div>
          }
        />
        <div className="grid gap-3 md:grid-cols-3">
          <StatCard label="Active parts" value={partsCount.toString()} icon={Package2} />
          <StatCard label="Linked assets" value={linkedAssets.toString()} icon={ClipboardList} />
          <StatCard label="Alerts" value={lowStockCount.toString()} icon={ShieldAlert} />
        </div>
      </div>

      <AlertsPanel />

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <PartsTableView />
        <div className="space-y-6">
          <VendorListPanel />
          <PurchaseOrderBuilder />
          <PurchaseOrderExportPanel />
          <PdfExportPanel />
          <Card title="Receiving & reservations">
            <p className="text-sm text-neutral-500">
              Capture receipts for purchase orders and reserve parts for upcoming work orders. Access is gated by
              inventory and work-order permissions.
            </p>
            <div className="mt-4 space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="PO / reference" placeholder="PO-123" disabled={!can('inventory.purchase')} />
                <Input label="Part ID" placeholder="Inventory part" disabled={!can('inventory.purchase')} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Input label="Quantity" type="number" min={0} disabled={!can('inventory.purchase')} />
                <Input label="Unit cost" type="number" min={0} step="0.01" disabled={!can('inventory.purchase')} />
                <Input label="Location" placeholder="Bin / room" disabled={!can('inventory.manage')} />
              </div>
              <Button type="button" className="w-full" disabled={!can('inventory.purchase')}>
                Record receipt
              </Button>
            </div>
            <div className="mt-6 space-y-3 rounded-md border border-dashed border-neutral-200 p-3">
              <p className="text-sm font-medium text-neutral-900">Work order part reservation</p>
              <div className="grid gap-3 md:grid-cols-3">
                <Input label="WO" placeholder="WO-001" disabled={!can('workorders.manage')} />
                <Input label="Part ID" placeholder="Inventory part" disabled={!can('inventory.manage')} />
                <Input label="Quantity" type="number" min={1} disabled={!can('inventory.manage')} />
              </div>
              <Input label="Needed by" type="date" disabled={!can('inventory.manage')} />
              <Button type="button" className="w-full" disabled={!can('inventory.manage')}>
                Reserve for work order
              </Button>
              {!can('inventory.manage') && (
                <p className="text-xs text-amber-600">Insufficient permissions to allocate parts.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
