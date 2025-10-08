/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useRef } from 'react';
import Modal from '@/components/modals/Modal';
import { scanQRCode } from '@/utils/qr';
import type { Part } from '@/types';

interface InventoryScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (part: Part | null, init?: Partial<Part>) => void;
}

const InventoryScanModal: React.FC<InventoryScanModalProps> = ({
  isOpen,
  onClose,
  onScanComplete,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isOpen || !videoRef.current) return;

    let cancelled = false;

    scanQRCode(videoRef.current)
      .then((raw) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(raw) as Partial<Part>;
          onScanComplete(null, data);
        } catch (err) {
          console.error('Invalid QR data', err);
        } finally {
          onClose();
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('QR scan failed', err);
          onClose();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scan QR Code">
      <video ref={videoRef} className="w-full" />
    </Modal>
  );
};

export default InventoryScanModal;
