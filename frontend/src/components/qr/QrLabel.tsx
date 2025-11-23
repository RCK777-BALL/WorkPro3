/*
 * SPDX-License-Identifier: MIT
 */

import { useState } from 'react';
import clsx from 'clsx';
import { QRCodeSVG } from 'qrcode.react';

import Button from '@/components/common/Button';
import { buildQrLabelMarkup } from './qrPrint';

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

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const markup = await buildQrLabelMarkup({ name, qrValue, subtitle, description });
      const printWindow = window.open('', '_blank', 'width=420,height=640');
      if (!printWindow) return;
      printWindow.document.write(markup);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
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
      <Button onClick={handlePrint} loading={printing} variant="outline" size={showPreview ? 'sm' : 'sm'}>
        {buttonLabel}
      </Button>
    </div>
  );
};

export default QrLabel;
