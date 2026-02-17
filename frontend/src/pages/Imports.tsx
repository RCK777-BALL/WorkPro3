/*
 * SPDX-License-Identifier: MIT
 */

import { ImportExportPanel } from '@/features/import-export';

export default function Imports() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Bulk imports</h1>
        <p className="text-sm text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">
          Validate CSV/XLSX uploads and download current asset snapshots without leaving the page.
        </p>
      </header>

      <ImportExportPanel />
    </div>
  );
}

