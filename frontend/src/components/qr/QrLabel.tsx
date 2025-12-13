/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { QRCodeSVG } from 'qrcode.react';
import { Printer } from 'lucide-react';

import Button from '@/components/common/Button';
import Modal from '@/components/modals/Modal';
import { buildQrLabelMarkup, type QrLabelFormat } from './qrPrint';

type QrLabelProps = {
  name: string;
  qrValue: string;
  subtitle?: string;
  description?: string;
  showPreview?: boolean;
  buttonLabel?: string;
  className?: string;
};

const QrLabel = ({
  name,
  qrValue,
  subtitle,
  description,
  showPreview = true,
  buttonLabel = 'Print QR Label',
  className,
}: QrLabelProps) => {
  const [printing, setPrinting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<QrLabelFormat>('standard');

  const formats = useMemo(
    () => [
      {
        id: 'standard' satisfies QrLabelFormat,
        name: 'Standard QR label',
        description: 'Balanced QR and meta for general bins.',
      },
      {
        id: 'compact' satisfies QrLabelFormat,
        name: 'Compact shelf label',
        description: 'Slim layout to tuck under shelves or drawers.',
      },
      {
        id: 'shipping' satisfies QrLabelFormat,
        name: 'Print QR / Label',
        description: 'Bold faceplate for carts, kitting, or shipping.',
      },
    ],
    [],
  );

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const markup = await buildQrLabelMarkup({
        name,
        qrValue,
        subtitle,
        description,
        format: selectedFormat,
      });
      const printWindow = window.open('', '_blank', 'width=420,height=640');
      if (!printWindow) return;
      printWindow.document.write(markup);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      setIsModalOpen(false);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className={clsx('flex flex-col gap-3', className)}>
      {showPreview && (
        <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
          <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-neutral-50">
            <QRCodeSVG value={qrValue} size={72} />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase text-neutral-500">Label</p>
            <p className="text-lg font-semibold text-neutral-900">{name}</p>
            {subtitle && <p className="text-sm text-neutral-600">{subtitle}</p>}
            {description && <p className="text-xs text-neutral-500">{description}</p>}
          </div>
        </div>
      )}
      <Button
        onClick={() => setIsModalOpen(true)}
        loading={printing}
        variant="outline"
        size={showPreview ? 'sm' : 'sm'}
        icon={<Printer size={16} />}
      >
        {buttonLabel}
      </Button>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Print QR / Label">
        <div className="space-y-4">
          <p className="text-sm text-neutral-300">
            Choose the layout you need and we will render the label with your QR value embedded.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {formats.map((format) => (
              <label
                key={format.id}
                className={clsx(
                  'flex cursor-pointer flex-col gap-2 rounded-lg border bg-neutral-900/60 p-3 transition hover:border-primary-400',
                  selectedFormat === format.id ? 'border-primary-400 shadow-lg shadow-primary-500/20' : 'border-neutral-700',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      className="h-4 w-4 accent-primary-400"
                      checked={selectedFormat === format.id}
                      onChange={() => setSelectedFormat(format.id)}
                      aria-label={`Choose ${format.name}`}
                    />
                    <p className="text-sm font-semibold text-white">{format.name}</p>
                  </div>
                  {selectedFormat === format.id && (
                    <span className="rounded-full bg-primary-500/20 px-2 py-0.5 text-[11px] font-semibold text-primary-200">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-300">{format.description}</p>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePrint} loading={printing} size="sm">
              Print selected format
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default QrLabel;
