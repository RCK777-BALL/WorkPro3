/*
 * SPDX-License-Identifier: MIT
 */

import ExportsPanel from '@/integrations/ExportsPanel';

export default function ExportsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Export History</h1>
        <p className="text-sm text-gray-500">
          Queue new exports and download completed CSV or XLSX files.
        </p>
      </div>
      <ExportsPanel apiBase="/api/exports/v2" />
    </div>
  );
}

