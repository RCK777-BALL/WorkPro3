/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Link, Share2 } from 'lucide-react';
import Modal from '@/components/modals/Modal';
import Button from '@/components/common/Button';
import type { DocumentMetadata } from '@/utils/documentation';
import { emitToast } from '@/context/ToastContext';

interface DocumentShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: { content: string; metadata: DocumentMetadata } | null;
}

const buildShareUrl = (title: string) => {
  const baseUrl =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://app.workpro.com';

  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  return `${baseUrl}/docs/${slug || 'document'}`;
};

const DocumentShareModal: React.FC<DocumentShareModalProps> = ({ isOpen, onClose, document }) => {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  const shareUrl = useMemo(() => {
    if (!document) {
      return '';
    }
    return buildShareUrl(document.metadata.title);
  }, [document]);

  useEffect(() => {
    if (!isOpen) {
      setCopyState('idle');
    }
  }, [isOpen]);

  useEffect(() => {
    setCopyState('idle');
  }, [document?.metadata.title]);

  if (!document) {
    return null;
  }

  const canUseNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopyLink = async () => {
    if (!shareUrl) {
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else if (typeof window !== 'undefined' && window.document) {
        const tempInput = window.document.createElement('textarea');
        tempInput.value = shareUrl;
        tempInput.setAttribute('readonly', '');
        tempInput.style.position = 'absolute';
        tempInput.style.left = '-9999px';
        window.document.body.appendChild(tempInput);
        tempInput.select();
        const successful = window.document.execCommand('copy');
        window.document.body.removeChild(tempInput);
        if (!successful) {
          throw new Error('Copy command was unsuccessful');
        }
      } else {
        throw new Error('Clipboard API unavailable');
      }

      setCopyState('copied');
      emitToast('Document link copied to clipboard');
    } catch (error) {
      console.error('Failed to copy share link', error);
      setCopyState('error');
      emitToast('Unable to copy link', 'error');
    }
  };

  const handleNativeShare = async () => {
    if (!shareUrl) {
      return;
    }

    if (!canUseNativeShare) {
      await handleCopyLink();
      return;
    }

    try {
      await navigator.share({
        title: document.metadata.title,
        text: `Check out this document: ${document.metadata.title}`,
        url: shareUrl,
      });
      emitToast('Document shared');
      onClose();
    } catch (error) {
      if ((error as DOMException | undefined)?.name === 'AbortError') {
        return;
      }
      console.error('Failed to share document', error);
      emitToast('Unable to share document', 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Share "${document.metadata.title}"`}
    >
      <div className="space-y-6">
        <p className="text-sm text-neutral-600">
          Share this document with your team using the link below or your device's native share options.
        </p>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-700" htmlFor="document-share-link">
            Share link
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex-1 flex items-center gap-2 rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2">
              <Link size={16} className="text-neutral-500" aria-hidden />
              <input
                id="document-share-link"
                className="w-full bg-transparent text-sm text-neutral-700 focus:outline-none"
                value={shareUrl}
                readOnly
                onFocus={(event) => event.target.select()}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={copyState === 'copied' ? <Check size={16} /> : <Copy size={16} />}
              onClick={() => void handleCopyLink()}
            >
              {copyState === 'copied' ? 'Copied' : 'Copy link'}
            </Button>
          </div>
          {copyState === 'error' && (
            <p className="text-xs text-error-600">We couldn't copy the link automatically. Please try again.</p>
          )}
        </div>

        <div className="space-y-2">
          <Button
            variant="primary"
            icon={<Share2 size={16} />}
            onClick={() => void handleNativeShare()}
            fullWidth
          >
            {canUseNativeShare ? 'Share via device dialog' : 'Share link using copy'}
          </Button>
          {!canUseNativeShare && (
            <p className="text-xs text-neutral-500">
              Your browser doesn't support the native share dialog. Use the copy option above to share the link manually.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default DocumentShareModal;

