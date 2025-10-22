/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface AssetQRCodeProps {
  value: string;
  size?: number;
}

const AssetQRCode: React.FC<AssetQRCodeProps> = ({ value, size = 128 }) => {
  const [svgMarkup, setSvgMarkup] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setGenerationError(null);
    setSvgMarkup('');

    QRCode.toString(value, { type: 'svg', width: size, margin: 1 })
      .then((svg) => {
        if (!isCancelled) {
          setSvgMarkup(svg);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setGenerationError('Unable to generate QR code');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [value, size]);

  if (generationError) {
    return (
      <div role="alert" className="text-sm text-red-600 dark:text-red-400">
        {generationError}
      </div>
    );
  }

  if (!svgMarkup) {
    return <div className="inline-block text-xs text-neutral-500">Generating QR…</div>;
  }

  return (
    <div
      className="inline-block"
      style={{ width: size, height: size }}
      role="img"
      aria-label="QR code"
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
};

export default AssetQRCode;
