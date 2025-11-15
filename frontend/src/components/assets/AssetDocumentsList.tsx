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
    return <p className="text-sm text-neutral-400">Loading documents…</p>;
  }

  if (!documents?.length) {
    return <p className="text-sm text-neutral-500">No documents linked to this asset.</p>;
  }

  return (
    <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800">
      {documents.map((doc) => (
        <li key={doc.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm text-neutral-200">
          <div>
            <p className="font-medium text-white">{doc.name ?? 'Untitled document'}</p>
            <p className="text-xs text-neutral-400">{doc.type ?? 'file'} • {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'unknown date'}</p>
          </div>
          <a
            href={doc.url}
            className="text-xs font-semibold text-indigo-300 hover:text-indigo-200"
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
