import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface AssetQRCodeProps {
  value: string;
  size?: number;
}

const AssetQRCode: React.FC<AssetQRCodeProps> = ({ value, size = 128 }) => {
  return (
    <div className="inline-block">
      <QRCodeSVG value={value} size={size} />
    </div>
  );
};

export default AssetQRCode;
