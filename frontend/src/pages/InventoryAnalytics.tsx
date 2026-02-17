/*
 * SPDX-License-Identifier: MIT
 */

import PartUsageReport from '@/features/inventory/PartUsageReport';

const InventoryAnalytics = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold text-[var(--wp-color-text)]">Inventory analytics</h1>
      <p className="text-sm text-[var(--wp-color-text-muted)]">
        Track how parts are consumed across work orders and identify the cost drivers in your inventory.
      </p>
    </div>

    <PartUsageReport />
  </div>
);

export default InventoryAnalytics;

