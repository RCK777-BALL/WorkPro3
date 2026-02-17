/*
 * SPDX-License-Identifier: MIT
 */

import type { AssetDocumentSummary } from '@/api/assets';

export type AssetDocumentsListProps = {
  documents?: AssetDocumentSummary[];
  isLoading?: boolean;
};

const AssetDocumentsList = ({ documents, isLoading }: AssetDocumentsListProps) => {
  if (isLoading) {
    return <p className="text-sm text-[var(--wp-color-text-muted)]">Loading documents...</p>;
  }

  if (!documents?.length) {
    return <p className="text-sm text-[var(--wp-color-text-muted)]">No documents linked to this asset.</p>;
  }

  return (
    <ul className="divide-y divide-[var(--wp-color-border)] rounded-xl border border-[var(--wp-color-border)]">
      {documents.map((doc) => (
        <li key={doc.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm text-[var(--wp-color-text)]">
          <div>
            <p className="font-medium text-[var(--wp-color-text)]">{doc.name ?? 'Untitled document'}</p>
            <p className="text-xs text-[var(--wp-color-text-muted)]">{doc.type ?? 'file'} | {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'unknown date'}</p>
          </div>
          <a
            href={doc.url}
            className="text-xs font-semibold text-[var(--wp-color-primary)] hover:text-[var(--wp-color-primary)]"
            target="_blank"
            rel="noreferrer"
          >
            View
          </a>
        </li>
      ))}
    </ul>
  );
};

export default AssetDocumentsList;

