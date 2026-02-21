/*
 * SPDX-License-Identifier: MIT
 */

import React, { useCallback, useMemo } from 'react';
import { Download, Trash2, Tag, Share } from 'lucide-react';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import type { DocumentMetadata } from '@/utils/documentation';
import { useToast } from '@/context/ToastContext';

interface DocumentViewerProps {
  content?: string | undefined;
  preview?: string | undefined;
  metadata: DocumentMetadata;
  onDownload: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  onShare?: (payload: { content?: string; metadata: DocumentMetadata }) => void | Promise<void>;
}

type SharePayload = {
  title?: string;
  text?: string;
  url?: string;
};

const formatFileSize = (size?: number) => {
  if (typeof size !== 'number' || Number.isNaN(size) || size <= 0) {
    return 'Unknown size';
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  metadata,
  content,
  preview,
  onDownload,
  onDelete,
  onShare,
}) => {
  const { addToast } = useToast();
  const lastModified = metadata.lastModified instanceof Date
    ? metadata.lastModified
    : new Date(metadata.lastModified);
  const hasValidDate = !Number.isNaN(lastModified.getTime());
  const sizeDisplay = formatFileSize(metadata.size);

  const documentContent = useMemo(() => {
    if (typeof preview === 'string' && preview.trim().length > 0) {
      return preview;
    }
    if (typeof content === 'string') {
      return content;
    }
    return '';
  }, [content, preview]);

  const shareUrl = useMemo(() => {
    if (metadata.downloadUrl) {
      return metadata.downloadUrl;
    }
    if (metadata.url) {
      return metadata.url;
    }
    if (typeof window !== 'undefined' && window.location) {
      return `${window.location.origin}/documentation`;
    }
    return '/documentation';
  }, [metadata.downloadUrl, metadata.url]);

  const handleShare = useCallback(async () => {
    try {
      const payload = { content: documentContent, metadata };
      if (onShare) {
        await onShare(payload);
        addToast('Document shared', 'success');
        return;
      }

      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        const shareData: SharePayload = {
          title: metadata.title,
          text: documentContent ? documentContent.slice(0, 280) : undefined,
          url: shareUrl,
        };
        await navigator.share(
          Object.fromEntries(
            Object.entries(shareData).filter(([, value]) => Boolean(value)),
          ) as SharePayload,
        );
        addToast('Share dialog opened', 'success');
        return;
      }

      if (
        shareUrl &&
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        await navigator.clipboard.writeText(shareUrl);
        addToast('Share link copied to clipboard', 'success');
        return;
      }

      addToast('Sharing is not supported in this browser', 'error');
    } catch (error) {
      console.error(error);
      addToast('Failed to share document', 'error');
    }
  }, [addToast, documentContent, metadata, onShare, shareUrl]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
      <div className="p-4 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">{metadata.title}</h3>
            <p className="text-sm text-neutral-500">
              {hasValidDate ? lastModified.toLocaleDateString() : 'Unknown date'} · {sizeDisplay}
            </p>
            <p className="text-xs text-neutral-400">{metadata.mimeType}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Share size={16} />}
              onClick={handleShare}
              aria-label="Share document"
            >
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Download size={16} />}
              onClick={() => void onDownload()}
              aria-label="Download document"
            >
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Trash2 size={16} />}
              onClick={() => void onDelete()}
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
        {documentContent && documentContent.trim().length > 0 ? (
          <pre className="whitespace-pre-wrap font-mono text-sm">{documentContent}</pre>
        ) : (
          <p className="text-sm text-neutral-500 italic">No preview available for this document.</p>
        )}
      </div>
    </div>
  );
};

export default DocumentViewer;
