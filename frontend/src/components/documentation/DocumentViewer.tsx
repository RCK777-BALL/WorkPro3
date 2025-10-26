/*
 * SPDX-License-Identifier: MIT
 */

import React, { useCallback } from 'react';
import { Download, Trash2, Tag, Share } from 'lucide-react';
import Button from '@common/Button';
import Badge from '@common/Badge';
import type { DocumentMetadata } from '@/utils/documentation';
import { useToast } from '@/context/ToastContext';

interface DocumentViewerProps {
  content: string;
  metadata: DocumentMetadata;
  onDownload: () => void;
  onDelete: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  content,
  metadata,
  onDownload,
  onDelete
}) => {
  const { addToast } = useToast();

  const handleShare = useCallback(async () => {
    try {
      const isBrowser = typeof window !== 'undefined';
      const shareUrl = isBrowser
        ? `${window.location.origin}/documentation`
        : '/documentation';
      const shareText = `Check out "${metadata.title}" in the WorkPro documentation library.`;

      if (typeof navigator !== 'undefined' && 'share' in navigator && typeof navigator.share === 'function') {
        await navigator.share({
          title: metadata.title,
          text: shareText,
          url: shareUrl,
        });
        addToast('Share dialog opened', 'success');
        return;
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        addToast('Share link copied to clipboard', 'success');
        return;
      }

      if (!isBrowser || typeof document === 'undefined') {
        throw new Error('Share is not supported in this environment');
      }

      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      addToast('Share link copied to clipboard', 'success');
    } catch (error) {
      const isAbortError = error instanceof DOMException && error.name === 'AbortError';
      if (!isAbortError) {
        addToast('Unable to share document', 'error');
      }
    }
  }, [addToast, metadata.title]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
      <div className="p-4 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">{metadata.title}</h3>
            <p className="text-sm text-neutral-500">
              {new Date(metadata.lastModified).toLocaleDateString()} · {(metadata.size / 1024).toFixed(2)} KB
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Share size={16} />}
              aria-label="Share document"
              onClick={handleShare}
            >
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Download size={16} />}
              onClick={onDownload}
              aria-label="Download document"
            >
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Trash2 size={16} />}
              onClick={onDelete}
              aria-label="Delete document"
            >
              Delete
            </Button>
          </div>
        </div>
        {metadata.tags && metadata.tags.length > 0 && (
          <div className="flex items-center mt-2 space-x-2">
            <Tag size={16} className="text-neutral-500" />
            {metadata.tags.map((tag, index) => (
              <Badge key={index} text={tag} size="sm" />
            ))}
          </div>
        )}
      </div>
      <div className="p-4 max-h-[600px] overflow-y-auto">
        <pre className="whitespace-pre-wrap font-mono text-sm">{content}</pre>
      </div>
    </div>
  );
};

export default DocumentViewer;
